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
     I  3D photo stage (lean, floating badges, arena ring) — home + about
     I2 Page-header depth planes + arena ring (opt-in: data-fx="stage")
     J  Kinetic marquee (answers scroll speed + direction)
     K  3D buttons (tilt toward pointer, moving highlight)

   Design notes:
   - Everything is transform/opacity only, so it stays on the GPU.
   - The canvas pauses completely when the tab is hidden (battery).
   - Word-splitting is skipped on headings containing markup (e.g.
     .gold-text) so the gradient-clipped text is never broken.
   ============================================================ */
(function () {
  "use strict";

  /* Page transitions (styles.css) are skipped by the browser when a tab is
     hidden or navigates mid-transition; unobserved, that surfaces as an
     "Uncaught (in promise) AbortError" in the console. It's harmless, so
     observe the promises and let it pass silently. */
  addEventListener("pagereveal", function (e) {
    var vt = e.viewTransition;
    if (vt) { vt.ready["catch"](function () {}); vt.finished["catch"](function () {}); }
  });

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

  /* ---------- B · GOLD DUST CANVAS (3D depth field) ---------- */
  /* Each mote has a depth z (0.25 far … 1 near). Near motes are bigger,
     brighter, drift faster and shift more with the pointer and the scroll —
     that parallax is what makes a flat canvas read as a volume of air.
     The glow is painted ONCE into two sprite canvases and stamped with
     drawImage; building a radial gradient per mote per frame (the old way)
     was the single most expensive thing on the page. */
  function sprite(rgb) {
    var s = document.createElement("canvas"), n = 64, c = s.getContext("2d");
    s.width = s.height = n;
    var g = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, "rgba(255,246,216,1)");
    g.addColorStop(0.3, "rgba(" + rgb + ",.75)");
    g.addColorStop(1, "rgba(" + rgb + ",0)");
    c.fillStyle = g; c.fillRect(0, 0, n, n);
    return s;
  }
  function dustField() {
    if (reduced) return;
    var cv = document.createElement("canvas");
    cv.id = "fx-dust";
    document.body.appendChild(cv);
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, parts = [], raf = null;
    var COUNT = small ? 30 : 64;      // deliberately low — this runs every frame
    var GOLD = sprite("233,196,90"), RED = sprite("225,29,42");
    var px = 0, py = 0, tx = 0, ty = 0;   // eased pointer offset, -0.5…0.5

    function size() {
      W = cv.width = Math.floor(innerWidth * dpr);
      H = cv.height = Math.floor(innerHeight * dpr);
      cv.style.width = innerWidth + "px";
      cv.style.height = innerHeight + "px";
    }
    function seed() {
      parts = [];
      for (var i = 0; i < COUNT; i++) {
        var z = 0.25 + Math.pow(Math.random(), 1.6) * 0.75;   // most motes far away
        parts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          z: z,
          s: (3 + z * 9) * dpr,                        // sprite size
          vy: -(0.05 + z * 0.3) * dpr,                 // near motes rise faster
          vx: (Math.random() - 0.5) * 0.16 * dpr,
          a: Math.random() * Math.PI * 2,              // twinkle phase
          sp: Math.random() * 0.02 + 0.008,
          gold: Math.random() > 0.22                   // a few red embers
        });
      }
    }
    function wrap(v, m) { return ((v % m) + m) % m; }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      var scrollShift = scrollY * dpr;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.a += p.sp;
        if (p.y < -H) p.y += H;                        // keep numbers small
        var x = wrap(p.x - px * 60 * p.z * dpr, W + 40) - 20;
        var y = wrap(p.y - py * 40 * p.z * dpr - scrollShift * p.z * 0.35, H + 40) - 20;
        var tw = 0.35 + Math.abs(Math.sin(p.a)) * 0.65;   // twinkle
        ctx.globalAlpha = tw * (0.35 + p.z * 0.65);
        ctx.drawImage(p.gold ? GOLD : RED, x - p.s / 2, y - p.s / 2, p.s, p.s);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    function start() { if (!raf) raf = requestAnimationFrame(draw); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    size(); seed(); start();
    if (fine) addEventListener("pointermove", function (e) {
      tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5;
    }, { passive: true });
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
    /* staggered groups: each child gets its index for the CSS delay */
    [["#method .grid", "fx-steps"], ["#benefitGrid", "fx-strike"]].forEach(function (g) {
      $$(g[0]).forEach(function (el) {
        if (!el.children.length) return;           // benefitGrid is filled by app.js
        el.classList.add(g[1]);
        Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty("--i", i); });
      });
    });
    $$("#coach .hl-row").forEach(function (el) {
      el.classList.add("fx-strike");
      Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty("--i", i); });
    });
    /* program cards swing in one by one as each reaches the viewport;
       --c staggers the cards of one row on wide screens */
    $$("#programGrid > .prog-card").forEach(function (el, i) {
      el.classList.add("fx-deal"); el.style.setProperty("--c", i % 3);
    });
    $$(".fees-card,.final-cta").forEach(function (el) {     // not .form-card: the booking form stays instantly visible
      el.classList.add("fx-rise");
      if (el.parentElement) el.parentElement.classList.add("fx-rise-host");
    });
    /* other card grids deal in the same way as the program cards */
    $$(".gallery-grid > .tile,.qa-grid > *").forEach(function (el, i) {
      if (el.classList.contains("fx-deal")) return;
      el.classList.add("fx-deal"); el.style.setProperty("--c", i % 3);
      if (el.parentElement) el.parentElement.classList.add("fx-rise-host");
    });
    $$(".parent-points").forEach(function (el) {
      el.classList.add("fx-strike");
      Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty("--i", i); });
    });
    $$(".auth-card .icon-tile").forEach(function (el, i) {
      el.classList.add("fx-medal"); el.style.setProperty("--i", i % 3);
    });
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
    var targets = $$(".fx-sec:not(.in),.fx-shine:not(.in),.fx-words:not(.in),.fx-wipe:not(.in)," +
                     ".fx-steps:not(.in),.fx-strike:not(.in),.fx-medal:not(.in),.fx-deal:not(.in),.fx-rise:not(.in)");
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

  /* ---------- I · HERO 3D STAGE ---------- */
  /* The coach portrait becomes a small 3D set: it leans toward the pointer,
     three credential badges float in front of it at different depths (so
     they slide past each other as it turns), and a gold arena ring turns
     beneath it. The badge text is read from the hero's own trust row, so it
     can never drift from the verified credentials on the page. Everything
     is added after the portrait has painted, and is absolutely positioned,
     so neither LCP nor layout is touched. */
  function heroStage() {
    // [photo block, where its credential text lives]
    stage(document.querySelector(".hero-portrait"), ".hero-trust span");
    stage(document.querySelector("#coach .split-media"), "#coach .hl-row span");
  }
  function stage(el, credSel) {
    if (!el || !el.querySelector("picture") || el.querySelector(".fx-badges")) return;
    el.classList.add("fx-stage");

    var ring = document.createElement("div");
    ring.className = "fx-arena"; ring.setAttribute("aria-hidden", "true");
    el.appendChild(ring);

    var creds = $$(credSel).slice(0, 3).map(function (s) { return s.textContent.trim(); });
    if (creds.length) {
      var box = document.createElement("div");
      box.className = "fx-badges"; box.setAttribute("aria-hidden", "true");
      creds.forEach(function (t, i) {
        var b = document.createElement("span");
        b.className = "fx-badge fx-badge-" + (i + 1);
        b.textContent = t;
        box.appendChild(b);
      });
      el.appendChild(box);
    }

    if (!fine || reduced) return;
    var area = el.closest("section") || el;
    follow(area, function (nx, ny) {
      el.style.setProperty("--rx", (-ny * 9).toFixed(2) + "deg");          // max ~5°
      el.style.setProperty("--ry", (nx * 11).toFixed(2) + "deg");
    }, el);
  }

  /* Eased pointer-follow shared by the stages and the page-header depth.
     Reports the pointer as -0.5…0.5 relative to `ref`'s centre (scaled by
     the viewport), and eases back to 0 when the pointer leaves `area`. */
  function follow(area, apply, ref) {
    var x = 0, y = 0, tx = 0, ty = 0, raf = null;
    function step() {
      x += (tx - x) * 0.08; y += (ty - y) * 0.08;
      apply(x, y);
      raf = (Math.abs(tx - x) + Math.abs(ty - y) > 0.001) ? requestAnimationFrame(step) : null;
    }
    function aim(a, b) { tx = a; ty = b; if (!raf) raf = requestAnimationFrame(step); }
    area.addEventListener("pointermove", function (e) {
      var r = (ref || area).getBoundingClientRect();
      aim((e.clientX - (r.left + r.width / 2)) / innerWidth,
          (e.clientY - (r.top + r.height / 2)) / innerHeight);
    }, { passive: true });
    area.addEventListener("pointerleave", function () { aim(0, 0); });
  }

  /* ---------- I2 · PAGE-HEADER DEPTH (pages that opt in) ---------- */
  /* <section class="page-hero" data-fx="stage">: the arena ring turns
     behind the title, and eyebrow / title / subtitle sit on separate depth
     planes that drift by different amounts with the pointer. */
  function pageStage() {
    var ph = document.querySelector('.page-hero[data-fx="stage"]');
    if (!ph || ph.classList.contains("fx-depth")) return;
    ph.classList.add("fx-depth");
    var ring = document.createElement("div");
    ring.className = "fx-arena"; ring.setAttribute("aria-hidden", "true");
    ph.insertBefore(ring, ph.firstChild);
    if (!fine || reduced) return;
    follow(ph, function (nx, ny) {
      ph.style.setProperty("--dx", nx.toFixed(3));
      ph.style.setProperty("--dy", ny.toFixed(3));
    });
  }

  /* ---------- K · 3D BUTTONS ---------- */
  /* Tilts each button toward the pointer and moves its highlight (fx.css
     §25 turns those into a transform + a radial gloss). Buttons are bound
     the first time the pointer reaches them, so buttons injected later
     (header, drawer, blog) are covered without scanning the page. */
  function buttons3d() {
    if (!fine || reduced) return;
    var seen = new WeakSet(), props = ["--btx", "--bty", "--bx", "--by"];
    document.addEventListener("pointerover", function (e) {
      var b = e.target.closest && e.target.closest(".btn:not(.burger)");
      if (!b || seen.has(b)) return;
      seen.add(b);
      b.addEventListener("pointermove", function (ev) {
        var r = b.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        b.style.setProperty("--bty", ((x - 0.5) * 14).toFixed(1) + "deg");
        b.style.setProperty("--btx", ((0.5 - y) * 18).toFixed(1) + "deg");
        b.style.setProperty("--bx", (x * 100).toFixed(0) + "%");
        b.style.setProperty("--by", (y * 100).toFixed(0) + "%");
      }, { passive: true });
      b.addEventListener("pointerleave", function () {
        props.forEach(function (p) { b.style.removeProperty(p); });
      });
    }, { passive: true });
  }

  /* ---------- J · KINETIC MARQUEE ---------- */
  /* The disciplines strip answers the scroll: faster when the page moves
     fast, and it runs backwards while you scroll up. It eases back to its
     resting speed on its own, and the loop stops once it has settled. */
  function kineticMarquee() {
    if (reduced) return;
    var m = document.querySelector(".marquee");
    if (!m || !m.getAnimations) return;
    var last = scrollY, rate = 1, target = 1, raf = null;
    function step() {
      target += (1 - target) * 0.04;                 // decay toward resting speed
      rate += (target - rate) * 0.15;
      m.getAnimations().forEach(function (a) { a.playbackRate = rate; });
      raf = (Math.abs(rate - 1) > 0.01) ? requestAnimationFrame(step) : null;
    }
    addEventListener("scroll", function () {
      var v = scrollY - last; last = scrollY;
      var boost = Math.min(Math.abs(v) / 14, 4);
      target = (v < 0 ? -1 : 1) * (1 + boost);
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
  }

  /* ---------- SAFETY NET ---------- */
  /* Word-reveal starts at opacity:0 and waits for IntersectionObserver.
     If IO is throttled, blocked, or never fires, a headline would stay
     invisible — unacceptable for the hero. So anything already at or above
     the fold is forced visible shortly after load; below-fold items keep
     their scroll animation. */
  function safetyNet() {
    setTimeout(function () {
      $$(".fx-words:not(.in),.fx-shine:not(.in),.fx-wipe:not(.in),.fx-steps:not(.in),.fx-strike:not(.in),.fx-medal:not(.in),.fx-deal:not(.in),.fx-rise:not(.in)").forEach(function (el) {
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
    heroStage();
    pageStage();
    kineticMarquee();
    buttons3d();
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
