-- ============================================================
-- Spartacus Blog — seed: the author authority record + pillar categories.
-- Run AFTER 0001_init.sql. Idempotent (on conflict do update).
-- Edit the bio / sameAs links to match your live profiles before running.
-- ============================================================

insert into public.authors (name, slug, bio, credentials, avatar_url, job_title, same_as)
values (
  'Kishore Kumar',
  'kishore-kumar',
  'Kishore Kumar is a sports psychologist and martial arts coach based in Chennai. A national medalist in Wushu and a Kung Fu black belt, he coaches competitive athletes and judges at state level. He founded Spartacus Martial Arts Academy to teach what most academies skip: the mind behind the technique — focus, discipline, and performance under pressure.',
  array[
    'Sports Psychologist',
    'Wushu National Medalist',
    'Kung Fu Black Belt',
    'Wushu Coach',
    'State-level Wushu Judge'
  ],
  'https://spartacusmartialarts.com/images/authors/kishore-kumar.webp',
  'Sports Psychologist & Martial Arts Coach',
  array[
    'https://www.instagram.com/kishorekumar.coach/',
    'https://spartacusmartialarts.com'
  ]
)
on conflict (slug) do update set
  name        = excluded.name,
  bio         = excluded.bio,
  avatar_url  = excluded.avatar_url,
  credentials = excluded.credentials,
  job_title   = excluded.job_title,
  same_as     = excluded.same_as;

insert into public.categories (name, slug, description, pillar, sort_order) values
  (
    'Sports Psychology for Athletes',
    'sports-psychology-for-athletes',
    'Sports psychology is the training that decides who performs when it actually counts. This is where every guide on focus, pressure control, pre-competition nerves, self-talk and recovery for athletes lives — written by a practising sports psychologist who also competes and coaches.',
    true, 1
  ),
  (
    'Wushu & Kung Fu Training',
    'wushu-and-kung-fu-training',
    'Wushu and Kung Fu training explained by a national medalist and state-level judge: forms, footwork, conditioning, competition preparation and how to progress from your first class to the competition floor.',
    true, 2
  ),
  (
    'Mental Toughness for Parents',
    'mental-toughness-for-parents',
    'What martial arts training actually builds in a child — focus, discipline, emotional control, confidence — and how parents in Chennai can support it without adding pressure at home.',
    true, 3
  ),
  (
    'Competition Mindset',
    'competition-mindset',
    'Everything about the days, hours and minutes before you compete: nerves, warm-up routines, visualisation, in-fight decision making, and what to do after a loss.',
    true, 4
  )
on conflict (slug) do update set
  name        = excluded.name,
  description = excluded.description,
  pillar      = excluded.pillar,
  sort_order  = excluded.sort_order;
