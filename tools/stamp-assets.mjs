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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = ["styles.css", "blog.css", "ux.css", "fx.css", "app.js", "blog.js",
                "blog-lead.js", "ux.js", "fx.js", "analytics.js", "track.js", "site-base.js", "ink.css", "home.css", "ink.js"];

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
