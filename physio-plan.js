// Treatment Plan step of a physio visit (physio-visit.html), saved in order.physioVisit.steps.ptPlan:
//   { plan (text), imaging: [{ mrId, reason, at }], next: { orderId, bookingId, code, date, time, total } | null }
// Work in progress is kept in physioVisit.ptPlanDraft, so a request sent or a session booked is never lost before the step is saved.
// From here the physiotherapist can:
//   - Imaging request: only a reason. It goes straight to the operations team as a medical request (medical.js, source "physio");
//     they call a doctor, get the imaging order from them and arrange the imaging.
//   - Physiotherapy treatment plan: pick one of the packages set on the dashboard (physio.js), the next session from their own free times
//     (visit-book.js slots: work hours on the staff profile and bookings), see the cart, then book it. The session is a normal booking
//     (MadaOrders.book, service physio, unpaid) assigned to this physiotherapist, with a payment link (pay.html, 1 hour to pay, renewable; WhatsApp, SMS, QR, copy) to send to the patient,
//     the same as the doctor's orders. Once paid it shows in their My Visits.
const PtPlan = (() => {
  const I = {
    plan: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h4"/>',
    xr: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 6v12M9 8.5c1 .8 2 1 3 1s2-.2 3-1M8.5 11.5c1.2.8 2.3 1.1 3.5 1.1s2.3-.3 3.5-1.1M9 14.5c1 .7 2 1 3 1s2-.3 3-1"/>',
    pt: '<circle cx="13" cy="4" r="2"/><path d="m9 20 3-6 3 3v4M6 12l3-4 4 1 3 3M12 14l-2-3"/>',
    pkg: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.5a1.5 1.5 0 0 0 1.5-1.1L21 7.5H6.4"/>',
    send: '<path d="M21 3 3 10.5l7 3 3 7z"/><path d="m10 13.5 4-4"/>', check: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    wa: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.5-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/>',
    sms: '<path d="M4 5h16v11H9l-5 4z"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4h-4"/>',
    dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
  };
  const L = {
    en: {
      stepOf: "Step {n} of {m}", prev: "Previous", cont: "Save & Continue", next: "Continue", edit: "Edit", cancel: "Cancel", savedAt: "Saved {t} · {n}", saved: "Saved.", storeErr: "Couldn't save. Try again.",
      ptPlan: "Treatment Plan", ptPlanS: "Write the plan, then create any request the patient needs.",
      planT: "Treatment plan", planPh: "e.g. Strengthening and mobility exercises for the knee, 2 sessions a week, home exercise program",
      reqT: "Create a request", reqS: "Optional. Pick what the patient needs next.",
      xrT: "Imaging request", xrS: "Write the reason. Operations calls a doctor for the order.", ptT: "Physiotherapy treatment plan", ptS: "Pick a package, the next session and send the payment link.",
      xrReason: "Reason for the imaging", xrPh: "e.g. Knee pain not improving after 4 sessions, rule out a meniscus tear", xrSend: "Send to operations", xrNeed: "Write the reason for the imaging.",
      xrSent: "Sent to operations · {id}", xrOk: "The imaging request was sent to operations.", xrTitle: "Imaging request (needs a doctor's order)", xrTitleAr: "طلب أشعة (يحتاج أمر طبيب)",
      xrDetails: "From the physiotherapist: {r}. Call a doctor for the imaging order.", xrDetailsAr: "من أخصائي العلاج الطبيعي: {r}. تواصل مع طبيب لإصدار أمر الأشعة.",
      s1: "1. Choose the plan package", s2: "2. Next session", s3: "3. Cart", noPkg: "No packages yet. Add them on the dashboard (Services · Physiotherapy · Packages).",
      sessions: "{n} sessions", perS: "{n} SAR / session", sar: "SAR", noDays: "No working days set in the next two weeks. Ask the team to set your work schedule.",
      dayOff: "Day off", noSlots: "No free times on this day.", pickPkg: "Choose a package first.", pickTime: "Choose the day and time of the next session.",
      subtotal: "Subtotal", vat: "VAT {n}%", total: "Total", book: "Book session & create payment link", booked: "Next session booked", bookedOk: "The session is booked. Send the payment link to the patient.",
      bookingNo: "Booking No.", when: "Date & time", amount: "Amount", payState: "Payment", paid: "Paid", unpaid: "Waiting for payment",
      viaWa: "WhatsApp", viaSms: "SMS", copy: "Copy message", openLink: "Open payment page", copied: "Copied.", linkNote: "Once the patient pays, the session shows in My Visits.",
      cancelBk: "Cancel booking", cancelQ: "Cancel this booking? The time will be free again.", cancelled: "The booking was cancelled.", cancelWhy: "Changed by the physiotherapist during the visit",
      needPlan: "Write the treatment plan.", viaQr: "QR code", qrT: "Scan to pay", qrS: "The patient opens the phone camera and scans the code; the payment page opens.", qrSave: "Download QR", qrErr: "Couldn't load the QR code. Try again.", close: "Close",
      leftMin: "The patient has {n} min to pay; the time is counted down on the payment page.", expired: "The payment time (1 hour) ended before the patient paid.", renew: "Renew link (1 hour)", renewed: "The link is open for another hour.", pkgOnly: "Package", sessionN: "Session",
      sesNext: "Next session of the package ({n} of {m})", inPkg: "Covered by the package", bookPkg: "Book the next session", bookedPkg: "The next session is booked. It is covered by the package, so there is nothing to pay."
    },
    ar: {
      stepOf: "الخطوة {n} من {m}", prev: "السابق", cont: "حفظ ومتابعة", next: "متابعة", edit: "تعديل", cancel: "إلغاء", savedAt: "انحفظت {t} · {n}", saved: "انحفظ.", storeErr: "ما قدرنا نحفظ. حاول مرة ثانية.",
      ptPlan: "الخطة العلاجية", ptPlanS: "اكتب الخطة، بعدها أنشئ أي طلب يحتاجه المريض.",
      planT: "الخطة العلاجية", planPh: "مثال: تمارين تقوية وتحسين حركة الركبة، جلستين في الأسبوع، وبرنامج تمارين منزلية",
      reqT: "إنشاء طلب", reqS: "اختياري. اختر اللي يحتاجه المريض بعدين.",
      xrT: "طلب أشعة", xrS: "اكتب السبب. التشغيل يتواصل مع طبيب لإصدار الأمر.", ptT: "خطة علاج طبيعي", ptS: "اختر الباقة والجلسة الجاية، وأرسل رابط الدفع.",
      xrReason: "سبب طلب الأشعة", xrPh: "مثال: ألم الركبة ما تحسن بعد 4 جلسات، للتأكد من عدم وجود تمزق في الغضروف", xrSend: "إرسال للتشغيل", xrNeed: "اكتب سبب طلب الأشعة.",
      xrSent: "انرسل للتشغيل · {id}", xrOk: "انرسل طلب الأشعة للتشغيل.", xrTitle: "Imaging request (needs a doctor's order)", xrTitleAr: "طلب أشعة (يحتاج أمر طبيب)",
      xrDetails: "From the physiotherapist: {r}. Call a doctor for the imaging order.", xrDetailsAr: "من أخصائي العلاج الطبيعي: {r}. تواصل مع طبيب لإصدار أمر الأشعة.",
      s1: "1. اختر باقة الخطة", s2: "2. الجلسة الجاية", s3: "3. السلة", noPkg: "ما فيه باقات للحين. أضفها من لوحة التحكم (الخدمات · العلاج الطبيعي · الباقات).",
      sessions: "{n} جلسات", perS: "{n} ريال / الجلسة", sar: "ريال", noDays: "ما فيه أيام دوام في الأسبوعين الجاية. اطلب من الفريق يضبط جدول دوامك.",
      dayOff: "إجازة", noSlots: "ما فيه أوقات فاضية في هذا اليوم.", pickPkg: "اختر الباقة أول.", pickTime: "اختر يوم ووقت الجلسة الجاية.",
      subtotal: "المجموع", vat: "ضريبة القيمة المضافة {n}%", total: "الإجمالي", book: "احجز الجلسة وأنشئ رابط الدفع", booked: "الجلسة الجاية محجوزة", bookedOk: "انحجزت الجلسة. أرسل رابط الدفع للمريض.",
      bookingNo: "رقم الحجز", when: "التاريخ والوقت", amount: "المبلغ", payState: "الدفع", paid: "مدفوع", unpaid: "بانتظار الدفع",
      viaWa: "واتساب", viaSms: "رسالة نصية", copy: "نسخ الرسالة", openLink: "فتح صفحة الدفع", copied: "انسخت.", linkNote: "أول ما يدفع المريض، تطلع الجلسة في زياراتي.",
      cancelBk: "إلغاء الحجز", cancelQ: "تلغي هذا الحجز؟ الوقت يرجع فاضي.", cancelled: "انلغى الحجز.", cancelWhy: "عدّلها الأخصائي أثناء الزيارة",
      needPlan: "اكتب الخطة العلاجية.", viaQr: "رمز QR", qrT: "امسح وادفع", qrS: "يفتح المريض كاميرا الجوال ويمسح الرمز، وتفتح له صفحة الدفع.", qrSave: "تحميل الرمز", qrErr: "ما قدرنا نحمّل رمز QR. حاول مرة ثانية.", close: "إغلاق",
      leftMin: "باقي للمريض {n} دقيقة للدفع، والعد التنازلي يطلع له في صفحة الدفع.", expired: "انتهت مدة الدفع (ساعة) قبل ما يدفع المريض.", renew: "تجديد الرابط (ساعة)", renewed: "الرابط مفتوح ساعة ثانية.", pkgOnly: "باقة", sessionN: "جلسة",
      sesNext: "الجلسة الجاية من الباقة ({n} من {m})", inPkg: "ضمن الباقة", bookPkg: "احجز الجلسة الجاية", bookedPkg: "انحجزت الجلسة الجاية. هي ضمن الباقة، فما فيه شي يندفع."
    }
  };
  let ctx = null, lang = "en", st = null, forKey = null, editing = false, tried = false;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const nameOf = v => v && typeof v === "object" ? v[lang] || v.en : v || "";
  const reset = () => { st = null; forKey = null; editing = false; tried = false; qrOpen = false; };
  const dvOf = o => o.doctorVisit || {};
  const savedOf = o => (dvOf(o).steps || {}).ptPlan;
  const clone = x => JSON.parse(JSON.stringify(x));
  const money = n => `${Math.round(Number(n || 0) * 100) / 100} ${t().sar}`;
  const SES = "__pkgNext";
  const pkgs = () => typeof MadaPhysio === "undefined" ? [] : (MadaPhysio.PACKAGES || []).filter(p => p.active !== false);
  const pkgOf = code => typeof MadaPhysio === "undefined" ? null : MadaPhysio.item(code);
  // VAT as on the payment page (MadaOrders.vatRate: the same rule for the same patient).
  const vatRateOf = o => MadaOrders.vatRate ? MadaOrders.vatRate({ ...(MadaOrders.get(o.id) || o), service: "physio" }) : 0.15;
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fmtDay = (s, o) => new Date(s + "T00:00").toLocaleDateString(ctx.loc(), o);
  const fmtTime = hm => { const [h, m] = hm.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${lang === "ar" ? (h < 12 ? "ص" : "م") : (h < 12 ? "AM" : "PM")}`; };
  function load(o) {
    if (st && forKey === o.id) return;
    const sv = savedOf(o), dr = dvOf(o).ptPlanDraft;
    // A follow-up session starts from the plan already approved (ctx.prevPlan).
    st = { plan: "", imaging: [], next: null, ...clone(dr || sv || (ctx && ctx.prevPlan ? { plan: ctx.prevPlan } : {})), open: "", xrReason: "", pick: { code: "", date: "", time: "" } };
    delete st.at; delete st.by;
    forKey = o.id; editing = !sv || !!dr;
  }
  // Keep requests and bookings in the draft straight away.
  function keep() { const { open, xrReason, pick, ...d } = st; try { ctx.saveDraft("ptPlan", d); } catch (e) { ctx.toast(e.message || t().storeErr); } }
  // The next 14 days with this physiotherapist's free times.
  function days() {
    const out = [], d0 = new Date();
    for (let i = 0; i < 14; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); const ds = ymd(d), sl = MadaVisitBook.slots(ctx.me.physioId, ds); out.push({ ds, slots: sl }); }
    return out;
  }
  function nextCard() {
    const n = st.next, bo = n && MadaOrders.get(n.orderId), p = n && pkgOf(n.code); if (!bo) return "";
    const paid = bo.payment === "paid", due = MadaVisitBook.due(bo);
    return `<div class="pp-bk"><div class="pp-bkh">${S(I.check, 2.6)}<b>${t().booked}</b><span class="pp-ps ${paid ? "ok" : ""}">${paid ? (bo.pkgSession ? t().inPkg : t().paid) : t().unpaid}</span></div>
      <dl class="pp-kv"><div><dt>${t().pkgOnly}</dt><dd>${E(p ? nameOf(p.name) : n.code)} <code>${E(n.code)}</code></dd></div><div><dt>${t().bookingNo}</dt><dd class="num">${E(bo.bookingId || "—")}</dd></div>
        <div><dt>${t().when}</dt><dd>${E(fmtDay(n.date, { weekday: "long", day: "numeric", month: "short" }))} · ${E(fmtTime(n.time))}</dd></div><div><dt>${t().amount}</dt><dd class="num">${money(due)}</dd></div></dl>
      ${paid ? "" : expired(bo) ? `<div class="pp-exp">${S(I.info)}<span>${t().expired}</span><button type="button" class="hx-btn dark" data-pp="renew">${S(I.send)}${t().renew}</button></div>${editing ? `<button type="button" class="pp-cx" data-pp="cancel">${S(I.x, 2.2)}${t().cancelBk}</button>` : ""}` : `<p class="pp-left">${S(I.clock, 2)}<span>${E(leftTxt(bo))}</span></p><div class="pp-share"><button type="button" class="hx-btn pp-wa" data-pp="wa">${S(I.wa)}${t().viaWa}</button><button type="button" class="hx-btn out" data-pp="sms">${S(I.sms)}${t().viaSms}</button>
        <button type="button" class="hx-btn out" data-pp="qr">${S(I.qr)}${t().viaQr}</button><button type="button" class="hx-btn out" data-pp="copy">${S(I.copy)}${t().copy}</button><a class="hx-btn out" href="${E(MadaVisitBook.payUrl(bo))}" target="_blank" rel="noopener">${S(I.open)}${t().openLink}</a></div>${qrBox(bo)}
        <p class="pp-note">${S(I.info)}<span>${t().linkNote}</span></p>
        ${editing ? `<button type="button" class="pp-cx" data-pp="cancel">${S(I.x, 2.2)}${t().cancelBk}</button>` : ""}`}</div>`;
  }
  function ptWizard(o) {
    // The next session of the package the patient already paid for (ctx.pkgNext): no payment, booked straight away.
    const pn = ctx.pkgNext, cur = pn && pkgOf(pn.code), ses = pk => pk.code === SES && cur ? { ...cur, code: cur.code, price: 0, ses: true } : null;
    const list = pkgs(), pk = st.pick, sel = pk.code && (ses(pk) || pkgOf(pk.code)), D = sel ? days() : [], day = D.find(x => x.ds === pk.date);
    const price = sel ? Number(sel.price || 0) : 0, rate = vatRateOf(o), vat = Math.round(price * rate * 100) / 100;
    return `<div class="pp-wz">
      <h4>${S(I.pkg, 2)}${t().s1}</h4>
      ${cur ? `<div class="pp-pkgs" style="margin-bottom:8px"><button type="button" class="pp-pkg ${pk.code === SES ? "on" : ""}" data-pkg="${SES}" aria-pressed="${pk.code === SES}"><span class="pp-rd">${pk.code === SES ? S(I.check, 3) : ""}</span>
          <span class="pp-pt"><b>${E(tx("sesNext", { n: pn.n + 1, m: pn.m }))}</b><small>${E(nameOf(cur.name))} · <code>${E(cur.code)}</code> · ${t().inPkg}</small></span><b class="pp-pr num">${money(0)}</b></button></div>` : ""}
      ${list.length ? `<div class="pp-pkgs">${list.map(p => { const on = pk.code === p.code, per = p.sessions ? Math.round(p.price / p.sessions) : p.price;
        return `<button type="button" class="pp-pkg ${on ? "on" : ""}" data-pkg="${E(p.code)}" aria-pressed="${on}"><span class="pp-rd">${on ? S(I.check, 3) : ""}</span>
          <span class="pp-pt"><b>${E(nameOf(p.name))}</b><small><code>${E(p.code)}</code> · ${E(tx("sessions", { n: p.sessions }))} · ${E(tx("perS", { n: per }))}</small></span><b class="pp-pr num">${money(p.price)}</b></button>`; }).join("")}</div>`
        : `<p class="pp-mt">${t().noPkg}</p>`}
      ${sel ? `<h4>${S(I.cal, 2)}${t().s2}</h4>
        ${D.some(x => x.slots) ? `<div class="pp-days">${D.map(x => `<button type="button" class="pp-day ${pk.date === x.ds ? "on" : ""}" data-day="${x.ds}" ${x.slots ? "" : "disabled"}>
            <small>${E(fmtDay(x.ds, { weekday: "short" }))}</small><b class="num">${E(fmtDay(x.ds, { day: "numeric" }))}</b><small>${x.slots ? E(fmtDay(x.ds, { month: "short" })) : t().dayOff}</small></button>`).join("")}</div>
          ${day ? (day.slots.some(s => s.state === "free") ? `<div class="pp-times">${day.slots.filter(s => s.state !== "past").map(s => `<button type="button" class="pp-time ${pk.time === s.time ? "on" : ""}" data-time="${s.time}" ${s.state === "free" ? "" : "disabled"}>${E(fmtTime(s.time))}</button>`).join("")}</div>` : `<p class="pp-mt">${t().noSlots}</p>`) : ""}`
          : `<p class="pp-mt">${t().noDays}</p>`}
        <h4>${S(I.cart, 2)}${t().s3}</h4>
        <div class="pp-cart"><div class="pp-line"><span><b>${E(nameOf(sel.name))}</b><small><code>${E(sel.code)}</code> · ${E(sel.ses ? tx("sesNext", { n: pn.n + 1, m: pn.m }) : tx("sessions", { n: sel.sessions }))}${pk.date && pk.time ? ` · ${E(fmtDay(pk.date, { weekday: "short", day: "numeric", month: "short" }))} ${E(fmtTime(pk.time))}` : ""}</small></span><b class="num">${money(price)}</b></div>
          <div class="pp-sum"><span>${t().subtotal}</span><span class="num">${money(price)}</span></div>${rate ? `<div class="pp-sum"><span>${tx("vat", { n: Math.round(rate * 100) })}</span><span class="num">${money(vat)}</span></div>` : ""}
          <div class="pp-sum tot"><span>${t().total}</span><b class="num">${money(price + vat)}</b></div>
          <button type="button" class="hx-btn dark pp-go" id="ppBook" ${pk.date && pk.time ? "" : "disabled"}>${S(I.send)}${sel.ses ? t().bookPkg : t().book}</button></div>` : ""}
    </div>`;
  }
  function form(o) {
    const b = c => tried && c;
    const tile = (k, ic, h, s) => `<button type="button" class="pp-tile ${st.open === k ? "on" : ""}" data-open="${k}" aria-expanded="${st.open === k}"><span class="pp-tic">${S(ic, 1.9)}</span><span><b>${h}</b><small>${s}</small></span></button>`;
    return `<div class="pt-f"><label>${t().planT} <span class="req">*</span></label>
        <textarea class="hx-in pt-ta ${b(!st.plan.trim()) ? "bad" : ""}" id="ppPlan" rows="4" maxlength="1500" dir="auto" placeholder="${E(t().planPh)}">${E(st.plan)}</textarea></div>
      <div class="pt-f"><label>${t().reqT}</label><small class="pt-sub">${t().reqS}</small>
        <div class="pp-tiles">${tile("xr", I.xr, t().xrT, t().xrS)}${st.next && MadaOrders.get(st.next.orderId) ? "" : tile("pt", I.pt, t().ptT, t().ptS)}</div></div>
      ${st.open === "xr" ? `<div class="pp-xr"><label for="ppXr">${t().xrReason} <span class="req">*</span></label>
          <textarea class="hx-in pt-ta" id="ppXr" rows="2" maxlength="500" dir="auto" placeholder="${E(t().xrPh)}">${E(st.xrReason)}</textarea>
          <div class="pp-xra"><button type="button" class="hx-btn out" data-open="">${t().cancel}</button><button type="button" class="hx-btn dark" id="ppXrSend">${S(I.send)}${t().xrSend}</button></div></div>` : ""}
      ${st.open === "pt" ? ptWizard(o) : ""}
      ${reqList()}${nextCard()}`;
  }
  const reqList = () => st.imaging.length ? `<ul class="pp-reqs">${st.imaging.map(r => `<li><span class="pp-tic sm">${S(I.xr, 1.9)}</span><span><b>${t().xrT}</b><small>${E(r.reason)}</small></span><span class="pp-ps ok">${E(tx("xrSent", { id: r.mrId }))}</span></li>`).join("")}</ul>` : "";
  function view(o, c) {
    ctx = c; lang = c.lang; load(o);
    const sv = savedOf(o), when = sv && new Date(sv.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const card = editing
      ? `<section class="nu-card open"><div class="nu-cb">${form(o)}${sv ? `<div class="nu-acts"><button type="button" class="hx-btn out" id="ppCancel">${S(I.x, 2.2)}${t().cancel}</button></div>` : ""}</div></section>`
      : `<section class="nu-card"><div class="nu-ch"><span class="nu-n0 done">${S(I.check, 2.6)}</span><div><b>${t().ptPlan}</b><small>${E(tx("savedAt", { t: when, n: nameOf(sv.by) }))}</small></div>
          ${dvOf(o).status === "done" ? "" : `<button type="button" class="hx-btn out sm" id="ppEdit">${S(I.pen)}${t().edit}</button>`}</div>
          <div class="nu-cb"><div class="np-sum"><div class="w"><span>${t().planT}</span><b dir="auto" class="pp-pre">${E(sv.plan)}</b></div></div>${reqList()}${nextCard()}</div></section>`;
    return `<div class="nu np ptx pp">
      <div class="ex-top"><span class="ex-tic">${S(I.plan)}</span><div><h1>${t().ptPlan}</h1><p>${t().ptPlanS}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>
      ${card}
      <div class="ex-foot"><button type="button" class="hx-btn out pl-prevb" id="ppPrev"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${E(c.prevName || "")}</small></span></button><span class="hx-sp"></span>
        <button type="button" class="hx-btn dark" id="ppCont">${editing ? t().cont : t().next}${S(I.arrow)}</button></div>
    </div>`;
  }
  // Imaging request: a medical request for the operations team (Medical Requests page).
  function sendImaging(o) {
    const reason = st.xrReason.trim(); if (!reason) { ctx.toast(t().xrNeed); const el = document.getElementById("ppXr"); if (el) { el.classList.add("bad"); el.focus(); } return; }
    const src = MadaOrders.get(o.id) || o, me = ctx.me;
    const r = MadaMedical.add({ orderId: src.id, bookingId: src.bookingId || null, mrn: src.mrn, patient: src.patient, mobile: src.mobile, service: "physio", doctorId: null,
      source: "physio", byDoctor: null, byPhysio: me.name, items: [{ type: "radiology", needsDoctor: true, title: { en: L.en.xrTitle, ar: L.ar.xrTitleAr },
        details: { en: L.en.xrDetails.replace("{r}", reason), ar: L.ar.xrDetailsAr.replace("{r}", reason) }, reason }] });
    st.imaging.push({ mrId: r.id, reason, at: new Date().toISOString() }); st.xrReason = ""; st.open = ""; keep();
    ctx.toast(t().xrOk); ctx.rerender();
  }
  // Physiotherapy plan: one booking for the chosen package, on the chosen time, assigned to this physiotherapist, with its payment link.
  function bookNext(o) {
    const pk = st.pick, pn = ctx.pkgNext, inPkg = pk.code === SES && pn, p = pkgOf(inPkg ? pn.code : pk.code); if (!p) return ctx.toast(t().pickPkg); if (!pk.date || !pk.time) return ctx.toast(t().pickTime);
    const src = MadaOrders.get(o.id) || o, me = ctx.me, [h, m] = pk.time.split(":").map(Number), now = new Date().toISOString();
    if (inPkg) {
      // Already paid with the package: a booking with nothing to pay, linked to the package (order.pkgSession).
      const bo = MadaOrders.book({ service: "physio", mrn: src.mrn, patient: src.patient, mobile: src.mobile, location: src.location, address: src.address,
        items: [{ kind: "physio", code: p.code }], total: 0, appointment: { date: pk.date, minute: h * 60 + (m || 0), nurse: me.name }, payment: "paid", paidInfo: { method: "package", amount: 0, at: now, by: me.name },
        booking: { nurseId: me.physioId, doctorId: null, noDoctor: true, by: me.name, at: now }, staff: me.name, fromPt: { visitId: src.id, by: me.name, at: now },
        pkgSession: { orderId: pn.orderId, code: p.code, n: pn.n + 1, m: pn.m } });
      st.next = { orderId: bo.id, bookingId: bo.bookingId, code: p.code, date: pk.date, time: pk.time, total: 0, pkgSes: pn.n + 1 };
      st.pick = { code: "", date: "", time: "" }; st.open = ""; keep();
      ctx.toast(t().bookedPkg); return ctx.rerender();
    }
    let bo = MadaOrders.book({ service: "physio", mrn: src.mrn, patient: src.patient, mobile: src.mobile, location: src.location, address: src.address,
      items: [{ kind: "physio", code: p.code }], total: Number(p.price || 0), appointment: { date: pk.date, minute: h * 60 + (m || 0), nurse: me.name },
      payment: "unpaid", booking: { nurseId: me.physioId, doctorId: null, noDoctor: true, by: me.name, at: now }, staff: me.name, fromPt: { visitId: src.id, by: me.name, at: now } });
    bo = MadaVisitBook.sendPay(bo, me.name);
    bo = holdHour(bo);
    st.next = { orderId: bo.id, bookingId: bo.bookingId, code: p.code, date: pk.date, time: pk.time, total: Number(p.price || 0) };
    st.pick = { code: "", date: "", time: "" }; st.open = ""; keep();
    ctx.toast(t().bookedOk); ctx.rerender();
  }
  // The patient has one hour to pay (MadaOrders.PAY_MINUTES), counted down on the payment page; after that the link can be renewed.
  function holdHour(bo) {
    const now = Date.now();
    return MadaOrders.update(bo.id, { payLink: { ...(bo.payLink || {}), sentAt: new Date(now).toISOString(), expiresAt: new Date(now + (MadaOrders.PAY_MINUTES || 60) * 60000).toISOString() } });
  }
  const expired = bo => !bo.payLink || new Date(bo.payLink.expiresAt) <= Date.now();
  const leftTxt = bo => { const m = Math.max(0, Math.ceil((new Date(bo.payLink.expiresAt) - Date.now()) / 60000)); return tx("leftMin", { n: m }); };
  // QR of the payment link: the patient scans it with the phone camera (doctor-qr.js, loaded when first needed).
  let qrOpen = false;
  function qrBox(bo) {
    if (!qrOpen) return "";
    const url = MadaVisitBook.payUrl(bo);
    return `<div class="pp-qr"><div class="or-qrc"><div class="or-qrb">${window.MadaQR ? MadaQR.svg(url) : ""}</div>${window.MadaQR ? `<img class="or-qrl" src="assets/mada-logo.png" alt="">` : ""}</div>
      <b>${t().qrT}</b><small>${t().qrS}</small><span class="pp-qri">${E(nameOf(bo.patient))} · <b class="num">${money(MadaVisitBook.due(bo))}</b></span>
      <div class="pp-qra"><button type="button" class="hx-btn out" data-pp="qrClose">${t().close}</button><button type="button" class="hx-btn dark" data-pp="qrSave">${S(I.dl)}${t().qrSave}</button></div></div>`;
  }
  function qrSave(bo) {
    const img = new Image(), c = document.createElement("canvas"), W = 1000; c.width = c.height = W;
    const done = () => { const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = `mada-pay-${bo.id}.png`; a.click(); };
    img.onload = () => { const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, W); g.drawImage(img, 0, 0, W, W);
      const lg = new Image(); lg.onload = () => { const r = W * .12, lw = r * 1.3, lh = lw * lg.height / lg.width; g.fillStyle = "#fff"; g.beginPath(); g.arc(W / 2, W / 2, r, 0, 7); g.fill(); g.drawImage(lg, (W - lw) / 2, (W - lh) / 2, lw, lh); done(); };
      lg.onerror = done; lg.src = "assets/mada-logo.png"; };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(MadaQR.svg(MadaVisitBook.payUrl(bo)));
  }
  function share(ch) {
    const bo = MadaOrders.get(st.next.orderId); if (!bo) return;
    const msg = MadaVisitBook.payMsg(bo, "ar"), num = String(bo.mobile || "").replace(/\D/g, "").replace(/^0/, "966");
    if (ch === "copy") { (navigator.clipboard ? navigator.clipboard.writeText(msg) : Promise.reject()).then(() => ctx.toast(t().copied), () => ctx.toast(msg)); }
    if (ch === "wa") window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    if (ch === "sms") location.href = `sms:${bo.mobile || ""}?&body=${encodeURIComponent(msg)}`;
    MadaOrders.update(bo.id, { messages: [...(bo.messages || []), { type: "share", channel: ch, at: new Date().toISOString(), by: ctx.me.name }] });
  }
  function bind(root, o, c) {
    ctx = c;
    const $ = s => root.querySelector(s), all = (s, f) => root.querySelectorAll(s).forEach(f), re = () => ctx.rerender();
    if ($("#ppPlan")) $("#ppPlan").addEventListener("input", e => { st.plan = e.target.value; if (st.plan.trim()) e.target.classList.remove("bad"); });
    if ($("#ppXr")) $("#ppXr").addEventListener("input", e => { st.xrReason = e.target.value; e.target.classList.remove("bad"); });
    all("[data-open]", b => b.addEventListener("click", () => { st.open = st.open === b.dataset.open ? "" : b.dataset.open; re(); }));
    if ($("#ppXrSend")) $("#ppXrSend").addEventListener("click", () => sendImaging(o));
    all("[data-pkg]", b => b.addEventListener("click", () => { st.pick.code = b.dataset.pkg; re(); }));
    all("[data-day]", b => b.addEventListener("click", () => { st.pick.date = b.dataset.day; st.pick.time = ""; re(); }));
    all("[data-time]", b => b.addEventListener("click", () => { st.pick.time = b.dataset.time; re(); }));
    if ($("#ppBook")) $("#ppBook").addEventListener("click", () => bookNext(o));
    all("[data-pp]", b => b.addEventListener("click", () => {
      const k = b.dataset.pp;
      if (k === "cancel") {
        if (!confirm(t().cancelQ)) return;
        const bo = MadaOrders.get(st.next.orderId);
        if (bo && bo.payment !== "paid") MadaOrders.update(bo.id, { status: "cancelled", decision: "rejected", reason: { en: L.en.cancelWhy, ar: L.ar.cancelWhy } });
        st.next = null; keep(); ctx.toast(t().cancelled); return re();
      }
      const bo = st.next && MadaOrders.get(st.next.orderId); if (!bo) return;
      if (k === "renew") { holdHour(bo); ctx.toast(t().renewed); return re(); }
      if (k === "qrClose") { qrOpen = false; return re(); }
      if (k === "qrSave") return window.MadaQR && qrSave(bo);
      if (k === "qr") {
        const show = () => { qrOpen = true; MadaOrders.update(bo.id, { messages: [...(bo.messages || []), { type: "share", channel: "qr", at: new Date().toISOString(), by: ctx.me.name }] }); re(); };
        if (window.MadaQR) return show();
        const sc = document.createElement("script"); sc.src = "doctor-qr.js"; sc.onload = show; sc.onerror = () => ctx.toast(t().qrErr); document.head.appendChild(sc); return;
      }
      share(k);
    }));
    if ($("#ppEdit")) $("#ppEdit").addEventListener("click", () => { editing = true; re(); });
    if ($("#ppCancel")) $("#ppCancel").addEventListener("click", () => { reset(); re(); });
    $("#ppPrev").addEventListener("click", () => { reset(); ctx.go(ctx.prevKey); });
    $("#ppCont").addEventListener("click", () => {
      if (editing) {
        if (!st.plan.trim()) { tried = true; re(); const el = root.querySelector(".bad"); if (el) el.focus(); return ctx.toast(t().needPlan); }
        const { open, xrReason, pick, ...d } = st;
        try { ctx.save("ptPlan", { ...d, plan: d.plan.trim() }); } catch (e) { return ctx.toast(e.message || t().storeErr); }
        ctx.toast(t().saved);
      }
      reset(); ctx.go(ctx.nextKey);
    });
  }
  return { view, bind, reset, L, ICON: I.plan };
})();
