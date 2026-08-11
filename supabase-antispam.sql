-- ============================================================
-- SPARTACUS — anti-spam gateway (run AFTER supabase-setup.sql)
--
-- Run STEP 1 now. Run STEP 2 only once the submit-lead Edge Function is
-- deployed AND you have submitted one real test lead through the live site.
-- Doing STEP 2 early would break the contact form.
-- ============================================================

-- ---------- STEP 1: rate-limit ledger -----------------------------------
-- Stores only a salted SHA-256 hash of the submitter's IP, never the raw IP.
create table if not exists public.lead_submissions (
  id         bigint generated always as identity primary key,
  ip_hash    text        not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_submissions_ip_window_idx
  on public.lead_submissions (ip_hash, created_at desc);

-- RLS on, and deliberately NO policies: anon/authenticated get nothing.
-- The Edge Function uses the service_role key, which bypasses RLS.
alter table public.lead_submissions enable row level security;

-- Housekeeping: drop ledger rows older than a day (run periodically, or
-- schedule with pg_cron if enabled).
create or replace function public.prune_lead_submissions()
returns void language sql as $$
  delete from public.lead_submissions where created_at < now() - interval '1 day';
$$;

-- Optional, if pg_cron is enabled on your project:
-- select cron.schedule('prune-lead-submissions','0 3 * * *',
--                      $$select public.prune_lead_submissions()$$);


-- ---------- STEP 2: close the open door ---------------------------------
-- ONLY run this after the Edge Function is deployed and verified working.
-- It removes the public INSERT permission, so the ONLY way a row can reach
-- the leads table is through the Edge Function (validated + rate-limited).
--
--   drop policy if exists "anon can submit leads" on public.leads;
--
-- To roll back instantly if anything goes wrong:
--
--   create policy "anon can submit leads" on public.leads
--     for insert to anon with check (true);
-- ------------------------------------------------------------------------
