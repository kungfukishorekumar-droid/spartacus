import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import PostCard from '@/components/PostCard';
import { getCategoryBySlug, getPostsByCategory, staticCategorySlugs } from '@/lib/queries';
import { breadcrumbSchema, collectionPageSchema, graph } from '@/lib/schema';
import { absoluteUrl, site } from '@/lib/site';

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
  return staticCategorySlugs();
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: 'Not found', robots: { index: false, follow: false } };

  const url = absoluteUrl(`/category/${category.slug}`);
  const description = (category.description ?? site.description).slice(0, 155);

  return {
    title: category.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: `${category.name} | ${site.blogName}`,
      description,
      siteName: site.blogName,
      locale: site.locale,
    },
    twitter: { card: 'summary_large_image', title: category.name, description },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const posts = await getPostsByCategory(category.id, 60);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd
        json={graph(
          collectionPageSchema(category, posts),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: category.name, path: `/category/${category.slug}` },
          ]),
        )}
      />

      <header className="max-w-3xl">
        {category.pillar && <p className="eyebrow">Pillar</p>}
        <h1 className="mt-3 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-bone sm:text-4xl">
          {category.name}
        </h1>
        {/* Written to rank for the pillar keyword on its own, not just to
            introduce the list below. */}
        {category.description && (
          <p className="mt-5 text-base leading-relaxed text-ash sm:text-lg">{category.description}</p>
        )}
        <p className="mt-4 text-xs uppercase tracking-widest text-ash/60">
          {posts.length} {posts.length === 1 ? 'article' : 'articles'}
        </p>
      </header>

      <div className="rule-gold mt-10" />

      {posts.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-steel p-8 text-center text-sm text-ash">
          No published articles in this pillar yet.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <PostCard key={post.id} post={post} categoryName={category.name} priority={index === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
