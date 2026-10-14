/* ============================================================
   Pre-renders the blog's front page (dist-blog/blog.html).

   Why: the listing was an empty shell filled by blog.js, so a crawler that
   does not run JavaScript reached the front page of the blog host and found
   no articles at all. Now the featured block, category chips, the first page
   of the grid, the two topic rows and an "all guides" archive (one link per
   article) are in the HTML.

   Same pure builders as the browser (blog-render.js), so blog.js re-renders
   identical markup on load and only adds the interactivity (filters, search,
   load more).
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { absolutizeLinks } from "./prerender-posts.mjs";

const require = createRequire(import.meta.url);

function fill(html, id, inner) {
  const re = new RegExp(`(<([a-z]+)\\b[^>]*\\bid="${id}"[^>]*>)(\\s*)</\\2>`);
  if (!re.test(html)) throw new Error(`blog.html has no empty #${id}`);
  return html.replace(re, (m, open, tag) => `${open}${inner}</${tag}>`);
}

export function prerenderListing({ root, out, posts, cats, mainSite }) {
  const R = require(path.join(root, "blog-render.js"));
  const file = path.join(out, "blog.html");
  const sorted = R.sortPosts(posts);
  const fb = "images/fallback/blog-placeholder.webp";
  let h = fs.readFileSync(file, "utf8");

  h = h.replace(/(<b id="blogHeroCount">)[^<]*(<\/b>)/, `$1${sorted.length}$2`);
  h = fill(h, "blogFeatured", R.featuredBlock(sorted, fb));
  h = fill(h, "blogCats", R.catChips(cats));
  const first = sorted.slice(0, R.LISTING_PAGE);
  h = fill(h, "blogGrid", first.map(p => R.card(p, fb)).join(""));
  h = fill(h, "blogCount", R.countText(sorted.length));
  // blog.js creates #blogMore after the grid if it is missing; ship it so the
  // button does not appear late and push the page down
  h = h.replace(/(<div class="blog-grid" id="blogGrid">[\s\S]*?<\/article><\/div>)/,
    `$1<div id="blogMore" class="blog-more">${R.moreBlock(sorted.length - first.length)}</div>`);
  h = fill(h, "parentGrid", R.categoryRow(sorted, "Parent Guide", fb));
  h = fill(h, "chennaiGrid", R.categoryRow(sorted, "Chennai Martial Arts", fb));
  h = fill(h, "blogArchive", R.archive(sorted, cats));
  // the featured image is this page's LCP
  const lcp = sorted[0] && sorted[0].featuredImage && sorted[0].featuredImage.src;
  if (lcp) h = h.replace("</head>", `<link rel="preload" as="image" href="${lcp}" fetchpriority="high" />\n</head>`);
  h = h.replace('<main id="blogListing">', '<main id="blogListing" data-prerendered>');
  h = absolutizeLinks(h, mainSite);

  fs.writeFileSync(file, h);
  return { links: (h.match(/href="blog-post\.html\?slug=/g) || []).length, articles: sorted.length };
}
