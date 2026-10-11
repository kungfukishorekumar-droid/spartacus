/* ============================================================
   Pre-renders every blog article to a complete static HTML file:
     dist-blog/posts/<slug>.html

   Why: the article page used to be an empty shell filled by JavaScript.
   AI crawlers (GPTBot, ClaudeBot, PerplexityBot) don't run JavaScript, so
   they saw 0 words; Google saw 131 copies of one generic title until its
   rendering pass; and the late fill caused a 0.6 layout shift.

   The public URL does NOT change. The blog host's .htaccess serves
   posts/<slug>.html for blog-post.html?slug=<slug> as an internal rewrite,
   so canonicals, links, sitemap and rankings stay exactly as they are.

   Uses blog-render.js — the same pure functions the browser uses — so the
   pre-built page and a browser render cannot drift apart.
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const escAttr = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Fill <tag ...id="X"...></tag> with html (the template's containers are empty). */
function fill(html, id, inner, extraAttrs) {
  const re = new RegExp(`(<([a-z]+)\\b[^>]*\\bid="${id}"[^>]*)>(\\s*)</\\2>`);
  if (!re.test(html)) throw new Error(`template has no empty #${id}`);
  return html.replace(re, (m, open, tag) => `${open}${extraAttrs || ""}>${inner}</${tag}>`);
}
function setOrAddMeta(html, attr, key, val) {
  if (val == null || val === "") return html;
  const tag = `<meta ${attr}="${key}" content="${escAttr(val)}" />`;
  const re = new RegExp(`<meta\\s+${attr}="${key.replace(/[:.]/g, "\\$&")}"\\s+content="[^"]*"\\s*/?>`);
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `${tag}\n</head>`);
}

export function prerenderPosts({ root, out, posts, site, mainSite, wa }) {
  const R = require(path.join(root, "blog-render.js"));
  const template = fs.readFileSync(path.join(out, "blog-post.html"), "utf8");
  const sorted = R.sortPosts(posts);
  fs.mkdirSync(path.join(out, "posts"), { recursive: true });
  const fb = "images/fallback/blog-placeholder.webp";
  let n = 0, words = 0;

  for (const p of sorted) {
    if (!/^[a-z0-9-]+$/.test(p.slug)) throw new Error(`unsafe slug: ${p.slug}`);
    const d = R.buildDetail(p, sorted, { site, mainSite, wa, fallback: fb });
    let h = template;

    // ---- head: everything blog.js used to inject at runtime ----
    h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${R.esc(d.title)}</title>`);
    h = h.replace(/<!-- Title\/description\/OG\/canonical \+ JSON-LD are set per-article by blog\.js -->\n?/, "");
    h = setOrAddMeta(h, "name", "description", d.description);
    h = setOrAddMeta(h, "name", "keywords", d.keywords);
    h = setOrAddMeta(h, "name", "author", p.author);
    h = setOrAddMeta(h, "property", "og:type", "article");
    h = setOrAddMeta(h, "property", "og:title", d.title);
    h = setOrAddMeta(h, "property", "og:description", d.description);
    h = setOrAddMeta(h, "property", "og:image", d.image);
    h = setOrAddMeta(h, "property", "og:url", d.url);
    h = setOrAddMeta(h, "property", "og:site_name", "Spartacus Martial Arts Academy");
    h = setOrAddMeta(h, "name", "twitter:card", "summary_large_image");
    h = setOrAddMeta(h, "name", "twitter:title", d.title);
    h = setOrAddMeta(h, "name", "twitter:description", d.description);
    h = setOrAddMeta(h, "name", "twitter:image", d.image);
    h = /<link rel="canonical"/.test(h)
      ? h.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${escAttr(d.url)}" />`)
      : h.replace("</head>", `<link rel="canonical" href="${escAttr(d.url)}" />\n</head>`);
    const ld = d.jsonld.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
    h = h.replace("</head>", `${ld}\n</head>`);
    // the hero image is this page's LCP: let the browser fetch it immediately
    if (p.heroImage && p.heroImage.src) h = h.replace("</head>", `<link rel="preload" as="image" href="${escAttr(p.heroImage.src)}" fetchpriority="high" />\n</head>`);

    // ---- no post data needed: the article is in the HTML ----
    h = h.replace(/<script src="data\/[^"]+\.js[^"]*"[^>]*><\/script>\n?/g, "");

    // ---- body ----
    h = h.replace('<main id="blogPost">',
      `<main id="blogPost" data-prerendered data-slug="${escAttr(p.slug)}" data-title="${escAttr(p.title)}" data-category="${escAttr(p.category)}">`);
    h = fill(h, "postCrumbs", d.crumbs);
    h = fill(h, "postHead", d.head);
    h = fill(h, "postHero", d.hero);
    h = fill(h, "postBody", d.body);
    h = d.toc ? fill(h, "postToc", d.toc) : fill(h, "postToc", "", ' style="display:none"');
    if (d.faq) h = fill(h, "postFaq", d.faq);
    h = fill(h, "postAuthor", d.author);
    h = fill(h, "postCta", d.cta);
    if (d.related) h = fill(h, "postRelated", d.related);

    fs.writeFileSync(path.join(out, "posts", p.slug + ".html"), h);
    words += R.textOf(d.body).split(/\s+/).filter(Boolean).length;
    n++;
  }
  return { count: n, avgWords: Math.round(words / Math.max(n, 1)) };
}
