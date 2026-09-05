-- ============================================================
-- Spartacus Blog — schema
-- Run in Supabase → SQL Editor, or `supabase db push`.
-- Idempotent: safe to re-run.
-- ============================================================

create extension if not exists "pgcrypto";

-- 1. AUTHORS ---------------------------------------------------------------
create table if not exists public.authors (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text unique not null,
  bio          text,
  credentials  text[],            -- {'Sports Psychologist','Wushu National Medalist',...}
  avatar_url   text,
  job_title    text,
  same_as      text[],            -- social profile URLs → Person.sameAs in JSON-LD
  created_at   timestamptz not null default now()
);

-- 2. CATEGORIES ------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  description text,               -- pillar hub intro paragraph (ranks on its own)
  pillar      boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- 3. POSTS -----------------------------------------------------------------
create table if not exists public.posts (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  slug               text unique not null,
  excerpt            text not null,   -- meta description, <= 155 chars
  answer_summary     text not null,   -- the 2-3 sentence direct-answer block (GEO/AEO)
  body_md            text not null,   -- markdown content
  author_id          uuid references public.authors(id) on delete set null,
  category_id        uuid references public.categories(id) on delete set null,
  featured_image_url text,
  featured_image_alt text,
  status             text not null default 'draft' check (status in ('draft', 'published')),
  published_at       timestamptz,
  updated_at         timestamptz not null default now(),
  seo_title          text,
  seo_keywords       text[],
  created_at         timestamptz not null default now()
);

create index if not exists posts_status_published_at_idx
  on public.posts (status, published_at desc);
create index if not exists posts_category_idx on public.posts (category_id);
create index if not exists posts_slug_idx     on public.posts (slug);

-- keep updated_at honest — it is a live freshness signal for AI answer engines
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_posts_touch on public.posts;
create trigger trg_posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

-- 4. TAGS ------------------------------------------------------------------
create table if not exists public.tags (
  id   uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null
);

create table if not exists public.post_tags (
  post_id uuid references public.posts(id) on delete cascade,
  tag_id  uuid references public.tags(id)  on delete cascade,
  primary key (post_id, tag_id)
);

-- 5. FAQS (feeds FAQPage JSON-LD — 3 to 5 per post, enforced at publish) ----
create table if not exists public.post_faqs (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.posts(id) on delete cascade,
  question   text not null,
  answer     text not null,
  sort_order int not null default 0
);
create index if not exists post_faqs_post_idx on public.post_faqs (post_id, sort_order);

-- 6. IMAGES ----------------------------------------------------------------
create table if not exists public.post_images (
  id       uuid primary key default gen_random_uuid(),
  post_id  uuid references public.posts(id) on delete cascade,
  url      text not null,
  alt_text text not null,          -- never empty: publish is rejected without it
  position int not null default 0,
  role     text not null default 'body' check (role in ('featured', 'body'))
);
create index if not exists post_images_post_idx on public.post_images (post_id, position);

-- 7. REDIRECTS -------------------------------------------------------------
create table if not exists public.redirects (
  id        uuid primary key default gen_random_uuid(),
  from_path text unique not null,
  to_path   text not null,
  created_at timestamptz not null default now()
);

-- 8. ROW LEVEL SECURITY ----------------------------------------------------
-- The browser only ever gets the anon key. It may read PUBLISHED content and
-- nothing else. Every write goes through the server with the service role key.
alter table public.authors     enable row level security;
alter table public.categories  enable row level security;
alter table public.posts       enable row level security;
alter table public.tags        enable row level security;
alter table public.post_tags   enable row level security;
alter table public.post_faqs   enable row level security;
alter table public.post_images enable row level security;
alter table public.redirects   enable row level security;

drop policy if exists "anon reads authors" on public.authors;
create policy "anon reads authors" on public.authors
  for select to anon, authenticated using (true);

drop policy if exists "anon reads categories" on public.categories;
create policy "anon reads categories" on public.categories
  for select to anon, authenticated using (true);

drop policy if exists "anon reads published posts" on public.posts;
create policy "anon reads published posts" on public.posts
  for select to anon, authenticated using (status = 'published');

drop policy if exists "anon reads tags" on public.tags;
create policy "anon reads tags" on public.tags
  for select to anon, authenticated using (true);

drop policy if exists "anon reads post_tags" on public.post_tags;
create policy "anon reads post_tags" on public.post_tags
  for select to anon, authenticated using (
    exists (select 1 from public.posts p
            where p.id = post_tags.post_id and p.status = 'published')
  );

drop policy if exists "anon reads faqs of published posts" on public.post_faqs;
create policy "anon reads faqs of published posts" on public.post_faqs
  for select to anon, authenticated using (
    exists (select 1 from public.posts p
            where p.id = post_faqs.post_id and p.status = 'published')
  );

drop policy if exists "anon reads images of published posts" on public.post_images;
create policy "anon reads images of published posts" on public.post_images
  for select to anon, authenticated using (
    exists (select 1 from public.posts p
            where p.id = post_images.post_id and p.status = 'published')
  );

drop policy if exists "anon reads redirects" on public.redirects;
create policy "anon reads redirects" on public.redirects
  for select to anon, authenticated using (true);
