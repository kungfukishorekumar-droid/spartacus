import LoginForm from '@/components/admin/LoginForm';
import { isAuthenticated } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await isAuthenticated()) redirect('/admin');
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-bone">Sign in</h1>
      <p className="mt-2 text-sm text-ash">Single-user admin for the Spartacus blog.</p>
      <LoginForm />
    </div>
  );
}
