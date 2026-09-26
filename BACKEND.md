# Backend — what the website talks to

The site is static HTML on Hostinger. Everything dynamic goes to one Supabase
project (`oqwbmtdrjxfbnitlzehe`) with the public publishable key, protected by
Row Level Security (the public key can insert, never read).

| What | Written by | Table | Status |
|---|---|---|---|
| Contact + blog form leads | `app.js` `saveLead()` | `public_leads` (owned by WarriorCRM) | ✅ live |
| Visits + backup lead capture | `warriorcrm.js` (CRM script) | `public_leads` | ✅ live (main site; blog after next deploy) |
| Page views, time on page, scroll depth, reached-form | `track.js` | `page_views`, `page_engagement` | ⏳ run the migration |
| Rate-limit ledger for the anti-spam function | `submit-lead` Edge Function | `lead_submissions` | ⏳ run the migration |

## Setting it up

Run **`supabase/migrations/20260926000000_site_backend.sql`** once
(Supabase → SQL Editor → paste → Run). It is idempotent and does not touch
`public_leads`. Until it runs, `track.js` gets a 404 on every page view.

Reading the numbers: Supabase → Table Editor → Views →
`analytics_daily`, `analytics_top_pages`, `analytics_referrers`, `analytics_sources`.

## The anti-spam Edge Function (`supabase/functions/submit-lead`)

Validates input, checks a Cloudflare Turnstile token and rate-limits per IP.
It only adds protection once direct inserts into the lead table are closed —
and `public_leads` must stay open because `warriorcrm.js` inserts into it
from all three websites. So: keep it undeployed until spam actually arrives.
The form's honeypot field is active today and needs nothing.

## Superseded files

`supabase-setup.sql` (creates an unused `leads` table), `supabase-analytics.sql`
(its lead view read that missing table, so the script failed) and
`supabase-antispam.sql` are kept for history. Use the migration instead.
