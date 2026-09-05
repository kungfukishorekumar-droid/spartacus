import blog from '@/content/blog.json';
import type { Author, Category, FullPost, Post, PostFaq, PostImage, Tag } from './types';

/**
 * File-backed content source.
 *
 * The blog's 115 posts live in content/blog.json, generated from the main
 * site's existing library by `npm run build:content`. This is the source the
 * site uses when Supabase is not configured — which means the blog builds,
 * deploys and serves every post with no database and no credentials at all.
 *
 * Supabase, when configured, takes precedence (see lib/queries.ts): the admin
 * UI then becomes the way to write, and this file stays as the fallback.
 */

interface RawPost extends Post {
  faqs: PostFaq[];
  images: PostImage[];
  tags: Tag[];
}

const authors = blog.authors as unknown as Author[];
const categories = (blog.categories as unknown as Category[])
  .slice()
  .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

const allPosts = (blog.posts as unknown as RawPost[]).filter((p) => p.status === 'published');

const byId = new Map(categories.map((c) => [c.id, c]));
const authorById = new Map(authors.map((a) => [a.id, a]));

/** Newest first — the order every listing uses. */
const sorted = allPosts
  .slice()
  .sort((a, b) => String(b.published_at ?? '').localeCompare(String(a.published_at ?? '')));

function strip(post: RawPost): Post {
  const { faqs: _f, images: _i, tags: _t, ...rest } = post;
  return rest;
}

export const fileContent = {
  available: sorted.length > 0,

  posts(limit = 20, offset = 0): Post[] {
    return sorted.slice(offset, offset + limit).map(strip);
  },

  allPostRefs() {
    return sorted.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      published_at: p.published_at,
      updated_at: p.updated_at,
      category_id: p.category_id,
    }));
  },

  postBySlug(slug: string): FullPost | null {
    const post = sorted.find((p) => p.slug === slug);
    if (!post) return null;
    return {
      ...strip(post),
      author: post.author_id ? (authorById.get(post.author_id) ?? null) : null,
      category: post.category_id ? (byId.get(post.category_id) ?? null) : null,
      faqs: post.faqs.slice().sort((a, b) => a.sort_order - b.sort_order),
      images: post.images.slice().sort((a, b) => a.position - b.position),
      tags: post.tags,
    };
  },

  categories(): Category[] {
    return categories;
  },

  categoryBySlug(slug: string): Category | null {
    return categories.find((c) => c.slug === slug) ?? null;
  },

  postsByCategory(categoryId: string, limit = 50): Post[] {
    return sorted.filter((p) => p.category_id === categoryId).slice(0, limit).map(strip);
  },

  authorBySlug(slug: string): Author | null {
    return authors.find((a) => a.slug === slug) ?? null;
  },
};
