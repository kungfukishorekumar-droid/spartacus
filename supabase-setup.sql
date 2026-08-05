-- ============================================================
-- SPARTACUS — Supabase leads backend
-- Run this ONCE in Supabase → SQL Editor → New query → Run.
-- It creates the leads table and a Row Level Security policy that lets
-- website visitors SUBMIT the form but NOT read anyone's leads.
-- ============================================================

-- 1. The table the contact form writes into
create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  full_name        text not null,
  phone            text not null,
  email            text,
  age              text,
  city             text,
  program_interest text,
  goal             text,
  role             text,
  preferred_time   text,
  message          text,
  source           text,
  website_source   text default 'spartacus'
);

-- 2. Lock the table down: nothing is allowed unless a policy permits it
alter table public.leads enable row level security;

-- 3. Allow the public "anon" role to INSERT only (submit the form).
--    There is deliberately NO select/update/delete policy for anon,
--    so the public key in the website cannot read or change leads.
drop policy if exists "anon can submit leads" on public.leads;
create policy "anon can submit leads"
  on public.leads
  for insert
  to anon
  with check (true);

-- ------------------------------------------------------------
-- You read your leads from the Supabase dashboard:
--   Table Editor → leads   (you are logged in, so you see everything)
-- or Database → export to CSV.
-- ------------------------------------------------------------
