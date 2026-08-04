/* Spartacus Martial Arts Academy — tiny static server (Node built-ins only).
   Run with:  npm start   (or: node server.js)
   No dependencies, no npm install required. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
// Admin key for live publishing — change via env ADMIN_KEY, or here. Must match admin.js PASSWORD.
const ADMIN_KEY = process.env.ADMIN_KEY || "spartacus@2026";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".gif": "image/gif",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  try {
    // ---- Live publish endpoint: admin saves content straight to the server ----
    if (req.method === "POST" && req.url.split("?")[0] === "/api/save") {
      if ((req.headers["x-admin-key"] || "") !== ADMIN_KEY) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: false, error: "Wrong admin key" }));
      }
      let body = "";
      let tooBig = false;
      req.on("data", (c) => { body += c; if (body.length > 25 * 1024 * 1024) { tooBig = true; req.destroy(); } });
      req.on("end", () => {
        if (tooBig) { res.writeHead(413, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ ok: false, error: "Payload too large" })); }
        try {
          const data = JSON.parse(body);                 // validate it's JSON
          fs.writeFileSync(path.join(ROOT, "content.json"), JSON.stringify(data, null, 2));
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Invalid JSON" }));
        }
      });
      return;
    }

    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.normalize(path.join(ROOT, urlPath));
    // Stay inside the web root: require the ROOT + separator prefix so a sibling
    // directory sharing the ROOT name string (…/spartacus websiteX) can't escape.
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
    // Never serve server-side secrets/source: the backend dir, dotfiles (.env), or node_modules.
    const rel = path.relative(ROOT, filePath);
    const firstSeg = rel.split(path.sep)[0];
    if (firstSeg === "backend" || firstSeg === "node_modules" || rel.split(path.sep).some((s) => s.startsWith("."))) {
      res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
      return res.end("<h1>403 — Forbidden</h1>");
    }
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        return res.end("<h1>404 — Not Found</h1>");
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-cache",
        // Security headers (Phase 5 equivalent for this static server)
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      });
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (e) {
    res.writeHead(500); res.end("Server error");
  }
});

let currentPort = Number(PORT);
const MAX_TRIES = 15;

server.on("listening", () => {
  console.log("\n  ⚔  Spartacus Martial Arts Academy");
  console.log("  Site running at:  http://localhost:" + currentPort);
  console.log("  Admin editor:     http://localhost:" + currentPort + "/#admin");
  console.log("  Press Ctrl+C to stop.\n");
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE" && currentPort < Number(PORT) + MAX_TRIES) {
    console.warn("  Port " + currentPort + " is busy — trying " + (currentPort + 1) + " …");
    currentPort += 1;
    setTimeout(() => server.listen(currentPort), 150);
  } else if (e.code === "EADDRINUSE") {
    console.error("\n  Could not find a free port. Your site is probably ALREADY running —");
    console.error("  just open http://localhost:" + PORT + " in your browser.\n");
    process.exit(1);
  } else {
    console.error(e);
    process.exit(1);
  }
});

server.listen(currentPort);
