/* ============================================================
   SPARTACUS — Cross-host link resolver
   ------------------------------------------------------------
   The blog is served from its own host:  blog.spartacusmartialarts.com
   The rest of the site lives on:         spartacusmartialarts.com

   Only the blog pages are deployed to the blog host, so any relative link
   to Programs / About / Contact / Gallery / Home would 404 there. This
   script rewrites those links to absolute main-site URLs — at runtime, so
   the 125 articles, the injected header and the footer all work on both
   hosts with no duplicated content and no per-post edits.

   On the main domain it does nothing at all.
   ============================================================ */
(function () {
  "use strict";

  var MAIN = "https://spartacusmartialarts.com";
  var BLOG = "https://blog.spartacusmartialarts.com";

  // Pages that live on the BLOG host. Everything else belongs to the main site.
  var BLOG_PAGES = /^(blog\.html|blog-post\.html)(\?|#|$)/;
  // Links we must never touch. A leading "/" means the link is already absolute
  // for THIS host (e.g. the blog root), so it must be left exactly as it is.
  var SKIP = /^(https?:|\/|#|mailto:|tel:|javascript:|data:)/i;

  var onBlogHost = location.hostname.indexOf("blog.") === 0;

  // Expose the canonical bases so blog.js can build correct canonical/JSON-LD URLs.
  window.SPARTACUS_MAIN_SITE = MAIN;
  window.SPARTACUS_BLOG_SITE = BLOG;
  window.BLOG_SITE_BASE = onBlogHost ? BLOG : MAIN;

  if (!onBlogHost) return;   // main domain: relative links already resolve fine

  function fix(a) {
    var href = a.getAttribute("href");
    if (!href || SKIP.test(href)) return;
    var clean = href.replace(/^\.\//, "");
    // The blog listing IS this host's front page. Point at "/" so visitors see
    // blog.spartacusmartialarts.com, not blog.spartacusmartialarts.com/blog.html.
    if (/^blog\.html(\?|#|$)/.test(clean)) {
      a.dataset.spFixed = "1";
      a.setAttribute("href", "/" + clean.slice("blog.html".length));
      return;
    }
    if (BLOG_PAGES.test(clean)) return;          // article pages stay as-is
    if (a.dataset.spFixed === "1") return;
    a.dataset.spFixed = "1";
    a.setAttribute("href", MAIN + "/" + clean);
  }

  function sweep(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName === "A") fix(root);
    var links = root.querySelectorAll ? root.querySelectorAll("a[href]") : [];
    for (var i = 0; i < links.length; i++) fix(links[i]);
  }

  // Catch everything that is injected later: the header/footer from app.js,
  // the article body from blog.js, the lead form from blog-lead.js.
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var added = muts[i].addedNodes;
      for (var j = 0; j < added.length; j++) sweep(added[j]);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { sweep(document.body); });
  } else {
    sweep(document.body);
  }
  addEventListener("load", function () { sweep(document.body); });
})();
