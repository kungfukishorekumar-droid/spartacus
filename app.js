/* ============================================================
   Spartacus Martial Arts Academy — shared site script
   Loaded on every page (defer). Injects header/menu/footer/floats,
   wires interactions, and runs the editable content engine.
   ============================================================ */
const CONFIG = {
  whatsappNumber: "919884599939",
  academyName:    "Spartacus Martial Arts Academy",
  instagram:      "https://www.instagram.com/kishorekumar.coach/",

  // --- Supabase (leads backend for the static Hostinger site) ---
  // These are the PUBLIC "publishable" values — designed to be shipped in
  // the frontend. A Row Level Security "insert-only" policy (see
  // supabase-setup.sql) stops this key from reading anyone's leads.
  supabaseUrl:     "https://oqwbmtdrjxfbnitlzehe.supabase.co",
  supabaseAnonKey: "sb_publishable_Tqkzvziw-5C6I7Hib92B-g_AZQIJTRA",

  backendUrl:     "",  // legacy Node/Express backend (not used on Hostinger; Supabase replaces it)
  waTemplate:     "Hi Coach Kishore, I am interested in {program} at Spartacus Martial Arts Academy. Please share fees, timings, and trial class details."
};

const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

function track(event, data={}){
  if (typeof gtag === "function") gtag("event", event, data);
  if (typeof fbq === "function")  fbq("trackCustom", event, data);
}
function waLink(message){ return "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(message); }
function waForProgram(program){ return waLink(CONFIG.waTemplate.replace("{program}", program || "Martial Arts Training")); }

/* ---------------- shared chrome (header / menu / footer / floats) ---------------- */
const PAGES = [
  ["index.html", "Home"], ["programs.html", "Programs"], ["about.html", "About Coach"],
  ["blog.html", "Blog"], ["gallery.html", "Gallery"], ["contact.html", "Contact"]
];
function currentPage(){ const p = location.pathname.split("/").pop(); return (p && p.indexOf(".html") > -1) ? p : "index.html"; }
const WA_PATH = '<path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.5 0-3-.4-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3C4.4 14.7 4 13.4 4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8zm4.5-5.6c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5 0-.2-.7-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 2 .8 2.7.9 3.7.8.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"/>';

function injectChrome(){
  const cur = currentPage();
  const navLinks = PAGES.map(p => `<a href="${p[0]}"${p[0]===cur?' class="active"':''}>${p[1]}</a>`).join("");

  const header =
    '<header id="top"><div class="wrap nav">' +
      '<a href="index.html" class="brand" aria-label="Spartacus Martial Arts Academy home">' +
        '<img class="logo-img" src="assets/logo.png?v=5" alt="Spartacus Martial Arts Academy logo" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'" />' +
        '<span class="brand-fallback"><span class="name">SPARTACUS<small>Martial Arts · We Born to Win</small></span></span>' +
      '</a>' +
      '<nav class="nav-links" aria-label="Primary">' + navLinks + '</nav>' +
      '<div class="nav-cta">' +
        '<a href="contact.html" class="btn btn-primary btn-sm" data-track="nav_book_trial">Book Trial</a>' +
        '<button class="burger" id="burger" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
      '</div>' +
    '</div></header>';

  const drawer =
    '<div class="drawer" id="drawer" role="dialog" aria-label="Menu">' +
      '<button class="close" id="drawerClose" aria-label="Close menu">&times;</button>' +
      navLinks +
      '<a href="contact.html" class="btn btn-primary">Book Free Trial Class</a>' +
    '</div>';

  const footer =
    '<footer><div class="wrap"><div class="foot-grid">' +
      '<div class="foot-brand">' +
        '<img class="logo-img" src="assets/logo.png?v=5" alt="Spartacus Martial Arts Academy logo" loading="lazy" decoding="async" onerror="this.style.display=\'none\'" />' +
        '<div class="foot-tag">WE BORN TO WIN</div>' +
        '<p>By Kishore Kumar — National Wushu Medalist, Kungfu Black Belt, Wushu Coach &amp; Judge. Building discipline, confidence and real martial arts skill in Chennai.</p>' +
        '<div class="foot-social">' +
          '<a href="' + CONFIG.instagram + '" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="#e9c45a" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.2" fill="#e9c45a" stroke="none"/></svg></a>' +
          '<a href="#" class="js-wa" data-program="Martial Arts Training" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="#25D366">' + WA_PATH + '</svg></a>' +
        '</div>' +
      '</div>' +
      '<div class="foot-col"><h4>Quick Links</h4>' + PAGES.map(p=>`<a href="${p[0]}">${p[1]}</a>`).join("") + '</div>' +
      '<div class="foot-col"><h4>Contact</h4>' +
        '<p>📍 Chennai, Tamil Nadu</p>' +
        '<a href="#" class="js-wa" data-program="Martial Arts Training">📱 WhatsApp: 9884599939</a>' +
        '<a href="' + CONFIG.instagram + '" target="_blank" rel="noopener">📸 @kishorekumar.coach</a>' +
      '</div>' +
    '</div>' +
    '<div class="foot-areas">Serving Chennai &amp; nearby areas — Otteri · Ayanavaram · Perambur · Kilpauk · Anna Nagar · and surrounding localities. Martial arts classes, self-defense, and kids martial arts training in Chennai.</div>' +
    '<div class="foot-bottom"><span>© <span id="year"></span> Spartacus Martial Arts Academy · By Kishore Kumar · Chennai · We Born to Win</span><span>Wushu • Kung Fu • Karate • Judo • Kick Boxing • Boxing</span></div>' +
    '</div></footer>';

  const floats =
    '<a href="#" class="wa-float js-wa" data-program="Martial Arts Training" aria-label="Chat on WhatsApp" data-track="float_whatsapp"><svg viewBox="0 0 24 24" fill="#fff">' + WA_PATH + '</svg></a>' +
    '<div class="mobile-bar">' +
      '<a href="contact.html" class="btn btn-primary" data-track="mobilebar_book_trial">Book Trial</a>' +
      '<a href="#" class="btn btn-wa js-wa" data-program="Martial Arts Training" data-track="mobilebar_whatsapp">WhatsApp</a>' +
      '<a href="tel:+919884599939" class="btn btn-gold" data-track="mobilebar_call">Call</a>' +
    '</div>';

  document.body.insertAdjacentHTML("afterbegin", header + drawer);
  document.body.insertAdjacentHTML("beforeend", footer + floats);
}

/* ---------------- run after the page HTML is parsed ---------------- */
function boot(){
  injectChrome();

  if ($("#year")) $("#year").textContent = new Date().getFullYear();

  /* Benefits grid (home page only) */
  const benefitGrid = $("#benefitGrid");
  if (benefitGrid){
    const BENEFITS = ["Discipline","Confidence","Fitness","Strength","Focus","Flexibility","Self-Defense","Emotional Control","Respect","Routine","Stamina","Fighting Spirit","Competition Mindset","Speed & Agility","Real Fighting Skills","Mental Toughness"];
    const chk = '<span class="chk"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    benefitGrid.innerHTML = BENEFITS.map((b,i)=>`<div class="benefit reveal d${i%4}">${chk}<b>${b}</b></div>`).join("");
  }

  /* mobile drawer */
  const drawer = $("#drawer");
  $("#burger").addEventListener("click", () => { drawer.classList.add("open"); $("#burger").setAttribute("aria-expanded","true"); });
  $("#drawerClose").addEventListener("click", () => { drawer.classList.remove("open"); $("#burger").setAttribute("aria-expanded","false"); });
  $$(".drawer a").forEach(a => a.addEventListener("click", () => drawer.classList.remove("open")));

  /* WhatsApp links */
  $$(".js-wa").forEach(el => el.addEventListener("click", (e) => {
    e.preventDefault();
    const program = el.dataset.program || "Martial Arts Training";
    const custom  = el.dataset.message;
    const url     = custom ? waLink(custom) : waForProgram(program);
    track(el.dataset.track || "whatsapp_click", { program });
    window.open(url, "_blank");
  }));

  /* Program "Enquire" → contact page with program preselected (or prefill if already there) */
  $$(".js-enquire").forEach(btn => btn.addEventListener("click", () => {
    const program = btn.dataset.program;
    track("program_enquire", { program });
    const sel = $("#program");
    if (sel){
      [...sel.options].forEach(o => { if (o.value === program) sel.value = program; });
      const c = $("#contact"); if (c) c.scrollIntoView({ behavior: "smooth" });
      sel.focus({ preventScroll: true });
    } else {
      location.href = "contact.html?program=" + encodeURIComponent(program);
    }
  }));

  /* FAQ accordion */
  $$(".faq-q").forEach(q => q.addEventListener("click", () => {
    const item = q.parentElement;
    const open = item.classList.contains("open");
    $$(".faq-item").forEach(i => { i.classList.remove("open"); $(".faq-a", i).style.maxHeight = null; });
    if (!open){ item.classList.add("open"); const a = $(".faq-a", item); a.style.maxHeight = a.scrollHeight + "px"; }
  }));

  /* Lead form (contact page only) */
  const form = $("#leadForm");
  if (form){
    // preselect program from ?program=
    const pre = new URLSearchParams(location.search).get("program");
    const psel = $("#program");
    if (pre && psel){ [...psel.options].forEach(o => { if (o.value === pre) psel.value = pre; }); }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()){ form.reportValidity(); return; }
      const lead = Object.fromEntries(new FormData(form).entries());
      lead.source = "Spartacus Website"; lead.academy = CONFIG.academyName; lead.timestamp = new Date().toISOString();
      const btn = $("#submitBtn"); btn.disabled = true; btn.textContent = "Sending…";
      // 1) always keep a local copy (offline safety net)
      try { const saved = JSON.parse(localStorage.getItem("spartacus_leads") || "[]"); saved.push(lead); localStorage.setItem("spartacus_leads", JSON.stringify(saved)); } catch(_){}
      // 2) save to Supabase (primary), else legacy backend if configured
      const savedRemote = await saveLead(lead);
      if (!savedRemote && CONFIG.backendUrl){
        try {
          await fetch(CONFIG.backendUrl.replace(/\/+$/,"") + "/api/leads", {
            method:"POST", headers:{ "Content-Type":"application/json" },
            body: JSON.stringify({
              websiteSource: "website_1",           // this site = website_1
              fullName: lead.name, phone: lead.phone, email: lead.email || "",
              age: lead.age, city: lead.location, programInterest: lead.program,
              message: [lead.message, lead.goal && ("Goal: "+lead.goal), lead.role && ("Role: "+lead.role), lead.time && ("Preferred: "+lead.time)].filter(Boolean).join(" | "),
              formType: "trial_booking"
            })
          });
        } catch(err){}
      }
      track("lead_submit", { program: lead.program, goal: lead.goal, role: lead.role });
      if (typeof fbq === "function") fbq("track", "Lead", { content_name: lead.program });
      const waMsg = `Hi Coach Kishore, my name is ${lead.name}. I am interested in ${lead.program} at ${CONFIG.academyName}.` +
        (lead.goal ? ` My goal is ${lead.goal}.` : "") + ` Please share fees, timings, and trial class details.\n\n` +
        `• Age: ${lead.age}\n• I am: ${lead.role || "-"}\n• Location: ${lead.location || "-"}\n• Preferred time: ${lead.time || "-"}\n` +
        (lead.message ? `• Message: ${lead.message}\n` : "") + `• Phone: ${lead.phone}`;
      form.style.display = "none";
      const success = $("#formSuccess"); success.classList.add("show");
      const waUrl = waLink(waMsg);
      $("#successWa").href = waUrl; $("#successWa").setAttribute("target","_blank");
      setTimeout(() => window.open(waUrl, "_blank"), 700);
    });
  }

  /* reveal on scroll */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach(el => io.observe(el));

  /* header shadow */
  const hdr = $("header");
  addEventListener("scroll", () => { hdr.style.background = scrollY > 20 ? "rgba(10,10,11,.92)" : "rgba(10,10,11,.72)"; }, { passive:true });

  /* ---- editable content engine ---- */
  bootContent();
}

/* ============================ SUPABASE LEADS ============================
   Saves a contact-form lead straight to Supabase from the static site.
   Uses the PUBLIC anon key + REST endpoint (PostgREST). Security is the
   table's Row Level Security policy: anon may INSERT, never SELECT — so
   this key cannot be used to read anyone's leads.
   Returns true on success, false on any failure (caller falls back to WA). */
async function saveLead(lead){
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) return false;
  try {
    const res = await fetch(CONFIG.supabaseUrl.replace(/\/+$/,"") + "/rest/v1/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.supabaseAnonKey,
        "Authorization": "Bearer " + CONFIG.supabaseAnonKey,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        full_name:        lead.name || "",
        phone:            lead.phone || "",
        email:            lead.email || null,
        age:              lead.age || null,
        city:             lead.location || null,
        program_interest: lead.program || null,
        goal:             lead.goal || null,
        role:             lead.role || null,
        preferred_time:   lead.time || null,
        message:          lead.message || null,
        source:           "website",
        website_source:   "spartacus"
      })
    });
    return res.ok;   // 201 = inserted
  } catch (err) { return false; }
}
window.saveLead = saveLead;

/* ============================ RAZORPAY PAYMENT (optional) ============================
   Wire any button to it, e.g.:
     <button onclick="spartacusPay({ amount: 50000, description:'Karate — 1 month', prefill:{name:'',contact:''} })">Pay ₹500</button>
   amount is in paise (50000 = ₹500). Needs CONFIG.backendUrl + Razorpay keys set in the backend. */
function _loadRazorpay(){
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}
async function spartacusPay(opts){
  opts = opts || {};
  if (!CONFIG.backendUrl){ alert("Payment is not set up yet."); return; }
  const base = CONFIG.backendUrl.replace(/\/+$/, "");
  try {
    // 1) ask backend to create a Razorpay order
    const order = await fetch(base + "/api/payment/order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: opts.amount, leadId: opts.leadId || "", notes: opts.notes || {} })
    }).then(r => r.json());
    if (!order || !order.success){ alert("Could not start payment: " + ((order && order.message) || "")); return; }

    const loaded = await _loadRazorpay();
    if (!loaded){ alert("Could not load the payment window. Check your connection."); return; }

    // 2) open Razorpay Checkout
    const rzp = new window.Razorpay({
      key: order.data.keyId, amount: order.data.amount, currency: order.data.currency,
      order_id: order.data.orderId, name: opts.name || CONFIG.academyName,
      description: opts.description || "Enrollment", prefill: opts.prefill || {},
      theme: { color: "#e11d2a" },
      handler: async function (resp){
        // 3) verify on the backend (also marks the lead paid)
        const v = await fetch(base + "/api/payment/verify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
            leadId: opts.leadId || ""
          })
        }).then(r => r.json()).catch(() => null);
        if (v && v.success){ (opts.onSuccess ? opts.onSuccess(v) : alert("✅ Payment successful!")); }
        else { alert("Payment could not be verified. If money was deducted, contact us."); }
      }
    });
    rzp.open();
  } catch (err) { alert("Payment error. Please try again."); }
}
window.spartacusPay = spartacusPay;

/* ============================ CONTENT ENGINE ============================ */
const EDIT_TEXT_SEL = [
  '.brandline','.hero-copy h1','.hero-copy h2.subhead','.hero-support','.hero-tanglish','.hero-mini',
  '.eyebrow','.section-title','.section-sub','.page-title','.page-sub',
  '.auth-card b','.auth-card span','.auth-copy',
  '.prog-card h3','.prog-card p','.prog-age','.prog-tag',
  '.join-card b','.benefit b',
  '.step h3','.step p','.hl-row span',
  '.review p','.review .who b','.review .who span',
  '.qa h3','.qa p','.faq-q','.faq-a p',
  '.fees-card .price-ph','.fees-card p',
  '.final-cta h2','.final-cta p',
  '.foot-col h4','.foot-tag','.foot-brand p','.foot-areas','.hero-trust span'
].join(',');
function _editKey(el, counts){
  const sec = el.closest('section[id], footer, header');
  const sid = sec ? (sec.id || sec.tagName.toLowerCase()) : 'top';
  counts[sid] = (counts[sid] || 0) + 1;
  return currentPage().replace('.html','') + ':' + sid + '#' + counts[sid];
}
function collectText(){
  const counts = {};
  return $$(EDIT_TEXT_SEL).filter(el => !el.closest('#sp-admin')).map(el => [_editKey(el, counts), el]);
}
function imgKey(src){ return (src || '').split('?')[0].split('/').pop().replace(/\.[a-z0-9]+$/i, ''); }
function collectImgs(){
  return $$('img').filter(img => /assets\//.test(img.getAttribute('src') || '') && !img.closest('#sp-admin'))
                  .map(img => [imgKey(img.getAttribute('src')), img]);
}
function applySettings(s){
  if (!s) return;
  if (s.whatsappNumber){ CONFIG.whatsappNumber = String(s.whatsappNumber).replace(/\D/g, ''); $$('a[href^="tel:"]').forEach(a => a.href = 'tel:+' + CONFIG.whatsappNumber); }
  if (s.instagram){ CONFIG.instagram = s.instagram; $$('a[href*="instagram.com"]').forEach(a => a.href = s.instagram); }
}
function applyContent(c){
  c = c || {};
  if (c.text){ collectText().forEach(([k, el]) => { if (c.text[k] != null) el.innerHTML = c.text[k]; }); }
  if (c.img){ collectImgs().forEach(([k, img]) => { if (c.img[k]){ const pic = img.closest('picture'); if (pic){ const s = pic.querySelector('source'); if (s) s.remove(); } img.src = c.img[k]; img.style.display = ''; } }); }
  if (c.settings) applySettings(c.settings);
}
function _deepMerge(a, b){ const o = Object.assign({}, a); for (const k in b){ o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) ? _deepMerge(a[k] || {}, b[k]) : b[k]; } return o; }
window.Spartacus = { CONFIG, collectText, collectImgs, applyContent, applySettings, get published(){ return window.__pub || {}; }, get content(){ return window.__content || {}; } };
function loadAdmin(){ if (window.__adminLoaded) return; window.__adminLoaded = true; const s = document.createElement('script'); s.src = 'admin.js?v=2'; document.body.appendChild(s); }
window.addEventListener('hashchange', () => { if (location.hash === '#admin') loadAdmin(); });
function bootContent(){
  let local = null;
  try { local = JSON.parse(localStorage.getItem('spartacus_content') || 'null'); } catch(_){}
  fetch('content.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null).then(remote => {
    const base = remote || {};
    window.__pub = base;
    window.__content = local ? _deepMerge(base, local) : base;
    applyContent(window.__content);
    if (location.hash === '#admin') loadAdmin();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
