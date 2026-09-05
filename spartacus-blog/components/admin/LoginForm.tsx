'use client';

import { useActionState } from 'react';
import { loginAction } from '@/app/admin/actions';
import { initialActionState } from '@/lib/action-state';

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialActionState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label htmlFor="password" className="eyebrow">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded border border-steel bg-char px-3 py-2 text-sm text-bone outline-none focus:border-gold"
        />
      </div>

      {state.status === 'error' && state.message && (
        <p role="alert" className="rounded border border-blood/60 bg-blood/10 px-3 py-2 text-sm text-bone">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {pending ? 'Checking…' : 'Sign in'}
      </button>
    </form>
  );
}
