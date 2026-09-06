/* ============================================================
   SPARTACUS — FX ENGINE
   Loads after ux.js. Powers fx.css.

     A  Guards + shared helpers
     B  Gold dust canvas field
     C  Sparkle burst on click
     D  Auto-tagging (no HTML edits needed)
     E  Heading animation (shine / word reveal)
     F  Cursor spotlight on cards
     G  Scroll parallax
     H  Reveal observer for fx elements

   Design notes:
   - Everything is transform/opacity only, so it stays on the GPU.
   - The canvas pauses completely when the tab is hidden (battery).
   - Word-splitting is skipped on headings containing markup (e.g.
     .gold-text) so the gradient-clipped text is never broken.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- A · GUARDS + HELPERS ---------- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var small = window.matchMedia("(max-width: 640px)").matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function onFrame(fn) {              // rAF throttle that can't latch (see ux.js)
    var ticking = false;
    return function () {
      if (ticking) return;
      ticking = true;
      var done = false;
      var run = function () { if (done) return; done = true; ticking = false; fn(); };
      requestAnimationFrame(run);
      setTimeout(run, 120);
    };
  }

  /* ---------- B · GOLD DUST CANVAS ---------- */
  function dustField() {
    if (reduced) return;
    var cv = document.createElement("canvas");
    cv.id = "fx-dust";
    document.body.appendChild(cv);
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, parts = [], raf = null;
    var COUNT = small ? 26 : 54;      // deliberately low — this runs every frame

    function size() {
      W = cv.width = Math.floor(innerWidth * dpr);
      H = cv.height = Math.floor(innerHeight * dpr);
      cv.style.width = innerWidth + "px";
      cv.style.height = innerHeight + "px";
    }
    function seed() {
      parts = [];
      for (var i = 0; i < COUNT; i++) {
        parts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: (Math.random() * 1.6 + 0.5) * dpr,
          vy: -(Math.random() * 0.22 + 0.05) * dpr,   // drifts upward
          vx: (Math.random() - 0.5) * 0.16 * dpr,
          a: Math.random() * Math.PI * 2,             // twinkle phase
          sp: Math.random() * 0.02 + 0.008,
          gold: Math.random() > 0.22                  // a few red embers
        });
      }
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.a += p.sp;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        var tw = 0.35 + Math.abs(Math.sin(p.a)) * 0.65;   // twinkle
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        var c = p.gold ? "233,196,90" : "225,29,42";
        g.addColorStop(0, "rgba(255,246,216," + (tw * 0.95) + ")");
        g.addColorStop(0.35, "rgba(" + c + "," + (tw * 0.7) + ")");
        g.addColorStop(1, "rgba(" + c + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    function start() { if (!raf) raf = requestAnimationFrame(draw); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    size(); seed(); start();
    addEventListener("resize", onFrame(function () { size(); seed(); }), { passive: true });
    // never burn CPU on a tab nobody is looking at
    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });
  }

  /* ---------- C · SPARKLE BURST ---------- */
  function sparkles() {
    if (reduced) return;
    document.addEventListener("pointerdown", function (e) {
      var t = e.target.closest && e.target.closest(".btn, .blog-chip, .wa-float");
      if (!t) return;
      var n = 10;
      for (var i = 0; i < n; i++) {
        var s = document.createElement("span");
        s.className = "sprk";
        var ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
        var dist = 26 + Math.random() * 40;
        s.style.left = e.clientX + "px";
        s.style.top = e.clientY + "px";
        s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        s.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        s.style.setProperty("--sd", (0.55 + Math.random() * 0.4) + "s");
        document.body.appendChild(s);
        setTimeout(function (el) { return function () { el.remove(); }; }(s), 1000);
      }
    }, { passive: true });
  }

  /* ---------- D · AUTO-TAGGING ---------- */
  /* Adds the fx hooks to existing markup so no HTML file needs editing,
     and late-injected content (chrome, blog cards) is picked up too. */
  function tag() {
    $$("section").forEach(function (el) { el.classList.add("fx-sec"); });
    if (fine) $$(".card,.prog-card,.blog-card,.auth-card,.join-card,.fees-card,.review")
      .forEach(function (el) { el.classList.add("fx-spot"); });
    $$(".section-title,.page-title,.hero-copy h1").forEach(function (el) {
      el.classList.add("fx-shine");
      splitWords(el);
    });
    $$(".eyebrow").forEach(function (el) { el.classList.add("twinkle"); });
    $$(".prog-card img,.g-item img").forEach(function (el) { el.classList.add("fx-wipe"); });
    observe();
  }

  /* ---------- E · HEADING WORD REVEAL ---------- */
  /* Splits plain text into per-word units, but treats any child ELEMENT
     (e.g. <span class="gold-text">) as ONE unit and moves it across intact —
     splitting inside it would break its background-clip:text gradient. */
  function splitWords(el) {
    if (reduced) return;
    /* Guard on the RESULT, not a flag: app.js's content engine rewrites
       these headings from content.json after we run, wiping the split. A
       flag would block re-applying; checking for .w children lets the
       MutationObserver rebuild it, and no-ops once it's there. */
    if (el.querySelector(".w")) return;

    var units = [];                                  // each = a Node to wrap
    Array.prototype.forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3) {                        // text → one unit per word
        n.textContent.split(/\s+/).forEach(function (w) {
          if (w) units.push(document.createTextNode(w));
        });
      } else if (n.nodeType === 1) {
        units.push(n.cloneNode(true));               // element → keep whole
      }
    });
    if (units.length < 2 || units.length > 16) return;

    var frag = document.createDocumentFragment();
    units.forEach(function (node, i) {
      var w = document.createElement("span");
      w.className = "w"; w.style.setProperty("--i", i);
      var inner = document.createElement("i");
      inner.appendChild(node);
      w.appendChild(inner);
      frag.appendChild(w);
      frag.appendChild(document.createTextNode(" "));
    });
    el.innerHTML = "";
    el.appendChild(frag);
    el.classList.add("fx-words");
  }

  /* ---------- F · CURSOR SPOTLIGHT ---------- */
  function spotlight() {
    if (!fine || reduced) return;
    document.addEventListener("pointermove", function (e) {
      var c = e.target.closest && e.target.closest(".fx-spot");
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      c.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    }, { passive: true });
  }

  /* ---------- G · SCROLL PARALLAX ---------- */
  function parallax() {
    if (reduced || small) return;
    var items = $$(".hero-photo,.hero-media,.parents-media,.about-media");
    if (!items.length) return;
    items.forEach(function (el) { el.classList.add("fx-par"); });
    var run = onFrame(function () {
      var vh = innerHeight;
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;   // offscreen: skip
        var mid = r.top + r.height / 2;
        var off = ((mid - vh / 2) / vh) * -26;             // max ±26px
        el.style.setProperty("--py", off.toFixed(1) + "px");
      });
    });
    addEventListener("scroll", run, { passive: true });
    run();
  }

  /* ---------- H · REVEAL OBSERVER ---------- */
  var io = null;
  function observe() {
    var targets = $$(".fx-sec:not(.in),.fx-shine:not(.in),.fx-words:not(.in),.fx-wipe:not(.in)");
    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add("in");
          io.unobserve(en.target);
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -60px 0px" });
    }
    targets.forEach(function (el) { io.observe(el); });   // re-observing is a no-op
  }

  /* ---------- SAFETY NET ---------- */
  /* Word-reveal starts at opacity:0 and waits for IntersectionObserver.
     If IO is throttled, blocked, or never fires, a headline would stay
     invisible — unacceptable for the hero. So anything already at or above
     the fold is forced visible shortly after load; below-fold items keep
     their scroll animation. */
  function safetyNet() {
    setTimeout(function () {
      $$(".fx-words:not(.in),.fx-shine:not(.in),.fx-wipe:not(.in)").forEach(function (el) {
        if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in");
      });
    }, 1600);
  }

  /* ---------- INIT ---------- */
  function init() {
    dustField();
    sparkles();
    tag();
    spotlight();
    parallax();
    safetyNet();
    if ("MutationObserver" in window) {
      var t;
      new MutationObserver(function () {
        clearTimeout(t);
        t = setTimeout(function () { tag(); safetyNet(); }, 150);   // re-tag injected/rewritten content
      }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
