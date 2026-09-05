# Spartacus Blog

The blog for **Spartacus Martial Arts Academy** (Chennai) — built so it ranks in Google **and**
gets quoted by ChatGPT, Gemini, Perplexity and Claude.

**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres) as the only
data store · Higgsfield for image generation · deployed as a long-lived Node process on Hostinger.

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
| `npx tsx scripts/generate-images.ts [slug]` | Backfill Higgsfield images for posts that have none |
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
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

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

## 4. Higgsfield images

Set `HIGGSFIELD_API_KEY`. On publish, a post with no images gets a featured image plus two in-body
images, generated from prompts built out of its own title and category in
`lib/image-prompts.ts` (black / blood red / gold, Chennai training hall, no text). Alt text is
generated with each image, so nothing reaches the database without it.

> **Confirm this before going live:** `lib/higgsfield.ts` uses the common
> submit-job-then-poll pattern (`POST /image/generate` → `GET /image/jobs/:id`). Check the exact
> endpoints and field names against your Higgsfield account's API docs and adjust that one file if
> they differ — nothing else in the app touches the API shape.

Image generation failing never blocks a publish; it records a warning and the post still goes live.

---

## 5. Hostinger — one-time setup

Do these once, in this order:

1. **hPanel → Domains → Subdomains** → create `blog` under `spartacusmartialarts.com`.
   Note the document root it creates.
2. **hPanel → Advanced → Node.js** → create an application on that subdomain:
   - Node version **20 or 22**
   - Application root: the subdomain's directory (this is `HOSTINGER_APP_PATH`)
   - Startup file: `current/server.js`
   - Start command: `npm start`
3. **Environment variables** on that Node.js app — add every runtime key:
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `HIGGSFIELD_API_KEY`, `ADMIN_PASSWORD_HASH`,
   `ADMIN_SESSION_SECRET`, and `NODE_ENV=production`.
4. **hPanel → Advanced → SSH Access** → enable SSH, note the host, port (usually 65002) and
   username. Add the public half of a deploy key under **SSH Keys**.
5. **SSL** → issue a certificate for `blog.spartacusmartialarts.com`.

---

## 6. GitHub → Hostinger deploy

The workflow lives at `.github/workflows/deploy-blog.yml` (repository root, not this folder) and
runs on every push to `main` that touches `spartacus-blog/**`.

It typechecks, lints, builds a standalone bundle, uploads it to a timestamped release directory,
flips a `current` symlink, restarts the app, keeps the last five releases, and smoke-checks
`robots.txt` afterwards.

Add these repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `HOSTINGER_SSH_HOST` | Server IP from hPanel |
| `HOSTINGER_SSH_PORT` | Usually `65002` |
| `HOSTINGER_SSH_USER` | e.g. `u123456789` |
| `HOSTINGER_SSH_KEY` | The **private** deploy key |
| `HOSTINGER_APP_PATH` | Absolute path of the Node.js app root |
| `NEXT_PUBLIC_SITE_URL` | `https://blog.spartacusmartialarts.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

The last two are needed at *build* time because Next inlines `NEXT_PUBLIC_*` into the client bundle.
The secret keys (service role, Higgsfield, admin hash) are runtime-only and deliberately stay out of
CI — they live only in the Hostinger app's environment.

> The restart step tries `pm2` and falls back to touching `tmp/restart.txt`. Adjust that one block
> to match how your Hostinger plan actually restarts the app.

**Alternative:** Hostinger's API can build a Node.js app from uploaded source instead of SSH
(`startNode_jsBuild` / `restartNode_jsApplication`). The SSH route is used here because it fails
loudly and supports instant rollback.

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

**Publish** runs the gate. Errors block; warnings do not. Publishing also generates the images,
stamps `published_at`, and revalidates the homepage, the post, the pillar page, `sitemap.xml` and
`llms.txt`.

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

After importing, run `npx tsx scripts/generate-images.ts` to give them brand images.

---

## 9. After the first deploy

1. **Google Search Console** — add `blog.spartacusmartialarts.com` as its own property. Subdomains
   need separate verification from the main domain. Submit `/sitemap.xml`.
2. **Bing Webmaster Tools** — same, and it feeds ChatGPT's search index.
3. Check `/robots.txt` and `/llms.txt` load on the live domain.
4. Validate one live post in Google's Rich Results Test — it should report `BlogPosting`,
   `FAQPage`, `BreadcrumbList` and `Person`.
5. **Quarterly:** re-check the top 5 posts, update them, and let the `updated_at` trigger refresh
   the freshness signal.

---

## One honest flag on the subdomain

Google treats `blog.spartacusmartialarts.com` as a related-but-separate property, so authority
builds slightly slower than it would on `spartacusmartialarts.com/blog`. The subdomain was the
explicit choice here and everything is built for it. If ranking speed later matters more than the
separate-site feel, moving to a subfolder means changing `NEXT_PUBLIC_SITE_URL`, pointing a reverse
proxy at `/blog`, and adding redirects — the application code does not change.

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
│   ├── publish.ts                   # generate images → validate → go live → revalidate
│   ├── higgsfield.ts                # image API adapter
│   ├── image-prompts.ts             # brand style guide as prompt text
│   ├── queries.ts                   # all reads
│   ├── supabase.ts                  # anon client + service-role client
│   ├── markdown.ts                  # markdown → sanitised HTML
│   └── auth.ts                      # scrypt password + signed session cookie
├── scripts/
│   ├── hash-password.mjs
│   ├── generate-images.ts
│   └── import-legacy-posts.mjs
└── supabase/migrations/
```

**Built for:** Kishore Kumar — Sports Psychologist · Wushu National Medalist · Kung Fu Black Belt ·
Wushu Coach · State-level Judge · Chennai.
