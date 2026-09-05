import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import AnswerBlock from '@/components/AnswerBlock';
import AuthorByline from '@/components/AuthorByline';
import CtaBlock from '@/components/CtaBlock';
import FaqSection from '@/components/FaqSection';
import JsonLd from '@/components/JsonLd';
import PostCard from '@/components/PostCard';
import { readingTimeMinutes, renderMarkdown } from '@/lib/markdown';
import { getPostBySlug, getRedirect, getRelatedPosts } from '@/lib/queries';
import {
  blogPostingSchema,
  breadcrumbSchema,
  faqPageSchema,
  graph,
  personSchema,
} from '@/lib/schema';
import { absoluteUrl, site } from '@/lib/site';

export const revalidate = 300;
export const dynamicParams = true;

// Nothing is prerendered at build time: posts come from Supabase and are
// cached on first request (ISR), so a build never needs database access.
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Not found', robots: { index: false, follow: false } };

  const url = absoluteUrl(`/${post.slug}`);
  const images = post.featured_image_url
    ? [{ url: post.featured_image_url, alt: post.featured_image_alt || post.title }]
    : [{ url: absoluteUrl(site.defaultOgImage), alt: post.title }];

  return {
    title: post.seo_title || post.title,
    description: post.excerpt,
    keywords: post.seo_keywords ?? undefined,
    alternates: { canonical: url },
    authors: [{ name: post.author?.name ?? 'Kishore Kumar', url: absoluteUrl(site.authorPagePath) }],
    openGraph: {
      type: 'article',
      url,
      title: post.seo_title || post.title,
      description: post.excerpt,
      siteName: site.blogName,
      locale: site.locale,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [absoluteUrl(site.authorPagePath)],
      section: post.category?.name,
      tags: post.tags.map((t) => t.name),
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seo_title || post.title,
      description: post.excerpt,
      images: images.map((i) => i.url),
      site: site.twitter,
      creator: site.twitter,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    // A slug that no longer exists may have moved — honour the redirects table
    // before giving up, so old links keep their ranking.
    const destination = await getRedirect(`/${slug}`);
    if (destination) permanentRedirect(destination);
    notFound();
  }

  const [html, related] = await Promise.all([
    renderMarkdown(post.body_md),
    getRelatedPosts(post.category_id, post.id, 3),
  ]);

  const bodyImages = post.images.filter((i) => i.role === 'body');
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    ...(post.category ? [{ name: post.category.name, path: `/category/${post.category.slug}` }] : []),
    { name: post.title, path: `/${post.slug}` },
  ];

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd
        json={graph(
          blogPostingSchema(post),
          faqPageSchema(post.faqs),
          breadcrumbSchema(breadcrumbs),
          personSchema(post.author),
        )}
      />

      <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-widest text-ash/70">
        <ol className="flex flex-wrap items-center gap-2">
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.path} className="flex items-center gap-2">
              {index < breadcrumbs.length - 1 ? (
                <>
                  <Link href={crumb.path} className="transition hover:text-gold">
                    {crumb.name}
                  </Link>
                  <span aria-hidden="true" className="text-steel">
                    /
                  </span>
                </>
              ) : (
                <span className="text-ash/50 line-clamp-1">{crumb.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <header>
            {post.category && (
              <Link href={`/category/${post.category.slug}`} className="eyebrow hover:underline">
                {post.category.name}
              </Link>
            )}
            <h1 className="mt-3 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-bone sm:text-4xl">
              {post.title}
            </h1>

            {/* The direct answer comes first, before the story. */}
            <AnswerBlock>{post.answer_summary}</AnswerBlock>

            <div className="mt-6">
              <AuthorByline
                author={post.author}
                publishedAt={post.published_at}
                updatedAt={post.updated_at}
                readingMinutes={readingTimeMinutes(post.body_md)}
              />
            </div>
          </header>

          {post.featured_image_url && (
            <figure className="mt-8">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-steel">
                <Image
                  src={post.featured_image_url}
                  alt={post.featured_image_alt || post.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 760px"
                  priority
                  className="object-cover"
                />
              </div>
            </figure>
          )}

          {/* Server-rendered markdown: the article body contains no
              client-only content, so crawlers get the full text. */}
          <div
            className="article-body mt-10 max-w-prose text-base leading-8 text-bone/90"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {bodyImages.length > 0 && (
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {bodyImages.map((image) => (
                <figure key={image.id}>
                  <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-steel">
                    <Image
                      src={image.url}
                      alt={image.alt_text}
                      fill
                      sizes="(max-width: 640px) 100vw, 380px"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="mt-2 text-xs text-ash/70">{image.alt_text}</figcaption>
                </figure>
              ))}
            </div>
          )}

          {post.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li
                  key={tag.id}
                  className="rounded border border-steel px-3 py-1 text-xs uppercase tracking-widest text-ash"
                >
                  {tag.name}
                </li>
              ))}
            </ul>
          )}

          <FaqSection faqs={post.faqs} />
          <CtaBlock />
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          {post.category && (
            <div className="rounded-lg border border-steel bg-char/60 p-5">
              <p className="eyebrow">Part of the pillar</p>
              <Link
                href={`/category/${post.category.slug}`}
                className="mt-2 block font-display text-lg font-semibold text-bone hover:text-gold"
              >
                {post.category.name}
              </Link>
              {post.category.description && (
                <p className="mt-3 line-clamp-6 text-sm leading-relaxed text-ash">
                  {post.category.description}
                </p>
              )}
            </div>
          )}
          <div className="mt-6 rounded-lg border border-gold/40 bg-char/60 p-5">
            <p className="eyebrow">Written by</p>
            <p className="mt-2 font-display text-lg text-bone">
              {post.author?.name ?? 'Kishore Kumar'}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ash">
              {(post.author?.credentials ?? []).join(' · ')}
            </p>
            <Link href={site.authorPagePath} className="mt-4 inline-block text-xs uppercase tracking-widest text-gold hover:underline">
              Full credentials →
            </Link>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-steel pt-10">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-bone">
            Keep reading in {post.category?.name ?? 'this pillar'}
          </h2>
          <div className="mt-2 h-0.5 w-16 bg-blood" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <PostCard key={item.id} post={item} categoryName={post.category?.name} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
