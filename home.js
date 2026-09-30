/* ============================================================
   SPARTACUS — HOMEPAGE MOTION ("Ink & Iron")
   Pairs with home.css. Deferred; does nothing on other pages.

     A  Disciplines rail — pinned horizontal scroll on wide screens,
        3D carousel tilt on every screen
     B  Word wall — words light up as the reader reaches them
     C  Training method — big numeral follows the step in view
     D  Staggered reveals ([data-stagger])
     E  Ambient parallax — 武 glyph, final-call outline type

   All scroll-linked work shares one rAF-throttled handler and skips
   sections that are off screen. Reduced motion: nothing moves; every
   word is lit, every step shown, the rail is a plain swipe row.
   ============================================================ */
(function () {
  "use strict";
  if (!document.body.classList.contains("page-home")) return;

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var jobs = [];                                   // scroll-linked painters
  var ticking = false;
  function frame() { ticking = false; for (var i = 0; i < jobs.length; i++) jobs[i](); }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  function near(el, margin) {                      // is el within `margin` px of the viewport?
    var r = el.getBoundingClientRect();
    return r.bottom > -margin && r.top < innerHeight + margin;
  }

  /* ---------- A · DISCIPLINES RAIL ---------- */
  var arts = $(".hx-arts"), track = arts && $(".hx-arts-track", arts);
  if (arts && track) {
    var cards = $$(".hx-art", track), meter = $(".hx-arts-meter", arts);
    var wide = matchMedia("(min-width: 1000px) and (hover: hover) and (pointer: fine)");
    var pinned = false, dist = 0;

    function layout() {
      pinned = wide.matches && !reduced;
      arts.classList.toggle("is-pinned", pinned);
      track.style.transform = "";
      if (!pinned) return;
      dist = Math.max(0, track.scrollWidth - track.clientWidth);
      arts.style.setProperty("--dist", dist + "px");
    }

    function paintRail() {
      if (!near(arts, 200)) return;
      var p;
      if (pinned) {
        var r = arts.getBoundingClientRect();
        var travel = arts.offsetHeight - (innerHeight);
        p = travel > 0 ? clamp(-r.top / travel, 0, 1) : 0;
        track.style.transform = "translate3d(" + (-p * dist).toFixed(1) + "px,0,0)";
      } else {
        var max = track.scrollWidth - track.clientWidth;
        p = max > 0 ? track.scrollLeft / max : 0;
      }
      if (meter) meter.style.setProperty("--p", p.toFixed(3));
      if (reduced) return;
      // 3D carousel: each card turns away as it leaves the centre of the view
      var mid = innerWidth / 2;
      for (var i = 0; i < cards.length; i++) {
        var b = cards[i].getBoundingClientRect();
        var t = clamp(((b.left + b.width / 2) - mid) / (innerWidth * 0.75), -1, 1);
        cards[i].style.setProperty("--ry", (t * -16).toFixed(2) + "deg");
        cards[i].style.setProperty("--sc", (1 - Math.abs(t) * 0.07).toFixed(3));
      }
    }

    // keyboard: tabbing to an off-screen card scrolls the page so it slides in
    track.addEventListener("focusin", function (e) {
      if (!pinned) return;
      var card = e.target.closest(".hx-art"); if (!card) return;
      var idx = cards.indexOf(card), p = cards.length > 1 ? idx / (cards.length - 1) : 0;
      var top = arts.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + p * (arts.offsetHeight - innerHeight), behavior: reduced ? "auto" : "smooth" });
    });

    layout();
    addEventListener("resize", function () { layout(); onScroll(); }, { passive: true });
    if (wide.addEventListener) wide.addEventListener("change", layout);
    track.addEventListener("scroll", onScroll, { passive: true });
    jobs.push(paintRail);
  }

  /* ---------- B · WORD WALL ---------- */
  var wall = $(".hx-wall");
  if (wall && !reduced) {
    var words = $$(".hx-w", wall);
    wall.classList.add("is-live");
    jobs.push(function () {
      if (!near(wall, 300)) return;
      var line = innerHeight * 0.72;               // a word lights once it rises above this line
      for (var i = 0; i < words.length; i++) {
        words[i].classList.toggle("lit", words[i].getBoundingClientRect().top < line);
      }
    });
  }

  /* ---------- C · TRAINING METHOD ---------- */
  var steps = $$(".hx-step"), digit = $(".hx-bignum-d"), rail = $(".hx-method-rail");
  if (steps.length) {
    var current = 0;
    function setStep(n) {
      if (n === current) return;
      current = n;
      steps.forEach(function (s, i) { s.classList.toggle("on", i + 1 === n); });
      if (digit) {
        digit.textContent = n;
        digit.classList.remove("flip"); void digit.offsetWidth; digit.classList.add("flip");
      }
      if (rail) rail.style.setProperty("--mp", (n / steps.length).toFixed(3));
    }
    setStep(1);
    if ("IntersectionObserver" in window && !reduced) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) setStep(parseInt(en.target.getAttribute("data-step"), 10) || 1);
        });
      }, { rootMargin: "-45% 0px -45% 0px" });     // the step crossing the middle band wins
      steps.forEach(function (s) { io.observe(s); });
    } else {
      steps.forEach(function (s) { s.classList.add("on"); });
    }
  }

  /* ---------- D · STAGGERED REVEALS ---------- */
  var groups = $$("[data-stagger]");
  groups.forEach(function (g) {
    Array.prototype.forEach.call(g.children, function (c, i) {
      if (!c.style.getPropertyValue("--i")) c.style.setProperty("--i", i);
    });
  });
  if ("IntersectionObserver" in window && !reduced) {
    var gio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); gio.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    groups.forEach(function (g) { gio.observe(g); });
    // never leave a group hidden if the observer is throttled or skipped
    setTimeout(function () {
      groups.forEach(function (g) { if (g.getBoundingClientRect().top < innerHeight) g.classList.add("in"); });
    }, 2500);
  } else {
    groups.forEach(function (g) { g.classList.add("in"); });
  }

  /* ---------- E · AMBIENT PARALLAX ---------- */
  var glyph = $(".hx-glyph"), coach = $(".hx-coach"), fin = $(".hx-final-bg"), finCard = $(".hx-final-card");
  if (!reduced) {
    if (glyph && coach) jobs.push(function () {
      if (!near(coach, 0)) return;
      var r = coach.getBoundingClientRect();
      glyph.style.setProperty("--gy", (((r.top + r.height / 2) - innerHeight / 2) * -0.18).toFixed(1) + "px");
    });
    if (fin && finCard) jobs.push(function () {
      if (!near(finCard, 0)) return;
      var r = finCard.getBoundingClientRect();
      fin.style.setProperty("--fx", (((r.top + r.height / 2) - innerHeight / 2) * 0.35).toFixed(1) + "px");
    });
  }

  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
