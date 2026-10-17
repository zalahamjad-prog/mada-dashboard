// Lab samples the nurse collected and their results (Nursing Portal > Samples, nurse-samples.html).
// Two sources, one list:
//  - Doctor's orders: lab items in medical.js (source "doctor") on a visit the nurse went on (order.booking.nurseId).
//    The sample time is the item's "collected" step. Approving sends the results to the ordering doctor (item step "resulted"):
//    the doctor gets "Lab results ready" in the bell and approves them on doctor-orders-list.html; high and critical values raise alerts.js alerts.
//    Results typed before sending wait on the item as nurseDraft = { CODE: { values, at, by } }.
//  - Patient bookings: the nurse's own lab visit (order.nurseVisit.steps.sample, tests marked collected). Results are kept on the order:
//    order.labResults = { tests: { CODE: { values: { analyte: n }, text, at, by } }, status: "draft" | "sent", sentAt, sentBy, seen: { at, by } }.
//    Approving sends them to the care team: the dashboard bell and Request Details (request-details.html).
// Each test is due at the sample time + its result time (labs.js "hours"). A test that is due with no results is a reminder for the nurse:
// the bell, the count on the Samples menu item and, if she allows it, a browser notification.
// The lab report (PDF or photo) the nurse uploads is kept in MadaStore under its own key; the card keeps { name, type, size, key, at, by }
// as item.report (doctor's order, the same field lab-test.html and doctor-orders-list.html show) or order.labResults.report.
// The dashboard's Lab Results page (lab-results.html) lists every card of every nurse with the doctor's follow-up (docSeen, approval, alert).
// Needs orders.js, labs.js and medical.js (result fields: MadaMedical.ANALYTES, set per test on Services > Laboratory).
// TODO: the lab system should send the results, and the reminders should be push or SMS so they reach her when the portal is closed.
const MadaSamples = (() => {
  const HOUR = 3600000;
  const Lb = () => typeof MadaLabs !== "undefined" ? MadaLabs : null;
  const Md = () => typeof MadaMedical !== "undefined" ? MadaMedical : null;
  const nm = (v, lg) => v && typeof v === "object" ? v[lg] || v.en : v || "";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const analytes = code => { const m = Md(); return (m && m.ANALYTES[code]) || []; };
  const labStatus = (a, v) => { const m = Md(); return m ? m.labStatus(a, v) : null; };
  const testInfo = code => { const x = (Lb() && Lb().byCode[code]) || null; return { code, x, name: x ? x.name : code, hours: x && x.hours ? +x.hours : null, tube: x && Lb().tubeOf ? Lb().tubeOf(x.tube) : null, sample: (x && x.sample) || "blood" }; };
  // A test has its results when every result field has a number, or (no fields set) the result was typed as text.
  const isEntered = (an, e) => !!e && (an.length ? an.every(a => e.values && e.values[a.code] != null && e.values[a.code] !== "" && !isNaN(e.values[a.code])) : !!(e.text && String(e.text).trim()));

  // Booked tests, packages opened, each test once (older sample records have no per-test list).
  function bookedTests(o) {
    const out = [], L = Lb(); if (!L) return out;
    (o.items || []).forEach(it => { if (it.kind === "test") out.push(it.code); if (it.kind === "pkg" && L.pkgById[it.code]) out.push(...L.pkgById[it.code].tests); });
    return [...new Set(out)].filter(c => L.byCode[c]);
  }
  // The nurse's collection time: the time she typed on the visit's date, or when she saved the step.
  function sampleAt(sm) {
    if (!sm) return null;
    if (sm.time && sm.at && /^\d{1,2}:\d{2}$/.test(sm.time)) { const d = new Date(sm.at), [h, m] = sm.time.split(":"); d.setHours(+h, +m, 0, 0); if (d - new Date(sm.at) > HOUR) d.setDate(d.getDate() - 1); return d.toISOString(); }
    return sm.at || null;
  }
  function mkTests(codes, at, entries) {
    return codes.map(c => { const ti = testInfo(c), an = analytes(c), e = (entries || {})[c] || null;
      return { ...ti, an, entry: e, entered: isEntered(an, e), dueAt: at && ti.hours ? new Date(new Date(at).getTime() + ti.hours * HOUR).toISOString() : null }; });
  }
  function finish(c) {
    const now = Date.now();
    c.tests.forEach(x => x.due = !x.entered && !!x.dueAt && now >= new Date(x.dueAt));
    c.status = c.sent ? "sent" : !c.collectedAt ? "collect" : c.tests.length && c.tests.every(x => x.entered) ? "ready" : c.tests.some(x => x.due) ? "due" : "waiting";
    const left = c.tests.filter(x => !x.entered && x.dueAt).map(x => x.dueAt).sort();
    c.nextDue = left[0] || null;
    return c;
  }
  // One nurse's bookings, or every booking when nurseId is null (dashboard).
  const nurseOrders = nurseId => (typeof MadaOrders !== "undefined" ? MadaOrders.all() : []).filter(o => o.status !== "cancelled" && (nurseId == null ? true : o.booking && o.booking.nurseId === nurseId));
  const staffName = sid => { if (!sid) return null; try { const s = MadaStore.getJSON("mada-staff", []).find(x => x.id === sid); return s ? s.name : null; } catch (e) { return null; } };

  // Every sample card for one nurse: { key, kind: "doctor" | "patient", o, r, it, collectedAt, tests, status, nextDue, sent, sentAt, sentBy }.
  // status: "collect" (doctor's order, sample not marked yet) | "waiting" | "due" (a result time has passed) | "ready" (all entered, not sent) | "sent".
  function list(nurseId) {
    const out = [], orders = nurseOrders(nurseId), byId = Object.fromEntries(orders.map(o => [o.id, o])), M = Md();
    if (M) M.all().filter(r => r.source === "doctor" && (byId[r.orderId] || nurseId == null && r.status !== "cancelled")).forEach(r => r.items.forEach(it => {
      if (it.type !== "lab" || !it.v2) return;
      const S = M.STEPS.lab, col = it.log.find(l => S[l.step] === "collected"), res = it.log.find(l => S[l.step] === "resulted");
      const codes = (it.tests || []).length ? it.tests : [];
      const sent = it.step >= S.indexOf("resulted");
      const entries = sent ? Object.fromEntries(codes.map(c => [c, { values: it.results || {} }])) : it.nurseDraft || {};
      const o = byId[r.orderId] || { id: r.orderId, patient: r.patient, mrn: r.mrn, bookingId: r.bookingId, mobile: r.mobile };
      const rv = it.log.find(l => S[l.step] === "reviewed"), al = typeof MadaAlerts !== "undefined" ? (MadaStore.getJSON(MadaAlerts.KEY, {})[r.id + ":" + it.id] || null) : null;
      out.push(finish({ key: "mr:" + r.id + ":" + it.id, kind: "doctor", o, r, it, report: it.report || null, nurseId: o.booking && o.booking.nurseId, nurse: staffName(o.booking && o.booking.nurseId),
        docSeen: it.docSeen || null, review: rv ? { at: rv.at, by: rv.by, note: rv.data && rv.data.docNote } : null, docNotes: it.docNotes || [], alert: al, title: it.title, collectedAt: it.step >= 1 ? (col && col.at) || r.createdAt : null,
        tests: mkTests(codes, it.step >= 1 ? (col && col.at) || r.createdAt : null, entries), sent, sentAt: res && res.at, sentBy: res && res.by,
        reviewed: it.step >= S.indexOf("reviewed"), doctor: (MadaOrders.DOCTORS.find(d => d.id === r.doctorId) || {}).name || r.byDoctor || null }));
    }));
    orders.filter(o => o.service !== "doctor").forEach(o => {
      const sm = o.nurseVisit && o.nurseVisit.steps && o.nurseVisit.steps.sample;
      if (!sm || !(sm.status === "collected" || sm.status === "partial")) return;
      const codes = sm.tests && sm.tests.length ? sm.tests.filter(x => x.ok).map(x => x.code) : bookedTests(o);
      if (!codes.length) return;
      const lr = o.labResults || {}, at = sampleAt(sm);
      out.push(finish({ key: "o:" + o.id, kind: "patient", o, report: lr.report || null, nurseId: o.booking && o.booking.nurseId, nurse: staffName(o.booking && o.booking.nurseId), seen: lr.seen || null, collectedAt: at, tests: mkTests(codes, at, lr.tests), sent: lr.status === "sent", sentAt: lr.sentAt, sentBy: lr.sentBy }));
    });
    return out;
  }
  const get = (nurseId, key) => list(nurseId).find(c => c.key === key) || null;
  // Tests with a result time that has passed and no results yet, plus cards entered but not sent: what the nurse must not forget.
  const todo = nurseId => list(nurseId).filter(c => c.status === "due" || c.status === "ready");

  // Save what the nurse typed (some tests may still be empty). entries: { CODE: { values, text } }.
  function saveDraft(nurseId, key, entries, by) {
    const c = get(nurseId, key); if (!c || c.sent) return null;
    const at = new Date().toISOString(), put = prev => { const n = { ...(prev || {}) }; Object.entries(entries).forEach(([k, e]) => n[k] = { ...e, at, by }); return n; };
    if (c.kind === "doctor") Md().patchItem(c.r.id, c.it.id, it => ({ nurseDraft: put(it.nurseDraft) }));
    else MadaOrders.update(c.o.id, { labResults: { ...(c.o.labResults || {}), status: "draft", tests: put((c.o.labResults || {}).tests) } });
    return get(nurseId, key);
  }
  // The lab report file: photos are shrunk to a JPEG, PDFs are kept as they are (up to 1.5 MB). Throws "big" or "room".
  const MAXF = 1.5 * 1024 * 1024;
  const readAs = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
  function shrink(url) {
    return new Promise((ok, no) => { const img = new Image(); img.onerror = no; img.onload = () => {
      const k = Math.min(1, 1800 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL("image/jpeg", 0.75)); }; img.src = url; });
  }
  async function saveReport(nurseId, key, file, by) {
    const c = get(nurseId, key); if (!c || c.sent) return null;
    const img = /^image\//.test(file.type);
    if (!img && file.size > MAXF) throw new Error("big");
    let data = await readAs(file); if (img) data = await shrink(data);
    if (data.length > MAXF * 1.4) throw new Error("big");
    const fk = c.kind === "doctor" ? `mada-mr-file-${c.r.id}-${c.it.id}-report` : `mada-lab-file-${c.o.id}-report`;
    try { MadaStore.set(fk, data); } catch (e) { throw new Error("room"); }
    if (MadaStore.get(fk) !== data) throw new Error("room");
    const report = { name: file.name, type: img ? "image/jpeg" : file.type || "application/pdf", size: Math.round(data.length * 0.75), key: fk, at: new Date().toISOString(), by };
    if (c.kind === "doctor") Md().patchItem(c.r.id, c.it.id, { report });
    else { const o = MadaOrders.get(c.o.id); MadaOrders.update(c.o.id, { labResults: { ...(o.labResults || {}), status: (o.labResults || {}).status || "draft", report } }); }
    return get(nurseId, key);
  }
  // Opens a stored report in a new tab.
  function openFile(f) {
    const url = f && MadaStore.get(f.key); if (!url) return false;
    const bin = atob(url.split(",")[1]), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    window.open(URL.createObjectURL(new Blob([buf], { type: f.type || "application/octet-stream" })), "_blank");
    return true;
  }
  // Approve and send. Every test must have its results, and the lab report must be uploaded.
  function send(nurseId, key, by) {
    const c = get(nurseId, key); if (!c || c.sent || c.status !== "ready" || !c.report) return null;
    const at = new Date().toISOString();
    if (c.kind === "doctor") {
      const M = Md(), S = M.STEPS.lab, results = {};
      c.tests.forEach(x => Object.assign(results, (x.entry && x.entry.values) || {}));
      M.patchItem(c.r.id, c.it.id, { results, tests: c.tests.map(x => x.code), enteredBy: by, enteredAt: at, nurseApproved: { by, at }, docSeen: null });
      // collected -> at the lab -> results entered (waiting for the doctor's approval)
      while ((M.get(c.r.id).items.find(i => i.id === c.it.id) || {}).step < S.indexOf("resulted")) M.advance(c.r.id, c.it.id, by, null);
    } else MadaOrders.update(c.o.id, { labResults: { ...(c.o.labResults || {}), status: "sent", sentAt: at, sentBy: by, seen: null } });
    return get(nurseId, key);
  }
  // Doctor's order with the sample not marked yet: the nurse marks it collected at the time she took it.
  function markCollected(nurseId, key, iso, by) {
    const c = get(nurseId, key); if (!c || c.kind !== "doctor" || c.collectedAt) return null;
    const M = Md(); M.advance(c.r.id, c.it.id, by, null);
    M.patchItem(c.r.id, c.it.id, it => ({ log: it.log.map(l => M.STEPS.lab[l.step] === "collected" ? { ...l, at: iso } : l) }));
    return get(nurseId, key);
  }
  // Worst flag of a card's results: "critical" | "high" | "low" | "normal" | null.
  function flag(c) {
    const fl = c.tests.flatMap(x => x.an.map(a => labStatus(a, x.entry && x.entry.values ? x.entry.values[a.code] : null))).filter(Boolean);
    return ["critical", "high", "low", "normal"].find(s => fl.includes(s)) || null;
  }

  // Care team: patient bookings with results the nurse sent that nobody on the team has opened yet.
  const staffNew = () => (typeof MadaOrders !== "undefined" ? MadaOrders.all() : []).filter(o => o.labResults && o.labResults.status === "sent" && !o.labResults.seen)
    .sort((a, b) => String(b.labResults.sentAt).localeCompare(String(a.labResults.sentAt)));
  function markSeen(oid, by) { const o = MadaOrders.get(oid); if (o && o.labResults && o.labResults.status === "sent" && !o.labResults.seen) MadaOrders.update(oid, { labResults: { ...o.labResults, seen: { at: new Date().toISOString(), by } } }); }

  const L = {
    en: { resT: "Lab Results", resSub: "Entered and approved by the nurse.", sentBy: "Sent by {n} · {t}", test: "Test", result: "Result", unit: "Unit", range: "Normal range",
      s_normal: "Normal", s_low: "Low", s_high: "High", s_critical: "Critical", nT: "Notifications", nNone: "No new notifications.", nRes: "Lab results ready", nCrit: "Critical lab result", open: "Open", rep: "Lab report" },
    ar: { resT: "نتائج التحاليل", resSub: "أدخلتها واعتمدتها الممرضة.", sentBy: "أرسلها {n} · {t}", test: "التحليل", result: "النتيجة", unit: "الوحدة", range: "المعدل الطبيعي",
      s_normal: "طبيعي", s_low: "منخفض", s_high: "مرتفع", s_critical: "حرج", nT: "الإشعارات", nNone: "ما فيه إشعارات جديدة.", nRes: "نتائج التحاليل طلعت", nCrit: "نتيجة تحليل حرجة", open: "فتح", rep: "تقرير المختبر" }
  };
  const rangeTxt = a => a.low != null && a.high != null ? `${a.low} – ${a.high}` : a.high != null ? `≤ ${a.high}` : a.low != null ? `≥ ${a.low}` : "";
  const when = (iso, lg) => iso ? new Date(iso).toLocaleString(lg === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
  const CSS = `.lsr{border:1px solid #e3e8ea;border-radius:14px;padding:16px;margin:16px 0;background:#fff;text-align:start}.lsr-h{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}
.lsr-ic{width:40px;height:40px;border-radius:50%;background:#e3f4ee;color:#0b6b5c;display:grid;place-items:center;flex:none}.lsr-ic svg{width:21px;height:21px}
.lsr-h b{display:block;font-size:15.5px;color:#15304a}.lsr-h small{display:block;font-size:13px;color:#5d6d78;margin-top:3px}
.lsr table{width:100%;border-collapse:collapse;font-size:13.5px}.lsr th{background:#f3f6f8;text-align:start;font-weight:600;color:#15304a;padding:9px 10px;font-size:12.5px}
.lsr td{padding:9px 10px;border-bottom:1px solid #eef2f3;color:#2c3d43}.lsr td.n{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}.lsr tr.g td{background:#fbfcfc;font-weight:700;color:#15304a}
.lsr .p{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11.5px;font-weight:700;background:#e3f4ee;color:#0f6b52}.lsr .p.low,.lsr .p.high{background:#fff1e0;color:#a4520a}.lsr .p.critical{background:#fdecec;color:#b42318}
@media (max-width:640px){.lsr .hm{display:none}}`;
  // Read-only results of a patient booking (Request Details).
  function card(o, lg) {
    const lr = o && o.labResults; if (!lr || lr.status !== "sent") return "";
    if (!document.getElementById("lsrCss")) { const s = document.createElement("style"); s.id = "lsrCss"; s.textContent = CSS; document.head.appendChild(s); }
    const t = L[lg], codes = Object.keys(lr.tests || {}), by = nm(lr.sentBy, lg);
    const rows = codes.map(c => { const ti = testInfo(c), an = analytes(c), e = lr.tests[c] || {};
      return `<tr class="g"><td colspan="4">${esc(nm(ti.name, lg))} <small class="n" style="font-weight:500;color:#6b7a80">${esc(c)}</small></td></tr>` + (an.length ? an.map(a => { const v = e.values ? e.values[a.code] : null, s = labStatus(a, v);
        return `<tr><td>${esc(nm(a.name, lg))}</td><td class="n"><b>${esc(v)}</b> ${esc(a.unit || "")}</td><td class="n hm">${esc(rangeTxt(a))}</td><td>${s ? `<span class="p ${s}">${t["s_" + s]}</span>` : ""}</td></tr>`; }).join("")
        : `<tr><td colspan="4" style="white-space:pre-line">${esc(e.text)}</td></tr>`); }).join("");
    return `<section class="lsr"><div class="lsr-h" style="flex-wrap:wrap"><span class="lsr-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/></svg></span>
      <div style="flex:1"><b>${t.resT}</b><small>${esc(t.sentBy.replace("{n}", by).replace("{t}", when(lr.sentAt, lg)))}</small></div><div style="display:flex;flex-wrap:wrap;gap:8px">${lr.report ? fileBtn(lr.report, lg) : ""}${typeof MadaLabReport !== "undefined" ? MadaLabReport.buttons("o:" + o.id, lg) : ""}</div></div>
      <div style="overflow-x:auto"><table><thead><tr><th>${t.test}</th><th>${t.result}</th><th class="hm">${t.range}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }
  // Button that opens an uploaded lab report (any page that loads this file).
  const fileBtn = (f, lg) => `<button type="button" data-lsf="${esc(f.key)}" data-lsft="${esc(f.type)}" style="display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px;border-radius:9px;border:1px solid #d6dee1;background:#fff;color:#15304a;font:inherit;font-size:13px;font-weight:600;cursor:pointer"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>${L[lg].rep}</button>`;
  if (typeof document !== "undefined") document.addEventListener("click", e => { const b = e.target.closest("[data-lsf]"); if (b) { e.preventDefault(); openFile({ key: b.dataset.lsf, type: b.dataset.lsft }); } });
  // Worst flag of a sent patient booking, for the care team's bell.
  function orderFlag(o) {
    const lr = o.labResults || {}, fl = Object.entries(lr.tests || {}).flatMap(([c, e]) => analytes(c).map(a => labStatus(a, e.values ? e.values[a.code] : null))).filter(Boolean);
    return fl.includes("critical") ? "critical" : fl.includes("high") || fl.includes("low") ? "out" : "normal";
  }
  // Care team bell on the dashboard: results the nurse sent for patient bookings.
  function staffBell(btn, lang, by) {
    if (!btn) return;
    const paint = () => {
      const n = staffNew().length; let bd = btn.querySelector(".badge");
      if (!bd) { bd = document.createElement("span"); bd.className = "badge"; btn.appendChild(bd); }
      bd.textContent = n > 9 ? "9+" : n; bd.hidden = !n;
    };
    paint();
    if (btn.dataset.lsb) return; btn.dataset.lsb = "1";
    document.addEventListener("click", e => {
      const pn = document.getElementById("lsPn");
      if (e.target.closest("[data-lsb]")) {
        e.stopPropagation(); if (pn) return pn.remove();
        const lg = document.documentElement.lang === "ar" ? "ar" : "en", t = L[lg], items = staffNew().slice(0, 8);
        const p = document.createElement("div"); p.id = "lsPn"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", t.nT);
        p.style.cssText = "position:fixed;z-index:80;width:min(360px,calc(100vw - 24px));background:#fff;border:1px solid #e3e8ea;border-radius:14px;box-shadow:0 14px 40px rgba(16,35,43,.18);overflow:hidden";
        p.innerHTML = `<h3 style="font-size:14.5px;color:#15304a;padding:14px 16px 10px;border-bottom:1px solid #eef2f3">${t.nT}</h3>` + (items.length ? items.map(o => { const f = orderFlag(o);
          return `<a href="request-details.html?id=${encodeURIComponent(o.id)}&labres=1" style="display:flex;gap:12px;padding:12px 16px;text-decoration:none;color:#2c3d43;font-size:13.5px;border-bottom:1px solid #f2f5f6;background:#f6fbf9">
            <span style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;flex:none;background:${f === "critical" ? "#fdecec;color:#b42318" : "#e6f3ef;color:#0b6b5c"}"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/></svg></span>
            <span><b style="display:block;color:#15304a">${f === "critical" ? t.nCrit : t.nRes}</b>${esc(nm(o.patient, lg))} · <span dir="ltr">${esc(o.bookingId || o.id)}</span><small style="display:block;color:#8a979c;font-size:12px;margin-top:2px">${esc(when(o.labResults.sentAt, lg))}</small></span></a>`; }).join("")
          : `<p style="padding:26px 16px;text-align:center;color:#8a979c;font-size:13.5px">${t.nNone}</p>`);
        document.body.appendChild(p);
        const rc = btn.getBoundingClientRect(), w = p.offsetWidth, x = document.documentElement.dir === "rtl" ? rc.left : rc.right - w;
        p.style.top = rc.bottom + 8 + "px"; p.style.left = Math.max(12, Math.min(x, innerWidth - w - 12)) + "px";
      } else if (pn && !e.target.closest("#lsPn")) pn.remove();
    });
    window.addEventListener("storage", e => { if (!e.key || e.key === "mada-orders") paint(); });
  }

  // Browser notification when a result time passes (once per test, on this device). Runs on every Nursing Portal page.
  const NKEY = "mada-smp-notified";
  let timer = null;
  function watch(me, lang, onTick) {
    if (timer || !me || !me.nurseId) return;
    const tick = () => {
      onTick && onTick();
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      let done = []; try { done = JSON.parse(localStorage.getItem(NKEY) || "[]"); } catch (e) {}
      const lg = document.documentElement.lang === "ar" ? "ar" : lang;
      list(me.nurseId).filter(c => c.status === "due").forEach(c => c.tests.filter(x => x.due).forEach(x => {
        const k = c.key + ":" + x.code; if (done.includes(k)) return; done.push(k);
        try { const n = new Notification(lg === "ar" ? "حان وقت نتيجة التحليل" : "Lab result is due", { body: `${nm(x.name, lg)} · ${nm(c.o.patient, lg)}`, tag: k, icon: "assets/mada-logo.png" });
          n.onclick = () => { window.focus(); location.href = "nurse-samples.html?k=" + encodeURIComponent(c.key); }; } catch (e) {}
      }));
      try { localStorage.setItem(NKEY, JSON.stringify(done.slice(-300))); } catch (e) {}
    };
    tick(); timer = setInterval(tick, 60000);
  }

  return { fileBtn, openFile, saveReport, list, get, todo, saveDraft, send, markCollected, flag, analytes, labStatus, isEntered, staffNew, markSeen, card, staffBell, watch, rangeTxt, HOUR };
})();
