import { notFound } from 'next/navigation';
import PostEditor from '@/components/admin/PostEditor';
import { guardAdminPage } from '@/lib/admin-guard';
import { adminClient } from '@/lib/supabase';
import type { Author, Category, FullPost, PostFaq, PostImage, Tag } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await guardAdminPage();
  const { id } = await params;
  const db = adminClient();
  if (!db) notFound();

  const [postRes, categoriesRes, authorsRes] = await Promise.all([
    db
      .from('posts')
      .select('*, faqs:post_faqs(*), images:post_images(*), post_tags(tag:tags(*))')
      .eq('id', id)
      .maybeSingle(),
    db.from('categories').select('*').order('sort_order'),
    db.from('authors').select('*').order('name'),
  ]);

  if (!postRes.data) notFound();

  const raw = postRes.data as unknown as FullPost & {
    faqs: PostFaq[] | null;
    images: PostImage[] | null;
    post_tags: { tag: Tag | null }[] | null;
  };

  const post: FullPost = {
    ...raw,
    author: null,
    category: null,
    faqs: (raw.faqs ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    images: (raw.images ?? []).slice().sort((a, b) => a.position - b.position),
    tags: (raw.post_tags ?? []).map((r) => r.tag).filter((t): t is Tag => Boolean(t)),
  };

  return (
    <>
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-bone">
        Edit post
      </h1>
      <p className="mt-1 text-xs uppercase tracking-widest text-ash">
        {post.status} · /{post.slug}
      </p>
      <div className="mt-8">
        <PostEditor
          post={post}
          categories={(categoriesRes.data ?? []) as Category[]}
          authors={(authorsRes.data ?? []) as Author[]}
        />
      </div>
    </>
  );
}
