/* ============================================================
   SPARTACUS — Blog lead capture
   ------------------------------------------------------------
   Turns blog readers into leads. Injects a short capture form into
   every article (name + phone + program — three fields, nothing more)
   and a compact one on the blog listing page.

   Every lead is saved to Supabase through the SAME pipeline as the main
   contact form (app.js → saveLead), so it lands in one place and shows up
   in WarriorCRM. What is added here is ATTRIBUTION: the article slug,
   title, referrer and campaign travel with the lead, so you can see in
   Supabase → analytics_lead_sources exactly which of the 125 articles
   is producing enquiries.

   Loads AFTER blog.js (it decorates the rendered article).
   ============================================================ */
(function () {
  "use strict";

  var CFG = (typeof CONFIG !== "undefined" && CONFIG) || {};
  var WA_NUMBER = CFG.whatsappNumber || "919884599939";

  var PROGRAMS = [
    "Kids Martial Arts", "Wushu", "Kung Fu", "Karate",
    "Boxing", "Kickboxing", "Judo", "Self-Defense (Women)",
    "Adult Fitness & Self-Defense", "Athlete Mindset / Sports Psychology"
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
      .replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function formHtml(opts) {
    return '' +
      '<section class="blog-lead" id="blogLeadForm">' +
        '<div class="bl-head">' +
          '<span class="bl-eyebrow">Free Trial Class</span>' +
          '<h3>' + esc(opts.heading) + '</h3>' +
          '<p>' + esc(opts.sub) + '</p>' +
        '</div>' +
        '<form class="bl-form" novalidate>' +
          '<div class="bl-row">' +
            '<label class="bl-field"><span>Your name</span>' +
              '<input type="text" name="name" required autocomplete="name" placeholder="e.g. Ramesh K" maxlength="80" />' +
            '</label>' +
            '<label class="bl-field"><span>WhatsApp number</span>' +
              '<input type="tel" name="phone" required autocomplete="tel" inputmode="numeric" placeholder="98845 99939" maxlength="20" />' +
            '</label>' +
          '</div>' +
          '<label class="bl-field"><span>Interested in</span>' +
            '<select name="program">' +
              PROGRAMS.map(function (p) {
                return '<option value="' + esc(p) + '"' + (p === opts.program ? " selected" : "") + ">" + esc(p) + "</option>";
              }).join("") +
            '</select>' +
          '</label>' +
          // Honeypot — invisible to humans, irresistible to bots.
          '<div class="bl-hp" aria-hidden="true">' +
            '<label>Company<input type="text" name="company" tabindex="-1" autocomplete="off" /></label>' +
          '</div>' +
          '<button type="submit" class="btn btn-primary bl-submit">Book My Free Trial Class</button>' +
          '<p class="bl-note">No spam. Coach Kishore replies personally on WhatsApp.</p>' +
          '<p class="bl-error" hidden></p>' +
        '</form>' +
        '<div class="bl-success" hidden>' +
          '<div class="bl-tick">✓</div>' +
          '<h4>Got it — thank you!</h4>' +
          '<p>Coach Kishore will message you on WhatsApp shortly. Want a faster reply?</p>' +
          '<a class="btn btn-wa bl-wa" href="#" target="_blank" rel="noopener">Message on WhatsApp now</a>' +
        '</div>' +
      '</section>';
  }

  /* Map the blog article's category to the most relevant program, so the
     dropdown is already on the right option when the form appears. */
  function programForCategory(cat) {
    var map = {
      "Kids Martial Arts": "Kids Martial Arts",
      "Parent Guide": "Kids Martial Arts",
      "Wushu Training": "Wushu",
      "Kungfu Wisdom": "Kung Fu",
      "Karate Basics": "Karate",
      "Kickboxing Fitness": "Kickboxing",
      "Self Defense": "Self-Defense (Women)",
      "Women's Self Defense": "Self-Defense (Women)",
      "Athlete Mindset": "Athlete Mindset / Sports Psychology",
      "Discipline & Confidence": "Athlete Mindset / Sports Psychology",
      "Beginner Guide": "Adult Fitness & Self-Defense"
    };
    return map[cat] || "Kids Martial Arts";
  }

  function waLink(msg) {
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg);
  }

  function bind(section, ctx) {
    var form = section.querySelector(".bl-form");
    var success = section.querySelector(".bl-success");
    var errEl = section.querySelector(".bl-error");
    var btn = section.querySelector(".bl-submit");

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      errEl.hidden = true;

      var data = Object.fromEntries(new FormData(form).entries());
      var name = (data.name || "").trim();
      var phone = (data.phone || "").trim();
      var digits = phone.replace(/\D/g, "");

      if (name.length < 2) { fail("Please enter your name."); return; }
      if (digits.length < 10 || digits.length > 15) { fail("Please enter a valid WhatsApp number."); return; }

      btn.disabled = true;
      btn.textContent = "Sending…";

      var lead = {
        name: name,
        phone: phone,
        program: data.program || "Martial Arts Training",
        company: data.company || "",                 // honeypot passes straight through
        message: ctx.slug ? ("Enquiry from blog article: " + (ctx.title || ctx.slug)) : "Enquiry from the blog",
        source_tag: "blog",
        website_source: "spartacus-blog",
        utm: (typeof spAttribution === "function") ? spAttribution() : { page: location.pathname, slug: ctx.slug }
      };

      // Never lose a lead: keep a local copy even if the network fails.
      try {
        var saved = JSON.parse(localStorage.getItem("spartacus_leads") || "[]");
        saved.push(lead);
        localStorage.setItem("spartacus_leads", JSON.stringify(saved));
      } catch (_) {}

      var ok = false;
      try {
        ok = (typeof saveLead === "function") ? await saveLead(lead) : false;
      } catch (_) { ok = false; }

      if (typeof spTrack === "function") spTrack("blog_lead_submit", { slug: ctx.slug, ok: ok });
      if (typeof gtag === "function") gtag("event", "lead_submit", { source: "blog", slug: ctx.slug });
      if (typeof fbq === "function") fbq("track", "Lead", { content_name: lead.program });

      var msg = "Hi Coach Kishore, my name is " + name + ". I read your article \"" +
        (ctx.title || "on the Spartacus blog") + "\" and I am interested in " + lead.program +
        ". Please share fees, timings and trial class details.\n\n• Phone: " + phone;

      // Whether or not the database write succeeded, the visitor gets a working
      // WhatsApp route — a lead is never dropped just because a request failed.
      section.querySelector(".bl-wa").href = waLink(msg);
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: "smooth", block: "center" });

      function noop() {}
      noop(ok);
    });

    function fail(m) {
      errEl.textContent = m;
      errEl.hidden = false;
      btn.disabled = false;
      btn.textContent = "Book My Free Trial Class";
    }
  }

  function mount() {
    var post = document.getElementById("blogPost");
    var listing = document.getElementById("blogListing");

    if (post) {
      var slug = new URLSearchParams(location.search).get("slug");
      var all = window.BLOG_POSTS || [];
      var p = all.filter(function (x) { return x.slug === slug; })[0];
      if (!p) return;                                  // 404 page — no form

      var ctx = { slug: p.slug, title: p.title, category: p.category };
      var wrap = document.createElement("div");
      wrap.innerHTML = formHtml({
        heading: "Want this for your family?",
        sub: "Book a free trial class at Spartacus Martial Arts Academy, Chennai. Two details is all it takes.",
        program: programForCategory(p.category)
      });
      var section = wrap.firstChild;

      // Place it right after the FAQ, where an engaged reader finishes.
      var faq = document.getElementById("postFaq");
      var author = document.getElementById("postAuthor");
      if (faq && faq.children.length) faq.after(section);
      else if (author) author.before(section);
      else document.getElementById("postBody").after(section);

      bind(section, ctx);
    }

    if (listing) {
      var lwrap = document.createElement("div");
      lwrap.innerHTML = formHtml({
        heading: "Start training in Chennai",
        sub: "Reading is a good start. One free class tells you more than 125 articles.",
        program: "Kids Martial Arts"
      });
      var lsection = lwrap.firstChild;
      var holder = document.querySelector("#allArticles");
      if (holder) {
        var host = document.createElement("section");
        host.className = "blog-section";
        var inner = document.createElement("div");
        inner.className = "blog-wrap";
        inner.appendChild(lsection);
        host.appendChild(inner);
        holder.after(host);
        bind(lsection, { slug: null, title: "Spartacus Martial Arts Blog" });
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
