// Mada Care website behavior. Settings are in site-config.js.
(() => {
  const C = (typeof MADA_SITE !== "undefined" && MADA_SITE) || {}, $ = id => document.getElementById(id), $$ = s => [...document.querySelectorAll(s)];
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const TZ = "Asia/Riyadh";
  const parts = (d, o) => Object.fromEntries(new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { timeZone: TZ, ...o }).formatToParts(d).map(p => [p.type, p.value]));

  // Second nav: city, weather, live Riyadh date and time ("3-مايو-2026", "2:30 مساءً").
  if (C.city) $("shCity").textContent = C.city;
  if (C.weather) $("shWeather").textContent = C.weather;
  function clock() {
    const n = new Date(), d = parts(n, { day: "numeric", month: "long", year: "numeric" }), t = parts(n, { hour: "numeric", minute: "2-digit", hour12: true });
    $("shDate").textContent = `${d.day}-${d.month}-${d.year}`;
    $("shTime").textContent = `${t.hour}:${t.minute} ${/م|PM/i.test(t.dayPeriod || "") ? "مساءً" : "صباحاً"}`;
  }
  clock(); setInterval(clock, 30000);

  // Last modified, in Saudi time.
  const lm = new Date(document.lastModified);
  if (!isNaN(lm)) {
    const d = parts(lm, { day: "2-digit", month: "2-digit", year: "numeric" }), t = parts(lm, { hour: "numeric", minute: "2-digit", hour12: true });
    $("lastMod").textContent = `تاريخ آخر تعديل: ${d.day}/${d.month}/${d.year} - ${t.hour}:${t.minute} ${/م|PM/i.test(t.dayPeriod || "") ? "م" : "ص"} بتوقيت السعودية`;
  }

  // Accessibility: text size, high contrast, read aloud.
  let zoom = parseFloat(store.get("mada-site-zoom")) || 1;
  const setZoom = z => { zoom = Math.min(1.3, Math.max(.9, Math.round(z * 10) / 10)); document.documentElement.style.setProperty("--zoom", zoom); store.set("mada-site-zoom", zoom); };
  setZoom(zoom);
  $("a11yZoomIn").addEventListener("click", () => setZoom(zoom + .1));
  $("a11yZoomOut").addEventListener("click", () => setZoom(zoom - .1));
  const hc = on => { document.documentElement.classList.toggle("hc", on); $("a11yView").setAttribute("aria-pressed", on); store.set("mada-site-hc", on ? "1" : ""); };
  hc(store.get("mada-site-hc") === "1");
  $("a11yView").addEventListener("click", () => hc(!document.documentElement.classList.contains("hc")));
  const rd = $("a11yRead");
  if (!("speechSynthesis" in window)) rd.hidden = true;
  else rd.addEventListener("click", () => {
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); rd.setAttribute("aria-pressed", "false"); return; }
    const u = new SpeechSynthesisUtterance($("main").innerText.replace(/\s+/g, " ").slice(0, 6000));
    u.lang = "ar-SA"; u.onend = u.onerror = () => rd.setAttribute("aria-pressed", "false");
    rd.setAttribute("aria-pressed", "true"); speechSynthesis.speak(u);
  });

  // Mobile menu.
  const menu = $("menu"), burger = $("burger");
  burger.addEventListener("click", () => { const o = menu.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
  menu.addEventListener("click", e => { if (e.target.closest("a")) { menu.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); } });

  // FAQ accordion.
  $$(".qa-h").forEach(b => b.addEventListener("click", () => {
    const qa = b.parentElement, o = !qa.classList.contains("open");
    $$(".qa.open").forEach(x => { x.classList.remove("open"); x.querySelector(".qa-h").setAttribute("aria-expanded", "false"); });
    qa.classList.toggle("open", o); b.setAttribute("aria-expanded", o);
  }));

  // Testimonials carousel.
  const track = $("tst"), cards = [...track.children], dots = $("dots");
  cards.forEach((c, i) => { const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", `رأي ${i + 1}`); b.addEventListener("click", () => go(i)); dots.appendChild(b); });
  dots.removeAttribute("aria-hidden");
  let cur = 0;
  function go(i) {
    cur = Math.max(0, Math.min(cards.length - 1, i));
    const tr = track.getBoundingClientRect(), cr = cards[cur].getBoundingClientRect(), pad = parseFloat(getComputedStyle(track).paddingRight) || 0;
    track.scrollBy({ left: cr.right - (tr.right - pad), behavior: "smooth" });
    mark();
  }
  function mark() { [...dots.children].forEach((d, i) => d.setAttribute("aria-current", i === cur)); }
  let tmr;
  track.addEventListener("scroll", () => { clearTimeout(tmr); tmr = setTimeout(() => {
    const tr = track.getBoundingClientRect(), pad = parseFloat(getComputedStyle(track).paddingRight) || 0;
    let best = 0, bd = Infinity; cards.forEach((c, i) => { const dd = Math.abs(c.getBoundingClientRect().right - (tr.right - pad)); if (dd < bd) { bd = dd; best = i; } });
    cur = best; mark();
  }, 80); });
  $$(".pg").forEach(b => b.addEventListener("click", () => go(cur + (b.dataset.dir === "next" ? 1 : -1))));
  mark();

  // Links from the settings. Empty settings keep the design's buttons and say the link is coming.
  const toast = msg => {
    let t = $("siteToast");
    if (!t) { t = document.createElement("div"); t.id = "siteToast"; t.setAttribute("role", "status"); t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:120;background:#194136;color:#fff;padding:12px 18px;border-radius:8px;font-size:14px;box-shadow:0 12px 24px -8px rgba(0,0,0,.3)"; document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 3200);
  };
  const wa = C.whatsapp ? "https://wa.me/" + String(C.whatsapp).replace(/\D/g, "") : "";
  const ext = (a, url) => { a.href = url; if (/^https?:/.test(url)) { a.target = "_blank"; a.rel = "noopener"; } };
  const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  $$("[data-app]").forEach(a => {
    const url = isApple ? (C.appStore || C.googlePlay) : (C.googlePlay || C.appStore);
    if (url) ext(a, url); else a.addEventListener("click", e => { e.preventDefault(); toast("تطبيق مدى كير قريباً على المتاجر"); });
  });
  [["[data-gp]", C.googlePlay], ["[data-as]", C.appStore]].forEach(([s, url]) => $$(s).forEach(a => {
    if (url) ext(a, url); else a.addEventListener("click", e => { e.preventDefault(); toast("تطبيق مدى كير قريباً على المتاجر"); });
  }));
  const so = C.social || {};
  $$("[data-so]").forEach(a => {
    const k = a.dataset.so, url = k === "whatsapp" ? wa : k === "email" ? (so.email ? "mailto:" + so.email : "") : so[k];
    if (url) ext(a, url); else { a.setAttribute("aria-disabled", "true"); a.addEventListener("click", e => e.preventDefault()); }
  });
  $$("[data-help]").forEach(a => { if (wa) ext(a, wa); });
  const wf = $("waFloat");
  if (wa) ext(wf, wa); else wf.addEventListener("click", e => { e.preventDefault(); openBook(); });
  if (C.crNumber) $("crNo").textContent = C.crNumber;
  if (C.vatNumber) $("vatNo").textContent = C.vatNumber;

  // Booking request: one new row in the dashboard's requests (Requests page, source "website", on hold until the call center calls).
  const ov = $("bookOv"), form = $("bookForm"), err = $("bkErr");
  let lastFocus = null;
  function openBook(svc) {
    lastFocus = document.activeElement;
    $("bkForm").hidden = false; $("bkDone").hidden = true; err.hidden = true;
    form.querySelectorAll("[aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
    if (svc) $("bkSvc").value = svc;
    ov.hidden = false; document.body.style.overflow = "hidden";
    setTimeout(() => $("bkName").focus(), 30);
  }
  function closeBook() { ov.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
  $$("[data-book]").forEach(el => {
    const fire = e => { e.preventDefault(); openBook(el.dataset.svc); };
    el.addEventListener("click", fire);
    if (el.tagName !== "A") el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") fire(e); });
  });
  ov.addEventListener("click", e => { if (e.target === ov || e.target.closest("[data-close]")) closeBook(); });
  document.addEventListener("keydown", e => {
    if (ov.hidden) return;
    if (e.key === "Escape") closeBook();
    if (e.key === "Tab") {
      const f = [...ov.querySelectorAll("button, input, select, textarea, a[href]")].filter(x => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  const latin = v => v.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  $("bkMobile").addEventListener("input", e => { e.target.value = latin(e.target.value).replace(/\D/g, "").slice(0, 10); });
  const bad = (el, msg) => { el.setAttribute("aria-invalid", "true"); err.textContent = msg; err.hidden = false; el.focus(); return false; };
  function valid() {
    form.querySelectorAll("[aria-invalid]").forEach(x => x.removeAttribute("aria-invalid")); err.hidden = true;
    if ($("bkName").value.trim().length < 2) return bad($("bkName"), "اكتب الاسم.");
    if (!/^05\d{8}$/.test($("bkMobile").value)) return bad($("bkMobile"), "اكتب رقم جوال صحيح يبدأ بـ 05 ومكوّن من 10 أرقام.");
    if (!$("bkSvc").value) return bad($("bkSvc"), "اختر الخدمة.");
    return true;
  }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!valid()) return;
    const cloud = C.cloud || {};
    if (!cloud.url || !cloud.key) { err.textContent = "الحجز من الموقع غير متاح حالياً، تواصل معنا عبر واتساب."; err.hidden = false; return; }
    const btn = $("bkSend"); btn.disabled = true;
    const now = new Date().toISOString(), id = "WEB-" + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 5).toUpperCase();
    const name = $("bkName").value.trim(), mobile = $("bkMobile").value, service = $("bkSvc").value, note = $("bkNote").value.trim();
    const order = {
      id, createdAt: now, updatedAt: now, service, mobile, medical: "non", patient: { en: name, ar: name }, mrn: null, staff: null, staffId: null,
      source: "website", status: "on_hold", decision: "pending", payment: null, web: { name, note: note || null, at: now },
      hold: { reason: "web", note: note || null, at: now, by: null, byId: null, view: "step1", snap: { mobile, source: "website", view: "step1", savedAt: now }, dueAt: now, action: "call", warned: null }
    };
    try {
      const res = await fetch(cloud.url.replace(/\/$/, "") + "/rest/v1/mada_data", {
        method: "POST",
        headers: { apikey: cloud.key, "Content-Type": "application/json", Prefer: "return=minimal", ...(String(cloud.key).split(".").length === 3 ? { Authorization: "Bearer " + cloud.key } : {}) },
        body: JSON.stringify({ k: "mada-orders", rid: id, v: JSON.stringify(order), pos: Math.floor(Date.now() / 1000) })
      });
      if (!res.ok) throw new Error(res.status);
      $("bkRef").textContent = id; $("bkForm").hidden = true; $("bkDone").hidden = false; form.reset();
      $("bkDone").querySelector("button").focus();
    } catch (x) {
      err.textContent = "تعذّر إرسال الطلب، حاول مرة أخرى."; err.hidden = false;
    } finally { btn.disabled = false; }
  });

  // Subscribe: no mailing service is connected yet, so nothing is saved.
  $("subForm").addEventListener("submit", e => {
    e.preventDefault();
    const m = $("subMsg"), v = $("subEmail").value.trim();
    m.hidden = false;
    m.textContent = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "شكراً لاهتمامك، خدمة الاشتراك ستتوفر قريباً." : "اكتب بريداً إلكترونياً صحيحاً.";
  });
})();
