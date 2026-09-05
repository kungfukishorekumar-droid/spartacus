# Spartacus Blog

The blog for **Spartacus Martial Arts Academy** (Chennai) — built so it ranks in Google **and**
gets quoted by ChatGPT, Gemini, Perplexity and Claude.

**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres) as the only
data store · deployed as a long-lived Node process on Hostinger.

No headless CMS. No markdown files on disk. Every post lives in Supabase and is written through
`/admin`.

---

## Why the pages are built the way they are

Answer engines mostly reuse the same crawl as search, then prefer pages they can lift a clean
answer from. Everything below is in the build for that reason:

| Feature | Where it lives | What it does |
|---|---|---|
| Direct-answer paragraph | `components/AnswerBlock.tsx`, rendered before the story on every post | The block engines quote near-verbatim |
| `BlogPosting` / `FAQPage` / `Person` / `Organization` / `WebSite` / `BreadcrumbList` / `CollectionPage` / `ProfilePage` JSON-LD | `lib/schema.ts` | How engines confirm *who* is answering and why to trust them (E-E-A-T) |
| FAQ block, 3–5 per post | `components/FaqSection.tsx` + `post_faqs` | Matches how people type questions into ChatGPT |
| AI crawler allow-list | `app/robots.ts` | Explicitly allows GPTBot, Google-Extended, ClaudeBot, PerplexityBot, CCBot, Applebot-Extended and more |
| `llms.txt` | `app/llms.txt/route.ts` | Clean plain-text site map for AI crawlers, generated from the live database |
| Author authority page | `app/about-kishore/page.tsx` | The four-pillar credentials, `Person` schema, linked from every byline |
| Topic clusters | `categories.pillar` + the internal-link check at publish | Makes you the authority on a topic, not a random blog |
| Freshness signals | `posts.updated_at` trigger + visible published/updated dates | Stale dates quietly hurt AI-answer inclusion |
| Core Web Vitals | `next/image` everywhere, server-rendered article bodies, `next/font` with `display: swap` | Slow pages get filtered out of AI Overviews |

`HowTo` schema is **not** included: it needs a structured steps field the `posts` table does not
have, and emitting it for prose articles is the kind of markup Google penalises. Add it as a
`post_steps` table when a genuinely step-by-step post calls for it.

The publish gate in `lib/validate.ts` enforces the non-negotiables — a post **cannot** go live with
a meta description over 155 characters, fewer than 3 or more than 5 FAQs, or an image with empty
alt text.

---

## 1. Local setup

```bash
cd spartacus-blog
npm install
cp .env.example .env.local
```

Then fill in `.env.local` (see step 2 and 3), and:

```bash
npm run dev      # http://localhost:3000
```

Useful scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run hash-password -- "your-password"` | Prints `ADMIN_PASSWORD_HASH` + `ADMIN_SESSION_SECRET` |
| `node --env-file=.env.local scripts/import-legacy-posts.mjs` | Dry-run import of the old static blog library |

---

## 2. Supabase

1. Create a project at [supabase.com](https://supabase.com) (or reuse the existing Spartacus one —
   the blog tables do not collide with `leads` / `payments`).
2. **SQL Editor → New query**, paste and run, in order:
   - `supabase/migrations/0001_init.sql` — tables, indexes, `updated_at` trigger, Row Level Security
   - `supabase/migrations/0002_seed.sql` — the author record and the four pillar categories
   Both are idempotent, so re-running them is safe.
3. **Project Settings → API**, copy into `.env.local`:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

   These are deliberately *not* `NEXT_PUBLIC_*` names. Next inlines every
   `NEXT_PUBLIC_` reference at build time — in the server bundle too — so a host that
   builds without them set would bake in `undefined` and ignore the runtime values
   forever. Nothing client-side touches Supabase, so plain names are safer. The
   `NEXT_PUBLIC_` spellings still work as fallbacks.

**On the two keys:** the anon key is safe in the browser — RLS restricts it to *published* posts and
nothing else. The service role key bypasses RLS entirely and must only ever live in server-side
environment variables. If it leaks, rotate it in the Supabase dashboard immediately.

Before writing posts, edit the seeded author bio and `same_as` links in `0002_seed.sql` (or directly
in the Supabase table editor) so `/about-kishore` reads exactly right. **That page carries more
SEO/GEO weight than any single post** — it is worth getting right before the first article.

---

## 3. Admin access

```bash
npm run hash-password -- "a-long-password-you-will-remember"
```

Paste both printed lines into `.env.local` and, later, into the Hostinger app's environment
variables. The plain password is never stored — only the scrypt hash. Sign in at `/admin/login`.

`/admin` is `noindex`, disallowed in `robots.txt`, and never cached.

---

## 4. Images

There is no image API wired into this app. Images are made in whichever generator you
prefer and their URLs pasted into the post.

What the app does provide is **consistency**: the admin editor generates three
brand-locked prompts for the post being edited — a 16:9 featured hero, an in-body
training shot, and an in-body psychological counterpart — each with matching
keyword-relevant alt text, ready to copy. The style guide lives in
`lib/image-prompts.ts` (black / blood red / gold, Chennai training hall, no text), so
the whole blog looks like one academy shot it rather than a stock-photo grab bag.

Alt text is not optional: publishing is blocked if any image lacks it.

**Where images live.** `spartacusmartialarts.com` and Supabase Storage are allowed as
image hosts by default. The existing library on the main site
(`images/blog100/`, `images/blog/`, `images/authors/`) is already served there, so the
115 imported posts reference it directly with nothing to re-upload. Add other hosts
with `IMAGE_HOSTS` — read at build time, so set it in the build environment.

---

## 5. Hostinger — one-time setup

This account is on a **Business** shared-hosting plan that already runs Next.js apps
through Hostinger's native Node.js pipeline (Node 22, `app_type: next`), so the blog
uses the same mechanism rather than a bespoke deploy.

> **Steps 1 and 2 are already done** on this account: the website
> `blog.spartacusmartialarts.com` exists and resolves, and the Node.js build settings
> below are stored against it. Steps 3 and 4 still need doing, plus connecting Git
> (section 6). They are written out here so the setup is reproducible.

1. **hPanel → Domains → Subdomains** → create `blog` under `spartacusmartialarts.com`.
   Hostinger adds the DNS record and the vhost. Note the document root.
2. **hPanel → Advanced → Node.js** → create an application on that subdomain with
   exactly these settings (they mirror the working Next.js apps already on this plan):

   | Setting | Value |
   |---|---|
   | Node.js version | `22` |
   | Framework / app type | `next` |
   | Package manager | `npm` |
   | Root directory | `spartacus-blog` |
   | Build script | `build` |
   | Output directory | `.next` |
   | Entry file | *(leave empty — Next apps do not need one)* |

   **Root directory matters:** this repository holds the static main site at its root
   and the blog in `spartacus-blog/`. Pointing at the repository root will make the
   build fail with "no package.json".
3. **Environment variables** on that Node.js app — add every key from `.env.example`:
   `SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, and `NODE_ENV=production`.

   Set these **before** the first build. `SITE_URL` in particular is read while the
   homepage, `sitemap.xml` and `llms.txt` are prerendered; if it is missing the build
   log prints a warning and the site ships canonical URLs for the wrong domain.
4. **SSL** → issue a certificate for `blog.spartacusmartialarts.com`.

---

## 6. Deploying

**Hostinger's Git auto-deployment does the deploy.** In hPanel → Node.js → Git,
connect this repository and the branch you want deployed. Every push to that branch
triggers a build using the settings above.

> The blog currently lives on a feature branch, not `main`. Either merge it to `main`
> first, or point Hostinger at the feature branch — but do not leave it pointing at a
> branch you later delete. This is the same pipeline that already builds
`kishorekumarcoach.com` successfully on this account, which is why it is preferred
over a hand-rolled SSH deploy.

**GitHub Actions is the safety net, not the deploy.** Hostinger gives no feedback
until after a push has landed, so `.github/workflows/blog-ci.yml` (at the repository
root) runs on every push and pull request touching `spartacus-blog/**` and:

- typechecks and lints
- builds with Node 22, matching the host
- boots the built app and asserts: homepage, `robots.txt`, `llms.txt`, `sitemap.xml`
  and `/about-kishore` return 200; an unknown slug returns 404; `/admin` redirects
  rather than rendering; unauthenticated `POST /api/publish` returns 401; and
  `robots.txt` still allows GPTBot, Google-Extended, ClaudeBot, PerplexityBot, CCBot
  and Applebot-Extended

It needs **no secrets** — the blog reads every credential at runtime from the
Hostinger app's environment. Optionally set a repository *variable* (not secret)
`SITE_URL` so CI builds with the production origin.

If a build fails, hPanel → Node.js → Builds shows the logs; the usual causes are a
wrong root directory or a missing environment variable.

**Alternatives, if you ever want them:** Hostinger's API can start a build from an
uploaded archive (`POST .../node-js/builds` with `source_type: archive`), and the
app can equally be deployed over SSH with rsync. Neither is needed while Git
auto-deployment works.

---

## 7. Writing a post

`/admin` → **New post**. The form mirrors the checklist:

- **Title** — phrase it as the question people actually ask.
- **Excerpt** — the meta description. Hard limit 155 characters, counter shown live.
- **Direct answer** — 2–3 sentences answering the headline, no build-up. This is the block AI
  engines quote.
- **Body (markdown)** — must link to its pillar page (`/category/…`) and at least 2 sibling posts.
- **FAQs** — 3 to 5, phrased the way people type them.
- **SEO title / keywords / tags.**

**Publish** runs the gate. Errors block; warnings do not. Publishing stamps
`published_at` and revalidates the homepage, the post, the pillar page, `sitemap.xml`
and `llms.txt`.

Posts can also be published programmatically:

```bash
curl -X POST https://blog.spartacusmartialarts.com/api/publish \
  -H "x-publish-token: $PUBLISH_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"postId":"<uuid>"}'
```

Set `PUBLISH_API_TOKEN` to enable that path (useful from Make.com); leave it unset to disable it.

---

## 8. Importing the existing 115 posts (optional)

The static site in the repository root already carries a 115-post library in `../data/`.
`scripts/import-legacy-posts.mjs` reads it, rewrites the old `programs.html`-style links to
absolute main-site URLs, and upserts everything into Supabase.

```bash
node --env-file=.env.local scripts/import-legacy-posts.mjs             # dry run + report
node --env-file=.env.local scripts/import-legacy-posts.mjs --write     # import as drafts
node --env-file=.env.local scripts/import-legacy-posts.mjs --write --publish
```

Posts land as drafts. `--publish` publishes only the ones that pass the same gate the admin uses —
at the last dry run, 100 of 115 passed; the other 15 (older posts missing a direct-answer
paragraph, or with an over-length excerpt) are listed by slug so they can be fixed by hand.

Images come across too: each post keeps its existing picture from the main site's
library, so the imported posts are illustrated immediately with nothing to re-upload.

---

## 9. After the first deploy

1. **Google Search Console** — add `blog.spartacusmartialarts.com` as its own property. Subdomains
   need separate verification from the main domain. Submit `/sitemap.xml`.
2. **Bing Webmaster Tools** — same, and it feeds ChatGPT's search index.
3. Check `/robots.txt` and `/llms.txt` load on the live domain, and that the URLs
   inside them say `blog.spartacusmartialarts.com` — if they say something else,
   `SITE_URL` was missing from the build environment.
4. Validate one live post in Google's Rich Results Test — it should report `BlogPosting`,
   `FAQPage`, `BreadcrumbList` and `Person`.
5. **Quarterly:** re-check the top 5 posts, update them, and let the `updated_at` trigger refresh
   the freshness signal.

---

## Subdomain vs subfolder

The app supports both, via `BASE_PATH`:

| `BASE_PATH` | The blog lives at | Notes |
|---|---|---|
| *(empty)* | `blog.spartacusmartialarts.com` | Google treats it as a related-but-separate property; authority builds slower |
| `/blog` | `spartacusmartialarts.com/blog` | Inherits the main domain's authority — the stronger SEO position |

Both modes are covered by CI. Everything derived from the mount point — canonical
tags, JSON-LD `@id`s, the sitemap, `llms.txt`, asset URLs — follows `BASE_PATH`
automatically. The one exception is deliberate: the `Organization` JSON-LD `@id` is
always anchored to `https://spartacusmartialarts.com/#organization`, because the
academy is one organisation regardless of where the blog sits. If the main site also
emits `Organization` schema it must use that same `@id`, or engines see two rival
entities.

**Two things the subfolder mode needs that the subdomain mode does not:**

1. **`robots.txt` must be at the domain root.** Crawlers only read
   `spartacusmartialarts.com/robots.txt` — they ignore `/blog/robots.txt`. The main
   site's existing root `robots.txt` already allows GPTBot, ClaudeBot,
   PerplexityBot, Google-Extended, CCBot and Applebot-Extended, so nothing needs
   adding there except the blog's sitemap:

   ```
   Sitemap: https://spartacusmartialarts.com/blog/sitemap.xml
   ```

2. **`llms.txt` is conventionally read from the domain root too.** Either point the
   root `llms.txt` at the blog's, or proxy `/llms.txt` to `/blog/llms.txt`.

Do not switch `BASE_PATH` on a live site without redirects — it changes every URL.

---

## Project layout

```
spartacus-blog/
├── app/
│   ├── [slug]/page.tsx              # single post: answer block, FAQs, JSON-LD, related posts
│   ├── category/[slug]/page.tsx     # pillar hub, CollectionPage schema
│   ├── about-kishore/page.tsx       # author authority page, Person schema
│   ├── admin/                       # login, post list, editor, server actions
│   ├── api/publish/route.ts         # the publish pipeline as an endpoint
│   ├── llms.txt/route.ts
│   ├── robots.ts
│   ├── sitemap.ts
│   ├── layout.tsx                   # fonts, Organization + WebSite schema, header/footer
│   └── page.tsx                     # homepage
├── components/                      # AnswerBlock, FaqSection, AuthorByline, PostCard, admin/
├── lib/
│   ├── schema.ts                    # every JSON-LD generator
│   ├── validate.ts                  # the publish gate
│   ├── publish.ts                   # validate → go live → revalidate
│   ├── image-prompts.ts             # brand style guide as copyable prompts
│   ├── queries.ts                   # all reads
│   ├── supabase.ts                  # anon client + service-role client
│   ├── markdown.ts                  # markdown → sanitised HTML
│   └── auth.ts                      # scrypt password + signed session cookie
├── scripts/
│   ├── hash-password.mjs
│   └── import-legacy-posts.mjs
└── supabase/migrations/
```

**Built for:** Kishore Kumar — Sports Psychologist · Wushu National Medalist · Kung Fu Black Belt ·
Wushu Coach · State-level Judge · Chennai.
