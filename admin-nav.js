// Dashboard side menu. Turns the top bar's links into a vertical menu on the side, with a button to show or hide it.
// Desktop: open (icons + names) or closed (icons only), remembered per browser.
// iPad and phones (up to 1200px wide): hidden, the button slides it in over the page.
// Loaded right after </header> on every dashboard page; the page keeps its own links, counts and translations.
(() => {
  const header = document.querySelector("header.topbar"), nav = header && header.querySelector(".nav");
  if (!header || !nav) return;
  const KEY = "mada-admin-nav", SMALL = 1200;
  const IC = {
    "dashboard.html": '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    "requests.html": '<path d="M4 6h16M4 12h16M4 18h10"/>',
    "bookings.html": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
    "patients.html": '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.6c1.9.7 3.1 2.6 3.5 5.4"/>',
    "medical-requests.html": '<path d="M9 3h6v4H9z"/><path d="M15 5h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3"/><path d="M12 11v6M9 14h6"/>',
    "invoices.html": '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    "services.html": '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M17 13v8M13 17h8"/>',
    "quality.html": '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
    "staff.html": '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M3 12h18"/>',
    "coupons.html": '<path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a3 3 0 0 0 0 6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a3 3 0 0 0 0-6z"/><path d="M14 5v2M14 11v2M14 17v2"/>',
    "lab-results.html": '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 14h9"/>',
    "followup-orders.html": '<path d="M9 4h6v3H9z"/><path d="M8 5H6v16h12V5h-2M9 12h6M9 16h4"/>',
    "xray-results.html": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 8v8M9 10h6M9 13h6"/>',
    "physio-requests.html": '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v6l-3 8M12 13l3 8M7 10l5-1 5 1"/>',
    "providers.html": '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3"/>',
    "coverage.html": '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    "policies.html": '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    "diagnoses.html": '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
    "medications.html": '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>',
    soon: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>'
  };
  const svg = p => `<svg class="mn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

  // Links added here so every page gets them without its own translation; named by the page language in paint().
  const EXTRA = [{ href: "followup-orders.html", en: "Doctor Orders", ar: "طلبات الطبيب", after: "patients.html" }, { href: "lab-results.html", en: "Lab Results", ar: "نتائج التحاليل", after: "medical-requests.html" }, { href: "xray-results.html", en: "X-ray Results", ar: "نتائج الأشعة", after: "lab-results.html" }, { href: "physio-requests.html", en: "Physiotherapy Requests", ar: "طلبات العلاج الطبيعي", after: "xray-results.html" }, { href: "providers.html", en: "Service Providers", ar: "مقدمو الخدمة", after: "services.html" }, { href: "diagnoses.html", en: "Diagnoses", ar: "التشخيصات", after: "providers.html" }, { href: "medications.html", en: "Medications", ar: "الأدوية", after: "diagnoses.html" }, { href: "coupons.html", en: "Coupons", ar: "الكوبونات" }, { href: "coverage.html", en: "Coverage", ar: "التغطية" }];
  EXTRA.forEach(x => {
    let a = nav.querySelector(`a[href="${x.href}"]`);
    if (!a) {
      a = document.createElement("a"); a.href = x.href; a.innerHTML = '<span class="mn-tx mn-extra"></span>'; a.querySelector("span").dataset.en = x.en; a.querySelector("span").dataset.ar = x.ar;
      const af = x.after && nav.querySelector(`a[href="${x.after}"]`), at = nav.querySelector('a[href="staff.html"]');
      af ? af.after(a) : at ? nav.insertBefore(a, at) : nav.appendChild(a);
    }
    if (new RegExp("(^|/)" + x.href.replace(".", "\\.") + "$").test(location.pathname)) a.setAttribute("aria-current", "page");
  });

  // Each link: icon + name. A name set straight on the link moves into its own span so translating the page keeps the icon.
  nav.querySelectorAll("a").forEach(a => {
    if (a.dataset.i18n) { const s = document.createElement("span"); s.dataset.i18n = a.dataset.i18n; s.textContent = a.textContent; a.removeAttribute("data-i18n"); a.textContent = ""; a.appendChild(s); }
    const label = a.querySelector("[data-i18n]"); if (label) label.classList.add("mn-tx");
    a.insertAdjacentHTML("afterbegin", svg(IC[a.getAttribute("href")] || (a.classList.contains("nav-soon") ? IC.soon : IC["dashboard.html"])));
    a.title = label ? label.textContent.trim() : "";
  });

  const side = document.createElement("aside");
  side.className = "mn-side"; side.id = "mnSide";
  const logo = header.querySelector(".logo");
  if (logo) side.appendChild(logo);
  side.appendChild(nav);
  document.body.insertBefore(side, header);
  const back = document.createElement("div"); back.className = "mn-back"; back.hidden = true;
  document.body.insertBefore(back, header);

  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "mn-btn"; btn.id = "mnBtn"; btn.setAttribute("aria-controls", "mnSide");
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  header.insertBefore(btn, header.firstChild);
  // Phones and iPad: the logo stays visible in the top bar while the menu is hidden.
  if (logo) { const m = document.createElement("a"); m.className = "mn-mlogo"; m.href = logo.getAttribute("href") || "dashboard.html"; m.setAttribute("aria-label", "Mada care");
    m.innerHTML = '<img src="assets/mada-logo.png" alt="">'; btn.after(m); }

  const small = () => innerWidth <= SMALL;
  let closed = false; try { closed = localStorage.getItem(KEY) === "closed"; } catch (e) {}
  const ar = () => document.documentElement.dir === "rtl";
  function paint() {
    const sm = small(), open = sm ? document.body.classList.contains("mn-drawer") : !closed;
    document.body.classList.toggle("mn-closed", !sm && closed);
    if (!sm) document.body.classList.remove("mn-drawer");
    back.hidden = !(sm && document.body.classList.contains("mn-drawer"));
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", ar() ? (open ? "إخفاء القائمة" : "إظهار القائمة") : (open ? "Hide menu" : "Show menu"));
    nav.querySelectorAll(".mn-extra").forEach(l => l.textContent = ar() ? l.dataset.ar : l.dataset.en);
    nav.querySelectorAll("a").forEach(a => { const l = a.querySelector(".mn-tx"); if (l) a.title = l.textContent.trim(); });
  }
  btn.addEventListener("click", () => {
    if (small()) document.body.classList.toggle("mn-drawer");
    else { closed = !closed; try { localStorage.setItem(KEY, closed ? "closed" : "open"); } catch (e) {} }
    paint();
  });
  const shut = () => { document.body.classList.remove("mn-drawer"); paint(); };
  back.addEventListener("click", shut);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("mn-drawer")) { shut(); btn.focus(); } });
  nav.addEventListener("click", e => { if (e.target.closest("a") && small()) shut(); });
  addEventListener("resize", paint);
  // Language switch flips the direction and names; refresh the button label and tooltips.
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["dir", "lang"] });

  const st = document.createElement("style");
  st.textContent = `
:root { --mn-w: 248px; --mn-rail: 76px; }
body { padding-inline-start: var(--mn-w); transition: padding .2s ease; }
body.mn-closed { padding-inline-start: var(--mn-rail); }
.mn-side { position: fixed; top: 0; bottom: 0; inset-inline-start: 0; z-index: 40; width: var(--mn-w); background: #fff; border-inline-end: 1px solid var(--border, #e3e8ea);
  display: flex; flex-direction: column; gap: 18px; padding: 16px 14px; overflow-y: auto; overflow-x: hidden; transition: width .2s ease, transform .22s ease; }
.mn-side .logo { display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 6px; flex: none; }
.mn-side .logo img { height: 40px; width: auto; flex: none; }
.mn-side .logo > div { min-width: 0; white-space: nowrap; }
.mn-side .nav { display: grid; gap: 4px; margin: 0; overflow: visible; order: 0; flex-basis: auto; }
.mn-side .nav a { display: flex; align-items: center; gap: 12px; height: 46px; padding: 0 14px; border-radius: 10px; font-size: 14px; font-weight: 500; color: #2c3d43; text-decoration: none; white-space: nowrap; position: relative; }
.mn-side .nav a:hover { background: #f3f6f7; }
.mn-side .nav a[aria-current="page"] { background: var(--primary-soft, #e6f3ef); color: var(--primary, #0b6b5c); font-weight: 600; }
.mn-side .nav a.nav-soon { color: #8a979c; }
.mn-side .nav a.nav-soon:hover { background: none; }
.mn-side .mn-ic { width: 21px; height: 21px; flex: none; }
.mn-side .mn-tx { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.mn-side .nav-count, .mn-side .soon-tag { margin-inline-start: auto; flex: none; }
.mn-btn { width: 40px; height: 40px; flex: none; border: 1px solid var(--border, #e3e8ea); border-radius: 10px; background: #fff; color: #2c3d43; display: grid; place-items: center; cursor: pointer; }
.mn-btn:hover { background: #f3f6f7; }
.mn-btn svg { width: 20px; height: 20px; }
.mn-btn:focus-visible, .mn-side a:focus-visible { outline: 2px solid var(--primary, #0b6b5c); outline-offset: 2px; }
header.topbar > .logo { display: none; }
body.mn-closed .mn-side { width: var(--mn-rail); padding-inline: 12px; }
body.mn-closed .mn-side .logo > div, body.mn-closed .mn-side .mn-tx, body.mn-closed .mn-side .soon-tag { display: none; }
body.mn-closed .mn-side .logo { justify-content: center; padding: 0; }
body.mn-closed .mn-side .nav a { justify-content: center; padding: 0; }
body.mn-closed .mn-side .nav-count { position: absolute; top: 5px; inset-inline-end: 6px; min-width: 16px; height: 16px; line-height: 16px; font-size: 9.5px; padding: 0 4px; }
/* The side menu takes width from the page: let the page content shrink instead of pushing past the screen. */
body > main { min-width: 0; grid-template-columns: minmax(0, 1fr); }
body > main > *, body > main .table-wrap { min-width: 0; }
body > main .table-wrap { max-width: 100%; overflow-x: auto; }
.mn-back { position: fixed; inset: 0; z-index: 39; background: rgba(16,35,43,.42); }
@media (max-width: ${SMALL}px) {
  body, body.mn-closed { padding-inline-start: 0; }
  .mn-side { width: min(280px, 86vw); box-shadow: 0 0 40px rgba(16,35,43,.18); transform: translateX(-105%); }
  [dir="rtl"] .mn-side { transform: translateX(105%); }
  body.mn-drawer .mn-side { transform: none; }
  body.mn-drawer { overflow: hidden; }
}
.mn-mlogo { display: none; }
@media (max-width: ${SMALL}px) { .mn-mlogo { display: flex; align-items: center; flex: none; } .mn-mlogo img { height: 34px; width: auto; } }
@media (prefers-reduced-motion: reduce) { body, .mn-side { transition: none; } }`;
  document.head.appendChild(st);
  paint();
})();
