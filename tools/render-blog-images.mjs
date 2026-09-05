/* ============================================================
   Renders an illustrated header image for every blog article.

   Run:  node tools/render-blog-images.mjs            (writes into images/)
         node tools/render-blog-images.mjs --preview  (writes a sample sheet)

   Free and self-contained: the artwork is drawn with the Canvas API in
   headless Chromium and exported as WebP. No image API, no credits, no
   external service — so it can be re-run any time an article is added.

   Each card pairs a martial-arts figure (chosen from the article's
   category, varied deterministically by slug) with the site's black /
   red / gold palette, so 125 images look like one designed set.
   ============================================================ */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || "8733";
const PREVIEW = process.argv.includes("--preview");
const PREVIEW_DIR = "/tmp/claude-0/-home-user-spartacus/3169816f-5efe-501e-b8a6-1d4a0aa8e21f/scratchpad/preview";

/* Which figure suits which kind of article. Several options per category so
   articles in the same category do not all get the same picture. */
const POSE_BY_CATEGORY = {
  "Kids Martial Arts":       ["child", "frontkick", "bow", "guard", "blockhigh"],
  "Parent Guide":            ["child", "bow", "ready", "coach", "guard"],
  "Self Defense":            ["guard", "blockhigh", "punch", "throw", "sidekick"],
  "Women's Self Defense":    ["punch", "guard", "blockhigh", "sidekick", "ready"],
  "Wushu Training":          ["roundhouse", "sidekick", "horsestance", "frontkick", "blockhigh"],
  "Kungfu Wisdom":           ["horsestance", "meditate", "bow", "blockhigh", "ready"],
  "Karate Basics":           ["blockhigh", "frontkick", "horsestance", "punch", "bow"],
  "Kickboxing Fitness":      ["roundhouse", "punch", "guard", "frontkick", "sidekick"],
  "Athlete Mindset":         ["meditate", "ready", "coach", "horsestance", "bow"],
  "Discipline & Confidence": ["ready", "horsestance", "meditate", "bow", "child"],
  "Chennai Martial Arts":    ["coach", "guard", "roundhouse", "ready", "frontkick"],
  "Beginner Guide":          ["frontkick", "ready", "guard", "horsestance", "throw"],
  "Coach & Academy":         ["coach", "ready", "bow"],
  "Sports Psychology":       ["meditate", "ready"],
  "Judo Training":           ["throw", "guard"],
  "Muay Thai Training":      ["roundhouse", "punch"],
  "Boxing Training":         ["punch", "guard"],
  "Karate Training":         ["blockhigh", "frontkick"],
  "Kickboxing Training":     ["roundhouse", "punch"]
};
const FALLBACK = ["ready", "guard", "frontkick"];
const MOTION = new Set(["roundhouse", "frontkick", "sidekick", "punch", "blockhigh"]);

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

function loadPosts() {
  const win = { BLOG_POSTS: [], BLOG_CATEGORIES: [] };
  const order = ["blogData.js", "blog100-part1.js", "blog100-part2.js", "blog100-part3.js",
                 "blog100-part4.js", "blog100-part5.js", "blog-2026.js"];
  for (const f of order) {
    const p = path.join(ROOT, "data", f);
    if (!fs.existsSync(p)) continue;
    new Function("window", "document", "encodeURIComponent",
      fs.readFileSync(p, "utf8"))(win, { createElement: () => ({}) }, encodeURIComponent);
  }
  return win.BLOG_POSTS;
}

/* One job per distinct image file. Several articles share a stock image in
   blogData.js, so the first article that claims a path wins it. */
function buildJobs(posts) {
  const seen = new Map();
  for (const p of posts) {
    for (const img of [p.featuredImage, p.heroImage]) {
      if (!img || !img.src) continue;
      if (seen.has(img.src)) continue;
      const opts = POSE_BY_CATEGORY[p.category] || FALLBACK;
      const pose = opts[hash(p.slug + "|" + (p.title || "")) % opts.length];
      seen.set(img.src, {
        target: img.src,
        slug: p.slug,
        title: img.title || p.title,
        category: p.category,
        pose,
        motion: MOTION.has(pose)
      });
    }
  }
  return [...seen.values()];
}

const posts = loadPosts();
let jobs = buildJobs(posts);
if (PREVIEW) {
  // one card per category, to eyeball the whole set quickly
  const byCat = new Map();
  for (const j of jobs) if (!byCat.has(j.category)) byCat.set(j.category, j);
  jobs = [...byCat.values()];
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"]
});
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
page.on("console", m => { if (m.type() === "error") console.log("PAGE ERR:", m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/tools/art/card.html`);
await page.waitForFunction("window.__ready === true", null, { timeout: 20000 });

let n = 0, bytes = 0;
for (const job of jobs) {
  const url = await page.evaluate(o => window.render(o), job);
  const buf = Buffer.from(url.split(",")[1], "base64");
  const out = PREVIEW
    ? path.join(PREVIEW_DIR, job.category.replace(/\W+/g, "-") + ".webp")
    : path.join(ROOT, job.target);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  n++; bytes += buf.length;
}
await browser.close();
console.log(`${n} images written${PREVIEW ? " (preview)" : ""} — ${(bytes / 1024 / 1024).toFixed(2)} MB total, avg ${Math.round(bytes / n / 1024)} KB`);
