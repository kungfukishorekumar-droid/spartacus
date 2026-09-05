import type { MetadataRoute } from 'next';
import { getAllPublishedPostRefs, getCategories } from '@/lib/queries';
import { absoluteUrl, site } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([getAllPublishedPostRefs(), getCategories()]);

  const newestPost = posts[0]?.updated_at ?? new Date().toISOString();

  return [
    {
      url: site.url,
      lastModified: new Date(newestPost),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: absoluteUrl(site.authorPagePath),
      lastModified: new Date(newestPost),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...categories.map((category) => ({
      url: absoluteUrl(`/category/${category.slug}`),
      lastModified: new Date(newestPost),
      changeFrequency: 'weekly' as const,
      priority: category.pillar ? 0.9 : 0.7,
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/${post.slug}`),
      lastModified: new Date(post.updated_at ?? post.published_at ?? Date.now()),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
