'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, createSessionToken, requireAdmin, sessionCookieOptions, verifyPassword } from '@/lib/auth';
import { publishPost, revalidateForPost, unpublishPost } from '@/lib/publish';
import { requireAdminClient } from '@/lib/supabase';
import { slugify } from '@/lib/validate';
import type { ActionState } from '@/lib/action-state';


// --- Auth -----------------------------------------------------------------

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get('password') ?? '');
  if (!verifyPassword(password, process.env.ADMIN_PASSWORD_HASH)) {
    // Constant-ish response: never reveal whether the hash is even configured.
    return { status: 'error', message: 'Incorrect password.' };
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/admin/login');
}

// --- Posts ----------------------------------------------------------------

interface FaqInput {
  question: string;
  answer: string;
}

interface ImageInput {
  url: string;
  alt_text: string;
  role?: 'featured' | 'body';
  position?: number;
}

function parseJsonField<T>(formData: FormData, key: string, fallback: T): T {
  const raw = formData.get(key);
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseKeywords(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Create or update a post, then optionally run the publish pipeline.
 * `intent` is "draft", "publish" or "unpublish".
 */
export async function savePostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = requireAdminClient();

  const id = String(formData.get('id') ?? '').trim() || null;
  const intent = String(formData.get('intent') ?? 'draft');
  const title = String(formData.get('title') ?? '').trim();
  const slug = slugify(String(formData.get('slug') ?? '').trim() || title);

  if (!title) return { status: 'error', message: 'A title is required.' };
  if (!slug) return { status: 'error', message: 'A slug is required.' };

  const payload = {
    title,
    slug,
    excerpt: String(formData.get('excerpt') ?? '').trim(),
    answer_summary: String(formData.get('answer_summary') ?? '').trim(),
    body_md: String(formData.get('body_md') ?? ''),
    category_id: String(formData.get('category_id') ?? '') || null,
    author_id: String(formData.get('author_id') ?? '') || null,
    seo_title: String(formData.get('seo_title') ?? '').trim() || null,
    seo_keywords: parseKeywords(formData.get('seo_keywords')),
    featured_image_url: String(formData.get('featured_image_url') ?? '').trim() || null,
    featured_image_alt: String(formData.get('featured_image_alt') ?? '').trim() || null,
  };

  let postId = id;

  if (postId) {
    const { error } = await db.from('posts').update(payload).eq('id', postId);
    if (error) return { status: 'error', message: `Save failed: ${error.message}` };
  } else {
    const { data, error } = await db
      .from('posts')
      .insert({ ...payload, status: 'draft' })
      .select('id')
      .single();
    if (error) return { status: 'error', message: `Create failed: ${error.message}` };
    postId = (data as { id: string }).id;
  }

  // FAQs and images are replaced wholesale — simplest correct behaviour for a
  // single-editor admin, and it keeps sort order honest.
  const faqs = parseJsonField<FaqInput[]>(formData, 'faqs_json', [])
    .filter((f) => f.question?.trim() && f.answer?.trim())
    .map((f, index) => ({
      post_id: postId!,
      question: f.question.trim(),
      answer: f.answer.trim(),
      sort_order: index,
    }));

  await db.from('post_faqs').delete().eq('post_id', postId);
  if (faqs.length) {
    const { error } = await db.from('post_faqs').insert(faqs);
    if (error) return { status: 'error', message: `Saving FAQs failed: ${error.message}` };
  }

  const images = parseJsonField<ImageInput[]>(formData, 'images_json', [])
    .filter((i) => i.url?.trim())
    .map((image, index) => ({
      post_id: postId!,
      url: image.url.trim(),
      alt_text: (image.alt_text ?? '').trim(),
      role: image.role ?? 'body',
      position: image.position ?? index,
    }));

  await db.from('post_images').delete().eq('post_id', postId);
  if (images.length) {
    const { error } = await db.from('post_images').insert(images);
    if (error) return { status: 'error', message: `Saving images failed: ${error.message}` };
  }

  const tagNames = parseKeywords(formData.get('tags'));
  await syncTags(postId!, tagNames);

  if (intent === 'unpublish') {
    await unpublishPost(postId!);
    revalidatePath('/admin');
    return { status: 'success', message: 'Post moved back to draft.', postId: postId! };
  }

  if (intent === 'publish') {
    const result = await publishPost(postId!);
    revalidatePath('/admin');
    if (!result.published) {
      return {
        status: 'error',
        message: 'Publish blocked — fix the items below and try again.',
        errors: result.errors,
        warnings: result.warnings,
        postId: postId!,
      };
    }
    return {
      status: 'success',
      message: 'Published.',
      warnings: result.warnings,
      postId: postId!,
    };
  }

  revalidatePath('/admin');
  revalidateForPost(slug, null);
  return { status: 'success', message: 'Draft saved.', postId: postId! };
}

async function syncTags(postId: string, tagNames: string[]): Promise<void> {
  const db = requireAdminClient();
  await db.from('post_tags').delete().eq('post_id', postId);
  if (!tagNames.length) return;

  const rows = tagNames.map((name) => ({ name, slug: slugify(name) }));
  const { error } = await db.from('tags').upsert(rows, { onConflict: 'slug', ignoreDuplicates: true });
  if (error) console.error('[admin] tag upsert', error.message);

  const { data: tags } = await db
    .from('tags')
    .select('id, slug')
    .in('slug', rows.map((r) => r.slug));

  const links = (tags ?? []).map((tag: { id: string }) => ({ post_id: postId, tag_id: tag.id }));
  if (links.length) await db.from('post_tags').insert(links);
}

export async function deletePostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const db = requireAdminClient();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { data } = await db.from('posts').select('slug').eq('id', id).maybeSingle();
  await db.from('posts').delete().eq('id', id);
  if (data) revalidateForPost((data as { slug: string }).slug, null);
  revalidatePath('/admin');
  redirect('/admin');
}
