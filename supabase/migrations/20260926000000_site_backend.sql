-- ============================================================
-- SPARTACUS WEBSITE — the database objects the site's code actually uses
-- Project: oqwbmtdrjxfbnitlzehe
--
-- Run once: Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent). Touches NOTHING the CRM owns: public_leads
-- (where both websites' leads land) is managed by WarriorCRM and is not
-- created, altered or re-permissioned here.
--
-- What the site writes, and where:
--   contact + blog forms  → public_leads            (CRM-owned, already exists)
--   warriorcrm.js         → public_leads            (visits + backup leads)
--   track.js              → page_views, page_engagement   ← created below
--   submit-lead function  → lead_submissions (rate-limit ledger) ← below
--
-- Replaces supabase-analytics.sql + STEP 1 of supabase-antispam.sql.
-- Dropped on purpose: the old analytics_lead_sources view (it read a
-- "leads" table that does not exist, which made the old script fail) —
-- lead attribution is visible in the CRM, which owns the lead data.
-- ============================================================

-- 1. PAGE VIEWS (one row per page view, written by track.js) ----------------
-- No IP addresses, names or emails. visitor_id is a random id the browser
-- generates for itself — not a person.
create table if not exists public.page_views (
  id             uuid primary key,
  created_at     timestamptz not null default now(),
  visitor_id     text not null,
  session_id     text not null,
  is_new_visitor boolean default false,
  site           text,          -- 'blog' | 'main'
  path           text not null,
  page_type      text,          -- 'blog_post' | 'blog_listing' | 'page'
  slug           text,
  title          text,
  referrer       text,
  referrer_host  text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_term       text,
  utm_content    text,
  device         text,          -- 'mobile' | 'tablet' | 'desktop'
  browser        text,
  os             text,
  screen_w       integer,
  viewport_w     integer,
  language       text,
  timezone       text
);
create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_slug_idx       on public.page_views (slug);
create index if not exists page_views_visitor_idx    on public.page_views (visitor_id);
create index if not exists page_views_session_idx    on public.page_views (session_id);
create index if not exists page_views_site_idx       on public.page_views (site);
create index if not exists page_views_referrer_idx   on public.page_views (referrer_host);

-- 2. ENGAGEMENT (one row per view when the visitor leaves) -------------------
create table if not exists public.page_engagement (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  view_id      uuid not null,        -- matches page_views.id
  duration_ms  integer,              -- time actually on the page
  max_scroll   integer,              -- furthest scroll reached, 0–100 (%)
  clicks       integer default 0,    -- CTA / WhatsApp / link clicks
  reached_cta  boolean default false -- did they scroll to the lead form?
);
create index if not exists page_engagement_view_idx    on public.page_engagement (view_id);
create index if not exists page_engagement_created_idx on public.page_engagement (created_at desc);

-- 3. ROW LEVEL SECURITY -------------------------------------------------------
-- The website's public key may INSERT only; it can never read traffic data.
alter table public.page_views      enable row level security;
alter table public.page_engagement enable row level security;

drop policy if exists "anon can record page views" on public.page_views;
create policy "anon can record page views"
  on public.page_views for insert to anon with check (true);

drop policy if exists "anon can record engagement" on public.page_engagement;
create policy "anon can record engagement"
  on public.page_engagement for insert to anon with check (true);

drop policy if exists "authenticated can read page views" on public.page_views;
create policy "authenticated can read page views"
  on public.page_views for select to authenticated using (true);

drop policy if exists "authenticated can read engagement" on public.page_engagement;
create policy "authenticated can read engagement"
  on public.page_engagement for select to authenticated using (true);

-- 4. REPORTING VIEWS (Table Editor → Views) ----------------------------------
-- security_invoker: a view obeys the RLS of whoever queries it, so the
-- public key cannot read traffic through a view either.
create or replace view public.analytics_daily with (security_invoker = true) as
select date_trunc('day', created_at)::date    as day,
       coalesce(site, 'main')                 as site,
       count(*)                               as page_views,
       count(distinct visitor_id)             as visitors,
       count(distinct session_id)             as sessions,
       count(*) filter (where is_new_visitor) as new_visitors
from public.page_views
group by 1, 2
order by 1 desc, 2;

-- which of the articles actually works (last 30 days)
create or replace view public.analytics_top_pages with (security_invoker = true) as
select v.path,
       v.slug,
       coalesce(max(v.title), v.path)        as title,
       count(*)                              as page_views,
       count(distinct v.visitor_id)          as visitors,
       round(avg(e.duration_ms) / 1000.0, 1) as avg_seconds,
       round(avg(e.max_scroll), 0)           as avg_scroll_pct,
       count(*) filter (where e.reached_cta) as reached_lead_form
from public.page_views v
left join public.page_engagement e on e.view_id = v.id
where v.created_at > now() - interval '30 days'
group by v.path, v.slug
order by page_views desc;

create or replace view public.analytics_referrers with (security_invoker = true) as
select coalesce(nullif(referrer_host, ''), '(direct)') as referrer_host,
       count(*)                   as page_views,
       count(distinct visitor_id) as visitors,
       min(created_at)            as first_seen,
       max(created_at)            as last_seen
from public.page_views
group by 1
order by page_views desc;

create or replace view public.analytics_sources with (security_invoker = true) as
select coalesce(nullif(utm_source, ''),   '(none)') as utm_source,
       coalesce(nullif(utm_medium, ''),   '(none)') as utm_medium,
       coalesce(nullif(utm_campaign, ''), '(none)') as utm_campaign,
       count(*)                   as page_views,
       count(distinct visitor_id) as visitors,
       count(distinct session_id) as sessions
from public.page_views
group by 1, 2, 3
order by page_views desc;

-- the old version of this view read a non-existent "leads" table
drop view if exists public.analytics_lead_sources;

revoke all on public.analytics_daily     from anon;
revoke all on public.analytics_top_pages from anon;
revoke all on public.analytics_referrers from anon;
revoke all on public.analytics_sources   from anon;
grant select on public.analytics_daily     to authenticated;
grant select on public.analytics_top_pages to authenticated;
grant select on public.analytics_referrers to authenticated;
grant select on public.analytics_sources   to authenticated;

-- 5. RATE-LIMIT LEDGER for the submit-lead Edge Function ---------------------
-- Only a salted SHA-256 hash of the submitter's IP, never the raw IP.
-- RLS on with NO policies: only the function (service_role) can touch it.
create table if not exists public.lead_submissions (
  id         bigint generated always as identity primary key,
  ip_hash    text        not null,
  created_at timestamptz not null default now()
);
create index if not exists lead_submissions_ip_window_idx
  on public.lead_submissions (ip_hash, created_at desc);
alter table public.lead_submissions enable row level security;

-- 6. HOUSEKEEPING -------------------------------------------------------------
create or replace function public.prune_analytics(months integer default 12)
returns integer language plpgsql as $$
declare removed integer;
begin
  delete from public.page_engagement where created_at < now() - (months || ' months')::interval;
  delete from public.page_views      where created_at < now() - (months || ' months')::interval;
  get diagnostics removed = row_count;
  return removed;
end $$;

create or replace function public.prune_lead_submissions()
returns void language sql as $$
  delete from public.lead_submissions where created_at < now() - interval '1 day';
$$;

-- Functions in "public" are callable through the REST API by default.
-- These are for the owner only.
revoke execute on function public.prune_analytics(integer) from public, anon, authenticated;
revoke execute on function public.prune_lead_submissions()  from public, anon, authenticated;

-- Optional, if pg_cron is enabled:
-- select cron.schedule('prune-analytics','0 4 1 * *',$$select public.prune_analytics(12)$$);
-- select cron.schedule('prune-lead-submissions','0 3 * * *',$$select public.prune_lead_submissions()$$);

-- 7. REFRESH THE API ----------------------------------------------------------
-- Makes the new tables visible to the REST API immediately.
notify pgrst, 'reload schema';
