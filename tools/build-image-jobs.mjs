/* ============================================================
   Builds image-jobs.json — the generation queue for all blog images.

   Run:  node tools/build-image-jobs.mjs

   Every post carries an `imagePrompt` in data/*.js. This script appends a
   single shared HOUSE STYLE to each one so 125 separately generated images
   still look like one brand — same dark hall, same gold rim light, same
   red accent as the website — instead of 125 unrelated stock photos.

   The output feeds an image generator (Higgsfield, or paste the prompts
   into ChatGPT / Gemini / Midjourney by hand).
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* One look, applied to every image. Matches the site's black / red / gold theme. */
const HOUSE_STYLE =
  "Photorealistic editorial photograph inside a premium martial arts academy in Chennai, India. " +
  "Deep black and charcoal tones, warm gold rim lighting, one subtle red accent light. " +
  "Shallow depth of field, 35mm lens, authentic Indian people and natural skin tones, " +
  "respectful and dignified, documentary feel. " +
  "Absolutely no text, no letters, no numbers, no logos, no watermarks, no signage.";

const NEGATIVE = "text, watermark, logo, signature, distorted hands, extra limbs, blurry faces, cartoon, anime";

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

const posts = loadPosts();
const jobs = [];
const missing = [];

posts.forEach((p, i) => {
  if (!p.imagePrompt) { missing.push(p.slug); return; }
  // The written prompts already end with loose style words; the house style
  // restates the important ones, which is harmless and reinforces intent.
  const subject = p.imagePrompt.trim().replace(/[.,\s]+$/, "");
  jobs.push({
    index: jobs.length,
    slug: p.slug,
    title: p.title,
    category: p.category,
    // where the generated file must eventually land
    target: (p.featuredImage && p.featuredImage.src) || null,
    params: {
      model: "z_image",          // swap for a higher-fidelity model if budget allows
      aspect_ratio: "16:9",
      prompt: `${subject}. ${HOUSE_STYLE}`
    },
    negative: NEGATIVE
  });
});

fs.writeFileSync(path.join(ROOT, "image-jobs.json"), JSON.stringify(jobs, null, 2) + "\n");

console.log(`image-jobs.json — ${jobs.length} prompts ready (of ${posts.length} posts)`);
if (missing.length) console.log(`  missing imagePrompt: ${missing.length} →`, missing.slice(0, 5));
console.log(`  batches of 12: ${Math.ceil(jobs.length / 12)}`);
console.log(`\nExample prompt (${jobs[0].slug}):\n  ${jobs[0].params.prompt}`);
