'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import ImagePromptHelper from '@/components/admin/ImagePromptHelper';
import { deletePostAction, savePostAction } from '@/app/admin/actions';
import { initialActionState } from '@/lib/action-state';
import {
  MAX_EXCERPT_LENGTH,
  MAX_FAQS,
  MAX_SEO_TITLE_LENGTH,
  MIN_FAQS,
  slugify,
} from '@/lib/validate';
import type { Author, Category, FullPost } from '@/lib/types';

interface FaqDraft {
  question: string;
  answer: string;
}

interface ImageDraft {
  url: string;
  alt_text: string;
  role: 'featured' | 'body';
}

const field =
  'mt-2 w-full rounded border border-steel bg-char px-3 py-2 text-sm text-bone outline-none focus:border-gold';

export default function PostEditor({
  post,
  categories,
  authors,
}: {
  post: FullPost | null;
  categories: Category[];
  authors: Author[];
}) {
  const [state, formAction, pending] = useActionState(savePostAction, initialActionState);

  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? '');
  const [faqs, setFaqs] = useState<FaqDraft[]>(
    post?.faqs.length
      ? post.faqs.map((f) => ({ question: f.question, answer: f.answer }))
      : [
          { question: '', answer: '' },
          { question: '', answer: '' },
          { question: '', answer: '' },
        ],
  );
  const [images, setImages] = useState<ImageDraft[]>(
    post?.images.map((i) => ({ url: i.url, alt_text: i.alt_text, role: i.role })) ?? [],
  );
  const [featuredAlt, setFeaturedAlt] = useState(post?.featured_image_alt ?? '');
  const [categoryId, setCategoryId] = useState(post?.category_id ?? '');
  const [keywordsRaw, setKeywordsRaw] = useState(post?.seo_keywords?.join(', ') ?? '');

  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? null;
  const keywords = keywordsRaw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const excerptLeft = MAX_EXCERPT_LENGTH - excerpt.length;
  const completeFaqs = useMemo(
    () => faqs.filter((f) => f.question.trim() && f.answer.trim()).length,
    [faqs],
  );

  function updateFaq(index: number, patch: Partial<FaqDraft>) {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function updateImage(index: number, patch: Partial<ImageDraft>) {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...patch } : img)));
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="id" value={post?.id ?? ''} />
      <input type="hidden" name="slug" value={effectiveSlug} />
      <input type="hidden" name="faqs_json" value={JSON.stringify(faqs)} />
      <input type="hidden" name="images_json" value={JSON.stringify(images)} />

      {/* --- Status banner ---------------------------------------------- */}
      {state.status !== 'idle' && (
        <div
          role="status"
          className={`rounded border p-4 text-sm ${
            state.status === 'success'
              ? 'border-gold/60 bg-gold/10 text-bone'
              : 'border-blood/60 bg-blood/10 text-bone'
          }`}
        >
          <p className="font-semibold">{state.message}</p>
          {state.errors?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
          {state.warnings?.length ? (
            <>
              <p className="mt-3 eyebrow">Warnings (not blocking)</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-ash">
                {state.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      )}

      {/* --- Core ---------------------------------------------------------- */}
      <section className="space-y-5">
        <div>
          <label htmlFor="title" className="eyebrow">
            Title <span className="text-blood">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
            placeholder="How do you stop freezing before a fight?"
          />
        </div>

        <div>
          <label htmlFor="slug-input" className="eyebrow">
            Slug
          </label>
          <input
            id="slug-input"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={field}
          />
          <p className="mt-1 text-xs text-ash/70">
            /{effectiveSlug || 'auto-generated-from-title'} — changing it on a live post breaks its
            links unless you add a redirect.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="category_id" className="eyebrow">
              Category <span className="text-blood">*</span>
            </label>
            <select
              id="category_id"
              name="category_id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={field}
            >
              <option value="">— choose a pillar —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.pillar ? ' (pillar)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="author_id" className="eyebrow">
              Author
            </label>
            <select
              id="author_id"
              name="author_id"
              defaultValue={post?.author_id ?? authors[0]?.id ?? ''}
              className={field}
            >
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="excerpt" className="eyebrow">
            Excerpt / meta description <span className="text-blood">*</span>
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            required
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className={field}
          />
          <p className={`mt-1 text-xs ${excerptLeft < 0 ? 'text-blood' : 'text-ash/70'}`}>
            {excerpt.length}/{MAX_EXCERPT_LENGTH} characters
            {excerptLeft < 0 ? ' — too long, publishing is blocked.' : ''}
          </p>
        </div>

        <div>
          <label htmlFor="answer_summary" className="eyebrow">
            Direct answer <span className="text-blood">*</span>
          </label>
          <textarea
            id="answer_summary"
            name="answer_summary"
            required
            rows={3}
            defaultValue={post?.answer_summary ?? ''}
            className={field}
            placeholder="Two to three plain sentences answering the headline question, before any story."
          />
          <p className="mt-1 text-xs text-ash/70">
            This is the paragraph ChatGPT, Gemini and Perplexity quote. Answer the question directly —
            no build-up.
          </p>
        </div>

        <div>
          <label htmlFor="body_md" className="eyebrow">
            Body (markdown) <span className="text-blood">*</span>
          </label>
          <textarea
            id="body_md"
            name="body_md"
            required
            rows={22}
            defaultValue={post?.body_md ?? ''}
            className={`${field} font-mono text-xs leading-relaxed`}
            placeholder={'## Why this happens\n\nLink to the pillar page and at least two sibling posts...'}
          />
          <p className="mt-1 text-xs text-ash/70">
            Link to the pillar page (/category/…) and at least 2 other posts in the same category.
          </p>
        </div>
      </section>

      {/* --- FAQs ---------------------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-bone">
            FAQs
          </h2>
          <p className={`text-xs ${completeFaqs < MIN_FAQS || completeFaqs > MAX_FAQS ? 'text-blood' : 'text-ash/70'}`}>
            {completeFaqs} complete — {MIN_FAQS} to {MAX_FAQS} required to publish
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="rounded border border-steel bg-char/50 p-4">
              <div className="flex items-center justify-between">
                <span className="eyebrow">FAQ {index + 1}</span>
                <button
                  type="button"
                  onClick={() => setFaqs((prev) => prev.filter((_, i) => i !== index))}
                  className="text-xs uppercase tracking-widest text-ash hover:text-blood"
                >
                  Remove
                </button>
              </div>
              <input
                value={faq.question}
                onChange={(e) => updateFaq(index, { question: e.target.value })}
                placeholder="Question — phrased the way people type it"
                className={field}
              />
              <textarea
                value={faq.answer}
                onChange={(e) => updateFaq(index, { answer: e.target.value })}
                rows={3}
                placeholder="Answer — two or three sentences, complete on its own"
                className={field}
              />
            </div>
          ))}
        </div>

        {faqs.length < MAX_FAQS && (
          <button
            type="button"
            onClick={() => setFaqs((prev) => [...prev, { question: '', answer: '' }])}
            className="btn-ghost mt-4 !px-4 !py-2 !text-xs"
          >
            Add FAQ
          </button>
        )}
      </section>

      {/* --- Images -------------------------------------------------------- */}
      <section>
        <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-bone">
          Images
        </h2>
        <p className="mt-1 text-xs text-ash/70">
          Make the images in whichever generator you use, then paste the URLs here. Alt text is
          mandatory on every image — publishing is blocked without it.
        </p>

        <ImagePromptHelper
          title={title}
          categoryName={categoryName}
          keywords={keywords}
          onUseAltText={({ role, altText }) => {
            if (role === 'featured') {
              setFeaturedAlt(altText);
            } else {
              setImages((prev) => [...prev, { url: '', alt_text: altText, role: 'body' }]);
            }
          }}
        />

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="featured_image_url" className="eyebrow">
              Featured image URL
            </label>
            <input
              id="featured_image_url"
              name="featured_image_url"
              defaultValue={post?.featured_image_url ?? ''}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="featured_image_alt" className="eyebrow">
              Featured image alt text
            </label>
            <input
              id="featured_image_alt"
              name="featured_image_alt"
              value={featuredAlt}
              onChange={(e) => setFeaturedAlt(e.target.value)}
              className={field}
            />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {images.map((image, index) => (
            <div key={index} className="rounded border border-steel bg-char/50 p-4">
              <div className="flex items-center justify-between">
                <span className="eyebrow">
                  Image {index + 1} ({image.role})
                </span>
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                  className="text-xs uppercase tracking-widest text-ash hover:text-blood"
                >
                  Remove
                </button>
              </div>
              <input
                value={image.url}
                onChange={(e) => updateImage(index, { url: e.target.value })}
                placeholder="https://…"
                className={field}
              />
              <input
                value={image.alt_text}
                onChange={(e) => updateImage(index, { alt_text: e.target.value })}
                placeholder="Alt text — describe the image and include the topic"
                className={field}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setImages((prev) => [...prev, { url: '', alt_text: '', role: 'body' }])}
          className="btn-ghost mt-4 !px-4 !py-2 !text-xs"
        >
          Add image
        </button>
      </section>

      {/* --- SEO ----------------------------------------------------------- */}
      <section className="space-y-5">
        <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-bone">SEO</h2>
        <div>
          <label htmlFor="seo_title" className="eyebrow">
            SEO title
          </label>
          <input
            id="seo_title"
            name="seo_title"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="Defaults to the post title"
            className={field}
          />
          <p className="mt-1 text-xs text-ash/70">
            {seoTitle.length}/{MAX_SEO_TITLE_LENGTH} characters before Google truncates
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="seo_keywords" className="eyebrow">
              SEO keywords (comma separated)
            </label>
            <input
              id="seo_keywords"
              name="seo_keywords"
              value={keywordsRaw}
              onChange={(e) => setKeywordsRaw(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="tags" className="eyebrow">
              Tags (comma separated)
            </label>
            <input
              id="tags"
              name="tags"
              defaultValue={post?.tags.map((t) => t.name).join(', ') ?? ''}
              className={field}
            />
          </div>
        </div>
      </section>

      {/* --- Actions ------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3 border-t border-steel pt-6">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="btn-ghost disabled:opacity-60"
        >
          {pending ? 'Working…' : 'Save draft'}
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
          {post?.status === 'published' ? 'Update live post' : 'Publish'}
        </button>
        {post?.status === 'published' && (
          <button
            type="submit"
            name="intent"
            value="unpublish"
            disabled={pending}
            className="text-xs uppercase tracking-widest text-ash hover:text-blood"
          >
            Unpublish
          </button>
        )}
        {post && (
          <Link href={`/${post.slug}`} target="_blank" className="text-xs uppercase tracking-widest text-gold hover:underline">
            Preview
          </Link>
        )}
      </div>

      {post && (
        <div className="border-t border-steel pt-6">
          <DeleteButton id={post.id} />
        </div>
      )}
    </form>
  );
}

/** type="button" + an explicit confirm, so a stray Enter can never delete a post. */
function DeleteButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      onClick={async (event) => {
        event.preventDefault();
        if (!window.confirm('Delete this post permanently? This cannot be undone.')) return;
        const data = new FormData();
        data.set('id', id);
        await deletePostAction(data);
      }}
      className="text-xs uppercase tracking-widest text-blood hover:underline"
    >
      Delete this post
    </button>
  );
}
