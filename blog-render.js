/* ============================================================
   Blog renderer — pure functions: post data in, HTML strings out.
   No DOM, no window. Used in two places so they can never drift:
     - the browser (blog.js) for the listing and any page that was not
       pre-rendered, and
     - the build (tools/prerender-posts.mjs), which writes every article
       as a complete static HTML file.
   Exposed as window.SPBlogRender in the browser, module.exports in Node.
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SPBlogRender = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Newest first. publishedTime is part of the key: several posts share a
     publishedDate, and sorting on the date alone left same-day posts in
     arbitrary order. */
  function postStamp(p) {
    var t = 0, m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(p.publishedTime || "");
    if (m) { var h = parseInt(m[1], 10) % 12; if (/PM/i.test(m[3])) h += 12; t = h * 60 + parseInt(m[2], 10); }
    return new Date(p.publishedDate).getTime() + t * 60000;
  }
  function sortPosts(list) { return list.slice().sort(function (a, b) { return postStamp(b) - postStamp(a); }); }

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  // what a browser's textContent would give for a small HTML fragment
  function textOf(html) {
    return String(html || "").replace(/<[^>]*>/g, "")
      .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); })
      .replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); })
      .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  }
  function slugifyId(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function postUrl(slug) { return "blog-post.html?slug=" + encodeURIComponent(slug); }
  function fmtDate(d) { try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return d || ""; } }
  function when(p) { return esc(fmtDate(p.publishedDate)) + (p.publishedTime ? " · " + esc(p.publishedTime) : ""); }

  /* reusable BlogImage (with graceful fallback) */
  function blogImage(img, opts, fallback) {
    opts = opts || {}; img = img || {};
    var fb = fallback || "images/fallback/blog-placeholder.webp";
    var cls = "bimg" + (opts.rounded === false ? "" : " rounded") + (opts.className ? " " + opts.className : "");
    var ph = '<span class="bimg-ph" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M5 17l5-4 4 3 3-2 2 2"/></svg><small>' + esc(img.title || opts.label || "Spartacus Martial Arts") + "</small></span>";
    var el = '<img src="' + esc(img.src) + '" alt="' + esc(img.alt || "") + '" title="' + esc(img.title || "") + '" loading="' + (opts.eager ? "eager" : "lazy") + '" decoding="async"' +
      ' onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src=\'' + fb + '\';}else{this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';}">';
    return '<span class="' + cls + '"' + (opts.style ? ' style="' + opts.style + '"' : "") + ">" + el + ph + "</span>";
  }
  function metaLine(p) { return '<span class="blog-meta"><span>' + when(p) + '</span><i class="dot"></i><span>' + esc(p.readingTime || "") + "</span></span>"; }
  function badges(p) {
    return '<div class="blog-badges"><span class="badge badge-cat">' + esc(p.category) + "</span>" +
      (p.subcategory ? '<span class="badge badge-sub">' + esc(p.subcategory) + "</span>" : "") + "</div>";
  }
  function card(p, fb) {
    return '<article class="blog-card">' +
      '<a href="' + postUrl(p.slug) + '" aria-label="' + esc(p.title) + '">' + blogImage(p.thumbnailImage || p.featuredImage, { className: "" }, fb) + "</a>" +
      '<div class="blog-card-body">' + badges(p) +
        "<h3><a href=\"" + postUrl(p.slug) + "\">" + esc(p.title) + "</a></h3>" +
        "<p>" + esc(p.excerpt) + "</p>" + metaLine(p) +
        '<a class="blog-readmore" href="' + postUrl(p.slug) + '">Read Guide →</a>' +
      "</div></article>";
  }
  function featMini(p, fb) {
    return '<a class="feat-mini" href="' + postUrl(p.slug) + '">' + blogImage(p.thumbnailImage || p.featuredImage, { className: "" }, fb) +
      '<div class="fm-body"><span class="badge badge-cat" style="align-self:flex-start">' + esc(p.category) + "</span><h4>" + esc(p.title) + "</h4>" + metaLine(p) + "</div></a>";
  }

  /* ---------- the article page ----------
     env: { site, mainSite, wa, fallback }  →  every piece of the page as HTML,
     plus the head data (title, meta, canonical, JSON-LD). */
  function buildDetail(p, posts, env) {
    env = env || {};
    var SITE = env.site, MAIN = env.mainSite, fb = env.fallback;
    var url = SITE + "/" + postUrl(p.slug);
    var img = (p.featuredImage && p.featuredImage.src) ? SITE + "/" + p.featuredImage.src : SITE + "/assets/og-cover.jpg";
    var title = p.seoTitle || (p.title + " | Spartacus Martial Arts Academy");
    var desc = p.seoDescription || p.excerpt;

    // body: quick answer + article content, inline images placed, h2 ids
    var content = p.content || "";
    (p.inlineImages || []).forEach(function (im) {
      var fig = '<figure class="bimg-fig">' + blogImage(im, { style: "aspect-ratio:16/9" }, fb) + (im.caption ? "<figcaption>" + esc(im.caption) + "</figcaption>" : "") + "</figure>";
      var h2s = [], re = /<h2\b/g, m;
      while ((m = re.exec(content))) h2s.push(m.index);
      var firstP = content.indexOf("</p>");
      if (im.placement === "after-introduction" && firstP > -1) {
        // after the article's first paragraph (not inside the Quick Answer box)
        content = content.slice(0, firstP + 4) + fig + content.slice(firstP + 4);
      } else if (im.placement === "middle-section" && h2s.length) {
        var at = h2s[Math.floor(h2s.length / 2)];
        content = content.slice(0, at) + fig + content.slice(at);
      } else {
        content += fig;
      }
    });
    var toc = [];
    content = content.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, function (_, attrs, inner) {
      var text = textOf(inner), id = slugifyId(text);
      toc.push('<a href="#' + id + '">' + esc(text) + "</a>");
      return '<h2' + attrs.replace(/\s+id="[^"]*"/, "") + ' id="' + id + '">' + inner + "</h2>";
    });
    var body = (p.quickAnswer ? '<div class="quick-answer"><h4>Quick Answer</h4><p>' + esc(p.quickAnswer) + "</p></div>" : "") + content;

    var rel = (p.relatedPosts || []).map(function (s) { return posts.filter(function (x) { return x.slug === s; })[0]; }).filter(Boolean);

    var jsonld = [{
      "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.excerpt,
      image: img, datePublished: p.publishedDate, dateModified: p.updatedDate || p.publishedDate, mainEntityOfPage: url,
      articleSection: p.category, keywords: (p.seoKeywords || []).join(", "),
      author: { "@type": "Person", name: p.author, jobTitle: p.authorRole },
      publisher: { "@type": "Organization", name: "Spartacus Martial Arts Academy", logo: { "@type": "ImageObject", url: SITE + "/assets/logo.png" } }
    }];
    if (p.faqs && p.faqs.length) jsonld.push({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: p.faqs.map(function (f) { return { "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } }; })
    });
    jsonld.push({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: MAIN + "/index.html" },
        { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog.html" },
        { "@type": "ListItem", position: 3, name: p.title, item: url }
      ]
    });
    jsonld.push({
      "@context": "https://schema.org", "@type": "Person", name: p.author,
      jobTitle: p.authorRole, worksFor: { "@type": "Organization", name: "Spartacus Martial Arts Academy" }, sameAs: ["https://www.instagram.com/kishorekumar.coach/"]
    });

    return {
      url: url, title: title, description: desc, image: img,
      keywords: (p.seoKeywords || []).concat(p.geoKeywords || []).join(", "),
      jsonld: jsonld,
      crumbs: '<a href="index.html">Home</a><span>/</span><a href="blog.html">Blog</a><span>/</span><a href="blog.html">' + esc(p.category) + "</a><span>/</span>" + esc(p.title),
      head: badges(p) + "<h1>" + esc(p.title) + "</h1><p class=\"post-excerpt\">" + esc(p.excerpt) + "</p>" +
        '<div class="post-byline"><span class="av">' + blogImage(p.authorImage, { rounded: false }, fb) + "</span><span>By <b>" + esc(p.author) + "</b></span><i class=\"dot\"></i><span>" + when(p) + "</span>" +
        (p.updatedDate && p.updatedDate !== p.publishedDate ? "<i class=\"dot\"></i><span>Updated " + esc(fmtDate(p.updatedDate)) + "</span>" : "") + "<i class=\"dot\"></i><span>" + esc(p.readingTime || "") + "</span></div>",
      hero: blogImage(p.heroImage || p.featuredImage, { eager: true, style: "aspect-ratio:16/9" }, fb),
      body: body,
      toc: toc.length >= 2 ? "<h4>On this page</h4>" + toc.join("") : "",
      faq: (p.faqs && p.faqs.length) ? "<h2>Frequently Asked Questions</h2>" + p.faqs.map(function (f) {
        return '<div class="faq-item"><button class="faq-q">' + esc(f.question) + '<span class="pm"></span></button><div class="faq-a"><p>' + esc(f.answer) + "</p></div></div>";
      }).join("") : "",
      author: '<span class="av">' + blogImage(p.authorImage, { rounded: false }, fb) + "</span><div><b>" + esc(p.author) + "</b><span>" + esc(p.authorRole) + "</span><p style=\"color:var(--mist);font-size:.9rem;margin-top:8px\">Founder of Spartacus Martial Arts Academy, Chennai. Training kids, students, athletes and adults in Wushu, Kungfu, Karate, Boxing, Kickboxing, Judo, self-defence and athlete-mindset coaching.</p></div>",
      cta: "<h3>Join Martial Arts Training in Chennai</h3><p>Looking for martial arts classes in Chennai? Spartacus Martial Arts Academy helps students build discipline, confidence, fitness, focus, and self-defense skills through structured training. Book a free trial class or message Coach Kishore on WhatsApp.</p>" +
        '<div class="hero-actions"><a class="btn btn-primary" href="' + esc(p.ctaLink) + '">' + esc(p.ctaText) + '</a>' +
        '<a class="btn btn-wa" href="' + esc(env.wa) + '" target="_blank" rel="noopener">WhatsApp Spartacus Academy</a>' +
        '<a class="btn btn-gold" href="tel:+919884599939">Talk to Coach Kishore</a></div>' +
        '<p class="post-disclaimer">This article is for general education. Martial arts training should be practiced under qualified supervision.</p>',
      related: rel.length ? '<div class="blog-wrap"><div class="blog-section-head"><h2>Related Guides</h2></div><div class="blog-grid">' + rel.map(function (r) { return card(r, fb); }).join("") + "</div></div>" : ""
    };
  }

  return { postStamp: postStamp, sortPosts: sortPosts, esc: esc, textOf: textOf, slugifyId: slugifyId, postUrl: postUrl,
           fmtDate: fmtDate, when: when, blogImage: blogImage, metaLine: metaLine, badges: badges, card: card, featMini: featMini,
           buildDetail: buildDetail };
});
