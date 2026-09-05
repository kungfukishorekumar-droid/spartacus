import PostEditor from '@/components/admin/PostEditor';
import { guardAdminPage } from '@/lib/admin-guard';
import { adminClient } from '@/lib/supabase';
import type { Author, Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NewPostPage() {
  await guardAdminPage();
  const db = adminClient();

  const [categoriesRes, authorsRes] = await Promise.all([
    db?.from('categories').select('*').order('sort_order') ?? Promise.resolve({ data: [] }),
    db?.from('authors').select('*').order('name') ?? Promise.resolve({ data: [] }),
  ]);

  return (
    <>
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-bone">New post</h1>
      <div className="mt-8">
        <PostEditor
          post={null}
          categories={(categoriesRes.data ?? []) as Category[]}
          authors={(authorsRes.data ?? []) as Author[]}
        />
      </div>
    </>
  );
}
