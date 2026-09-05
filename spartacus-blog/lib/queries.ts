import { readClient } from './supabase';
import type { Author, Category, FullPost, Post, PostFaq, PostImage, Tag } from './types';

const POST_COLUMNS = '*';
const FULL_POST_COLUMNS = `
  *,
  author:authors(*),
  category:categories(*),
  faqs:post_faqs(*),
  images:post_images(*),
  post_tags(tag:tags(*))
`;

type RawFullPost = Post & {
  author: Author | null;
  category: Category | null;
  faqs: PostFaq[] | null;
  images: PostImage[] | null;
  post_tags: { tag: Tag | null }[] | null;
};

function shape(raw: RawFullPost): FullPost {
  return {
    ...raw,
    faqs: (raw.faqs ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    images: (raw.images ?? []).slice().sort((a, b) => a.position - b.position),
    tags: (raw.post_tags ?? []).map((row) => row.tag).filter((t): t is Tag => Boolean(t)),
  };
}

/** One published post by slug, with author, category, FAQs, images and tags. */
export async function getPostBySlug(slug: string): Promise<FullPost | null> {
  const db = readClient();
  if (!db) return null;
  const { data, error } = await db
    .from('posts')
    .select(FULL_POST_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) {
    console.error('[queries] getPostBySlug', slug, error.message);
    return null;
  }
  return data ? shape(data as unknown as RawFullPost) : null;
}

/** Published posts, newest first. */
export async function getPublishedPosts(limit = 20, offset = 0): Promise<Post[]> {
  const db = readClient();
  if (!db) return [];
  const { data, error } = await db
    .from('posts')
    .select(POST_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);
  if (error) {
    console.error('[queries] getPublishedPosts', error.message);
    return [];
  }
  return (data ?? []) as Post[];
}

/** Every published slug + timestamps — used by sitemap.xml and llms.txt. */
export async function getAllPublishedPostRefs(): Promise<
  Pick<Post, 'slug' | 'title' | 'excerpt' | 'published_at' | 'updated_at' | 'category_id'>[]
> {
  const db = readClient();
  if (!db) return [];
  const { data, error } = await db
    .from('posts')
    .select('slug, title, excerpt, published_at, updated_at, category_id')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false });
  if (error) {
    console.error('[queries] getAllPublishedPostRefs', error.message);
    return [];
  }
  return (data ?? []) as Pick<
    Post,
    'slug' | 'title' | 'excerpt' | 'published_at' | 'updated_at' | 'category_id'
  >[];
}

export async function getCategories(): Promise<Category[]> {
  const db = readClient();
  if (!db) return [];
  const { data, error } = await db
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) {
    console.error('[queries] getCategories', error.message);
    return [];
  }
  return (data ?? []) as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = readClient();
  if (!db) return null;
  const { data, error } = await db.from('categories').select('*').eq('slug', slug).maybeSingle();
  if (error) {
    console.error('[queries] getCategoryBySlug', slug, error.message);
    return null;
  }
  return (data as Category) ?? null;
}

export async function getPostsByCategory(categoryId: string, limit = 50): Promise<Post[]> {
  const db = readClient();
  if (!db) return [];
  const { data, error } = await db
    .from('posts')
    .select(POST_COLUMNS)
    .eq('status', 'published')
    .eq('category_id', categoryId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    console.error('[queries] getPostsByCategory', error.message);
    return [];
  }
  return (data ?? []) as Post[];
}

/** Up to `limit` other published posts in the same category. */
export async function getRelatedPosts(
  categoryId: string | null,
  excludePostId: string,
  limit = 3,
): Promise<Post[]> {
  if (!categoryId) return [];
  const posts = await getPostsByCategory(categoryId, limit + 1);
  return posts.filter((p) => p.id !== excludePostId).slice(0, limit);
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  const db = readClient();
  if (!db) return null;
  const { data, error } = await db.from('authors').select('*').eq('slug', slug).maybeSingle();
  if (error) {
    console.error('[queries] getAuthorBySlug', slug, error.message);
    return null;
  }
  return (data as Author) ?? null;
}

/** Legacy URL support: /old-path → /new-path, driven by the `redirects` table. */
export async function getRedirect(fromPath: string): Promise<string | null> {
  const db = readClient();
  if (!db) return null;
  const { data, error } = await db
    .from('redirects')
    .select('to_path')
    .eq('from_path', fromPath)
    .maybeSingle();
  if (error) {
    console.error('[queries] getRedirect', fromPath, error.message);
    return null;
  }
  return (data as { to_path: string } | null)?.to_path ?? null;
}
