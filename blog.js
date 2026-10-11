/* ============================================================
   Blog runtime — renders the listing (blog.html) and the detail (blog-post.html)
   from window.BLOG_POSTS. Adds SEO meta + JSON-LD on detail pages.
   ============================================================ */
(function () {
  // Every HTML builder lives in blog-render.js (pure functions), shared with
  // the build's pre-renderer so the two can never drift.
  var R = window.SPBlogRender;
  var POSTS = R.sortPosts(window.BLOG_POSTS || []);
  var CATS = window.BLOG_CATEGORIES || [];
  var WA = window.BLOG_WHATSAPP || "https://wa.me/919884599939";
  // Which host is serving this page? The blog lives on its own subdomain, so
  // canonical, og:url and JSON-LD must point at the host the reader is on.
  var SITE = window.BLOG_SITE_BASE ||
    (/^https?:$/.test(location.protocol) ? location.origin : "https://spartacusmartialarts.com");
  var MAIN_SITE = window.SPARTACUS_MAIN_SITE || "https://spartacusmartialarts.com";
  var FB = window.BLOG_FALLBACK_IMG || "images/fallback/blog-placeholder.webp";
  var esc = R.esc, postUrl = R.postUrl, when = R.when, metaLine = R.metaLine, badges = R.badges, fmtDate = R.fmtDate;
  function stripTags(h) { return R.textOf(h).trim(); }
  function slugifyId(t) { return R.slugifyId(t); }
  function blogImage(img, opts) { return R.blogImage(img, opts, FB); }
  function card(p) { return R.card(p, FB); }
  function featMini(p) { return R.featMini(p, FB); }

  /* ======================= LISTING PAGE ======================= */
  function renderListing(root) {
    var state = { cat: "all", sub: "all", q: "", shown: 12 };

    // Hero credibility line: keep the guide count accurate as posts are added.
    var heroCount = root.querySelector("#blogHeroCount");
    if (heroCount) heroCount.textContent = POSTS.length;

    var featured = POSTS[0];
    var featSide = POSTS.slice(1, 4);
    root.querySelector("#blogFeatured").innerHTML =
      '<div class="feat-main"><a href="' + postUrl(featured.slug) + '">' + blogImage(featured.featuredImage, { eager: true }) + "</a>" +
      '<div class="blog-card-body"><div class="blog-badges"><span class="badge badge-cat">Featured</span><span class="badge badge-sub">' + esc(featured.category) + "</span></div>" +
      "<h3><a href=\"" + postUrl(featured.slug) + "\">" + esc(featured.title) + "</a></h3><p>" + esc(featured.excerpt) + "</p>" + metaLine(featured) +
      '<a class="blog-readmore" href="' + postUrl(featured.slug) + '">Read Guide →</a></div></div>' +
      '<div class="feat-side">' + featSide.map(featMini).join("") + "</div>";

    // category chips
    var catBar = root.querySelector("#blogCats");
    catBar.innerHTML = '<button class="blog-chip active" data-cat="all">All</button>' +
      CATS.map(function (c) { return '<button class="blog-chip" data-cat="' + esc(c.name) + '">' + esc(c.name) + "</button>"; }).join("");

    var subBar = root.querySelector("#blogSubs");

    function renderSubs() {
      if (state.cat === "all") { subBar.innerHTML = ""; return; }
      var c = CATS.filter(function (x) { return x.name === state.cat; })[0];
      if (!c || !c.subs || !c.subs.length) { subBar.innerHTML = ""; return; }
      subBar.innerHTML = '<button class="blog-subchip active" data-sub="all">All ' + esc(c.name) + "</button>" +
        c.subs.map(function (s) { return '<button class="blog-subchip" data-sub="' + esc(s) + '">' + esc(s) + "</button>"; }).join("");
    }

    function filtered() {
      var q = state.q.toLowerCase();
      return POSTS.filter(function (p) {
        if (state.cat !== "all" && p.category !== state.cat) return false;
        if (state.sub !== "all" && p.subcategory !== state.sub) return false;
        if (q) {
          var hay = (p.title + " " + p.excerpt + " " + (p.seoKeywords || []).join(" ") + " " + p.category + " " + (p.subcategory || "")).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
    }
    /* Render in pages. Dumping all 126 cards at once built a ~27,000px wall
       of articles and a needlessly heavy DOM; showing a page at a time is
       both faster and far easier to scan. Filtering/searching resets to
       page one. */
    var PAGE = 12;
    function renderGrid(reset) {
      if (reset !== false) state.shown = PAGE;
      var list = filtered();
      var grid = root.querySelector("#blogGrid");
      var slice = list.slice(0, state.shown);

      grid.innerHTML = list.length
        ? slice.map(card).join("")
        : '<div class="blog-empty">No articles found. Try another search or category.</div>';
      root.querySelector("#blogCount").textContent = list.length + " article" + (list.length === 1 ? "" : "s");

      // "Load more" lives after the grid and is rebuilt on every render
      var more = root.querySelector("#blogMore");
      if (!more) {
        more = document.createElement("div");
        more.id = "blogMore";
        more.className = "blog-more";
        grid.parentNode.insertBefore(more, grid.nextSibling);
      }
      var remaining = list.length - slice.length;
      if (remaining > 0) {
        more.innerHTML = '<div><button type="button" id="blogMoreBtn">Load more articles</button>' +
          '<span class="more-left">' + remaining + " more</span></div>";
      } else {
        more.innerHTML = "";
      }
    }

    // one delegated listener, so it survives every re-render
    root.addEventListener("click", function (e) {
      if (!e.target.closest("#blogMoreBtn")) return;
      state.shown += PAGE;
      renderGrid(false);
    });

    catBar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]"); if (!b) return;
      state.cat = b.dataset.cat; state.sub = "all";
      catBar.querySelectorAll(".blog-chip").forEach(function (x) { x.classList.toggle("active", x === b); });
      renderSubs(); renderGrid();
    });
    subBar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-sub]"); if (!b) return;
      state.sub = b.dataset.sub;
      subBar.querySelectorAll(".blog-subchip").forEach(function (x) { x.classList.toggle("active", x === b); });
      renderGrid();
    });
    var search = root.querySelector("#blogSearchInput");
    search.addEventListener("input", function () { state.q = search.value.trim(); renderGrid(); });

    renderSubs(); renderGrid();

    // Parent Guide + Chennai Martial Arts feature rows (if the sections exist)
    var pgEl = root.querySelector("#parentGrid");
    if (pgEl) pgEl.innerHTML = POSTS.filter(function (p) { return p.category === "Parent Guide"; }).slice(0, 3).map(card).join("");
    var chEl = root.querySelector("#chennaiGrid");
    if (chEl) chEl.innerHTML = POSTS.filter(function (p) { return p.category === "Chennai Martial Arts"; }).slice(0, 3).map(card).join("");
  }

  /* ======================= DETAIL PAGE ======================= */
  function getParam(n) { return new URLSearchParams(window.location.search).get(n); }

  function setMeta(key, val, isProp) {
    if (!val) return;
    var sel = isProp ? 'meta[property="' + key + '"]' : 'meta[name="' + key + '"]';
    var m = document.head.querySelector(sel);
    if (!m) { m = document.createElement("meta"); m.setAttribute(isProp ? "property" : "name", key); document.head.appendChild(m); }
    m.setAttribute("content", val);
  }
  function setLink(rel, href) {
    var l = document.head.querySelector('link[rel="' + rel + '"]');
    if (!l) { l = document.createElement("link"); l.setAttribute("rel", rel); document.head.appendChild(l); }
    l.setAttribute("href", href);
  }
  function addJsonLd(obj) {
    var s = document.createElement("script"); s.type = "application/ld+json";
    s.textContent = JSON.stringify(obj); document.head.appendChild(s);
  }

  function injectSEO(d) {
    document.title = d.title;
    setMeta("description", d.description);
    setMeta("keywords", d.keywords);
    setLink("canonical", d.url);
    setMeta("og:type", "article", true); setMeta("og:title", d.title, true);
    setMeta("og:description", d.description, true); setMeta("og:image", d.image, true);
    setMeta("og:url", d.url, true); setMeta("og:site_name", "Spartacus Martial Arts Academy", true);
    setMeta("twitter:card", "summary_large_image"); setMeta("twitter:title", d.title);
    setMeta("twitter:description", d.description); setMeta("twitter:image", d.image);
    d.jsonld.forEach(addJsonLd);
  }

  function renderDetail(root) {
    // Pre-rendered by the build: the article is already in the HTML (and no
    // post data was loaded). Only the interactive parts need wiring.
    // (No bindFaq here: app.js binds every .faq-q present at boot, and on a
    // pre-rendered page the FAQ is already there — a second handler made each
    // click open and then immediately close the answer.)
    if (root.hasAttribute("data-prerendered")) return;

    var slug = getParam("slug");
    var p = POSTS.filter(function (x) { return x.slug === slug; })[0];
    if (!p) { root.innerHTML = '<div class="blog-wrap" style="padding:140px 0 80px;text-align:center"><h1 class="page-title">Article not found</h1><p class="page-sub">This blog post doesn\'t exist. <a href="blog.html" style="color:var(--gold-2)">Back to the blog</a>.</p></div>'; return; }

    var d = R.buildDetail(p, POSTS, { site: SITE, mainSite: MAIN_SITE, wa: WA, fallback: FB });
    setMeta("author", p.author);
    injectSEO(d);
    root.querySelector("#postCrumbs").innerHTML = d.crumbs;
    root.querySelector("#postHead").innerHTML = d.head;
    root.querySelector("#postHero").innerHTML = d.hero;
    root.querySelector("#postBody").innerHTML = d.body;
    var toc = root.querySelector("#postToc");
    if (d.toc) toc.innerHTML = d.toc; else toc.style.display = "none";
    if (d.faq) { root.querySelector("#postFaq").innerHTML = d.faq; bindFaq(root); }
    root.querySelector("#postAuthor").innerHTML = d.author;
    root.querySelector("#postCta").innerHTML = d.cta;
    if (d.related) root.querySelector("#postRelated").innerHTML = d.related;
  }

  function bindFaq(root) {
    root.querySelectorAll(".faq-q").forEach(function (q) {
      q.addEventListener("click", function () {
        var item = q.parentElement, open = item.classList.contains("open");
        root.querySelectorAll(".faq-item").forEach(function (i) { i.classList.remove("open"); var a = i.querySelector(".faq-a"); if (a) a.style.maxHeight = null; });
        if (!open) { item.classList.add("open"); var a = item.querySelector(".faq-a"); a.style.maxHeight = a.scrollHeight + "px"; }
      });
    });
  }

  function boot() {
    var list = document.getElementById("blogListing");
    var detail = document.getElementById("blogPost");
    if (list) renderListing(list);
    if (detail) renderDetail(detail);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
