/* ============================================================
   SPARTACUS — First-party visitor tracking
   ------------------------------------------------------------
   Records, into YOUR OWN Supabase database (never a third party):
     • every page view: path, article slug, title, referrer, UTM,
       device, browser, OS, language, timezone
     • how long the visitor stayed, how far they scrolled, whether
       they reached the lead form, how many CTAs they clicked

   Why first-party: ad blockers remove Google Analytics for a large
   share of Indian mobile traffic. This is your own domain writing to
   your own database, so the numbers are real.

   Privacy: no IP address, no name, no email, no cross-site tracking.
   `visitor_id` is a random ID the browser generates for itself. Honours
   the browser's "Do Not Track" setting.

   Read the numbers in Supabase → Table Editor → Views →
     analytics_daily · analytics_top_pages · analytics_referrers ·
     analytics_sources · analytics_lead_sources
   (Run supabase-analytics.sql once before this can write anything.)
   ============================================================ */
(function () {
  "use strict";

  /* --- Public Supabase values (same ones app.js ships; safe in a browser:
         the table's RLS policy allows INSERT only, never SELECT) --------- */
  var CFG = (typeof CONFIG !== "undefined" && CONFIG) || {};
  var SB_URL = CFG.supabaseUrl    || "https://oqwbmtdrjxfbnitlzehe.supabase.co";
  var SB_KEY = CFG.supabaseAnonKey || "sb_publishable_Tqkzvziw-5C6I7Hib92B-g_AZQIJTRA";
  var MAIN_HOST = "spartacusmartialarts.com";

  /* --- Respect Do Not Track ---------------------------------------------- */
  var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
  if (dnt === "1" || dnt === "yes") return;
  if (!SB_URL || !SB_KEY) return;
  // Never record the coach's own visits while editing the site.
  if (location.hash === "#admin" || /^(localhost|127\.|192\.168\.)/.test(location.hostname)) return;

  /* --- small helpers ------------------------------------------------------ */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  function ls(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val); return val;
    } catch (e) { return null; }
  }
  function ss(key, val) {
    try {
      if (val === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, val); return val;
    } catch (e) { return null; }
  }
  function host(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }
  function cap(s, n) { return s ? String(s).slice(0, n) : null; }

  /* --- identity (anonymous, first-party) ---------------------------------- */
  var visitorId = ls("sp_vid");
  var isNew = false;
  if (!visitorId) { visitorId = uuid(); ls("sp_vid", visitorId); isNew = true; }

  var sessionId = ss("sp_sid");
  if (!sessionId) { sessionId = uuid(); ss("sp_sid", sessionId); }

  /* --- campaign attribution ----------------------------------------------- */
  var qs = new URLSearchParams(location.search);
  var utm = {
    utm_source:   qs.get("utm_source"),
    utm_medium:   qs.get("utm_medium"),
    utm_campaign: qs.get("utm_campaign"),
    utm_term:     qs.get("utm_term"),
    utm_content:  qs.get("utm_content")
  };
  // Instagram/YouTube bio links often carry no UTM — infer the source from the referrer.
  var ref = document.referrer || "";
  var refHost = host(ref);
  if (refHost === host(location.href)) { ref = ""; refHost = ""; }   // ignore self-referrals
  if (!utm.utm_source && refHost) {
    if (/instagram/.test(refHost))      utm.utm_source = "instagram";
    else if (/youtube|youtu\.be/.test(refHost)) utm.utm_source = "youtube";
    else if (/google/.test(refHost))    { utm.utm_source = "google"; utm.utm_medium = utm.utm_medium || "organic"; }
    else if (/facebook/.test(refHost))  utm.utm_source = "facebook";
    else if (/whatsapp/.test(refHost))  utm.utm_source = "whatsapp";
    else if (/bing|duckduckgo|yahoo/.test(refHost)) { utm.utm_source = refHost; utm.utm_medium = utm.utm_medium || "organic"; }
  }
  // Remember the FIRST touch — the campaign that originally found this person.
  if (!ls("sp_first_touch") && (utm.utm_source || refHost)) {
    ls("sp_first_touch", JSON.stringify({ at: new Date().toISOString(), referrer: refHost, utm: utm }));
  }

  /* --- what page is this? -------------------------------------------------- */
  var path = location.pathname + location.search;
  var slug = qs.get("slug");
  var file = location.pathname.split("/").pop() || "index.html";
  var pageType = /^blog-post\.html/.test(file) ? "blog_post"
               : /^blog\.html/.test(file)      ? "blog_listing"
               : "page";
  var site = location.hostname.indexOf("blog.") === 0 ? "blog" : "main";

  /* --- device context (buckets, not fingerprints) --------------------------- */
  var ua = navigator.userAgent || "";
  var sw = (screen && screen.width) || 0;
  var device = /Tablet|iPad/i.test(ua) || (sw >= 768 && sw <= 1024 && /Mobi|Android/i.test(ua)) ? "tablet"
             : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  var browser = /Edg\//.test(ua) ? "Edge"
              : /OPR\//.test(ua) ? "Opera"
              : /Chrome\//.test(ua) ? "Chrome"
              : /Safari\//.test(ua) ? "Safari"
              : /Firefox\//.test(ua) ? "Firefox" : "Other";
  var os = /Android/.test(ua) ? "Android"
         : /iPhone|iPad|iPod/.test(ua) ? "iOS"
         : /Windows/.test(ua) ? "Windows"
         : /Mac OS X/.test(ua) ? "macOS"
         : /Linux/.test(ua) ? "Linux" : "Other";

  var viewId = uuid();

  /* --- send helper: survives the page being closed -------------------------- */
  function send(table, row, urgent) {
    var url = SB_URL.replace(/\/+$/, "") + "/rest/v1/" + table;
    var body = JSON.stringify(row);
    try {
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SB_KEY,
          "Authorization": "Bearer " + SB_KEY,
          "Prefer": "return=minimal"
        },
        body: body,
        keepalive: !!urgent          // lets the request finish after the tab closes
      }).catch(function () { beacon(url, body); });
    } catch (e) { beacon(url, body); }
  }
  // Fallback for browsers without fetch keepalive. sendBeacon cannot set headers,
  // so the key travels as a query parameter (Supabase accepts ?apikey=).
  function beacon(url, body) {
    try {
      if (!navigator.sendBeacon) return;
      navigator.sendBeacon(url + "?apikey=" + encodeURIComponent(SB_KEY),
        new Blob([body], { type: "application/json" }));
    } catch (e) {}
  }

  /* --- 1. record the page view --------------------------------------------- */
  send("page_views", {
    id: viewId,
    visitor_id: visitorId,
    session_id: sessionId,
    is_new_visitor: isNew,
    site: site,
    path: cap(path, 500),
    page_type: pageType,
    slug: cap(slug, 200),
    title: cap(document.title, 300),
    referrer: cap(ref, 500),
    referrer_host: cap(refHost, 200),
    utm_source: cap(utm.utm_source, 100),
    utm_medium: cap(utm.utm_medium, 100),
    utm_campaign: cap(utm.utm_campaign, 150),
    utm_term: cap(utm.utm_term, 150),
    utm_content: cap(utm.utm_content, 150),
    device: device,
    browser: browser,
    os: os,
    screen_w: sw || null,
    viewport_w: window.innerWidth || null,
    language: cap(navigator.language, 20),
    timezone: cap((Intl.DateTimeFormat().resolvedOptions() || {}).timeZone, 60)
  });

  // Expose the current view so the lead form can attribute itself to this page.
  window.SPARTACUS_VIEW = {
    view_id: viewId, visitor_id: visitorId, session_id: sessionId,
    slug: slug, path: path, title: document.title,
    referrer: refHost, utm: utm, site: site,
    firstTouch: (function () { try { return JSON.parse(ls("sp_first_touch") || "null"); } catch (e) { return null; } })()
  };

  /* --- 2. measure engagement ------------------------------------------------ */
  var started = Date.now();
  var maxScroll = 0;
  var clicks = 0;
  var reachedCta = false;
  var sent = false;

  function scrollPct() {
    var doc = document.documentElement;
    var scrollable = (doc.scrollHeight || 0) - window.innerHeight;
    if (scrollable <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((window.scrollY / scrollable) * 100)));
  }
  addEventListener("scroll", function () {
    var p = scrollPct();
    if (p > maxScroll) maxScroll = p;
  }, { passive: true });

  addEventListener("click", function (e) {
    if (e.target.closest('a, button, [data-track]')) clicks++;
  }, true);

  // Did they actually reach the lead form / main CTA?
  function watchCta() {
    var targets = document.querySelectorAll(".blog-cta, #blogLeadForm, #leadForm");
    if (!targets.length || !window.IntersectionObserver) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { reachedCta = true; io.disconnect(); } });
    }, { threshold: 0.25 });
    targets.forEach(function (t) { io.observe(t); });
  }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", function () { setTimeout(watchCta, 400); });
  else setTimeout(watchCta, 400);

  function finish() {
    if (sent) return;
    sent = true;
    send("page_engagement", {
      view_id: viewId,
      duration_ms: Math.min(Date.now() - started, 1000 * 60 * 60),   // cap at 1h (idle tabs)
      max_scroll: maxScroll || scrollPct(),
      clicks: clicks,
      reached_cta: reachedCta
    }, true);
  }
  addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") finish(); });
  addEventListener("pagehide", finish);

  /* --- 3. attribution for lead forms ---------------------------------------
     Both the blog lead form and the main contact form attach this to the lead,
     so every lead in Supabase says WHICH page and WHICH campaign produced it.
     Read it back in the analytics_lead_sources view. ------------------------- */
  window.spAttribution = function () {
    var ft = window.SPARTACUS_VIEW && window.SPARTACUS_VIEW.firstTouch;
    return {
      page: path,
      slug: slug || null,
      title: cap(document.title, 300),
      referrer: refHost || null,
      site: site,
      utm_source: utm.utm_source || null,
      utm_medium: utm.utm_medium || null,
      utm_campaign: utm.utm_campaign || null,
      utm_term: utm.utm_term || null,
      utm_content: utm.utm_content || null,
      first_touch_source: (ft && ft.utm && ft.utm.utm_source) || null,
      first_touch_referrer: (ft && ft.referrer) || null,
      first_seen_at: (ft && ft.at) || null,
      visitor_id: visitorId,
      session_id: sessionId,
      view_id: viewId,
      device: device,
      submitted_at: new Date().toISOString()
    };
  };

  /* --- 4. tiny public API for custom events --------------------------------- */
  window.spTrack = function (name, data) {
    send("page_views", {
      id: uuid(), visitor_id: visitorId, session_id: sessionId,
      site: site, path: cap("event:" + name, 500), page_type: "event",
      slug: cap(slug, 200), title: cap(JSON.stringify(data || {}), 300),
      referrer_host: cap(refHost, 200), device: device, browser: browser, os: os
    });
  };
})();
