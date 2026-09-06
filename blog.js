/* ============================================================
   Blog runtime — renders the listing (blog.html) and the detail (blog-post.html)
   from window.BLOG_POSTS. Adds SEO meta + JSON-LD on detail pages.
   ============================================================ */
(function () {
  var POSTS = (window.BLOG_POSTS || []).slice().sort(function (a, b) { return new Date(b.publishedDate) - new Date(a.publishedDate); });
  var CATS = window.BLOG_CATEGORIES || [];
  var WA = window.BLOG_WHATSAPP || "https://wa.me/919884599939";
  // Which host is serving this page? The blog lives on its own subdomain, so
  // canonical, og:url and JSON-LD must point at the host the reader is on.
  var SITE = window.BLOG_SITE_BASE ||
    (/^https?:$/.test(location.protocol) ? location.origin : "https://spartacusmartialarts.com");
  var MAIN_SITE = window.SPARTACUS_MAIN_SITE || "https://spartacusmartialarts.com";

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function stripTags(h) { var d = document.createElement("div"); d.innerHTML = h || ""; return (d.textContent || "").trim(); }
  function slugifyId(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function postUrl(slug) { return "blog-post.html?slug=" + encodeURIComponent(slug); }

  /* --- reusable BlogImage (with graceful fallback) --- */
  function blogImage(img, opts) {
    opts = opts || {};
    img = img || {};
    var cls = "bimg" + (opts.rounded === false ? "" : " rounded") + (opts.className ? " " + opts.className : "");
    var ph = '<span class="bimg-ph" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M5 17l5-4 4 3 3-2 2 2"/></svg><small>' + esc(img.title || opts.label || "Spartacus Martial Arts") + "</small></span>";
    var fb = (window.BLOG_FALLBACK_IMG || "images/fallback/blog-placeholder.webp");
    var el = '<img src="' + esc(img.src) + '" alt="' + esc(img.alt || "") + '" title="' + esc(img.title || "") + '" loading="' + (opts.eager ? "eager" : "lazy") + '" decoding="async"' +
      ' onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src=\'' + fb + '\';}else{this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';}">';
    return '<span class="' + cls + '"' + (opts.style ? ' style="' + opts.style + '"' : "") + ">" + el + ph + "</span>";
  }

  function when(p) { return esc(fmtDate(p.publishedDate)) + (p.publishedTime ? " · " + esc(p.publishedTime) : ""); }
  function metaLine(p) {
    return '<span class="blog-meta"><span>' + when(p) + '</span><i class="dot"></i><span>' + esc(p.readingTime || "") + "</span></span>";
  }
  function badges(p) {
    return '<div class="blog-badges"><span class="badge badge-cat">' + esc(p.category) + "</span>" +
      (p.subcategory ? '<span class="badge badge-sub">' + esc(p.subcategory) + "</span>" : "") + "</div>";
  }
  function fmtDate(d) { try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return d || ""; } }

  function card(p) {
    return '<article class="blog-card">' +
      '<a href="' + postUrl(p.slug) + '" aria-label="' + esc(p.title) + '">' + blogImage(p.thumbnailImage || p.featuredImage, { className: "" }) + "</a>" +
      '<div class="blog-card-body">' +
        badges(p) +
        "<h3><a href=\"" + postUrl(p.slug) + "\">" + esc(p.title) + "</a></h3>" +
        "<p>" + esc(p.excerpt) + "</p>" +
        metaLine(p) +
        '<a class="blog-readmore" href="' + postUrl(p.slug) + '">Read Guide →</a>' +
      "</div></article>";
  }
  function featMini(p) {
    return '<a class="feat-mini" href="' + postUrl(p.slug) + '">' + blogImage(p.thumbnailImage || p.featuredImage, { className: "" }) +
      '<div class="fm-body"><span class="badge badge-cat" style="align-self:flex-start">' + esc(p.category) + "</span><h4>" + esc(p.title) + "</h4>" + metaLine(p) + "</div></a>";
  }

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

  function injectSEO(p) {
    var url = SITE + "/" + postUrl(p.slug);
    var img = (p.featuredImage && p.featuredImage.src) ? SITE + "/" + p.featuredImage.src : SITE + "/assets/og-cover.jpg";
    document.title = p.seoTitle || (p.title + " | Spartacus Martial Arts Academy");
    setMeta("description", p.seoDescription || p.excerpt);
    setMeta("keywords", (p.seoKeywords || []).concat(p.geoKeywords || []).join(", "));
    setMeta("author", p.author);
    setLink("canonical", url);
    setMeta("og:type", "article", true); setMeta("og:title", p.seoTitle || p.title, true);
    setMeta("og:description", p.seoDescription || p.excerpt, true); setMeta("og:image", img, true);
    setMeta("og:url", url, true); setMeta("og:site_name", "Spartacus Martial Arts Academy", true);
    setMeta("twitter:card", "summary_large_image"); setMeta("twitter:title", p.seoTitle || p.title);
    setMeta("twitter:description", p.seoDescription || p.excerpt); setMeta("twitter:image", img);

    addJsonLd({
      "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.excerpt,
      image: img, datePublished: p.publishedDate, dateModified: p.publishedDate, mainEntityOfPage: url,
      articleSection: p.category, keywords: (p.seoKeywords || []).join(", "),
      author: { "@type": "Person", name: p.author, jobTitle: p.authorRole },
      publisher: { "@type": "Organization", name: "Spartacus Martial Arts Academy", logo: { "@type": "ImageObject", url: SITE + "/assets/logo.png" } }
    });
    if (p.faqs && p.faqs.length) addJsonLd({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: p.faqs.map(function (f) { return { "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } }; })
    });
    addJsonLd({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: MAIN_SITE + "/index.html" },
        { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog.html" },
        { "@type": "ListItem", position: 3, name: p.title, item: url }
      ]
    });
    addJsonLd({
      "@context": "https://schema.org", "@type": "Person", name: p.author,
      jobTitle: p.authorRole, worksFor: { "@type": "Organization", name: "Spartacus Martial Arts Academy" }, sameAs: ["https://www.instagram.com/kishorekumar.coach/"]
    });
  }

  function renderDetail(root) {
    var slug = getParam("slug");
    var p = POSTS.filter(function (x) { return x.slug === slug; })[0];
    if (!p) { root.innerHTML = '<div class="blog-wrap" style="padding:140px 0 80px;text-align:center"><h1 class="page-title">Article not found</h1><p class="page-sub">This blog post doesn\'t exist. <a href="blog.html" style="color:var(--gold-2)">Back to the blog</a>.</p></div>'; return; }

    injectSEO(p);

    // breadcrumb + head
    root.querySelector("#postCrumbs").innerHTML =
      '<a href="index.html">Home</a><span>/</span><a href="blog.html">Blog</a><span>/</span><a href="blog.html">' + esc(p.category) + "</a><span>/</span>" + esc(p.title);

    root.querySelector("#postHead").innerHTML =
      badges(p) +
      "<h1>" + esc(p.title) + "</h1><p class=\"post-excerpt\">" + esc(p.excerpt) + "</p>" +
      '<div class="post-byline"><span class="av">' + blogImage(p.authorImage, { rounded: false }) + "</span><span>By <b>" + esc(p.author) + "</b></span><i class=\"dot\"></i><span>" + when(p) + "</span><i class=\"dot\"></i><span>" + esc(p.readingTime || "") + "</span></div>";

    // hero image
    root.querySelector("#postHero").innerHTML = blogImage(p.heroImage || p.featuredImage, { eager: true, style: "aspect-ratio:16/9" });

    // body content + inline images + TOC ids
    var body = root.querySelector("#postBody");
    body.innerHTML =
      (p.quickAnswer ? '<div class="quick-answer"><h4>Quick Answer</h4><p>' + esc(p.quickAnswer) + "</p></div>" : "") +
      p.content;
    // insert inline images
    (p.inlineImages || []).forEach(function (im) {
      var fig = document.createElement("figure"); fig.className = "bimg-fig";
      fig.innerHTML = blogImage(im, { style: "aspect-ratio:16/9" }) + (im.caption ? "<figcaption>" + esc(im.caption) + "</figcaption>" : "");
      var ps = body.querySelectorAll("p"), h2s = body.querySelectorAll("h2");
      if (im.placement === "after-introduction" && ps[0]) ps[0].after(fig);
      else if (im.placement === "middle-section" && h2s.length) h2s[Math.floor(h2s.length / 2)].before(fig);
      else body.appendChild(fig);
    });
    // TOC from h2
    var h2s = body.querySelectorAll("h2"), tocHtml = "";
    h2s.forEach(function (h) { var id = slugifyId(h.textContent); h.id = id; tocHtml += '<a href="#' + id + '">' + esc(h.textContent) + "</a>"; });
    var toc = root.querySelector("#postToc");
    if (h2s.length >= 2) { toc.innerHTML = "<h4>On this page</h4>" + tocHtml; } else { toc.style.display = "none"; }

    // FAQ
    if (p.faqs && p.faqs.length) {
      root.querySelector("#postFaq").innerHTML = "<h2>Frequently Asked Questions</h2>" +
        p.faqs.map(function (f) {
          return '<div class="faq-item"><button class="faq-q">' + esc(f.question) + '<span class="pm"></span></button><div class="faq-a"><p>' + esc(f.answer) + "</p></div></div>";
        }).join("");
      bindFaq(root);
    }

    // author box
    root.querySelector("#postAuthor").innerHTML =
      '<span class="av">' + blogImage(p.authorImage, { rounded: false }) + "</span><div><b>" + esc(p.author) + "</b><span>" + esc(p.authorRole) + "</span><p style=\"color:var(--mist);font-size:.9rem;margin-top:8px\">Founder of Spartacus Martial Arts Academy, Chennai. Training kids, students, athletes and adults in Wushu, Kungfu, Karate, Boxing, Kickboxing, Judo, self-defence and athlete-mindset coaching.</p></div>";

    // CTA + disclaimer
    root.querySelector("#postCta").innerHTML =
      "<h3>Join Martial Arts Training in Chennai</h3><p>Looking for martial arts classes in Chennai? Spartacus Martial Arts Academy helps students build discipline, confidence, fitness, focus, and self-defense skills through structured training. Book a free trial class or message Coach Kishore on WhatsApp.</p>" +
      '<div class="hero-actions"><a class="btn btn-primary" href="' + esc(p.ctaLink) + '">' + esc(p.ctaText) + '</a>' +
      '<a class="btn btn-wa" href="' + esc(WA) + '" target="_blank" rel="noopener">WhatsApp Spartacus Academy</a>' +
      '<a class="btn btn-gold" href="tel:+919884599939">Talk to Coach Kishore</a></div>' +
      '<p class="post-disclaimer">This article is for general education. Martial arts training should be practiced under qualified supervision.</p>';

    // related
    var rel = (p.relatedPosts || []).map(function (s) { return POSTS.filter(function (x) { return x.slug === s; })[0]; }).filter(Boolean);
    if (rel.length) {
      root.querySelector("#postRelated").innerHTML =
        '<div class="blog-wrap"><div class="blog-section-head"><h2>Related Guides</h2></div><div class="blog-grid">' + rel.map(card).join("") + "</div></div>";
    }
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
