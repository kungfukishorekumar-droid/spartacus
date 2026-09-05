/**
 * Backfill images for posts that have none.
 *
 *   npx tsx scripts/generate-images.ts            # every post missing images
 *   npx tsx scripts/generate-images.ts <slug>     # one post
 *
 * Uses the same brand prompts and the same Higgsfield adapter as the publish
 * pipeline, so backfilled images look identical to generated-on-publish ones.
 * Requires SUPABASE_SERVICE_ROLE_KEY and HIGGSFIELD_API_KEY in the environment
 * (load them with `node --env-file=.env.local` or export them first).
 */
import { buildImagePrompts } from '../lib/image-prompts';
import { generateImages, isHiggsfieldConfigured } from '../lib/higgsfield';
import { requireAdminClient } from '../lib/supabase';

interface Row {
  id: string;
  title: string;
  slug: string;
  seo_keywords: string[] | null;
  featured_image_url: string | null;
  category: { name: string } | null;
  images: { id: string }[] | null;
}

async function main() {
  if (!isHiggsfieldConfigured()) {
    console.error('HIGGSFIELD_API_KEY is not set.');
    process.exit(1);
  }

  const db = requireAdminClient();
  const onlySlug = process.argv[2];

  let query = db
    .from('posts')
    .select('id, title, slug, seo_keywords, featured_image_url, category:categories(name), images:post_images(id)');
  if (onlySlug) query = query.eq('slug', onlySlug);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Row[];
  const targets = onlySlug
    ? rows
    : rows.filter((row) => !row.featured_image_url || (row.images ?? []).length === 0);

  if (targets.length === 0) {
    console.log('Nothing to do — every post already has images.');
    return;
  }

  console.log(`Generating images for ${targets.length} post(s)…`);

  for (const post of targets) {
    process.stdout.write(`  ${post.slug} … `);
    const specs = buildImagePrompts({
      title: post.title,
      categoryName: post.category?.name,
      keywords: post.seo_keywords,
    });
    const { images, warnings } = await generateImages(specs);

    if (images.length === 0) {
      console.log(`skipped (${warnings.join('; ')})`);
      continue;
    }

    await db.from('post_images').delete().eq('post_id', post.id);
    const { error: insertError } = await db.from('post_images').insert(
      images.map((image) => ({
        post_id: post.id,
        url: image.url,
        alt_text: image.altText,
        position: image.position,
        role: image.role,
      })),
    );
    if (insertError) {
      console.log(`failed to save: ${insertError.message}`);
      continue;
    }

    const featured = images.find((i) => i.role === 'featured');
    if (featured) {
      await db
        .from('posts')
        .update({ featured_image_url: featured.url, featured_image_alt: featured.altText })
        .eq('id', post.id);
    }

    console.log(`${images.length} image(s)`);
    if (warnings.length) console.log(`    warnings: ${warnings.join('; ')}`);
  }

  console.log('Done. Revalidate the site (or wait for ISR) to see the new images.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
