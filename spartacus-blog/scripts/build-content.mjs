#!/usr/bin/env node
/**
 * Build the blog's content file from the existing static-site library.
 *
 *   node scripts/build-content.mjs
 *
 * Reads ../data/blogData.js + ../data/blog100-part*.js (the 115-post library
 * that already powers the main site), applies the fixes in
 * scripts/content-overrides.json and the metadata in
 * scripts/content-categories.json, and writes content/blog.json.
 *
 * That file is the blog's content source when Supabase is not configured, so
 * the site builds, deploys and serves all 115 posts with no database and no
 * credentials. Commit the output — it is the content, not a build artifact.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const LEGACY_DIR = resolve(HERE, '../../data');
const OUT = resolve(HERE, '../content/blog.json');
const MAIN_SITE = 'https://spartacusmartialarts.com';

const MAX_EXCERPT = 155;

const overrides = JSON.parse(readFileSync(resolve(HERE, 'content-overrides.json'), 'utf8'));
const categoryMeta = JSON.parse(readFileSync(resolve(HERE, 'content-categories.json'), 'utf8'));

function loadLegacy() {
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
    const source = readFileSync(resolve(LEGACY_DIR, file), 'utf8');
    new vm.Script(source, { filename: file }).runInContext(context);
  }
  return sandbox.window.BLOG_POSTS ?? [];
}

/** Legacy links point at the main site's pages; make them absolute. */
function rewriteLinks(html) {
  return String(html ?? '')
    .replace(/href="(programs|contact|about|gallery|index)\.html"/g, `href="${MAIN_SITE}/$1.html"`)
    .replace(/href="blog\.html"/g, 'href="/"')
    .replace(/href="blog-post\.html\?slug=([^"]+)"/g, 'href="/$1"')
    .trim();
}

function absoluteImage(src) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return `${MAIN_SITE}/${String(src).replace(/^\/+/, '')}`;
}

function toTimestamp(post) {
  const date = post.publishedDate || post.date;
  if (!date) return null;
  const parsed = new Date(`${date} ${post.publishedTime ?? '09:00 AM'} GMT+0530`);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  const fallback = new Date(date);
  return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const legacyPosts = loadLegacy();
if (legacyPosts.length === 0) {
  console.error('No posts found — check that ../data/ still holds the blog library.');
  process.exit(1);
}

// --- Author ---------------------------------------------------------------
const author = {
  id: 'author-kishore-kumar',
  name: 'Kishore Kumar',
  slug: 'kishore-kumar',
  bio:
    'Kishore Kumar is a sports psychologist and martial arts coach based in Chennai. A national medalist in Wushu and a Kung Fu black belt, he coaches competitive athletes and judges at state level.\n\nHe founded Spartacus Martial Arts Academy to teach what most academies skip: the mind behind the technique — focus, discipline, and performance under pressure.',
  credentials: [
    'Sports Psychologist',
    'Wushu National Medalist',
    'Kung Fu Black Belt',
    'Wushu Coach',
    'State-level Wushu Judge',
  ],
  avatar_url: `${MAIN_SITE}/images/authors/kishore-kumar.webp`,
  job_title: 'Sports Psychologist & Martial Arts Coach',
  same_as: ['https://www.instagram.com/kishorekumar.coach/', MAIN_SITE],
};

// --- Categories -----------------------------------------------------------
const usedCategories = [...new Set(legacyPosts.map((p) => p.category).filter(Boolean))];
const categories = usedCategories
  .map((name) => {
    const meta = categoryMeta[name];
    if (!meta) {
      console.warn(`  ! no metadata for category "${name}" — add it to content-categories.json`);
    }
    return {
      id: `category-${meta?.slug ?? slugify(name)}`,
      name,
      slug: meta?.slug ?? slugify(name),
      description: meta?.description ?? null,
      pillar: Boolean(meta?.pillar),
      sort_order: meta?.sort_order ?? 99,
    };
  })
  .sort((a, b) => a.sort_order - b.sort_order);

const categoryIdByName = new Map(
  usedCategories.map((name) => [name, categories.find((c) => c.name === name).id]),
);

// --- Posts ----------------------------------------------------------------
const problems = [];
const posts = legacyPosts.map((legacy) => {
  const override = overrides[legacy.slug] ?? {};
  const excerpt = (override.excerpt ?? legacy.excerpt ?? '').trim();
  const answer = (override.answer_summary ?? legacy.quickAnswer ?? '').trim();
  const publishedAt = toTimestamp(legacy);

  const faqs = (legacy.faqs ?? [])
    .filter((f) => f?.question?.trim() && f?.answer?.trim())
    .slice(0, 5)
    .map((f, i) => ({
      id: `faq-${legacy.slug}-${i}`,
      post_id: `post-${legacy.slug}`,
      question: f.question.trim(),
      answer: f.answer.trim(),
      sort_order: i,
    }));

  const images = (legacy.inlineImages ?? [])
    .map((img, i) => ({
      id: `image-${legacy.slug}-${i}`,
      post_id: `post-${legacy.slug}`,
      url: absoluteImage(img?.src),
      alt_text: (img?.alt ?? '').trim(),
      position: i + 1,
      role: 'body',
    }))
    .filter((img) => img.url && img.alt_text);

  // Same rules the admin publish gate applies.
  const issues = [];
  if (!excerpt) issues.push('no excerpt');
  else if (excerpt.length > MAX_EXCERPT) issues.push(`excerpt ${excerpt.length} > ${MAX_EXCERPT}`);
  if (!answer) issues.push('no answer summary');
  if (faqs.length < 3 || faqs.length > 5) issues.push(`${faqs.length} FAQs`);
  if (!legacy.featuredImage?.src) issues.push('no featured image');
  if (issues.length) problems.push({ slug: legacy.slug, issues });

  return {
    id: `post-${legacy.slug}`,
    title: legacy.title,
    slug: legacy.slug,
    excerpt,
    answer_summary: answer,
    body_md: rewriteLinks(legacy.content),
    author_id: author.id,
    category_id: categoryIdByName.get(legacy.category) ?? null,
    featured_image_url: absoluteImage(legacy.featuredImage?.src),
    featured_image_alt:
      legacy.featuredImage?.alt ?? `${legacy.title} — Spartacus Martial Arts Academy, Chennai`,
    status: issues.length ? 'draft' : 'published',
    published_at: publishedAt,
    updated_at: publishedAt ?? new Date().toISOString(),
    seo_title: legacy.seoTitle ?? null,
    seo_keywords: legacy.seoKeywords ?? [],
    created_at: publishedAt ?? new Date().toISOString(),
    faqs,
    images,
    tags: (legacy.seoKeywords ?? []).slice(0, 4).map((name) => ({
      id: `tag-${slugify(name)}`,
      name,
      slug: slugify(name),
    })),
  };
});

posts.sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), authors: [author], categories, posts }, null, 2)}\n`,
);

const published = posts.filter((p) => p.status === 'published').length;
console.log(`content/blog.json written`);
console.log(`  posts:      ${posts.length} (${published} published, ${posts.length - published} draft)`);
console.log(`  categories: ${categories.length} (${categories.filter((c) => c.pillar).length} pillars)`);
console.log(`  images:     ${posts.filter((p) => p.featured_image_url).length} featured`);
console.log(`  FAQs:       ${posts.reduce((n, p) => n + p.faqs.length, 0)}`);

if (problems.length) {
  console.log(`\n${problems.length} post(s) held back as drafts:`);
  for (const p of problems) console.log(`  ${p.slug}: ${p.issues.join('; ')}`);
} else {
  console.log('\nEvery post passes the publish gate.');
}
