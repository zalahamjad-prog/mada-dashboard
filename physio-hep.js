// Home Exercise Program step of a physio visit (physio-visit.html), saved in order.physioVisit.steps.ptHep:
//   { items: [{ code, sets, reps, hold, perDay, note }], days (days a week), note, token, sent: [{ ch, at, by }], opens, openedAt }
// The physiotherapist picks exercises from the library (exercises.js, managed on the dashboard), sets the dose of each one,
// then sends the program to the patient by a link (hep.html?t=TOKEN): WhatsApp, SMS, copy or QR. "No home program" skips it.
// Exercises open on the areas chosen in the Objective Examination.
const PtHep = (() => {
  const I = {
    hep: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>', check: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    wa: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.5-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/>',
    sms: '<path d="M4 5h16v11H9l-5 4z"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4h-4"/>',
    send: '<path d="M21 3 3 10.5l7 3 3 7z"/><path d="m10 13.5 4-4"/>'
  };
  const L = {
    en: {
      stepOf: "Step {n} of {m}", prev: "Previous", cont: "Save & Continue", next: "Continue", edit: "Edit", cancel: "Cancel", savedAt: "Saved {t} · {n}", saved: "Saved.", storeErr: "Couldn't save. Try again.",
      ptHep: "Home Exercise Program", ptHepS: "Pick the exercises, set the repetitions and send the program to the patient.",
      all: "All", search: "Search exercises", chosen: "Program ({n})", none: "No home program for this patient", noneOn: "No home program",
      empty: "Tap + on an exercise to add it.", noLib: "The exercise library is empty. Add exercises on the dashboard (Services · Physiotherapy · Exercises).",
      sets: "Sets", reps: "Reps", hold: "Hold (s)", perDay: "Per day", exNote: "Note for this exercise (optional)", days: "Days a week", note: "Notes for the patient (optional)",
      notePh: "e.g. Stop if the pain gets worse and call us", fromExam: "Showing the areas from the examination.", needEx: "Add at least one exercise, or choose No home program.", needDose: "Enter the sets, reps and times a day as whole numbers.",
      sendT: "Send to the patient", viaWa: "WhatsApp", viaSms: "SMS", viaQr: "QR code", copy: "Copy message", openLink: "Open program", copied: "Copied.",
      sentN: "Sent {n} times · last {t}", notSent: "Not sent yet", opened: "Opened by the patient", notOpened: "Not opened yet", qrT: "Scan to open the program", qrErr: "Couldn't load the QR code.",
      msg: "Hello {n}, here is your home exercise program from Mada Care:\n{u}\nDo the exercises as shown. If the pain gets worse, stop and contact us 💚", video: "Video", perWeek: "{n} days a week"
    },
    ar: {
      stepOf: "الخطوة {n} من {m}", prev: "السابق", cont: "حفظ ومتابعة", next: "متابعة", edit: "تعديل", cancel: "إلغاء", savedAt: "انحفظت {t} · {n}", saved: "انحفظ.", storeErr: "ما قدرنا نحفظ. حاول مرة ثانية.",
      ptHep: "البرنامج المنزلي", ptHepS: "اختر التمارين، وحدد التكرارات، وأرسل البرنامج للمريض.",
      all: "الكل", search: "ابحث في التمارين", chosen: "البرنامج ({n})", none: "ما فيه برنامج منزلي لهذا المريض", noneOn: "بدون برنامج منزلي",
      empty: "اضغط + على أي تمرين عشان تضيفه.", noLib: "مكتبة التمارين فاضية. أضف التمارين من لوحة التحكم (الخدمات · العلاج الطبيعي · التمارين).",
      sets: "مجموعات", reps: "تكرار", hold: "ثبات (ث)", perDay: "باليوم", exNote: "ملاحظة لهذا التمرين (اختياري)", days: "أيام في الأسبوع", note: "ملاحظات للمريض (اختياري)",
      notePh: "مثال: وقّف إذا زاد الألم وتواصل معنا", fromExam: "تظهر المناطق اللي في الفحص السريري.", needEx: "أضف تمرين واحد على الأقل، أو اختر بدون برنامج منزلي.", needDose: "اكتب المجموعات والتكرار والمرات في اليوم بأرقام صحيحة.",
      sendT: "إرسال للمريض", viaWa: "واتساب", viaSms: "رسالة نصية", viaQr: "رمز QR", copy: "نسخ الرسالة", openLink: "فتح البرنامج", copied: "انسخت.",
      sentN: "انرسل {n} مرات · آخر مرة {t}", notSent: "ما انرسل للحين", opened: "فتحه المريض", notOpened: "ما فتحه للحين", qrT: "امسح وافتح البرنامج", qrErr: "ما قدرنا نحمّل رمز QR.",
      msg: "مرحبًا {n}، هذا برنامج التمارين المنزلية من مدى كير:\n{u}\nسوّ التمارين مثل ما هي موضحة. إذا زاد الألم وقّف وتواصل معنا 💚", video: "فيديو", perWeek: "{n} أيام في الأسبوع"
    }
  };
  let ctx = null, lang = "en", st = null, forKey = null, editing = false, tried = false, area = "", q = "", qrOpen = false;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const nameOf = v => v && typeof v === "object" ? v[lang] || v.en : v || "";
  const reset = () => { st = null; forKey = null; editing = false; tried = false; area = ""; q = ""; qrOpen = false; };
  const steps = o => (o.doctorVisit || {}).steps || {};
  const savedOf = o => steps(o).ptHep;
  const clone = x => JSON.parse(JSON.stringify(x));
  const X = () => typeof MadaExercises !== "undefined" ? MadaExercises : null;
  const exOf = code => X() && X().byCode[code];
  const media = x => x && x.img ? `<img src="${E(x.img)}" alt="">` : `<span class="hp-fig">${X().fig(x ? x.area : "")}</span>`;
  const newToken = () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, "0")).join(""); };
  const url = (sv, lg) => new URL(`hep.html?t=${sv.token}${lg === "en" ? "&l=en" : ""}`, location.href).href;
  // Areas from the Objective Examination that the library has (the back of the exam maps to the back here).
  const examAreas = o => ((steps(o).ptExam || {}).areas || []).filter(a => X() && X().AREAS.includes(a));
  function load(o) {
    if (st && forKey === o.id) return;
    const sv = savedOf(o);
    // A follow-up session starts from the program the patient already has (ctx.prevHep); it gets its own new link when saved.
    st = { items: [], days: 7, note: "", none: false, ...clone(sv || (ctx && ctx.prevHep) || {}) };
    delete st.at; delete st.by;
    if (!sv) ["token", "sent", "opens", "openedAt", "lastOpenedAt"].forEach(k => delete st[k]);
    const ea = examAreas(o); area = ea[0] || "";
    forKey = o.id; editing = !sv;
  }
  function libList() {
    const all = X() ? X().LIST : [], norm = s => String(s || "").toLowerCase();
    return all.filter(x => (!area || x.area === area) && (!q || norm([x.name.en, x.name.ar, (x.steps || {}).en, (x.steps || {}).ar, x.code].join(" ")).includes(norm(q))));
  }
  function form(o) {
    const b = c => tried && c, lib = X() ? X().LIST : [], ea = examAreas(o), list = libList();
    const num = (i, k, l) => `<label class="hp-n"><span>${l}</span><input class="hx-in ${b(!(Number(st.items[i][k]) >= (k === "hold" ? 0 : 1))) ? "bad" : ""}" data-dose="${i}.${k}" type="number" min="${k === "hold" ? 0 : 1}" inputmode="numeric" dir="ltr" value="${E(st.items[i][k])}"></label>`;
    return `<button type="button" class="pt-chip nn ${st.none ? "on" : ""}" id="hpNone" aria-pressed="${st.none}">${st.none ? S(I.check, 2.8) : ""}${t().noneOn}</button>
      ${st.none ? "" : !lib.length ? `<p class="pp-mt" style="margin-top:12px">${t().noLib}</p>` : `<div class="hp-wrap">
        <div class="hp-lib"><div class="hp-bar"><label class="hp-q">${S(I.search, 2)}<input type="search" id="hpQ" value="${E(q)}" placeholder="${E(t().search)}"></label></div>
          <div class="pt-chips hp-areas">${["", ...X().AREAS].map(a => `<button type="button" class="pt-chip ${area === a ? "on" : ""}" data-area="${a}">${a ? E(X().areaName(a, lang)) : t().all}<small>${a ? lib.filter(x => x.area === a).length : lib.length}</small></button>`).join("")}</div>
          ${ea.length ? `<small class="pt-sub">${t().fromExam}</small>` : ""}
          <div class="hp-grid">${list.map(x => { const on = st.items.some(y => y.code === x.code);
            return `<button type="button" class="hp-card ${on ? "on" : ""}" data-add="${E(x.code)}" aria-pressed="${on}"><span class="hp-m">${media(x)}${x.video ? `<i class="hp-v">${S(I.play, 2)}</i>` : ""}</span>
              <span class="hp-ct"><b>${E(nameOf(x.name))}</b><small>${E(X().dose(x, lang))}</small></span><span class="hp-add">${S(on ? I.check : I.plus, 2.6)}</span></button>`; }).join("")}</div></div>
        <div class="hp-prog ${b(!st.items.length) ? "bad" : ""}"><h3>${E(tx("chosen", { n: st.items.length }))}</h3>
          ${st.items.length ? `<ol class="hp-list">${st.items.map((it, i) => { const x = exOf(it.code) || { name: { en: it.code, ar: it.code }, area: "" };
            return `<li><div class="hp-lh"><span class="hp-m sm">${media(x)}</span><b>${E(nameOf(x.name))}</b><button type="button" class="pt-del" data-del="${i}" aria-label="${E(nameOf(x.name))}">${S(I.trash, 2)}</button></div>
              <div class="hp-dose">${num(i, "sets", t().sets)}${num(i, "reps", t().reps)}${num(i, "hold", t().hold)}${num(i, "perDay", t().perDay)}</div>
              <input class="hx-in" data-exnote="${i}" value="${E(it.note || "")}" maxlength="200" dir="auto" placeholder="${E(t().exNote)}"></li>`; }).join("")}</ol>` : `<p class="pp-mt">${t().empty}</p>`}
          <div class="pt-f"><label>${t().days}</label><div class="pt-chips">${[3, 4, 5, 6, 7].map(n => `<button type="button" class="pt-chip rd ${Number(st.days) === n ? "on" : ""}" data-days="${n}">${Number(st.days) === n ? S(I.check, 2.8) : ""}${n}</button>`).join("")}</div></div>
          <div class="pt-f"><label>${t().note}</label><textarea class="hx-in pt-ta" id="hpNote" rows="2" maxlength="500" dir="auto" placeholder="${E(t().notePh)}">${E(st.note)}</textarea></div></div></div>`}`;
  }
  function shareBox(o, sv) {
    if (!sv.token) return "";
    const last = (sv.sent || []).slice(-1)[0], when = s => new Date(s).toLocaleString(ctx.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    return `<div class="pp-bk hp-send"><div class="pp-bkh">${S(I.send, 2.2)}<b>${t().sendT}</b><span class="pp-ps ${sv.openedAt ? "ok" : ""}">${sv.openedAt ? t().opened : t().notOpened}</span></div>
      <p class="pp-note">${S(I.info)}<span>${last ? E(tx("sentN", { n: sv.sent.length, t: when(last.at) })) : t().notSent}</span></p>
      <div class="pp-share"><button type="button" class="hx-btn pp-wa" data-hp="wa">${S(I.wa)}${t().viaWa}</button><button type="button" class="hx-btn out" data-hp="sms">${S(I.sms)}${t().viaSms}</button>
        <button type="button" class="hx-btn out" data-hp="qr">${S(I.qr)}${t().viaQr}</button><button type="button" class="hx-btn out" data-hp="copy">${S(I.copy)}${t().copy}</button>
        <a class="hx-btn out" href="${E(url(sv, lang) + "&pv=1")}" target="_blank" rel="noopener">${S(I.open)}${t().openLink}</a></div>
      ${qrOpen && window.MadaQR ? `<div class="pp-qr"><div class="or-qrc"><div class="or-qrb">${MadaQR.svg(url(sv, "ar"))}</div><img class="or-qrl" src="assets/mada-logo.png" alt=""></div><b>${t().qrT}</b></div>` : ""}</div>`;
  }
  function summary(o, sv) {
    if (sv.none) return `<div class="np-sum"><div class="w"><span>${t().ptHep}</span><b>${t().none}</b></div></div>`;
    return `<ol class="hp-list ro">${sv.items.map(it => { const x = exOf(it.code) || { name: { en: it.code, ar: it.code }, area: "" };
        return `<li><div class="hp-lh"><span class="hp-m sm">${media(x)}</span><span><b>${E(nameOf(x.name))}</b><small>${E(X().dose(it, lang))}${it.note ? " · " + E(it.note) : ""}</small></span></div></li>`; }).join("")}</ol>
      <div class="np-sum" style="margin-top:10px"><div><span>${t().days}</span><b>${E(tx("perWeek", { n: sv.days }))}</b></div>${sv.note ? `<div><span>${t().note.replace(/ \(.*\)$/, "")}</span><b dir="auto">${E(sv.note)}</b></div>` : ""}</div>${shareBox(o, sv)}`;
  }
  function view(o, c) {
    ctx = c; lang = c.lang; load(o);
    const sv = savedOf(o), when = sv && new Date(sv.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const card = editing
      ? `<section class="nu-card open"><div class="nu-cb">${form(o)}${sv ? `<div class="nu-acts"><button type="button" class="hx-btn out" id="hpCancel">${S(I.x, 2.2)}${t().cancel}</button></div>` : ""}</div></section>`
      : `<section class="nu-card"><div class="nu-ch"><span class="nu-n0 done">${S(I.check, 2.6)}</span><div><b>${t().ptHep}</b><small>${E(tx("savedAt", { t: when, n: nameOf(sv.by) }))}</small></div>
          ${(o.doctorVisit || {}).status === "done" ? "" : `<button type="button" class="hx-btn out sm" id="hpEdit">${S(I.pen)}${t().edit}</button>`}</div><div class="nu-cb">${summary(o, sv)}</div></section>`;
    return `<div class="nu np ptx pp hp">
      <div class="ex-top"><span class="ex-tic">${S(I.hep)}</span><div><h1>${t().ptHep}</h1><p>${t().ptHepS}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>
      ${card}
      <div class="ex-foot"><button type="button" class="hx-btn out pl-prevb" id="hpPrev"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${E(c.prevName || "")}</small></span></button><span class="hx-sp"></span>
        <button type="button" class="hx-btn dark" id="hpCont">${editing ? t().cont : t().next}${S(I.arrow)}</button></div>
    </div>`;
  }
  function msgOf(o, sv, lg) { const first = String(nameOf(o.patient) || "").trim().split(/\s+/)[0] || ""; return L[lg].msg.replace(" {n}", first ? " " + first : "").replace("{u}", url(sv, lg)); }
  function share(o, ch) {
    const sv = savedOf(o); if (!sv) return;
    const msg = msgOf(o, sv, "ar"), num = String(o.mobile || "").replace(/\D/g, "").replace(/^0/, "966");
    const log = () => ctx.saveStep("ptHep", { ...sv, sent: [...(sv.sent || []), { ch, at: new Date().toISOString(), by: ctx.me.name }] });
    if (ch === "copy") { (navigator.clipboard ? navigator.clipboard.writeText(msg) : Promise.reject()).then(() => ctx.toast(t().copied), () => ctx.toast(msg)); log(); return; }
    if (ch === "wa") { window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank", "noopener"); log(); return ctx.rerender(); }
    if (ch === "sms") { log(); location.href = `sms:${o.mobile || ""}?&body=${encodeURIComponent(msg)}`; return; }
    if (ch === "qr") {
      const show = () => { qrOpen = !qrOpen; if (qrOpen) log(); ctx.rerender(); };
      if (window.MadaQR) return show();
      const sc = document.createElement("script"); sc.src = "doctor-qr.js"; sc.onload = show; sc.onerror = () => ctx.toast(t().qrErr); document.head.appendChild(sc);
    }
  }
  function bind(root, o, c) {
    ctx = c;
    const $ = s => root.querySelector(s), all = (s, f) => root.querySelectorAll(s).forEach(f), re = () => ctx.rerender();
    if ($("#hpNone")) $("#hpNone").addEventListener("click", () => { st.none = !st.none; re(); });
    all("[data-area]", b => b.addEventListener("click", () => { area = b.dataset.area; re(); }));
    if ($("#hpQ")) $("#hpQ").addEventListener("input", e => { q = e.target.value; const p = e.target.selectionStart; re(); const i = root.querySelector("#hpQ"); if (i) { i.focus(); i.setSelectionRange(p, p); } });
    all("[data-add]", b => b.addEventListener("click", () => {
      const code = b.dataset.add, i = st.items.findIndex(y => y.code === code);
      if (i >= 0) st.items.splice(i, 1); else { const x = exOf(code); st.items.push({ code, sets: x.sets, reps: x.reps, hold: x.hold || 0, perDay: x.perDay, note: "" }); }
      re();
    }));
    all("[data-del]", b => b.addEventListener("click", () => { st.items.splice(+b.dataset.del, 1); re(); }));
    all("[data-dose]", el => el.addEventListener("input", () => { const [i, k] = el.dataset.dose.split("."); st.items[+i][k] = el.value === "" ? "" : Number(el.value); el.classList.remove("bad"); }));
    all("[data-exnote]", el => el.addEventListener("input", () => { st.items[+el.dataset.exnote].note = el.value; }));
    all("[data-days]", b => b.addEventListener("click", () => { st.days = Number(b.dataset.days); re(); }));
    if ($("#hpNote")) $("#hpNote").addEventListener("input", e => { st.note = e.target.value; });
    all("[data-hp]", b => b.addEventListener("click", () => share(MadaOrders.get(o.id) || o, b.dataset.hp)));
    if ($("#hpEdit")) $("#hpEdit").addEventListener("click", () => { editing = true; re(); });
    if ($("#hpCancel")) $("#hpCancel").addEventListener("click", () => { reset(); re(); });
    $("#hpPrev").addEventListener("click", () => { reset(); ctx.go(ctx.prevKey); });
    $("#hpCont").addEventListener("click", () => {
      if (editing) {
        if (!st.none && !st.items.length) { tried = true; re(); return ctx.toast(t().needEx); }
        const whole = (v, min) => Number.isInteger(Number(v)) && String(v) !== "" && Number(v) >= min;
        if (!st.none && st.items.some(it => !whole(it.sets, 1) || !whole(it.reps, 1) || !whole(it.hold, 0) || !whole(it.perDay, 1))) { tried = true; re(); return ctx.toast(t().needDose); }
        const sv = savedOf(o) || {};
        const d = st.none ? { none: true, items: [], days: null, note: "" } : { none: false, items: st.items.map(it => ({ ...it, note: (it.note || "").trim() })), days: st.days, note: st.note.trim(),
          token: sv.token || newToken(), sent: sv.sent || [], opens: sv.opens || 0, openedAt: sv.openedAt || null };
        try { ctx.save("ptHep", d); } catch (e) { return ctx.toast(e.message || t().storeErr); }
        ctx.toast(t().saved);
        // Stay on the step once, so the program can be sent straight away.
        if (!st.none) { reset(); return re(); }
      }
      reset(); ctx.go(ctx.nextKey);
    });
  }
  return { view, bind, reset, L, ICON: I.hep };
})();
