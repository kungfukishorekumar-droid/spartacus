/* ============================================================
   SPARTACUS — UX / INTERACTION ENGINE
   Loads last on every page. Powers the motion defined in ux.css.

     01  Guards + helpers
     02  Button ripple (event-delegated)
     03  Magnetic CTAs (fine pointers only)
     04  Card 3D tilt
     05  Scroll: progress bar, header state, back-to-top
     06  Reveal on scroll (+ watches injected content)
     07  Count-up stats
     08  Blog TOC scroll-spy
     09  Skip link + smooth anchors

   Every effect is pointer/motion-aware: on touch devices and when the
   OS "reduce motion" setting is on, decorative effects never run.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 01 · GUARDS + HELPERS ---------- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var bound = new WeakSet();

  /* rAF-throttled handler. rAF is paused in hidden/background tabs, so a
     timer races it — otherwise the latch could stay stuck and scroll state
     would stop updating entirely. Whichever fires first wins, once. */
  function onFrame(fn) {
    var ticking = false;
    return function () {
      if (ticking) return;
      ticking = true;
      var done = false;
      var run = function () {
        if (done) return;
        done = true; ticking = false;
        fn();
      };
      requestAnimationFrame(run);
      setTimeout(run, 120);
    };
  }

  /* ---------- 02 · BUTTON RIPPLE ---------- */
  /* Delegated, so buttons injected later (chrome, blog cards) work too. */
  if (!reduced) {
    document.addEventListener("pointerdown", function (e) {
      var btn = e.target.closest && e.target.closest(".btn, .blog-chip, .blog-subchip");
      if (!btn) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var s = document.createElement("span");
      s.className = "rippl";
      s.style.width = s.style.height = size + "px";
      s.style.left = (e.clientX - r.left - size / 2) + "px";
      s.style.top = (e.clientY - r.top - size / 2) + "px";
      if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
      btn.appendChild(s);
      setTimeout(function () { s.remove(); }, 640);
    }, { passive: true });
  }

  /* ---------- 03 · MAGNETIC CTAs ---------- */
  /* The button leans toward the cursor, then springs back. */
  function magnetize(el) {
    if (bound.has(el)) return;
    bound.add(el);
    var strength = 0.22;
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var mx = e.clientX - (r.left + r.width / 2);
      var my = e.clientY - (r.top + r.height / 2);
      el.style.translate = (mx * strength).toFixed(2) + "px " + (my * strength * 0.7).toFixed(2) + "px";
    });
    el.addEventListener("pointerleave", function () { el.style.translate = ""; });
  }

  /* ---------- 04 · CARD 3D TILT ---------- */
  function tiltify(el) {
    if (bound.has(el)) return;
    bound.add(el);
    var max = 6; // degrees — subtle, never disorienting
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = "perspective(900px) rotateX(" + (-py * max).toFixed(2) +
        "deg) rotateY(" + (px * max).toFixed(2) + "deg) translateY(-7px)";
    });
    el.addEventListener("pointerleave", function () { el.style.transform = ""; });
  }

  /* ---------- 05 · SCROLL UI ---------- */
  var bar = document.createElement("div"); bar.id = "sp-progress";
  var top = document.createElement("button");
  top.id = "sp-top"; top.type = "button";
  top.setAttribute("aria-label", "Back to top");
  top.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  top.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });

  var lastY = 0;
  var onScroll = onFrame(function () {
    var y = window.scrollY || 0;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";

    var hdr = $("header");
    if (hdr) {
      hdr.classList.toggle("sp-scrolled", y > 20);
      // hide when scrolling down past the fold, reveal on any scroll up
      if (!reduced) hdr.classList.toggle("sp-hide", y > lastY && y > 420);
    }
    top.classList.toggle("show", y > 640);
    lastY = y;
  });

  /* ---------- 06 · REVEAL ON SCROLL ---------- */
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }

  function scan() {
    // reveal targets
    $$("[data-anim]:not(.in), .reveal:not(.in)").forEach(function (el) {
      if (bound.has(el)) return;
      bound.add(el);
      if (reduced || !io) { el.classList.add("in"); return; }
      io.observe(el);
    });
    if (reduced || !fine) return;
    // pointer-driven effects — desktop only
    $$(".btn-primary, .btn-gold, .wa-float").forEach(magnetize);
    $$(".prog-card, .auth-card, .join-card, .fees-card").forEach(tiltify);
  }

  /* ---------- 07 · COUNT-UP STATS ---------- */
  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    var suffix = el.dataset.suffix || "";
    if (reduced) { el.textContent = target + suffix; return; }
    var dur = 1400, t0 = performance.now();
    (function step(now) {
      var p = Math.min((now - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);           // ease-out cubic
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  function watchCounters() {
    var els = $$("[data-count]");
    if (!els.length || !("IntersectionObserver" in window)) { els.forEach(countUp); return; }
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        countUp(en.target); cio.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- 08 · BLOG TOC SCROLL-SPY ---------- */
  function tocSpy() {
    var links = $$(".toc a");
    if (!links.length) return;
    var map = links.map(function (a) {
      return { a: a, el: document.getElementById(decodeURIComponent(a.hash.slice(1))) };
    }).filter(function (x) { return x.el; });
    if (!map.length) return;
    window.addEventListener("scroll", onFrame(function () {
      var y = window.scrollY + 140, cur = map[0];
      map.forEach(function (m) { if (m.el.offsetTop <= y) cur = m; });
      links.forEach(function (a) { a.classList.toggle("toc-on", a === cur.a); });
    }), { passive: true });
  }

  /* ---------- 09 · SKIP LINK ---------- */
  function skipLink() {
    if ($(".sp-skip")) return;
    var main = $("main") || $("section");
    if (!main) return;
    if (!main.id) main.id = "sp-main";
    var a = document.createElement("a");
    a.className = "sp-skip"; a.href = "#" + main.id; a.textContent = "Skip to content";
    document.body.insertAdjacentElement("afterbegin", a);
  }

  /* ---------- INIT ---------- */
  function init() {
    document.body.appendChild(bar);
    document.body.appendChild(top);
    skipLink();
    scan();
    watchCounters();
    tocSpy();
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Chrome/blog content is injected by app.js and blog.js — re-scan when
    // the DOM changes so late elements still animate. Debounced.
    if ("MutationObserver" in window) {
      var t;
      new MutationObserver(function () {
        clearTimeout(t);
        t = setTimeout(function () { scan(); skipLink(); }, 120);
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
