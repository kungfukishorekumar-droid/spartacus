# Spartacus Martial Arts Academy — Landing Page

A premium, mobile-first **multi-page** website for **Spartacus Martial Arts Academy by Kishore Kumar** (Chennai).
No build step, no dependencies — just open or deploy.

**Pages:** `index.html` (Home) · `programs.html` · `about.html` · `gallery.html` · `contact.html`.
**Shared files:** `styles.css` (all styling) · `app.js` (injects the header/menu/footer on every page, runs all logic + the editor).
So to change the **menu or footer**, edit `app.js` (the `injectChrome` function) once — it updates every page.

Theme: **Black · Red · Gold · White** · Spartan warrior energy · 3D glossy SVG graphics ·
smooth scroll, hover + scroll-reveal animations · sticky WhatsApp + mobile "Book Trial" bar.

---

## ✏️ Admin editor (edit the site yourself — no coding)

You can edit the website content yourself, on your own computer, then publish.

**Open the editor:** go to your website and add `#admin` to the end of the URL, e.g.
`https://your-site.netlify.app/#admin` — then enter the password.

- **Password:** `spartacus@2026` — change it by editing the `PASSWORD` line at the top of `admin.js`.
- **✎ Edit Text** — click any text on the page and type. (Headlines, programs, FAQ, reviews, fees, everything.)
- **🖼 Replace Images** — click any image (logo, your photo, etc.) and pick a new one.
- **⚙ Contact & Links** — change the WhatsApp number and Instagram everywhere at once.
- **💾 Save** — keeps your edits on this device so you can preview them.
- **🚀 Publish Live** — saves your edits straight to the server so they're **live for everyone instantly** (no re-upload). Works when the site is running on its Node server (`npm start`) or any Node host.
- **⬇ Export file** — downloads `content.json` (use this on static hosting like Netlify drop, then re-upload it).

**Two ways to publish:**
- **Dynamic (Node host / `npm start`):** click **🚀 Publish Live** → done, live immediately.
- **Static host (Netlify drop, etc.):** click **⬇ Export file** → put the downloaded `content.json` next to `index.html` → re-upload the folder.

> The live-publish endpoint (`POST /api/save` in `server.js`) is protected by `ADMIN_KEY`
> (env var `ADMIN_KEY`, default `spartacus@2026` — must match the `PASSWORD` in `admin.js`). Change both.

> Notes: The password is a light lock for convenience, not bank-grade security — but nothing goes public
> until *you* upload `content.json`, so it's safe. Replacing an image through the editor embeds it into
> `content.json` (heavier); for the lightest result, swap the actual file in `assets/` instead.

---

## 1. Quick start

- **Run with npm (local server):** in this folder, run `npm start` → open `http://localhost:3000`
  (admin editor at `http://localhost:3000/#admin`). `npm run dev` is the same. Uses `server.js` (Node built-ins, no `npm install` needed).
- **Preview without anything:** double-click `index.html` (opens in any browser — no npm, no server).
- **Deploy:** upload this folder to any static host (Hostinger, Cloudflare Pages, GitHub Pages, etc.).

---

## 2. Add your photos (5 minutes)

Drop your images into the **`assets/`** folder using these exact names. The page already points to them,
and shows a styled placeholder until the real file exists.

| File                          | Where it shows                                   | Tip                                                        |
|-------------------------------|--------------------------------------------------|------------------------------------------------------------|
| `assets/logo.png`             | Navbar, footer, loading screen, favicon          | Your Spartacus logo (the one you shared). PNG with transparent background works best. |
| `assets/kishore.jpg`          | Hero portrait                                    | Your photo (the suited one). Face fully visible — the name plate sits **below** the face, no text covers your face. 4:5 vertical works best. |
| `assets/kishore-training.jpg` | About Coach section                              | A second coaching / training photo. Optional — placeholder shows until added. |
| `assets/parents.jpg`          | Parent Trust section                             | A kids / class training photo (optional)                   |
| `assets/og-cover.jpg`         | Social share preview (WhatsApp/Facebook)         | 1200×630 image used when the link is shared                 |

> **The two images you shared:** save the **logo** as `assets/logo.png` and your **photo** as `assets/kishore.jpg`.
> Until those files exist, the page shows clean styled placeholders in their place.

For the **Gallery** (class, competition, medal, review screenshots): replace the placeholder tiles in the
`#gallery` section with `<img src="assets/your-photo.jpg" />`.

---

## 3. Change phone / Instagram / backend

Open **`app.js`**, find the **`CONFIG`** block at the top, and edit:

```js
const CONFIG = {
  whatsappNumber: "919884599939",   // 91 + your number, digits only
  instagram:      "https://www.instagram.com/kishorekumar.coach/",
  backendUrl:     "",               // e.g. "http://localhost:5000" — see section 4
  waTemplate:     "Hi Coach Kishore, I am interested in {program} ..."
};
```

Everything (every WhatsApp button, the prefilled program message, the form) reads from here — change once, applies everywhere. (You can also change the WhatsApp number & Instagram from the **admin editor → ⚙ Contact & Links**.)

---

## 4. Connect the lead form to the backend

The form **already works** without any setup:

1. **WhatsApp (guaranteed):** on submit, it opens WhatsApp to `9884599939` with all the lead details prefilled.
2. **Local backup:** every lead is also saved in the browser's `localStorage` (`spartacus_leads`) so none are lost.

To also **store leads in the shared MongoDB backend** (see the `backend/` folder), set `CONFIG.backendUrl` in `app.js`:

```js
backendUrl: "http://localhost:5000",   // or your deployed backend URL
```

The form then POSTs to `POST {backendUrl}/api/leads` with `websiteSource: "website_1"` and the lead
fields. Start the backend first (`cd backend && npm run dev`) — see `backend/README.md`.

> There is **no CRM** in this project. Leads go to WhatsApp + optional MongoDB backend only.

---

## 5. Analytics (Google Analytics + Meta Pixel)

Near the top of `<head>` there's an **ANALYTICS** comment block. Uncomment it and paste your IDs:

- **GA4:** replace `G-XXXXXXXXXX` with your Measurement ID.
- **Meta Pixel:** replace `YOUR_PIXEL_ID`.

Conversion events are already wired and will fire automatically once IDs are in:
`hero_book_trial`, `program_enquire`, `whatsapp_click`, **`lead_submit`** (+ Meta standard `Lead`), and more.

---

## 6. Google Business Profile reviews & Instagram reels

- **Reviews:** manual review cards are live in the `#gallery` section now. To auto-pull Google reviews later,
  use the Google **Places API** and replace the `.reviews` cards with the API response.
- **Instagram:** an embed slot is reserved at the bottom of `#gallery`. Paste your reel embed code
  (Instagram → ⋯ → *Embed*) into the `.ig-note` block.

---

## 7. Editing text

All copy is plain HTML — search for the headline you want to change and edit it directly.
Section order in the file matches the page top-to-bottom:

Hero → Authority → Programs → Who Can Join → Benefits → Method → Parent Trust →
Gallery/Proof → Lead Form → Fees & Timings → FAQ → Final CTA → Footer.

---

**Built for:** Kishore Kumar — National Wushu Medalist · Kungfu Black Belt · Wushu Coach & Judge · Chennai.
