-- ============================================================
-- SPARTACUS — Supabase backend (leads + payments)
-- Run this ONCE in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: everything is idempotent (IF NOT EXISTS / OR REPLACE).
--
-- What it does:
--   • creates the leads table the contact form writes into
--   • adds a lead-lifecycle status + campaign attribution (JSONB) + updated_at
--   • indexes the fields you actually query (created_at, email, phone, status)
--   • Row Level Security: the public anon key may INSERT a lead but can NEVER
--     read/update/delete anyone's data
--   • creates a locked-down payments table (ready for Razorpay), invisible to
--     the browser
-- ============================================================

-- 1. LEADS -----------------------------------------------------------------
create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
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
  website_source   text default 'spartacus',
  -- lead lifecycle so you can actually work the pipeline
  status           text not null default 'new'
                     check (status in ('new','contacted','trial_booked','converted','lost','spam')),
  -- flexible campaign attribution (the Supabase-native answer to nested docs)
  utm              jsonb
);

-- add the newer columns if the table already existed from the old version
alter table public.leads add column if not exists updated_at timestamptz not null default now();
alter table public.leads add column if not exists status text not null default 'new';
alter table public.leads add column if not exists utm jsonb;
do $$ begin
  alter table public.leads add constraint leads_status_chk
    check (status in ('new','contacted','trial_booked','converted','lost','spam'));
exception when duplicate_object then null; end $$;

-- indexes on frequently-queried fields
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_email_idx      on public.leads (lower(email));
create index if not exists leads_phone_idx       on public.leads (phone);
create index if not exists leads_status_idx      on public.leads (status);

-- keep updated_at fresh on any update
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_leads_touch on public.leads;
create trigger trg_leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

-- 2. LEADS — Row Level Security -------------------------------------------
-- Lock the table: nothing is allowed unless a policy permits it.
alter table public.leads enable row level security;

-- Allow the public "anon" role to INSERT only (submit the form).
-- There is deliberately NO select/update/delete policy for anon, so the
-- public key shipped in the website cannot read or change anyone's leads.
drop policy if exists "anon can submit leads" on public.leads;
create policy "anon can submit leads"
  on public.leads
  for insert
  to anon
  with check (true);

-- (Optional) let YOU read leads when signed in as an authenticated admin,
-- e.g. from a future admin panel. You already see everything in the
-- Supabase dashboard because you are the project owner.
drop policy if exists "authenticated can read leads" on public.leads;
create policy "authenticated can read leads"
  on public.leads
  for select
  to authenticated
  using (true);

-- 3. PAYMENTS (ready for Razorpay) ----------------------------------------
-- No anon policy at all → completely invisible to the browser. Writes must
-- happen server-side (Supabase Edge Function using the service_role key).
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  lead_id             uuid references public.leads(id) on delete set null,
  amount_paise        integer not null check (amount_paise > 0),
  currency            text not null default 'INR',
  program             text,
  razorpay_order_id   text unique,
  razorpay_payment_id text unique,
  status              text not null default 'created'
                       check (status in ('created','paid','failed','refunded'))
);
alter table public.payments enable row level security;   -- no policies = deny all to anon
create index if not exists payments_lead_id_idx on public.payments (lead_id);
create index if not exists payments_created_at_idx on public.payments (created_at desc);

-- ------------------------------------------------------------
-- You read leads from the Supabase dashboard:
--   Table Editor → leads   (you are logged in, so you see everything)
-- or Database → export to CSV.
--
-- IMPORTANT (anti-spam): the anon INSERT policy accepts anything, so a bot
-- could flood this table. The recommended hardening is to route the form
-- through a Supabase Edge Function that validates input + checks a
-- Cloudflare Turnstile token + rate-limits per IP, then revoke the anon
-- INSERT policy above. Ask and I'll scaffold that function.
-- ------------------------------------------------------------
