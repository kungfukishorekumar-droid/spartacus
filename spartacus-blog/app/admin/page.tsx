import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { guardAdminPage } from '@/lib/admin-guard';
import { adminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface AdminPostRow {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  published_at: string | null;
  updated_at: string;
  category: { name: string } | null;
}

export default async function AdminHome() {
  await guardAdminPage();

  const db = adminClient();
  if (!db) {
    return (
      <p className="rounded border border-blood/60 bg-blood/10 p-4 text-sm text-bone">
        Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
        <code>SUPABASE_SERVICE_ROLE_KEY</code>, then reload.
      </p>
    );
  }

  const { data, error } = await db
    .from('posts')
    .select('id, title, slug, status, published_at, updated_at, category:categories(name)')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <p className="rounded border border-blood/60 bg-blood/10 p-4 text-sm text-bone">
        Could not load posts: {error.message}
      </p>
    );
  }

  const posts = (data ?? []) as unknown as AdminPostRow[];
  const drafts = posts.filter((p) => p.status === 'draft').length;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-bone">Posts</h1>
        <p className="text-xs uppercase tracking-widest text-ash">
          {posts.length} total · {drafts} draft{drafts === 1 ? '' : 's'}
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-steel p-8 text-center text-sm text-ash">
          No posts yet.{' '}
          <Link href="/admin/posts/new" className="text-gold hover:underline">
            Write the first one.
          </Link>
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-steel border-y border-steel">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center gap-3 py-3">
              <span
                className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                  post.status === 'published'
                    ? 'bg-gold/20 text-gold'
                    : 'bg-steel text-ash'
                }`}
              >
                {post.status}
              </span>
              <Link
                href={`/admin/posts/${post.id}`}
                className="min-w-0 flex-1 truncate text-sm text-bone hover:text-gold"
              >
                {post.title}
              </Link>
              <span className="hidden text-xs text-ash/70 sm:block">{post.category?.name ?? '—'}</span>
              <span className="text-xs text-ash/60">
                {formatDate(post.published_at ?? post.updated_at)}
              </span>
              {post.status === 'published' && (
                <Link
                  href={`/${post.slug}`}
                  target="_blank"
                  className="text-xs uppercase tracking-widest text-gold hover:underline"
                >
                  View
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
