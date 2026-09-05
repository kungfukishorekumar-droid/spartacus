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

## Step 2 — Connect Hostinger to GitHub (3 minutes, no password needed)

> **Order matters.** Everything in this document lives on the pull request
> branch, not on `main` yet. The **blog** can be deployed right now — the
> `blog-dist` branch is already built from that work. The **main site** must
> not be deployed from `main` until the pull request is merged, or you would
> publish the old site: no visitor tracking, no redirects from the old blog
> URLs, and a Blog menu item still pointing at the wrong place.
>
> Merging the PR also switches on the workflow that keeps `blog-dist` current
> automatically. Until then the branch is only updated when it is rebuilt by
> hand.


The repository is public, so Hostinger can pull it directly. **You never have to
put an FTP password anywhere.**

There are two Git connections to make in hPanel → **Website** → **Git**:

**A. The blog** → `blog.spartacusmartialarts.com`

| Field | Value |
|---|---|
| Repository | `https://github.com/kungfukishorekumar-droid/spartacus.git` |
| Branch | `blog-dist` |
| Directory | `/domains/spartacusmartialarts.com/public_html/blog` |

Click **Create**, then **Deploy**. The blog is live.

The `blog-dist` branch holds the *built* blog — its root is exactly the blog's
document root, so there is nothing to compile. A GitHub Action rebuilds and
force-pushes it automatically whenever the blog changes on `main`, so after the
first setup you only ever click **Deploy** (or switch on **Auto-deployment** in
hPanel and stop clicking altogether).

**B. The main site** → `spartacusmartialarts.com`

| Field | Value |
|---|---|
| Repository | `https://github.com/kungfukishorekumar-droid/spartacus.git` |
| Branch | `main` |
| Directory | `/domains/spartacusmartialarts.com/public_html` |

The root `.htaccess` blocks everything that is repository-only — `tools/`,
`supabase/`, `dist-blog/`, `.sql`, `.md`, dotfiles — so a plain Git copy is safe
to serve.

> **Optional: FTP deploys instead.** `.github/workflows/deploy-hostinger.yml`
> pushes both targets over FTP on every commit, which removes the Deploy click
> entirely. It needs three repository secrets — `HOSTINGER_FTP_SERVER`
> (`145.79.25.192`), `HOSTINGER_FTP_USERNAME` (`u824263812`) and
> `HOSTINGER_FTP_PASSWORD` (from hPanel → Files → FTP Accounts). Use it only if
> you want fully hands-off deploys; the Git route above needs no credentials.

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

| What | How |
|---|---|
| Blog content or images changed | Push to `main` → the Action rebuilds `blog-dist` → click **Deploy** in hPanel |
| Main site pages changed | Push to `main` → click **Deploy** on the main site's Git connection |
| Want zero clicks | Turn on **Auto-deployment** in hPanel, or add the three FTP secrets |

**Building the blog locally**

```bash
node tools/build-blog-site.mjs     # → dist-blog/  (125 articles + sitemap + robots + .htaccess)
```

**Regenerating the article artwork**

```bash
node tools/render-blog-images.mjs            # all 127 header images
node tools/render-blog-images.mjs --preview  # one sample per category
```

Both are free and need no image service — the artwork is drawn with the Canvas
API in headless Chromium.

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
