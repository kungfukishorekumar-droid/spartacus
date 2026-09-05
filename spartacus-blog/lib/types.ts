export type PostStatus = 'draft' | 'published';

export interface Author {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  credentials: string[] | null;
  avatar_url: string | null;
  job_title: string | null;
  same_as: string[] | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  pillar: boolean;
  sort_order: number;
}

export interface PostFaq {
  id: string;
  post_id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export interface PostImage {
  id: string;
  post_id: string;
  url: string;
  alt_text: string;
  position: number;
  role: 'featured' | 'body';
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  answer_summary: string;
  body_md: string;
  author_id: string | null;
  category_id: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  status: PostStatus;
  published_at: string | null;
  updated_at: string;
  seo_title: string | null;
  seo_keywords: string[] | null;
  created_at: string;
}

/** A post joined with everything a page or a JSON-LD block needs. */
export interface FullPost extends Post {
  author: Author | null;
  category: Category | null;
  faqs: PostFaq[];
  images: PostImage[];
  tags: Tag[];
}
