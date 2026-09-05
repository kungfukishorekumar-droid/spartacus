import Link from 'next/link';
import PostCard from '@/components/PostCard';
import { getCategories, getPublishedPosts } from '@/lib/queries';
import { site } from '@/lib/site';

export const revalidate = 300;

export default async function HomePage() {
  const [posts, categories] = await Promise.all([getPublishedPosts(12), getCategories()]);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const pillars = categories.filter((c) => c.pillar);
  const [lead, ...rest] = posts;

  return (
    <>
      <section className="border-b border-steel bg-gradient-to-b from-char to-ink">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="eyebrow">{site.tagline}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold uppercase leading-tight tracking-wide text-bone sm:text-5xl">
            Sports psychology and martial arts, from someone who has competed, coached and judged
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ash sm:text-lg">
            Written by Kishore Kumar — Wushu national medalist, sports psychologist, Kung Fu black belt
            and state-level judge in Chennai. Every article answers one real question, straight away,
            before the story starts.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={site.authorPagePath} className="btn-ghost">
              About Coach Kishore
            </Link>
            <a href={`${site.mainSiteUrl}/contact.html`} className="btn-primary" rel="noopener">
              Book a free trial class
            </a>
          </div>
        </div>
      </section>

      {pillars.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-bone">
            Start with a pillar
          </h2>
          <div className="mt-2 h-0.5 w-16 bg-blood" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group rounded-lg border border-steel bg-char/60 p-5 transition hover:border-gold/60"
              >
                <h3 className="font-display text-base font-semibold uppercase tracking-wide text-gold">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-ash">
                    {category.description}
                  </p>
                )}
                <span className="mt-4 inline-block text-xs uppercase tracking-widest text-ash/70 transition group-hover:text-gold">
                  Read the pillar →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-bone">
          Latest articles
        </h2>
        <div className="mt-2 h-0.5 w-16 bg-blood" />

        {posts.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-steel p-8 text-center text-sm text-ash">
            No posts published yet. Sign in at <code className="text-gold">/admin</code> to write the
            first one.
          </p>
        ) : (
          <>
            {lead && (
              <div className="mt-8">
                <PostCard
                  post={lead}
                  categoryName={lead.category_id ? categoryById.get(lead.category_id)?.name : null}
                  priority
                />
              </div>
            )}
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  categoryName={post.category_id ? categoryById.get(post.category_id)?.name : null}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
