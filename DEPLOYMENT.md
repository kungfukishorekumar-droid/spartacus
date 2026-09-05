# Spartacus — Blog subdomain, tracking & deployment

Everything below is already built and committed. There are **three things only you
can do** (they need passwords and accounts I don't have). They take about 10 minutes.

---

## Step 1 — Create the analytics tables (2 minutes)

Supabase → your project → **SQL Editor** → **New query** → paste the whole of
[`supabase-analytics.sql`](supabase-analytics.sql) → **Run**.

Safe to re-run. It creates:

| Object | What it is |
|---|---|
| `page_views` | one row per page view |
| `page_engagement` | time on page, scroll depth, CTA reached |
| `analytics_daily` | visits and visitors per day |
| `analytics_top_pages` | which of the 125 articles actually works |
| `analytics_referrers` | Google vs Instagram vs direct |
| `analytics_sources` | UTM campaign performance |
| `analytics_lead_sources` | **the article each lead came from** |

Until this runs, tracking silently does nothing — the site is unaffected.

---

## Step 2 — Add three GitHub secrets (3 minutes)

GitHub → your repo → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**. Add these three:

| Secret name | Value |
|---|---|
| `HOSTINGER_FTP_SERVER` | `145.79.25.192` |
| `HOSTINGER_FTP_USERNAME` | `u824263812` |
| `HOSTINGER_FTP_PASSWORD` | your FTP password |

Get the password from **hPanel → Files → FTP Accounts** (create one or reset the
existing password). Never paste it into a chat or a file — only into the secret box.

Then run the deploy: **Actions** tab → **Deploy to Hostinger** → **Run workflow**.
After that, every push to `main` deploys automatically.

---

## Step 3 — Tell Google about the new blog host (5 minutes)

`blog.spartacusmartialarts.com` is a separate property in Google's eyes.

1. [Google Search Console](https://search.google.com/search-console) → **Add property**
   → URL prefix → `https://blog.spartacusmartialarts.com/`
2. Verify (the DNS TXT method works — the domain is already on Hostinger DNS).
3. **Sitemaps** → submit `sitemap.xml` (125 articles).

---

## What is already done

**Subdomain** — `blog.spartacusmartialarts.com` is created on Hostinger with DNS
(A `145.79.25.192`, AAAA, and the Hostinger CDN alias) already resolving. Its
document root is `public_html/blog`.

**Redirects** — the main site's `.htaccess` sends the old blog URLs
(`/blog.html`, `/blog-post.html`, `/blog/*`) to the new host with 301s, so no
duplicate content and no lost links. The rules are guarded by `HTTP_HOST` so they
can never loop on the blog host itself.

**Cross-host links** — `site-base.js` rewrites Programs / About / Contact /
Gallery links to the main domain when a page is served from the blog host, so all
125 articles work on the subdomain with no per-article edits.

**Tracking** — `track.js` runs on every page and records path, article slug,
referrer, UTM, device, browser, OS, time on page, scroll depth and whether the
reader reached the lead form. First-party, so ad blockers don't remove it. It
honours Do Not Track and skips localhost and `#admin`, so your own editing
sessions never pollute the numbers. No IP address or personal data is stored.

**Lead capture** — `blog-lead.js` puts a three-field form in every article, placed
right after the FAQ. It saves through the same Supabase pipeline as the main
contact form, so leads land in one place and reach WarriorCRM — and it attaches
attribution, so `analytics_lead_sources` tells you which article produced each
enquiry. The main contact form now carries the same attribution (it previously
discarded it).

---

## Deploying

**Automatic (set up in Step 2)** — push to `main`, and
`.github/workflows/deploy-hostinger.yml` builds the blog and uploads both targets.
The main-site job excludes `blog/**`, so it can never overwrite the blog.

**Manual fallback — hPanel Git**

1. hPanel → **Website** → **Git**
2. Repository: `https://github.com/kungfukishorekumar-droid/spartacus.git`, branch `main`
3. Directory: `/domains/spartacusmartialarts.com/public_html`
4. **Create**, then **Deploy** whenever you want changes live

Note that hPanel Git copies the repository as-is; it does **not** run the blog
build. Use it for the main site, and let GitHub Actions handle the blog.

**Building the blog locally**

```bash
node tools/build-blog-site.mjs     # → dist-blog/  (125 articles + sitemap + robots + .htaccess)
```

---

## Reading your numbers

Supabase → **Table Editor** → switch the dropdown from Tables to **Views**:

- `analytics_daily` — is traffic growing?
- `analytics_top_pages` — your best articles, with average read time and scroll depth
- `analytics_referrers` — where people come from
- `analytics_sources` — which campaign paid off
- `analytics_lead_sources` — every lead, and the article that produced it

Traffic data grows quickly. Once a year, run `select public.prune_analytics(12);`
to drop page views older than 12 months. It never touches leads.

---

## Optional: also turn on GA4 and Meta Pixel

`analytics.js` is already wired and dormant. Paste your IDs at the top of the file
and push — conversion events (`lead_submit`, `whatsapp_click`, `call_click`) are
already firing through it.
