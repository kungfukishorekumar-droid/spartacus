/* ============================================================
   Stamps every shared CSS/JS reference in the site's HTML with a hash of
   that file's own contents:  styles.css?v=20260906c  →  styles.css?v=<md5>

   Run after editing any CSS/JS:   node tools/stamp-assets.mjs

   Why: the host caches .css/.js for a week. With a hand-typed version, a
   change only reaches returning visitors if someone remembers to bump it —
   missed more than once. A content hash changes exactly when the file does.
   The blog build (build-blog-site.mjs) does the same for the blog host.
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = ["styles.css", "blog.css", "ux.css", "fx.css", "app.js", "blog.js",
                "blog-lead.js", "ux.js", "fx.js", "analytics.js", "track.js", "site-base.js", "ink.css", "home.css", "ink.js", "blog-render.js"];

const vers = {};
for (const a of ASSETS) {
  const f = path.join(ROOT, a);
  if (fs.existsSync(f)) vers[a] = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex").slice(0, 10);
}

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith(".html"));
let changed = 0;
for (const page of pages) {
  const p = path.join(ROOT, page);
  const before = fs.readFileSync(p, "utf8");
  let html = before;
  for (const [a, v] of Object.entries(vers)) {
    const esc = a.replace(/\./g, "\\.");
    // the name must start right after the opening quote or a "/", so
    // "blog.js" never matches inside "blog-lead.js"
    html = html.replace(new RegExp(`((?:href|src)="(?:[^"]*/)?)${esc}(\\?[^"]*)?"`, "g"), `$1${a}?v=${v}"`);
  }
  if (html !== before) { fs.writeFileSync(p, html); changed++; }
}
console.log(`asset stamps: ${Object.keys(vers).length} files hashed, ${changed} page(s) updated`);

/* ---------- sitemap.xml lastmod ----------
   Each page's <lastmod> is when that page last changed: today if it has
   uncommitted edits (this script runs before a commit), otherwise the date
   of its last commit. It was hand-typed before and went stale. */
const smPath = path.join(ROOT, "sitemap.xml");
if (fs.existsSync(smPath)) {
  const git = (...a) => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return ""; } };
  const today = new Date().toISOString().slice(0, 10);
  const dirty = new Set(git("status", "--porcelain").split("\n").map(l => l.slice(3).trim()).filter(Boolean));
  let sm = fs.readFileSync(smPath, "utf8"), n = 0;
  sm = sm.replace(/<loc>https:\/\/spartacusmartialarts\.com\/([^<]*)<\/loc><lastmod>[^<]*<\/lastmod>/g, (m, rel) => {
    const file = rel === "" ? "index.html" : rel;
    const d = dirty.has(file) ? today : (git("log", "-1", "--format=%cs", "--", file) || today);
    n++;
    return `<loc>https://spartacusmartialarts.com/${rel}</loc><lastmod>${d}</lastmod>`;
  });
  fs.writeFileSync(smPath, sm);
  console.log(`sitemap lastmod: ${n} page(s) dated`);
}
