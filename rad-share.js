// Imaging appointment: share it with the patient and send the patient's details to the imaging center.
// Used by Medical Requests (medical-request.html) and Doctor Orders (followup-orders.html) once an imaging item is booked.
//   item.radLoc  = { address, map }          the patient's location for this appointment (editable; starts from the booking's location)
//   item.radLink = { token, createdAt, sent: [{ ch, at, by }] }   the booking link (rad-booking.html?t=...) the patient opens
// Demo: the booking page reads the item from the shared store. TODO: before real patient data, the backend must return only this
// appointment for the token.
const MadaRadShare = (() => {
  const L = {
    en: { shT: "Share the appointment", shS: "Send the booking to the patient, and the patient's details and location to the imaging center.",
      sendPt: "Send to patient", copyMsg: "Copy message", openLink: "Open booking page", sheet: "Patient details for the center", editLoc: "Edit location", saveLoc: "Save location", cancel: "Cancel",
      locT: "Patient location", addr: "Address", map: "Google Maps link", mapPh: "https://maps.google.com/...", noLoc: "No location yet. Add the address and the map link.", openMap: "Open in Maps",
      locSaved: "Location saved.", badMap: "Paste a map link that starts with https://", needAddr: "Write the address or paste the map link.", copied: "Message copied.", noPhone: "There is no mobile number on this request.",
      m_head: "Mada Care · Imaging appointment", m_hi: "Hello {n},", m_body: "Your {x} appointment is booked:", m_center: "Center: {c}", m_when: "Date: {d} · {t}", m_loc: "Location: {a}", m_link: "Booking details:", m_thanks: "We wish you good health 💚",
      sh_title: "Imaging Appointment · Patient Details", sh_for: "For the imaging center", sh_patient: "Patient", sh_file: "File No.", sh_mobile: "Mobile", sh_id: "ID / Iqama", sh_dob: "Date of birth", sh_exam: "Exam requested", sh_note: "Doctor's note",
      sh_center: "Imaging center", sh_when: "Appointment", sh_req: "Request No.", sh_doc: "Ordering doctor", sh_loc: "Patient location", sh_scan: "Scan to open the patient's location", sh_printed: "Printed {t}",
      sent: "Sent by {c} · {t}", ch_wa: "WhatsApp", ch_sms: "SMS", ch_copy: "copied message" },
    ar: { shT: "مشاركة الموعد", shS: "أرسل الحجز للمريض، وأرسل بيانات المريض وموقعه لمركز الأشعة.",
      sendPt: "إرسال للمريض", copyMsg: "نسخ الرسالة", openLink: "فتح صفحة الحجز", sheet: "بيانات المريض للمركز", editLoc: "تعديل الموقع", saveLoc: "حفظ الموقع", cancel: "إلغاء",
      locT: "موقع المريض", addr: "العنوان", map: "رابط قوقل ماب", mapPh: "https://maps.google.com/...", noLoc: "ما فيه موقع للحين. أضف العنوان ورابط الخريطة.", openMap: "فتح في الخرائط",
      locSaved: "انحفظ الموقع.", badMap: "الصق رابط خريطة يبدأ بـ https://", needAddr: "اكتب العنوان أو الصق رابط الخريطة.", copied: "انسخت الرسالة.", noPhone: "ما فيه رقم جوال في هذا الطلب.",
      m_head: "مدى كير · موعد الأشعة", m_hi: "أهلاً {n}،", m_body: "تم حجز موعد {x} لك:", m_center: "المركز: {c}", m_when: "التاريخ: {d} · {t}", m_loc: "الموقع: {a}", m_link: "تفاصيل الحجز:", m_thanks: "نتمنى لك الصحة والعافية 💚",
      sh_title: "موعد أشعة · بيانات المريض", sh_for: "لمركز الأشعة", sh_patient: "المريض", sh_file: "رقم الملف", sh_mobile: "الجوال", sh_id: "الهوية / الإقامة", sh_dob: "تاريخ الميلاد", sh_exam: "الفحص المطلوب", sh_note: "ملاحظة الطبيب",
      sh_center: "مركز الأشعة", sh_when: "الموعد", sh_req: "رقم الطلب", sh_doc: "الطبيب الطالب", sh_loc: "موقع المريض", sh_scan: "امسح الكود عشان يفتح موقع المريض", sh_printed: "طُبع {t}",
      sent: "انرسل عبر {c} · {t}", ch_wa: "واتساب", ch_sms: "رسالة SMS", ch_copy: "نسخ الرسالة" }
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const T = (v, lg) => v && typeof v === "object" ? v[lg] || v.en || v.ar || "" : v || "";
  const tx = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : "");
  const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const IC = { send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' };

  const STEPS = () => MadaMedical.STEPS.radiology;
  // The latest "appointment booked" entry: center, providerId, date, time.
  const booking = it => { const l = (it.log || []).filter(x => STEPS()[x.step] === "scheduled").pop(); return l ? { ...(l.data || {}), at: l.at, by: l.by } : null; };
  const mapOf = loc => loc && loc.lat != null && loc.lng != null ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : "";
  // Where the patient is for this appointment: the item's own location, else the visit's location.
  function locOf(r, it) {
    if (it.radLoc && (it.radLoc.address || it.radLoc.map)) return it.radLoc;
    const o = r && r.orderId && MadaOrders.get(r.orderId), loc = o && o.location;
    return { address: (loc && loc.address) || "", map: mapOf(loc) };
  }
  const centerName = (b, lg) => { const p = b && b.providerId && typeof MadaProviders !== "undefined" ? MadaProviders.get(b.providerId) : null; return p ? T(p.name, lg) : (b && b.center) || ""; };
  const fmtDate = (s, lg) => s ? new Date(s + "T00:00").toLocaleDateString(lg === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const fmtTime = (s, lg) => { if (!s) return ""; const [h, m] = s.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? (lg === "ar" ? "م" : "PM") : (lg === "ar" ? "ص" : "AM")}`; };
  const newToken = () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, "0")).join(""); };
  function link(r, it) {
    let tk = it.radLink && it.radLink.token;
    if (!tk) { tk = newToken(); MadaMedical.patchItem(r.id, it.id, { radLink: { token: tk, createdAt: new Date().toISOString(), sent: [] } }); }
    return tk;
  }
  const url = (tk, lg) => new URL(`rad-booking.html?t=${tk}&l=${lg}`, location.href).href;
  function message(r, it, lg, tk) {
    const M = L[lg], b = booking(it) || {}, loc = locOf(r, it), first = String(T(r.patient, lg)).split(/\s+/)[0] || "";
    return [M.m_head, "", tx(M.m_hi, { n: first }), tx(M.m_body, { x: T(it.title, lg) }), tx(M.m_center, { c: centerName(b, lg) }), tx(M.m_when, { d: fmtDate(b.date, lg), t: fmtTime(b.time, lg) || "—" }),
      loc.address ? tx(M.m_loc, { a: loc.address }) : "", "", M.m_link, "🔗 " + url(tk, lg), "", M.m_thanks].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n");
  }
  const waNum = m => { const d = String(m || "").replace(/\D/g, ""); return d.startsWith("05") ? "966" + d.slice(1) : d.startsWith("5") && d.length === 9 ? "966" + d : d; };

  // The share box under a booked imaging item. edit: show the location form.
  function html(r, it, lg, edit) {
    const M = L[lg], loc = locOf(r, it), last = it.radLink && (it.radLink.sent || []).slice(-1)[0];
    const when = s => new Date(s).toLocaleString(lg === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    const locBox = edit ? `<div class="rs-loc-f"><label><span>${M.addr}</span><input class="inp" data-rs-addr dir="auto" maxlength="200" value="${esc(loc.address)}"></label>
        <label><span>${M.map}</span><input class="inp ltr" data-rs-map dir="ltr" maxlength="400" placeholder="${M.mapPh}" value="${esc(loc.map)}"></label>
        <div class="rs-err" data-rs-err hidden></div><div class="rs-acts"><button type="button" class="btn btn-primary btn-sm" data-rs="saveLoc">${M.saveLoc}</button><button type="button" class="btn btn-ghost btn-sm" data-rs="cancelLoc">${M.cancel}</button></div></div>`
      : `<div class="rs-loc">${svg(IC.pin)}<div><b>${M.locT}</b><span dir="auto">${loc.address ? esc(loc.address) : M.noLoc}</span>${loc.map ? `<a href="${esc(loc.map)}" target="_blank" rel="noopener">${M.openMap}</a>` : ""}</div>
        <button type="button" class="btn btn-ghost btn-sm" data-rs="editLoc">${svg(IC.pen)}${M.editLoc}</button></div>`;
    return `<div class="rs" data-rs-item="${esc(it.id)}"><div class="rs-h"><b>${M.shT}</b><small>${M.shS}</small></div>${locBox}
      <div class="rs-acts"><button type="button" class="btn btn-primary btn-sm" data-rs="wa">${svg(IC.send)}${M.sendPt}</button><button type="button" class="btn btn-ghost btn-sm" data-rs="copy">${svg(IC.copy)}${M.copyMsg}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-rs="open">${svg(IC.eye)}${M.openLink}</button><button type="button" class="btn btn-ghost btn-sm" data-rs="sheet">${svg(IC.doc)}${M.sheet}</button></div>
      ${last ? `<p class="rs-sent">${esc(tx(M.sent, { c: M["ch_" + last.ch] || last.ch, t: when(last.at) }))}</p>` : ""}</div>`;
  }
  const CSS = `.rs { margin-top: 12px; border: 1px solid #cfe6de; background: #f6fbf9; border-radius: 12px; padding: 14px; }
    .rs-h b { display: block; font-size: 14px; color: #0b6b5c; } .rs-h small { display: block; font-size: 12.5px; color: #6b7a80; margin-top: 2px; }
    .rs-loc { display: flex; align-items: flex-start; gap: 10px; margin: 12px 0; padding: 10px 12px; background: #fff; border: 1px solid #e3e8ea; border-radius: 10px; }
    .rs-loc > svg { width: 18px; height: 18px; color: #0b6b5c; flex: none; margin-top: 2px; } .rs-loc > div { flex: 1; min-width: 0; font-size: 13px; }
    .rs-loc b, .rs-loc > div > span { display: block; } .rs-loc b { font-size: 12px; color: #6b7a80; font-weight: 600; } .rs-loc a { display: inline-block; margin-top: 4px; color: #0b6b5c; font-weight: 600; font-size: 12.5px; }
    .rs-loc-f { display: grid; gap: 10px; margin: 12px 0; } .rs-loc-f label span { display: block; font-size: 12.5px; font-weight: 600; color: #44545a; margin-bottom: 4px; }
    .rs-acts { display: flex; flex-wrap: wrap; gap: 8px; } .rs-acts .btn svg { width: 15px; height: 15px; }
    .rs-err { color: #dc2626; font-size: 12.5px; } .rs-sent { margin: 8px 0 0; font-size: 12px; color: #6b7a80; }
    @media (max-width: 640px) { .rs-acts .btn { flex: 1 1 calc(50% - 8px); } .rs-loc { flex-wrap: wrap; } }`;
  const styled = () => { if (document.getElementById("rsCss")) return; const s = document.createElement("style"); s.id = "rsCss"; s.textContent = CSS; document.head.appendChild(s); };

  // Printable sheet for the imaging center: patient, exam, appointment and location, with a QR code of the map link.
  async function sheet(r, it, lg) {
    const M = L[lg], b = booking(it) || {}, loc = locOf(r, it), file = (r.mrn && typeof MadaPatients !== "undefined" && MadaPatients.get(r.mrn)) || {};
    const o = r.orderId && MadaOrders.get(r.orderId), arr = (o && o.doctorVisit && o.doctorVisit.steps && o.doctorVisit.steps.arrival) || {};
    const doc = (MadaOrders.DOCTORS || []).find(d => d.id === r.doctorId);
    const w = window.open("", "_blank"); if (!w) return;
    if (loc.map && !window.MadaQR) await new Promise(res => { const sc = document.createElement("script"); sc.src = "doctor-qr.js"; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
    const qr = loc.map && window.MadaQR ? MadaQR.svg(loc.map) : "";
    const kv = (k, v) => v ? `<div><small>${esc(k)}</small><b>${v}</b></div>` : "";
    w.document.write(`<!doctype html><html lang="${lg}" dir="${lg === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(M.sh_title)} · ${esc(r.id)}</title><style>
      body { font-family: Tajawal, Inter, Arial, sans-serif; color: #10232b; margin: 28px; }
      header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0b6b5c; padding-bottom: 12px; margin-bottom: 18px; }
      header img { width: 44px; } header h1 { font-size: 20px; margin: 0; color: #0b6b5c; } header p { margin: 2px 0 0; font-size: 12.5px; color: #6b7a80; }
      h2 { font-size: 14px; color: #0b6b5c; margin: 18px 0 8px; } .kv { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 18px; font-size: 13.5px; }
      .kv small { display: block; color: #6b7a80; font-size: 11.5px; } .kv b { font-weight: 600; }
      .loc { display: flex; gap: 20px; align-items: center; border: 1px solid #cfd8db; border-radius: 12px; padding: 14px; }
      .loc .qr { width: 150px; height: 150px; flex: none; } .loc .qr svg { width: 100%; height: 100%; } .loc p { margin: 0 0 6px; font-size: 14px; } .loc a { color: #0b6b5c; word-break: break-all; font-size: 12.5px; }
      .loc small { display: block; color: #6b7a80; font-size: 12px; margin-top: 8px; } footer { margin-top: 26px; font-size: 11px; color: #6b7a80; }
      @media print { body { margin: 12mm; } }</style></head><body>
      <header><img src="${new URL("assets/mada-logo.png", window.location.href).href}" alt=""><div><h1>${esc(M.sh_title)}</h1><p>Mada Care · ${esc(M.sh_for)}</p></div></header>
      <div class="kv">${kv(M.sh_patient, esc(T(r.patient, lg) || "—"))}${kv(M.sh_mobile, `<span dir="ltr">${esc(r.mobile || "—")}</span>`)}${kv(M.sh_file, `<span dir="ltr">${esc(r.mrn || "—")}</span>`)}
        ${kv(M.sh_id, arr.idNumber || file.idNumber ? `<span dir="ltr">${esc(arr.idNumber || file.idNumber)}</span>` : "")}${kv(M.sh_dob, arr.dob || file.dateOfBirth ? `<span dir="ltr">${esc(arr.dob || file.dateOfBirth)}</span>` : "")}${kv(M.sh_req, `<span dir="ltr">${esc(r.id)}</span>`)}</div>
      <h2>${esc(M.sh_exam)}</h2><div class="kv">${kv(M.sh_exam, esc(T(it.title, lg)))}${kv(M.sh_center, esc(centerName(b, lg) || "—"))}${kv(M.sh_when, esc([fmtDate(b.date, lg), fmtTime(b.time, lg)].filter(Boolean).join(" · ") || "—"))}
        ${kv(M.sh_doc, esc(doc ? T(doc.name, lg) : T(r.byDoctor, lg)))}${kv(M.sh_note, esc(T(it.details, lg)))}</div>
      <h2>${esc(M.sh_loc)}</h2><div class="loc">${qr ? `<div class="qr">${qr}</div>` : ""}<div><p dir="auto">${esc(loc.address || "—")}</p>${loc.map ? `<a href="${esc(loc.map)}">${esc(loc.map)}</a><small>${esc(M.sh_scan)}</small>` : ""}</div></div>
      <footer>${esc(tx(M.sh_printed, { t: new Date().toLocaleString(lg === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB") }))}</footer>
      <script>onload = () => setTimeout(() => print(), 300)<\/script></body></html>`);
    w.document.close();
  }

  // Clicks inside a share box. get(itemId) returns { r, it } fresh from the store; redraw() repaints the page; edit(itemId, on) keeps the form open.
  function bind(root, { get, redraw, toast, lang, by, edit }) {
    styled();
    root.addEventListener("click", async e => {
      const b = e.target.closest("[data-rs]"), box = b && b.closest("[data-rs-item]"); if (!b || !box) return;
      const lg = lang(), M = L[lg], { r, it } = get(box.dataset.rsItem), k = b.dataset.rs;
      if (k === "editLoc") return edit(it.id, true);
      if (k === "cancelLoc") return edit(it.id, false);
      if (k === "saveLoc") {
        const addr = box.querySelector("[data-rs-addr]").value.trim(), map = box.querySelector("[data-rs-map]").value.trim(), err = box.querySelector("[data-rs-err]");
        if (!addr && !map) { err.textContent = M.needAddr; err.hidden = false; return; }
        if (map && !/^https:\/\/\S+$/i.test(map)) { err.textContent = M.badMap; err.hidden = false; return; }
        MadaMedical.patchItem(r.id, it.id, { radLoc: { address: addr, map, at: new Date().toISOString(), by: by() } });
        edit(it.id, false); return toast(M.locSaved);
      }
      if (k === "sheet") return sheet(r, it, lg);
      const tk = link(r, it), msg = message(r, it, lg, tk);
      const log = ch => { const cur = MadaMedical.get(r.id).items.find(x => x.id === it.id).radLink || { token: tk, sent: [] }; MadaMedical.patchItem(r.id, it.id, { radLink: { ...cur, sent: [...(cur.sent || []), { ch, at: new Date().toISOString(), by: by() }] } }); redraw(); };
      if (k === "open") return window.open(url(tk, lg), "_blank", "noopener");
      if (k === "copy") { try { await navigator.clipboard.writeText(msg); } catch (er) { const ta = document.createElement("textarea"); ta.value = msg; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); } log("copy"); return toast(M.copied); }
      if (k === "wa") { const n = waNum(r.mobile); if (!n) return toast(M.noPhone); window.open(`https://wa.me/${n}?text=${encodeURIComponent(msg)}`, "_blank", "noopener"); log("wa"); }
    });
  }
  const ready = it => it.type === "radiology" && !it.rejected && (it.log || []).some(l => STEPS()[l.step] === "scheduled");
  return { L, html, bind, ready, booking, locOf, centerName, fmtDate, fmtTime, styled };
})();
