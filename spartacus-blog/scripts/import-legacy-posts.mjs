#!/usr/bin/env node
/**
 * Import the existing static-site blog library (../data/blogData.js +
 * ../data/blog100-part*.js) into Supabase.
 *
 *   node --env-file=.env.local scripts/import-legacy-posts.mjs           # dry run
 *   node --env-file=.env.local scripts/import-legacy-posts.mjs --write   # import as drafts
 *   node --env-file=.env.local scripts/import-legacy-posts.mjs --write --publish
 *
 * Posts land as DRAFTS by default. `--publish` publishes only the ones that
 * pass the same SEO/GEO/AEO gate the admin uses — nothing skips the gate.
 * Everything that fails is listed with the reason so it can be fixed by hand.
 *
 * Re-running is safe: posts are upserted on their slug.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const LEGACY_DIR = resolve(HERE, '../../data');
const MAIN_SITE = 'https://spartacusmartialarts.com';

const write = process.argv.includes('--write');
const publish = process.argv.includes('--publish');

// --- 1. Evaluate the legacy IIFEs against a fake `window` -------------------
function loadLegacyPosts() {
  const files = [
    'blogData.js',
    'blog100-part1.js',
    'blog100-part2.js',
    'blog100-part3.js',
    'blog100-part4.js',
    'blog100-part5.js',
  ];
  const sandbox = { window: {}, console, encodeURIComponent, Math, Date, JSON };
  sandbox.window.window = sandbox.window;
  const context = vm.createContext(sandbox);

  for (const file of files) {
    const path = resolve(LEGACY_DIR, file);
    let source;
    try {
      source = readFileSync(path, 'utf8');
    } catch {
      console.warn(`  (skipping ${file} — not found)`);
      continue;
    }
    new vm.Script(source, { filename: file }).runInContext(context);
  }

  return {
    posts: sandbox.window.BLOG_POSTS ?? [],
    categories: sandbox.window.BLOG_CATEGORIES ?? [],
  };
}

// --- 2. Rewrite legacy links so they resolve from the blog subdomain --------
function rewriteLinks(html) {
  return String(html ?? '')
    .replace(/href="(programs|contact|about|gallery|index)\.html"/g, `href="${MAIN_SITE}/$1.html"`)
    .replace(/href="blog\.html"/g, 'href="/"')
    .replace(/href="blog-post\.html\?slug=([^"]+)"/g, 'href="/$1"')
    .trim();
}

function toTimestamp(post) {
  const date = post.publishedDate || post.date;
  if (!date) return null;
  const time = post.publishedTime ?? '09:00 AM';
  const parsed = new Date(`${date} ${time} GMT+0530`);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date(date);
    return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
  }
  return parsed.toISOString();
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** The same rules as lib/validate.ts, kept in plain JS so this runs standalone. */
function gate(post, faqs) {
  const errors = [];
  if (!post.excerpt) errors.push('missing excerpt');
  else if (post.excerpt.length > 155) errors.push(`excerpt ${post.excerpt.length} > 155 chars`);
  if (!post.answer_summary) errors.push('missing answer summary');
  if (!post.body_md) errors.push('missing body');
  if (faqs.length < 3 || faqs.length > 5) errors.push(`${faqs.length} FAQs (need 3-5)`);
  if (post.featured_image_url && !post.featured_image_alt) errors.push('featured image has no alt text');
  return errors;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (write && (!url || !key)) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to write.');
    process.exit(1);
  }

  console.log(`Reading the legacy blog library from ${LEGACY_DIR}`);
  const { posts: legacyPosts, categories: legacyCategories } = loadLegacyPosts();
  console.log(`Found ${legacyPosts.length} posts across ${legacyCategories.length} categories.\n`);
  if (legacyPosts.length === 0) return;

  const db = write ? createClient(url, key, { auth: { persistSession: false } }) : null;

  // --- Author -------------------------------------------------------------
  let authorId = null;
  if (db) {
    const { data } = await db.from('authors').select('id').eq('slug', 'kishore-kumar').maybeSingle();
    authorId = data?.id ?? null;
    if (!authorId) {
      console.error('No author with slug "kishore-kumar". Run supabase/migrations/0002_seed.sql first.');
      process.exit(1);
    }
  }

  // --- Categories ---------------------------------------------------------
  const categoryNames = [...new Set(legacyPosts.map((p) => p.category).filter(Boolean))];
  const categoryIdByName = new Map();

  if (db) {
    for (const [index, name] of categoryNames.entries()) {
      const slug = slugify(name);
      const { data, error } = await db
        .from('categories')
        .upsert({ name, slug, sort_order: 100 + index }, { onConflict: 'slug' })
        .select('id')
        .single();
      if (error) throw new Error(`category "${name}": ${error.message}`);
      categoryIdByName.set(name, data.id);
    }
    console.log(`Categories ready: ${categoryNames.length}\n`);
  }

  // --- Posts --------------------------------------------------------------
  const blocked = [];
  let imported = 0;
  let published = 0;

  for (const legacy of legacyPosts) {
    const faqs = (legacy.faqs ?? [])
      .filter((f) => f?.question && f?.answer)
      .slice(0, 5)
      .map((f, i) => ({ question: f.question, answer: f.answer, sort_order: i }));

    const record = {
      title: legacy.title,
      slug: legacy.slug,
      excerpt: (legacy.excerpt ?? '').trim(),
      answer_summary: (legacy.quickAnswer ?? legacy.answerSummary ?? '').trim(),
      body_md: rewriteLinks(legacy.content),
      author_id: authorId,
      category_id: categoryIdByName.get(legacy.category) ?? null,
      featured_image_url: null, // legacy images are relative paths on the old host
      featured_image_alt: legacy.featuredImage?.alt ?? null,
      seo_title: legacy.seoTitle ?? null,
      seo_keywords: legacy.seoKeywords ?? [],
      published_at: toTimestamp(legacy),
      status: 'draft',
    };

    const errors = gate(record, faqs);
    if (errors.length) blocked.push({ slug: record.slug, errors });

    if (publish && errors.length === 0) {
      record.status = 'published';
      published += 1;
    }

    if (!db) {
      imported += 1;
      continue;
    }

    const { data, error } = await db
      .from('posts')
      .upsert(record, { onConflict: 'slug' })
      .select('id')
      .single();
    if (error) {
      blocked.push({ slug: record.slug, errors: [`write failed: ${error.message}`] });
      continue;
    }

    await db.from('post_faqs').delete().eq('post_id', data.id);
    if (faqs.length) {
      await db.from('post_faqs').insert(faqs.map((f) => ({ ...f, post_id: data.id })));
    }
    imported += 1;
  }

  // --- Report -------------------------------------------------------------
  console.log(write ? '--- imported ---' : '--- dry run (nothing written) ---');
  console.log(`Posts processed:  ${imported}`);
  console.log(`Published:        ${publish ? published : 0}`);
  console.log(`Failing the gate: ${blocked.length}`);

  if (blocked.length) {
    console.log('\nThese stay as drafts until fixed:');
    for (const item of blocked.slice(0, 40)) {
      console.log(`  ${item.slug}: ${item.errors.join('; ')}`);
    }
    if (blocked.length > 40) console.log(`  … and ${blocked.length - 40} more`);
  }

  console.log(
    '\nNext: run `npx tsx scripts/generate-images.ts` to give the imported posts',
    'brand images, then review them in /admin.',
  );
  if (!write) console.log('Re-run with --write to actually import.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
