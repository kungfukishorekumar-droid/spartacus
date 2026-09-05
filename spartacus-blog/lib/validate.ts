import { extractInternalLinks } from './markdown';

/**
 * The publish gate.
 *
 * Every rule in the "non-negotiable" list from the build spec is enforced here,
 * in one place, so a post physically cannot go live half-optimised. `errors`
 * block the publish; `warnings` are shown in the admin but do not block.
 */

export const MAX_EXCERPT_LENGTH = 155;
export const MIN_FAQS = 3;
export const MAX_FAQS = 5;
export const MAX_SEO_TITLE_LENGTH = 60;
export const MIN_INTERNAL_POST_LINKS = 2;

export interface ValidationInput {
  title: string;
  slug: string;
  excerpt: string;
  answer_summary: string;
  body_md: string;
  category_slug: string | null;
  seo_title?: string | null;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  faqs: { question: string; answer: string }[];
  images: { url: string; alt_text: string }[];
  /** Slugs of other published posts in the same category — for the link check. */
  siblingSlugs?: string[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateForPublish(input: ValidationInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Identity -----------------------------------------------------------
  if (!input.title?.trim()) errors.push('Title is required.');
  if (!input.slug?.trim()) {
    errors.push('Slug is required.');
  } else if (!SLUG_RE.test(input.slug)) {
    errors.push('Slug must be lowercase words separated by single hyphens (e.g. "pre-fight-nerves").');
  }
  if (!input.category_slug) {
    errors.push('A category is required — every post has to belong to a pillar cluster.');
  }

  // --- Meta description ---------------------------------------------------
  const excerpt = input.excerpt?.trim() ?? '';
  if (!excerpt) {
    errors.push('Excerpt is required — it is the meta description.');
  } else if (excerpt.length > MAX_EXCERPT_LENGTH) {
    errors.push(
      `Excerpt is ${excerpt.length} characters; the meta description limit is ${MAX_EXCERPT_LENGTH}.`,
    );
  } else if (excerpt.length < 70) {
    warnings.push(`Excerpt is only ${excerpt.length} characters — 120-155 reads better in search results.`);
  }

  // --- The direct-answer block (GEO/AEO) ----------------------------------
  const answer = input.answer_summary?.trim() ?? '';
  if (!answer) {
    errors.push('Answer summary is required — it is the paragraph AI engines quote.');
  } else {
    const sentences = answer.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    const words = answer.split(/\s+/).filter(Boolean).length;
    if (words < 25) warnings.push('Answer summary is very short — aim for 2-3 full sentences (40-70 words).');
    if (sentences > 4) warnings.push('Answer summary runs longer than 3 sentences; engines quote tighter blocks.');
  }

  // --- Body ---------------------------------------------------------------
  if (!input.body_md?.trim()) {
    errors.push('Body content is required.');
  }

  // --- SEO title ----------------------------------------------------------
  if (input.seo_title && input.seo_title.length > MAX_SEO_TITLE_LENGTH) {
    warnings.push(
      `SEO title is ${input.seo_title.length} characters — Google truncates around ${MAX_SEO_TITLE_LENGTH}.`,
    );
  }

  // --- FAQs ---------------------------------------------------------------
  const faqs = (input.faqs ?? []).filter((f) => f.question?.trim() && f.answer?.trim());
  if (faqs.length < MIN_FAQS || faqs.length > MAX_FAQS) {
    errors.push(
      `Every post needs between ${MIN_FAQS} and ${MAX_FAQS} complete FAQ pairs (found ${faqs.length}).`,
    );
  }
  faqs.forEach((f, i) => {
    if (!f.question.trim().endsWith('?')) {
      warnings.push(`FAQ ${i + 1} is not phrased as a question — match how people type into ChatGPT.`);
    }
  });

  // --- Images -------------------------------------------------------------
  if (input.featured_image_url && !input.featured_image_alt?.trim()) {
    errors.push('The featured image has no alt text.');
  }
  (input.images ?? []).forEach((img, i) => {
    if (!img.url?.trim()) return;
    if (!img.alt_text?.trim()) {
      errors.push(`Image ${i + 1} has no alt text. Every image needs keyword-relevant alt text.`);
    } else if (img.alt_text.trim().length < 15) {
      warnings.push(`Image ${i + 1} alt text is very short — describe the image and include the topic.`);
    }
  });
  if (!input.featured_image_url) {
    warnings.push(
      'No featured image. Social shares and Google Discover fall back to the default image — ' +
        'use the prompts in the editor to make one.',
    );
  }

  // --- Internal linking (topic-cluster wiring) ----------------------------
  const links = extractInternalLinks(input.body_md ?? '');
  const pillarPath = input.category_slug ? `/category/${input.category_slug}` : null;
  if (pillarPath && !links.includes(pillarPath)) {
    warnings.push(`Body does not link to its pillar page (${pillarPath}). Add the link before publishing.`);
  }
  if (input.siblingSlugs?.length) {
    const siblingLinks = links.filter(
      (l) => l.startsWith('/') && input.siblingSlugs!.includes(l.slice(1)),
    );
    if (siblingLinks.length < MIN_INTERNAL_POST_LINKS) {
      warnings.push(
        `Body links to ${siblingLinks.length} other post(s) in this category; ${MIN_INTERNAL_POST_LINKS} is the target.`,
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** URL-safe slug from a title. */
export function slugify(input: string): string {
  return (input ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}
