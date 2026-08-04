/* ============================================================
   SPARTACUS — On-device Admin Editor
   Open it by adding  #admin  to the website URL.
   ------------------------------------------------------------
   CHANGE THIS PASSWORD to your own:
   ============================================================ */
(function () {
  "use strict";
  var PASSWORD = "spartacus@2026";   // <-- change to your own secret

  if (window.__spAdminInit) return;
  window.__spAdminInit = true;
  var SP = window.Spartacus;
  if (!SP) { alert("Editor engine not ready — reload the page."); return; }

  /* ---- light password gate (note: this is a convenience lock, not bank-grade
     security; nothing publishes until YOU upload content.json) ---- */
  if (sessionStorage.getItem("sp_admin_ok") !== "1") {
    var pw = prompt("Spartacus Admin — enter password:");
    if (pw === null) { history.replaceState(null, "", location.pathname); return; }
    if (pw !== PASSWORD) { alert("Wrong password."); history.replaceState(null, "", location.pathname); return; }
    sessionStorage.setItem("sp_admin_ok", "1");
  }

  /* ---- styles ---- */
  var css = document.createElement("style");
  css.textContent = [
    "#sp-admin{position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#0b0b0d;border-top:2px solid #e9c45a;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 14px;font-family:Inter,system-ui,sans-serif;box-shadow:0 -12px 34px rgba(0,0,0,.7)}",
    "#sp-admin .sp-brand{color:#e9c45a;font-weight:800;letter-spacing:.06em;margin-right:4px;font-size:.82rem}",
    "#sp-admin button{font:600 .8rem Inter,system-ui,sans-serif;border-radius:8px;border:1px solid #2a2a30;background:#17171b;color:#fff;padding:9px 13px;cursor:pointer;transition:.15s}",
    "#sp-admin button:hover{border-color:#e9c45a}",
    "#sp-admin button.on{background:#e11d2a;border-color:#e11d2a}",
    "#sp-admin button.gold{background:linear-gradient(135deg,#f6d77a,#b6892b);color:#1a1303;border:0;font-weight:700}",
    "#sp-admin .sp-spacer{flex:1 1 20px}",
    "#sp-admin .sp-status{color:#9a9aa3;font-size:.73rem;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "body.sp-editing [data-sp-edit]{outline:1.5px dashed rgba(233,196,90,.55);outline-offset:3px;cursor:text;border-radius:3px}",
    "body.sp-editing [data-sp-edit]:hover{outline-color:#e9c45a}",
    "body.sp-editing [data-sp-edit]:focus{outline:2px solid #e9c45a;background:rgba(233,196,90,.07)}",
    "body.sp-imgmode img[data-sp-img]{outline:2px dashed #2da6e0;outline-offset:3px;cursor:pointer}",
    "body.sp-imgmode img[data-sp-img]:hover{outline:3px solid #2da6e0}",
    "body.sp-editing .faq-a{max-height:none!important}",
    "body.sp-admin-pad{padding-bottom:84px!important}",
    ".sp-modal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:18px}",
    ".sp-modal .box{background:#141416;border:1px solid #2a2a30;border-radius:14px;padding:24px;max-width:460px;width:100%;font-family:Inter,system-ui,sans-serif}",
    ".sp-modal h3{color:#e9c45a;font-size:1.1rem;margin:0 0 6px}",
    ".sp-modal p.hint{color:#9a9aa3;font-size:.8rem;margin:0 0 8px}",
    ".sp-modal label{display:block;color:#cfcfd4;font-size:.78rem;margin:13px 0 5px}",
    ".sp-modal input{width:100%;padding:10px;border-radius:8px;border:1px solid #2a2a30;background:#0b0b0d;color:#fff;font-size:.9rem}",
    ".sp-modal .row{display:flex;gap:10px;margin-top:18px}",
    ".sp-modal .row button{flex:1;padding:11px;border-radius:8px;border:0;font-weight:700;cursor:pointer;font-family:inherit}"
  ].join("\n");
  document.head.appendChild(css);
  document.body.classList.add("sp-admin-pad");

  /* ---- toolbar ---- */
  var bar = document.createElement("div");
  bar.id = "sp-admin";
  bar.innerHTML =
    '<span class="sp-brand">⚔ ADMIN</span>' +
    '<button id="sp-text">✎ Edit Text</button>' +
    '<button id="sp-img">🖼 Replace Images</button>' +
    '<button id="sp-set">⚙ Contact &amp; Links</button>' +
    '<button id="sp-save">💾 Save</button>' +
    '<button id="sp-publish" class="gold">🚀 Publish Live</button>' +
    '<button id="sp-export">⬇ Export file</button>' +
    '<span class="sp-spacer"></span>' +
    '<span class="sp-status" id="sp-status"></span>' +
    '<button id="sp-discard">↺ Discard</button>' +
    '<button id="sp-exit">✕ Exit</button>';
  document.body.appendChild(bar);
  var statusEl = document.getElementById("sp-status");
  function status(m) { statusEl.textContent = m || ""; }

  /* tag editable nodes so styles/handlers can target them */
  SP.collectText().forEach(function (p) { p[1].setAttribute("data-sp-edit", p[0]); });
  SP.collectImgs().forEach(function (p) { p[1].setAttribute("data-sp-img", p[0]); });

  var textOn = false, imgOn = false;

  function protectChildren(el) {
    el.querySelectorAll("img,svg,.pm,.dot,.chk,.icon-tile,source").forEach(function (c) { c.contentEditable = "false"; });
  }
  function setTextEdit(on) {
    textOn = on;
    document.body.classList.toggle("sp-editing", on);
    document.getElementById("sp-text").classList.toggle("on", on);
    SP.collectText().forEach(function (p) { p[1].contentEditable = on ? "true" : "false"; if (on) protectChildren(p[1]); });
    if (on && imgOn) setImgEdit(false);
    status(on ? "Edit ON — click any text and type, then Save." : "");
  }
  function setImgEdit(on) {
    imgOn = on;
    document.body.classList.toggle("sp-imgmode", on);
    document.getElementById("sp-img").classList.toggle("on", on);
    if (on && textOn) setTextEdit(false);
    status(on ? "Image mode ON — click any image to replace it." : "");
  }

  /* stop FAQ accordion from toggling while editing text */
  document.addEventListener("click", function (e) {
    if (textOn && e.target.closest(".faq-q")) e.stopImmediatePropagation();
  }, true);

  /* image replace */
  document.addEventListener("click", function (e) {
    if (!imgOn) return;
    var img = e.target.closest("img[data-sp-img]");
    if (!img) return;
    e.preventDefault(); e.stopPropagation();
    var key = img.getAttribute("data-sp-img");
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        document.querySelectorAll('img[data-sp-img="' + key + '"]').forEach(function (im) {
          var pic = im.closest("picture"); if (pic) { var s = pic.querySelector("source"); if (s) s.remove(); }
          im.src = rd.result; im.style.display = "";
        });
        status('Image "' + key + '" replaced — Save + Export to keep it.');
      };
      rd.readAsDataURL(f);
    };
    inp.click();
  }, true);

  /* gather current state into a content object */
  function gather() {
    // start from the full known content (all pages) so editing one page never wipes the others
    var full = {};
    try { full = JSON.parse(JSON.stringify(SP.content || {})); } catch (_) { full = {}; }
    full.text = full.text || {}; full.img = full.img || {}; full.settings = full.settings || {};
    SP.collectText().forEach(function (p) {
      full.text[p[0]] = p[1].innerHTML.replace(/\s*contenteditable="[^"]*"/gi, "").trim();
    });
    SP.collectImgs().forEach(function (p) {
      var src = p[1].getAttribute("src") || "";
      if (src.indexOf("data:") === 0) full.img[p[0]] = src;   // only store replaced (embedded) images
    });
    full.settings.whatsappNumber = SP.CONFIG.whatsappNumber;
    full.settings.instagram = SP.CONFIG.instagram;
    return full;
  }
  function save() {
    localStorage.setItem("spartacus_content", JSON.stringify(gather()));
    status("Saved on this device ✓  " + new Date().toLocaleTimeString());
  }
  function publishLive() {
    var c = gather();
    localStorage.setItem("spartacus_content", JSON.stringify(c));
    status("Publishing to server…");
    fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": PASSWORD },
      body: JSON.stringify(c)
    })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: "bad response" }; }); })
      .then(function (j) {
        if (j && j.ok) {
          status("✅ Published LIVE — " + new Date().toLocaleTimeString());
          alert("✅ Published!\n\nYour changes are now LIVE for everyone visiting the site. No re-upload needed.");
        } else {
          status("Publish failed: " + ((j && j.error) || ""));
          alert("Couldn't publish (" + ((j && j.error) || "error") + ").\n\nLive publish needs the Node server (npm start) or a Node host.\nOn static hosting, use ⬇ Export file instead, then re-upload content.json.");
        }
      })
      .catch(function () {
        status("Publish failed — no server reachable.");
        alert("Couldn't reach the server to publish.\n\nLive publish works when the site runs on its Node server (npm start) or a Node host. On static hosting (e.g. Netlify drop), use ⬇ Export file and re-upload content.json.");
      });
  }
  function exportJson() {
    save();
    var blob = new Blob([JSON.stringify(gather(), null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "content.json"; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    alert("Downloaded content.json ✅\n\nTO PUBLISH (make it live for everyone):\n1. Put this content.json into your website folder (next to index.html), replacing the old one.\n2. Re-upload the folder to your host (drag to Netlify, etc.).\n\nUntil you do that, edits show only on this device.");
  }

  /* settings modal */
  function openSettings() {
    var m = document.createElement("div");
    m.className = "sp-modal";
    m.innerHTML =
      '<div class="box"><h3>⚙ Contact &amp; Links</h3>' +
      '<p class="hint">Updates every WhatsApp button, Call button and Instagram link on the site.</p>' +
      '<label>WhatsApp number (country code + number, digits only)</label><input id="sp-wa">' +
      '<label>Instagram URL</label><input id="sp-ig">' +
      '<div class="row"><button class="gold" id="sp-ok" style="background:linear-gradient(135deg,#f6d77a,#b6892b);color:#1a1303">Apply</button>' +
      '<button id="sp-cancel" style="background:#2a2a30;color:#fff">Cancel</button></div></div>';
    document.body.appendChild(m);
    m.querySelector("#sp-wa").value = SP.CONFIG.whatsappNumber;
    m.querySelector("#sp-ig").value = SP.CONFIG.instagram;
    m.querySelector("#sp-cancel").onclick = function () { m.remove(); };
    m.querySelector("#sp-ok").onclick = function () {
      SP.applySettings({
        whatsappNumber: m.querySelector("#sp-wa").value,
        instagram: m.querySelector("#sp-ig").value
      });
      m.remove();
      status("Contact info applied — Save + Export to keep it.");
    };
  }

  document.getElementById("sp-text").onclick = function () { setTextEdit(!textOn); };
  document.getElementById("sp-img").onclick = function () { setImgEdit(!imgOn); };
  document.getElementById("sp-set").onclick = openSettings;
  document.getElementById("sp-save").onclick = save;
  document.getElementById("sp-publish").onclick = publishLive;
  document.getElementById("sp-export").onclick = exportJson;
  document.getElementById("sp-discard").onclick = function () {
    if (confirm("Discard your local unsaved edits and reload the published version?")) {
      localStorage.removeItem("spartacus_content"); location.reload();
    }
  };
  document.getElementById("sp-exit").onclick = function () {
    history.replaceState(null, "", location.pathname); location.reload();
  };

  status("Ready — edits stay on this device until you Export + re-upload content.json.");
})();
