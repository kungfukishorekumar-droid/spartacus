import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Two clients, on purpose:
 *
 *   readClient()  — anon key. Row Level Security limits it to PUBLISHED content.
 *                   Safe for every public page.
 *   adminClient() — service role key. Server-only, used by /admin and the
 *                   publish pipeline. Never import this into a client component.
 *
 * Both return null when the environment is not configured, so `next build`
 * succeeds on a machine that has no database (CI, a fresh clone). Pages treat a
 * null client as "no content yet" rather than crashing.
 */

/**
 * Read the project URL at RUNTIME.
 *
 * Deliberately NOT a NEXT_PUBLIC_ name: Next inlines every `NEXT_PUBLIC_*`
 * reference at build time — in the server bundle too — so a host that builds
 * without the variable set would bake in `undefined` and silently ignore the
 * runtime value forever. Nothing client-side touches Supabase, so the plain
 * name is both safer and simpler. The NEXT_PUBLIC_ fallbacks stay for anyone
 * who already set them.
 */
function supabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

let cachedRead: SupabaseClient | null = null;
let cachedAdmin: SupabaseClient | null = null;
let warnedRead = false;
let warnedAdmin = false;

export function readClient(): SupabaseClient | null {
  if (cachedRead) return cachedRead;
  const url = supabaseUrl();
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (!warnedRead) {
      warnedRead = true;
      console.warn('[supabase] SUPABASE_URL / SUPABASE_ANON_KEY missing — serving empty content.');
    }
    return null;
  }
  cachedRead = createClient(url, key, { auth: { persistSession: false } });
  return cachedRead;
}

export function adminClient(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (!warnedAdmin) {
      warnedAdmin = true;
      console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY missing — admin writes are disabled.');
    }
    return null;
  }
  cachedAdmin = createClient(url, key, { auth: { persistSession: false } });
  return cachedAdmin;
}

export function requireAdminClient(): SupabaseClient {
  const client = adminClient();
  if (!client) {
    throw new Error(
      'Supabase admin client is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return client;
}
