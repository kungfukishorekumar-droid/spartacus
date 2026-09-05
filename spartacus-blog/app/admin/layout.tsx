import type { Metadata } from 'next';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { logoutAction } from './actions';

// The admin is never cached and never indexed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isAuthenticated();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-steel pb-4">
        <Link href="/admin" className="font-display text-lg font-bold uppercase tracking-[0.18em] text-bone">
          Spartacus Admin
        </Link>
        {signedIn && (
          <div className="flex items-center gap-4">
            <Link href="/admin/posts/new" className="btn-ghost !px-4 !py-2 !text-xs">
              New post
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-xs uppercase tracking-widest text-ash hover:text-gold">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
