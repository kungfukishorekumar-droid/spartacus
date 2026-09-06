/* ============================================================
   Spartacus — Analytics loader (GA4 + Meta Pixel)
   ------------------------------------------------------------
   DORMANT until you paste your IDs below. With no IDs it loads
   NOTHING (zero third-party requests, zero privacy/perf cost) but
   still wires click tracking through the site's track() hooks.

   To activate: fill GA4_ID and/or META_PIXEL_ID, redeploy.
     • GA4_ID        → Google Analytics 4 "Measurement ID"  (G-XXXXXXXXXX)
     • META_PIXEL_ID → Meta/Facebook Pixel ID               (numeric)
   Then it fires: pageview + lead_submit + WhatsApp/Call/Book clicks,
   so every funnel step is measurable.
   ============================================================ */
(function () {
  var GA4_ID        = "";   // ← paste GA4 Measurement ID  e.g. "G-XXXXXXXXXX"
  var META_PIXEL_ID = "";   // ← paste Meta Pixel ID       e.g. "1234567890"

  /* --- Google Analytics 4 --- */
  if (GA4_ID) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", GA4_ID, { anonymize_ip: true });
  }

  /* --- Meta (Facebook/Instagram) Pixel --- */
  if (META_PIXEL_ID) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", META_PIXEL_ID);
    fbq("track", "PageView");
  }

  /* --- Click tracking: makes every data-track attr + WhatsApp/Call/Pay fire
     an event through whatever analytics is loaded. Works even before you add
     IDs (calls are simply no-ops until gtag/fbq exist). --- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('[data-track], .js-wa, a[href^="https://wa.me"], a[href^="tel:"]');
    if (!a) return;
    var isWa  = a.classList.contains("js-wa") || /wa\.me/.test(a.href || "");
    var isTel = /^tel:/.test(a.getAttribute("href") || "");
    var name  = a.getAttribute("data-track") || (isWa ? "whatsapp_click" : isTel ? "call_click" : "click");
    if (typeof gtag === "function") gtag("event", name);
    if (typeof fbq  === "function") { fbq("trackCustom", name); if (isWa) fbq("track", "Contact"); }
  }, true);
})();
