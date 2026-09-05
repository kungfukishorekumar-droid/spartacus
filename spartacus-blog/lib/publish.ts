import { revalidatePath } from 'next/cache';
import { requireAdminClient } from './supabase';
import { validateForPublish, type ValidationResult } from './validate';

/**
 * The publish pipeline — the one place a post can go from draft to live.
 *
 *   1. Load the post with its FAQs, images and category.
 *   2. Run the full SEO/GEO/AEO gate. Any error aborts — nothing is published
 *      half-optimised.
 *   3. Flip status to published, stamp published_at, revalidate the pages the
 *      post appears on.
 *
 * Images are supplied by hand (or by the legacy import), not generated here.
 * The admin editor builds brand-consistent prompts for whichever image tool you
 * use; the gate then insists every image that exists has real alt text.
 */

export interface PublishResult extends ValidationResult {
  published: boolean;
}

interface PublishRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  answer_summary: string;
  body_md: string;
  seo_title: string | null;
  seo_keywords: string[] | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  published_at: string | null;
  category: { id: string; slug: string; name: string } | null;
  faqs: { question: string; answer: string }[] | null;
  images: { url: string; alt_text: string }[] | null;
}

export async function publishPost(postId: string): Promise<PublishResult> {
  const db = requireAdminClient();

  const { data, error } = await db
    .from('posts')
    .select('*, category:categories(*), faqs:post_faqs(*), images:post_images(*)')
    .eq('id', postId)
    .maybeSingle();

  if (error) throw new Error(`Could not load the post: ${error.message}`);
  if (!data) throw new Error('Post not found.');

  const post = data as unknown as PublishRow;

  // Sibling slugs feed the internal-linking check that wires the topic cluster.
  let siblingSlugs: string[] = [];
  if (post.category) {
    const { data: siblings } = await db
      .from('posts')
      .select('slug')
      .eq('category_id', post.category.id)
      .eq('status', 'published')
      .neq('id', post.id)
      .limit(200);
    siblingSlugs = (siblings ?? []).map((s: { slug: string }) => s.slug);
  }

  const validation = validateForPublish({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    answer_summary: post.answer_summary,
    body_md: post.body_md,
    category_slug: post.category?.slug ?? null,
    seo_title: post.seo_title,
    featured_image_url: post.featured_image_url,
    featured_image_alt: post.featured_image_alt,
    faqs: post.faqs ?? [],
    images: post.images ?? [],
    siblingSlugs,
  });

  if (!validation.ok) {
    return { ...validation, published: false };
  }

  const { error: publishError } = await db
    .from('posts')
    .update({
      status: 'published',
      published_at: post.published_at ?? new Date().toISOString(),
    })
    .eq('id', post.id);

  if (publishError) throw new Error(`Publish failed: ${publishError.message}`);

  revalidateForPost(post.slug, post.category?.slug ?? null);

  return { ...validation, published: true };
}

export async function unpublishPost(postId: string): Promise<void> {
  const db = requireAdminClient();
  const { data, error } = await db
    .from('posts')
    .update({ status: 'draft' })
    .eq('id', postId)
    .select('slug, category:categories(slug)')
    .maybeSingle();
  if (error) throw new Error(`Could not unpublish: ${error.message}`);
  const row = data as { slug: string; category: { slug: string } | null } | null;
  if (row) revalidateForPost(row.slug, row.category?.slug ?? null);
}

/** Bust the ISR cache for every page this post appears on. */
export function revalidateForPost(slug: string, categorySlug: string | null): void {
  revalidatePath('/');
  revalidatePath(`/${slug}`);
  revalidatePath('/about-kishore');
  revalidatePath('/sitemap.xml');
  revalidatePath('/llms.txt');
  if (categorySlug) revalidatePath(`/category/${categorySlug}`);
}
