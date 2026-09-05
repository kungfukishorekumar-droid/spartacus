import { revalidatePath } from 'next/cache';
import { buildImagePrompts } from './image-prompts';
import { generateImages, isHiggsfieldConfigured } from './higgsfield';
import { requireAdminClient } from './supabase';
import { validateForPublish, type ValidationResult } from './validate';

/**
 * The publish pipeline — the one place a post can go from draft to live.
 *
 * Order matters:
 *   1. Load the post with its FAQs, images and category.
 *   2. Generate the featured + in-body images if they are missing, so the
 *      image checks below have something to check.
 *   3. Run the full SEO/GEO/AEO gate. Any error aborts — nothing is published
 *      half-optimised.
 *   4. Flip status to published, stamp published_at, revalidate the pages the
 *      post appears on.
 */

export interface PublishResult extends ValidationResult {
  published: boolean;
  generatedImages: number;
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

  const post = data as {
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
    images: { url: string; alt_text: string; role: string; position: number }[] | null;
  };

  const warnings: string[] = [];
  let generatedImages = 0;

  // --- 2. Images -----------------------------------------------------------
  const existingImages = post.images ?? [];
  const needsImages = !post.featured_image_url || existingImages.length === 0;

  if (needsImages && isHiggsfieldConfigured()) {
    const specs = buildImagePrompts({
      title: post.title,
      categoryName: post.category?.name,
      keywords: post.seo_keywords,
    });
    const outcome = await generateImages(specs);
    warnings.push(...outcome.warnings);

    if (outcome.images.length > 0) {
      const rows = outcome.images.map((image) => ({
        post_id: post.id,
        url: image.url,
        alt_text: image.altText,
        position: image.position,
        role: image.role,
      }));
      const { error: imageError } = await db.from('post_images').insert(rows);
      if (imageError) {
        warnings.push(`Images were generated but could not be saved: ${imageError.message}`);
      } else {
        generatedImages = rows.length;
        existingImages.push(...rows);
      }

      const featured = outcome.images.find((i) => i.role === 'featured');
      if (featured && !post.featured_image_url) {
        post.featured_image_url = featured.url;
        post.featured_image_alt = featured.altText;
        await db
          .from('posts')
          .update({ featured_image_url: featured.url, featured_image_alt: featured.altText })
          .eq('id', post.id);
      }
    }
  } else if (needsImages) {
    warnings.push('HIGGSFIELD_API_KEY is not set — no images were generated for this post.');
  }

  // --- 3. The gate ---------------------------------------------------------
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
    images: existingImages,
    siblingSlugs,
  });

  warnings.push(...validation.warnings);

  if (!validation.ok) {
    return { ...validation, warnings, published: false, generatedImages };
  }

  // --- 4. Go live ----------------------------------------------------------
  const { error: publishError } = await db
    .from('posts')
    .update({
      status: 'published',
      published_at: post.published_at ?? new Date().toISOString(),
    })
    .eq('id', post.id);

  if (publishError) throw new Error(`Publish failed: ${publishError.message}`);

  revalidateForPost(post.slug, post.category?.slug ?? null);

  return { ok: true, errors: [], warnings, published: true, generatedImages };
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
