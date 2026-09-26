# Backend — what the website talks to

The site is static HTML on Hostinger. Everything dynamic goes to one Supabase
project (`oqwbmtdrjxfbnitlzehe`) with the public publishable key, protected by
Row Level Security (the public key can insert, never read).

| What | Written by | Table | Status |
|---|---|---|---|
| Contact + blog form leads | `app.js` `saveLead()` | `public_leads` (owned by WarriorCRM) | ✅ live |
| Visits + backup lead capture | `warriorcrm.js` (CRM script) | `public_leads` | ✅ live (main site; blog after next deploy) |
| Page views, time on page, scroll depth, reached-form | `track.js` | `page_views`, `page_engagement` | ✅ live since 2026-09-26 |
| Rate-limit ledger for the anti-spam function | `submit-lead` Edge Function | `lead_submissions` | ✅ table ready (function not deployed — see below) |

## Setting it up

Applied to project `oqwbmtdrjxfbnitlzehe` on 2026-09-26 (Supabase migrations
`site_backend` + `site_backend_pin_search_path`; same SQL as the two files in
`supabase/migrations/`). Both are idempotent — safe to re-run on a new project.
Neither touches the CRM's tables (`public_leads`, `crm_state`).

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
