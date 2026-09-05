import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import PostCard from '@/components/PostCard';
import { getAuthorBySlug, getCategories, getPublishedPosts } from '@/lib/queries';
import {
  breadcrumbSchema,
  graph,
  organizationSchema,
  personSchema,
  profilePageSchema,
} from '@/lib/schema';
import { absoluteUrl, site } from '@/lib/site';

export const revalidate = 3600;

const FALLBACK_CREDENTIALS = [
  'Sports Psychologist',
  'Wushu National Medalist',
  'Kung Fu Black Belt',
  'Wushu Coach',
  'State-level Wushu Judge',
];

export async function generateMetadata(): Promise<Metadata> {
  const author = await getAuthorBySlug(site.authorSlug);
  const name = author?.name ?? 'Kishore Kumar';
  const description =
    `${name} — sports psychologist, Wushu national medalist, Kung Fu black belt, coach and ` +
    `state-level judge in Chennai. The credentials behind every article on this blog.`;

  return {
    title: `${name} — Sports Psychologist & Wushu National Medalist, Chennai`,
    description: description.slice(0, 155),
    alternates: { canonical: absoluteUrl(site.authorPagePath) },
    openGraph: {
      type: 'profile',
      url: absoluteUrl(site.authorPagePath),
      title: `${name} — Sports Psychologist & Martial Arts Coach, Chennai`,
      description: description.slice(0, 200),
      siteName: site.blogName,
      locale: site.locale,
    },
  };
}

export default async function AboutKishorePage() {
  const [author, posts, categories] = await Promise.all([
    getAuthorBySlug(site.authorSlug),
    getPublishedPosts(6),
    getCategories(),
  ]);

  const name = author?.name ?? 'Kishore Kumar';
  const credentials = author?.credentials?.length ? author.credentials : FALLBACK_CREDENTIALS;
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd
        json={graph(
          personSchema(author),
          profilePageSchema(author),
          organizationSchema(),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: `About ${name}`, path: site.authorPagePath },
          ]),
        )}
      />

      <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-lg border border-gold/40 bg-char">
            {author?.avatar_url ? (
              <Image
                src={author.avatar_url}
                alt={`${name}, sports psychologist and Wushu national medalist, Chennai`}
                width={560}
                height={700}
                priority
                className="aspect-[4/5] w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 280px"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-gradient-to-br from-char to-ink">
                <span className="font-display text-5xl uppercase tracking-[0.2em] text-gold/40">
                  {name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          <ul className="mt-5 space-y-2">
            {credentials.map((credential) => (
              <li
                key={credential}
                className="flex items-start gap-2 rounded border border-steel bg-char/60 px-3 py-2 text-xs uppercase tracking-widest text-gold"
              >
                <span aria-hidden="true" className="mt-0.5 text-blood">
                  ▸
                </span>
                {credential}
              </li>
            ))}
          </ul>

          {author?.same_as?.length ? (
            <div className="mt-5">
              <p className="eyebrow">Elsewhere</p>
              <ul className="mt-2 space-y-1">
                {author.same_as.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      rel="me noopener"
                      target="_blank"
                      className="break-all text-xs text-ash transition hover:text-gold"
                    >
                      {url.replace(/^https?:\/\//, '')}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="eyebrow">The author behind every article</p>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-bone sm:text-4xl">
            {name}
          </h1>
          <p className="mt-2 font-display text-sm uppercase tracking-[0.2em] text-gold">
            {author?.job_title ?? 'Sports Psychologist & Martial Arts Coach · Chennai'}
          </p>

          <div className="article-body mt-8 max-w-prose text-base leading-8 text-bone/90">
            {author?.bio ? (
              author.bio.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)
            ) : (
              <>
                <p>
                  Kishore Kumar is a sports psychologist and martial arts coach based in Chennai. He
                  is a national medalist in Wushu, a Kung Fu black belt, a Wushu coach and a
                  state-level judge — four things that rarely sit in the same person, and the reason
                  this blog can talk about both the technique and the mind behind it.
                </p>
                <p>
                  He founded Spartacus Martial Arts Academy to teach what most academies skip: focus
                  under pressure, discipline that survives a bad week, and the mental routines that
                  decide competitions long before the first exchange.
                </p>
              </>
            )}

            <h2>What this blog is for</h2>
            <p>
              Every article here answers one real question people actually ask — about training, about
              competing, about what martial arts does for a child&apos;s focus — and answers it in the
              first paragraph, before any storytelling. No filler, no borrowed motivation.
            </p>

            <h2>Where to start</h2>
            <ul>
              {categories
                .filter((c) => c.pillar)
                .map((category) => (
                  <li key={category.id}>
                    <Link href={`/category/${category.slug}`}>{category.name}</Link>
                  </li>
                ))}
            </ul>

            <h2>Train with Kishore</h2>
            <p>
              Coaching runs online and in person from Chennai — competitive athletes, kids&apos;
              programs, and sports psychology sessions for performers under pressure.{' '}
              <a href={`${site.mainSiteUrl}/contact.html`} rel="noopener">
                Book a free trial class
              </a>{' '}
              or{' '}
              <a href={`${site.mainSiteUrl}/programs.html`} rel="noopener">
                see the full program list
              </a>
              .
            </p>
          </div>

          {posts.length > 0 && (
            <section className="mt-14">
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-bone">
                Recent articles
              </h2>
              <div className="mt-2 h-0.5 w-16 bg-blood" />
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    categoryName={post.category_id ? categoryById.get(post.category_id)?.name : null}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
