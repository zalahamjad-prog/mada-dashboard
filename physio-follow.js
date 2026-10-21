// Follow-up session of a physio visit (physio-visit.html). A visit is a follow-up when it was booked from an earlier physio visit
// (order.fromPt, physio-plan.js) or the patient file already has a physio visit. Each session is its own record (its order's physioVisit),
// linked to the previous session (follow.prevId), the first assessment (follow.baseId) and the package it belongs to.
// Steps, saved in order.physioVisit.steps[key]:
//   fuInfo  (Session Overview):    { seen } (view only: session number, the previous assessment and plan, and the past sessions)
//   fuToday (Today's Assessment):  { pain 0–10, change: "better" | "same" | "worse", exam: "brief" | "detailed" | "none", examNote }
//                                  "detailed" adds the Objective Examination step (starting from the last examination).
//   fuTx    (Treatment Given):     { done: [type], items: { type: [{ name, dose, note }] }, otherName, response: "ok" | "modified" | "reassess", note }
//   fuNext  (Next Plan):           { decision: "continue" | "modify" | "reassess" | "discharge", why (discharge), recs }
//                                  Not "discharge": the Treatment Plan step follows to book the next session. The case is never closed
//                                  on its own when the package ends: the physiotherapist decides here.
//   fuSign  (Session Approval):    { approved: true } (the session note is approved; "Save as draft" keeps physioVisit.fuSignDraft)
// Nothing is marked as done unless the physiotherapist records it.
const PtFu = (() => {
  const I = {
    info: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>', today: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    tx: '<path d="M6.5 6.5h11M6.5 17.5h11M4 9v6M7 7v10M17 7v10M20 9v6"/>', next: '<path d="M4 12h12M12 6l6 6-6 6"/><path d="M20 5v14"/>',
    sign: '<path d="M4 20h16"/><path d="M5 16c3-6 5-9 6.5-9S12 12 9 16s4-5 6-5 0 5 2 5 2-2 3-3"/>',
    check: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    info2: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', warn: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>', draft: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>',
    up: '<path d="m6 14 6-6 6 6"/>', down: '<path d="m6 10 6 6 6-6"/>', same: '<path d="M5 12h14"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  const L = {
    en: {
      stepOf: "Step {n} of {m}", prev: "Previous", cont: "Save & Continue", next: "Continue", edit: "Edit", cancel: "Cancel", savedAt: "Saved {t} · {n}", saved: "Saved.", storeErr: "Couldn't save. Try again.",
      opt: "(Optional)", other: "Other", otherPh: "Write it here",
      fuInfo: "Session Overview", fuInfoS: "The session details and the patient's case so far. Nothing to enter here.",
      fuToday: "Today's Assessment", fuTodayS: "How the patient is today compared with the last session.",
      fuTx: "Treatment Given", fuTxS: "Tick only what you actually did today, then the patient's response.",
      fuNext: "Next Plan", fuNextS: "What happens after this session.",
      fuSign: "Session Approval", fuSignS: "Check the session note, then approve it or keep it as a draft.",
      sesT: "Session information", sesNo: "Session", sesOf: "{n} of {m}", sesN: "Session {n}", sesDate: "Session date", sesBy: "Physiotherapist", sesSt: "Status",
      st_ongoing: "In progress", st_draft: "Draft", st_approved: "Note approved", st_done: "Completed", pkgT: "Package",
      prevT: "Previous case summary", prevS: "From the first assessment and the latest sessions (view only).", firstAt: "First assessment · {d}",
      complaint: "Main complaint", lastExam: "Last examination", goals: "Treatment goals", plan: "Approved treatment plan", hep: "Previous home program", none: "Not recorded",
      histT: "Previous sessions ({n})", histNone: "No earlier follow-up sessions.", hPain: "Pain {n}/10", initial: "First assessment",
      pain: "Pain level today", p0: "0 No pain", p10: "10 Worst pain", band_0: "No pain", band_1: "Mild pain", band_2: "Moderate pain", band_3: "Severe pain", lastPain: "Last session: {n}/10",
      change: "Change since the last session", ch_better: "Improved", ch_same: "No change", ch_worse: "Worse",
      exam: "Examination today", ex_brief: "Short examination as needed", ex_detailed: "Detailed reassessment", ex_none: "No extra examination needed",
      exBriefL: "What you checked", exBriefPh: "e.g. Knee flexion improved to 110°, mild pain at end of range",
      exDetHint: "The Objective Examination step is added next, starting from the last examination.",
      txQ: "Treatment done today", tx_exercise: "Therapeutic exercises", tx_manual: "Manual therapy", tx_stretch: "Stretching", tx_balance: "Balance training", tx_gait: "Gait training", tx_edu: "Patient education", tx_other: "Other treatment",
      addDet: "Add details", detName: "Exercise or treatment", detDose: "Sets × reps or time", detNote: "Note", detNamePh: "e.g. Straight leg raise", detDosePh: "e.g. 2 × 10, or 10 min",
      resp: "Patient's response", rs_ok: "Tolerated the treatment well", rs_modified: "Treatment needed changes", rs_reassess: "Symptoms need a reassessment",
      note: "Session notes", notePh: "What you did, how the patient responded, and any important change", rsHint: "Consider choosing Reassess in the next plan.",
      dec: "Next step", dc_continue: "Continue the current plan", dc_modify: "Change the treatment plan", dc_reassess: "Reassess the case", dc_discharge: "End the treatment (discharge)",
      modHint: "Update the plan in the Treatment Plan step that follows.", nextHint: "Book the next session in the Treatment Plan step that follows.",
      lastPkg: "This is the last session of the package. Decide what happens next: the case isn't closed on its own.",
      why: "Reason for ending the treatment", whyPh: "e.g. Goals reached: walks 20 minutes with pain 2/10",
      recs: "Recommendations for the next session", recsPh: "e.g. Progress to standing exercises, check the home program",
      sumToday: "Today", sumTx: "Treatment", sumNext: "Next", draftSave: "Save as draft", approve: "Approve session note", draftOk: "Saved as a draft. You can come back to it from My Visits.",
      draftAt: "Draft saved {t}", approved: "Session note approved", approvedBy: "Approved {t} · {n}", approvedOk: "The session note is approved.",
      lockNote: "The session note is approved, so these steps are locked.", approveHint: "Next: Identity Confirmation and Patient Consent close the visit.",
      needPain: "Tap today's pain level.", needChange: "Choose the change since the last session.", needExam: "Choose the examination today.", needBrief: "Write what you checked.",
      needTx: "Tick at least one treatment you did.", needOther: "Write the other treatment.", needResp: "Choose the patient's response.", needNote: "Write the session notes.",
      needDec: "Choose the next step.", needWhy: "Write the reason for ending the treatment.", needAll: "Finish these steps first: {s}"
    },
    ar: {
      stepOf: "الخطوة {n} من {m}", prev: "السابق", cont: "حفظ ومتابعة", next: "متابعة", edit: "تعديل", cancel: "إلغاء", savedAt: "انحفظت {t} · {n}", saved: "انحفظ.", storeErr: "ما قدرنا نحفظ. حاول مرة ثانية.",
      opt: "(اختياري)", other: "أخرى", otherPh: "اكتبها هنا",
      fuInfo: "ملخص الجلسة", fuInfoS: "معلومات الجلسة وحالة المريض لين الحين. ما تحتاج تدخل شي هنا.",
      fuToday: "تقييم اليوم", fuTodayS: "حالة المريض اليوم مقارنة بالجلسة السابقة.",
      fuTx: "العلاج المنفذ", fuTxS: "اختر بس اللي سويته فعلًا اليوم، وبعدها استجابة المريض.",
      fuNext: "الخطة القادمة", fuNextS: "وش يصير بعد هذي الجلسة.",
      fuSign: "اعتماد الجلسة", fuSignS: "راجع ملاحظة الجلسة، واعتمدها أو احفظها كمسودة.",
      sesT: "معلومات الجلسة", sesNo: "رقم الجلسة", sesOf: "{n} من {m}", sesN: "الجلسة {n}", sesDate: "تاريخ الجلسة", sesBy: "الأخصائي", sesSt: "حالة الجلسة",
      st_ongoing: "جارية", st_draft: "مسودة", st_approved: "الملاحظة معتمدة", st_done: "مكتملة", pkgT: "الباقة",
      prevT: "ملخص الحالة السابقة", prevS: "من التقييم الأول وآخر الجلسات (للعرض فقط).", firstAt: "التقييم الأول · {d}",
      complaint: "الشكوى الرئيسية", lastExam: "آخر نتائج الفحص السريري", goals: "الأهداف العلاجية", plan: "الخطة العلاجية المعتمدة", hep: "البرنامج المنزلي السابق", none: "ما انسجل",
      histT: "الجلسات السابقة ({n})", histNone: "ما فيه جلسات متابعة قبل.", hPain: "الألم {n}/10", initial: "التقييم الأول",
      pain: "مستوى الألم اليوم", p0: "0 لا يوجد ألم", p10: "10 أشد ألم", band_0: "لا يوجد ألم", band_1: "ألم خفيف", band_2: "ألم متوسط", band_3: "ألم شديد", lastPain: "الجلسة السابقة: {n}/10",
      change: "التغير منذ الجلسة السابقة", ch_better: "تحسن", ch_same: "لا يوجد تغير", ch_worse: "تدهور",
      exam: "الفحص السريري اليوم", ex_brief: "فحص مختصر حسب الحاجة", ex_detailed: "إعادة تقييم مفصل", ex_none: "لا توجد حاجة إلى فحص إضافي",
      exBriefL: "وش فحصت", exBriefPh: "مثال: ثني الركبة تحسن إلى 110°، ألم خفيف في آخر المدى",
      exDetHint: "تنضاف خطوة الفحص السريري بعد هذي، وتبدأ من آخر فحص.",
      txQ: "العلاج المنفذ اليوم", tx_exercise: "تمارين علاجية", tx_manual: "علاج يدوي", tx_stretch: "تمارين إطالة", tx_balance: "تدريب التوازن", tx_gait: "تدريب المشي", tx_edu: "تثقيف المريض", tx_other: "تدخل علاجي آخر",
      addDet: "إضافة تفاصيل", detName: "التمرين أو التدخل", detDose: "المجموعات × التكرار أو المدة", detNote: "ملاحظة", detNamePh: "مثال: رفع الرجل مستقيمة", detDosePh: "مثال: 2 × 10، أو 10 دقائق",
      resp: "استجابة المريض للعلاج", rs_ok: "تحمل العلاج جيدًا", rs_modified: "احتاج العلاج إلى تعديل", rs_reassess: "ظهرت أعراض تستدعي إعادة التقييم",
      note: "ملاحظات الجلسة", notePh: "وش سويت، وكيف كانت استجابة المريض، وأي تغير سريري مهم", rsHint: "فكر تختار إعادة التقييم في الخطة القادمة.",
      dec: "الخطوة الجاية", dc_continue: "استمرار الخطة العلاجية الحالية", dc_modify: "تعديل الخطة العلاجية", dc_reassess: "إعادة تقييم الحالة", dc_discharge: "إنهاء العلاج",
      modHint: "عدّل الخطة في خطوة الخطة العلاجية اللي بعدها.", nextHint: "احجز الجلسة الجاية في خطوة الخطة العلاجية اللي بعدها.",
      lastPkg: "هذي آخر جلسة في الباقة. حدد وش يصير بعدها، الحالة ما تنقفل من نفسها.",
      why: "سبب إنهاء العلاج", whyPh: "مثال: تحققت الأهداف، يمشي 20 دقيقة والألم 2/10",
      recs: "توصيات أو تعليمات للجلسة القادمة", recsPh: "مثال: الانتقال لتمارين الوقوف، ومراجعة البرنامج المنزلي",
      sumToday: "اليوم", sumTx: "العلاج", sumNext: "الجاي", draftSave: "حفظ كمسودة", approve: "اعتماد ملاحظة الجلسة", draftOk: "انحفظت كمسودة. تقدر ترجع لها من زياراتي.",
      draftAt: "مسودة محفوظة {t}", approved: "ملاحظة الجلسة معتمدة", approvedBy: "اعتمدت {t} · {n}", approvedOk: "اعتمدت ملاحظة الجلسة.",
      lockNote: "ملاحظة الجلسة معتمدة، فهذي الخطوات مقفلة.", approveHint: "الجاي: تأكيد هوية المريض وموافقة المريض، وبعدها تنقفل الزيارة.",
      needPain: "اختر مستوى الألم اليوم.", needChange: "اختر التغير منذ الجلسة السابقة.", needExam: "اختر الفحص السريري اليوم.", needBrief: "اكتب وش فحصت.",
      needTx: "اختر علاج واحد على الأقل سويته.", needOther: "اكتب التدخل العلاجي الآخر.", needResp: "اختر استجابة المريض.", needNote: "اكتب ملاحظات الجلسة.",
      needDec: "اختر الخطوة الجاية.", needWhy: "اكتب سبب إنهاء العلاج.", needAll: "كمّل هذه الخطوات أول: {s}"
    }
  };
  const KEYS = ["fuInfo", "fuToday", "fuTx", "fuNext", "fuSign"];
  const ICONS = { fuInfo: I.info, fuToday: I.today, fuTx: I.tx, fuNext: I.next, fuSign: I.sign };
  const TX = ["exercise", "manual", "stretch", "balance", "gait", "edu", "other"];
  let ctx = null, lang = "en", st = null, forKey = null, editing = false, tried = false;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const nameOf = v => v && typeof v === "object" ? v[lang] || v.en : v || "";
  const clone = x => JSON.parse(JSON.stringify(x));
  const reset = () => { st = null; forKey = null; editing = false; tried = false; };
  const pvOf = o => o ? o.doctorVisit || o.physioVisit || {} : {};
  const stepsOf = o => pvOf(o).steps || {};
  const when = (s, opt) => s ? new Date(s).toLocaleString(ctx.loc(), opt || { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const band = n => n === 0 ? 0 : n <= 3 ? 1 : n <= 6 ? 2 : 3;

  // ---- The session chain: previous sessions of this patient, the first assessment and the package. ----
  const allPhysio = () => typeof MadaOrders === "undefined" ? [] : MadaOrders.all().filter(x => x.physioVisit && x.physioVisit.steps);
  const apptKey = o => `${(o.appointment || {}).date || ""} ${String((o.appointment || {}).minute || 0).padStart(4, "0")} ${o.createdAt || ""}`;
  function prevOf(o) {
    const list = allPhysio().filter(x => x.id !== o.id);
    if (o.fromPt && o.fromPt.visitId) { const p = list.find(x => x.id === o.fromPt.visitId); if (p) return p; }
    if (!o.mrn) return null;
    // Otherwise the patient's latest earlier physio visit that has an assessment or a session note.
    const mine = apptKey(o);
    return list.filter(x => x.mrn === o.mrn && apptKey(x) < mine && Object.keys(x.physioVisit.steps).some(k => /^(pt|fu)/.test(k)))
      .sort((a, b) => apptKey(b).localeCompare(apptKey(a)))[0] || null;
  }
  // The package this visit belongs to: a session booked inside a package (order.pkgSession), or a package bought with this visit (session 1).
  function pkgOf(o) {
    if (o.pkgSession) return o.pkgSession;
    const it = (o.items || []).map(i => typeof MadaPhysio !== "undefined" ? MadaPhysio.item(i.code) : null).find(p => p && p.pkg && p.sessions > 1);
    return it ? { orderId: o.id, code: it.code, n: 1, m: it.sessions } : null;
  }
  // { follow, prev, chain (earlier sessions, latest first), base (first assessment), n, m, pkg, latest(k) } for a visit.
  function info(o) {
    const chain = []; let p = prevOf(o), guard = 0;
    while (p && guard++ < 60) { chain.push(p); p = prevOf(p); }
    const pkg = pkgOf(o), base = chain.length ? chain[chain.length - 1] : null;
    const latest = (k, ok) => { for (const x of chain) { const s = x.physioVisit.steps[k]; if (s && (!ok || ok(s))) return { v: s, from: x }; } return null; };
    return { follow: !!chain.length, prev: chain[0] || null, chain, base, pkg, n: pkg ? pkg.n : chain.length + 1, m: pkg ? pkg.m : null, latest };
  }

  // ---- Building blocks (the same look as the assessment steps, physio-steps.css). ----
  const scale = (val, bad) => `<div class="pt-sc ${bad ? "bad" : ""}" role="group">${Array.from({ length: 11 }, (_, n) =>
    `<button type="button" class="pt-scb s${n} ${val === n ? "on" : ""}" data-fsc="pain" data-v="${n}" aria-pressed="${val === n}">${n}</button>`).join("")}</div>
    <div class="pt-scl"><span>${t().p0}</span><span>5</span><span>${t().p10}</span></div>`;
  const one = (key, val, opts, pre, bad) => `<div class="pt-chips ${bad ? "bad" : ""}">${opts.map(v => `<button type="button" class="pt-chip rd ${val === v ? "on" : ""}" data-fone="${key}" data-v="${v}" aria-pressed="${val === v}">${val === v ? S(I.check, 2.8) : ""}${E(t()[pre + v])}</button>`).join("")}</div>`;
  const fld = (label, req, body, sub) => `<div class="pt-f"><label>${label}${req ? ' <span class="req">*</span>' : ` <span class="hx-opt">${t().opt}</span>`}</label>${sub ? `<small class="pt-sub">${sub}</small>` : ""}${body}</div>`;
  const ta = (key, val, ph, bad, rows) => `<textarea class="hx-in pt-ta ${bad ? "bad" : ""}" data-fin="${key}" rows="${rows || 3}" maxlength="1500" dir="auto" placeholder="${E(ph || "")}">${E(val || "")}</textarea>`;
  const inp = (key, val, ph, bad, list) => `<input class="hx-in ${bad ? "bad" : ""}" data-fin="${key}" value="${E(val || "")}" placeholder="${E(ph || "")}" maxlength="200" dir="auto"${list ? ` list="${list}"` : ""}>`;
  const row = (l, v, wide) => `<div class="${wide ? "w" : ""}"><span>${l}</span><b dir="auto">${v ? E(v) : `<i class="fu-mt">${t().none}</i>`}</b></div>`;
  const rowH = (l, html, wide) => `<div class="${wide ? "w" : ""}"><span>${l}</span><b>${html || `<i class="fu-mt">${t().none}</i>`}</b></div>`;
  const hint = (ic, txt, cls) => `<p class="fu-hint ${cls || ""}">${S(ic, 2)}<span>${txt}</span></p>`;

  function load(o, k) {
    if (st && forKey === o.id + k) return;
    const sv = stepsOf(o)[k], dr = pvOf(o)[k + "Draft"];
    if (k === "fuToday") st = { pain: null, change: "", exam: "", examNote: "", ...clone(dr || sv || {}) };
    if (k === "fuTx") st = { done: [], items: {}, otherName: "", response: "", note: "", ...clone(dr || sv || {}) };
    if (k === "fuNext") st = { decision: "", why: "", recs: "", ...clone(dr || sv || {}) };
    if (k === "fuInfo" || k === "fuSign") st = {};
    delete st.at; delete st.by;
    forKey = o.id + k; editing = !sv;
  }
  const locked = o => !!stepsOf(o).fuSign || pvOf(o).status === "done";
  function problem(k) {
    if (k === "fuToday") return st.pain == null ? "needPain" : !st.change ? "needChange" : !st.exam ? "needExam" : st.exam === "brief" && !st.examNote.trim() ? "needBrief" : "";
    if (k === "fuTx") return !st.done.length ? "needTx" : st.done.includes("other") && !st.otherName.trim() ? "needOther" : !st.response ? "needResp" : !st.note.trim() ? "needNote" : "";
    if (k === "fuNext") return !st.decision ? "needDec" : st.decision === "discharge" && !st.why.trim() ? "needWhy" : "";
    return "";
  }
  const status = o => pvOf(o).status === "done" ? "done" : stepsOf(o).fuSign ? "approved" : pvOf(o).fuSignDraft ? "draft" : "ongoing";

  // ---- Session Overview ----
  function overview(o) {
    const F = info(o), s = st, A = PtSteps, sm = (k, v) => v ? A.sum(k, v, lang, ctx) : `<p class="pt-mt">${t().none}</p>`;
    const base = F.base ? F.base.physioVisit.steps : {}, pain = base.ptPain, ex0 = base.ptExam;
    const complaint = [ex0 && A.sumText("area", ex0, lang), pain && A.sumText("pain", pain, lang)].filter(Boolean).join(" · ");
    const lastEx = F.latest("ptExam"), goals = F.latest("ptGoals"), plan = F.latest("ptPlan"), hep = F.latest("ptHep", h => !h.none && (h.items || []).length);
    const pk = F.pkg && typeof MadaPhysio !== "undefined" ? MadaPhysio.item(F.pkg.code) : null, ap = o.appointment || {};
    const date = ap.date ? new Date(ap.date + "T00:00").toLocaleDateString(ctx.loc(), { weekday: "long", day: "numeric", month: "long" }) : "";
    const stt = status(o);
    const hepList = hep ? `<ol class="fu-hep">${hep.v.items.map(it => { const x = typeof MadaExercises !== "undefined" && MadaExercises.byCode[it.code];
      return `<li><b>${E(x ? nameOf(x.name) : it.code)}</b><small>${E(typeof MadaExercises !== "undefined" ? MadaExercises.dose(it, lang) : "")}</small></li>`; }).join("")}</ol>` : "";
    const hist = F.chain.map(x => { const sv = x.physioVisit.steps, fi = info(x), tdy = sv.fuToday, txs = sv.fuTx;
      return `<li><span class="fu-hn">${fi.follow ? E(fi.m ? tx("sesOf", { n: fi.n, m: fi.m }) : tx("sesN", { n: fi.n })) : t().initial}</span>
        <span class="fu-hb"><b>${E(((x.appointment || {}).date) ? new Date(x.appointment.date + "T00:00").toLocaleDateString(ctx.loc(), { day: "numeric", month: "short", year: "numeric" }) : "")}</b>
          <small>${[tdy ? tx("hPain", { n: tdy.pain }) + " · " + t()["ch_" + tdy.change] : sv.ptPain ? tx("hPain", { n: sv.ptPain.now }) : "", txs ? txs.done.map(d => d === "other" ? txs.otherName : t()["tx_" + d]).join(lang === "ar" ? "، " : ", ") : ""].filter(Boolean).map(E).join(" · ")}</small>
          ${txs && txs.note ? `<small class="fu-hnote" dir="auto">${E(txs.note)}</small>` : ""}</span></li>`; }).join("");
    return `<section class="nu-card open"><div class="nu-cb">
        <h3 class="fu-h">${S(I.info, 2)}${t().sesT}</h3>
        <div class="np-sum fu-ses">${row(t().sesNo, F.m ? tx("sesOf", { n: F.n, m: F.m }) : tx("sesN", { n: F.n }))}${row(t().sesDate, date)}${row(t().sesBy, nameOf(ap.nurse))}
          ${rowH(t().sesSt, `<span class="fu-st ${stt}">${t()["st_" + stt]}</span>`)}${pk ? row(t().pkgT, nameOf(pk.name) + " · " + pk.code, 1) : ""}</div>
        <h3 class="fu-h">${S(I.clock, 2)}${t().prevT}</h3><small class="pt-sub">${t().prevS}${F.base ? " · " + E(tx("firstAt", { d: when(F.base.physioVisit.startedAt || (F.base.appointment || {}).date, { day: "numeric", month: "short", year: "numeric" }) })) : ""}</small>
        <div class="np-sum">${row(t().complaint, complaint, 1)}</div>
        <div class="fu-sec"><b>${t().lastExam}</b>${sm("ptExam", lastEx && lastEx.v)}</div>
        <div class="fu-sec"><b>${t().goals}</b>${sm("ptGoals", goals && goals.v)}</div>
        <div class="fu-sec"><b>${t().plan}</b>${plan && plan.v.plan ? `<p class="fu-plan" dir="auto">${E(plan.v.plan)}</p>` : `<p class="pt-mt">${t().none}</p>`}</div>
        <div class="fu-sec"><b>${t().hep}</b>${hepList || `<p class="pt-mt">${t().none}</p>`}</div>
        <h3 class="fu-h">${S(I.draft, 2)}${tx("histT", { n: F.chain.length })}</h3>
        ${F.chain.length ? `<ol class="fu-hist">${hist}</ol>` : `<p class="pt-mt">${t().histNone}</p>`}
      </div></section>`;
  }

  // ---- Forms ----
  function form(o, k) {
    const b = c => tried && c, F = info(o);
    if (k === "fuToday") {
      const last = F.prev && (F.prev.physioVisit.steps.fuToday ? F.prev.physioVisit.steps.fuToday.pain : (F.prev.physioVisit.steps.ptPain || {}).now);
      return `${fld(t().pain, 1, scale(st.pain, b(st.pain == null)) + `<div class="fu-band">${st.pain != null ? `<span class="fu-bd b${band(st.pain)}">${t()["band_" + band(st.pain)]}</span>` : ""}${last != null ? `<small>${E(tx("lastPain", { n: last }))}</small>` : ""}</div>`)}
        ${fld(t().change, 1, one("change", st.change, ["better", "same", "worse"], "ch_", b(!st.change)))}
        ${fld(t().exam, 1, one("exam", st.exam, ["brief", "detailed", "none"], "ex_", b(!st.exam)))}
        ${st.exam === "brief" ? fld(t().exBriefL, 1, ta("examNote", st.examNote, t().exBriefPh, b(!st.examNote.trim()), 2)) : ""}
        ${st.exam === "detailed" ? hint(I.info2, t().exDetHint) : ""}`;
    }
    if (k === "fuTx") {
      const names = typeof MadaExercises !== "undefined" ? MadaExercises.LIST.map(x => nameOf(x.name)) : [];
      const det = ty => { const rows = st.items[ty] || [];
        return `<div class="fu-tx"><b>${S(I.check, 2.6)}${ty === "other" ? "" : t()["tx_" + ty]}${ty === "other" ? inp("otherName", st.otherName, t().otherPh, b(!st.otherName.trim())) : ""}</b>
          ${rows.map((r, i) => `<div class="fu-det"><label><span>${t().detName}</span>${inp(`items.${ty}.${i}.name`, r.name, t().detNamePh, false, "fuExList")}</label>
            <label class="fu-dose"><span>${t().detDose}</span>${inp(`items.${ty}.${i}.dose`, r.dose, t().detDosePh)}</label>
            <label><span>${t().detNote}</span>${inp(`items.${ty}.${i}.note`, r.note, "")}</label>
            <button type="button" class="pt-del" data-fdel="${ty}.${i}" aria-label="${t().cancel}">${S(I.trash, 2)}</button></div>`).join("")}
          <button type="button" class="pt-add" data-fadd="${ty}">${S(I.plus, 2.4)}${t().addDet}</button></div>`; };
      return `${fld(t().txQ, 1, `<div class="pt-chips ${b(!st.done.length) ? "bad" : ""}">${TX.map(v => { const on = st.done.includes(v);
          return `<button type="button" class="pt-chip ${on ? "on" : ""}" data-ftx="${v}" aria-pressed="${on}">${on ? S(I.check, 2.8) : ""}${E(t()["tx_" + v])}</button>`; }).join("")}</div>`)}
        ${st.done.length ? `<div class="fu-txs">${TX.filter(v => st.done.includes(v)).map(det).join("")}</div>` : ""}
        <datalist id="fuExList">${names.map(n => `<option value="${E(n)}">`).join("")}</datalist>
        ${fld(t().resp, 1, one("response", st.response, ["ok", "modified", "reassess"], "rs_", b(!st.response)))}
        ${st.response === "reassess" ? hint(I.warn, t().rsHint, "warn") : ""}
        ${fld(t().note, 1, ta("note", st.note, t().notePh, b(!st.note.trim()), 4))}`;
    }
    if (k === "fuNext") {
      const last = F.m && F.n >= F.m;
      return `${last ? hint(I.warn, t().lastPkg, "warn") : ""}
        ${fld(t().dec, 1, one("decision", st.decision, ["continue", "modify", "reassess", "discharge"], "dc_", b(!st.decision)))}
        ${st.decision === "discharge" ? fld(t().why, 1, ta("why", st.why, t().whyPh, b(!st.why.trim()), 2)) : st.decision === "modify" ? hint(I.info2, t().modHint) : st.decision ? hint(I.info2, t().nextHint) : ""}
        ${fld(t().recs, 0, ta("recs", st.recs, t().recsPh, false, 3))}`;
    }
    return "";
  }
  function summary(o, k, sv) {
    const J = a => a.filter(Boolean).join(lang === "ar" ? "، " : ", ");
    if (k === "fuToday") return `<div class="np-sum">${row(t().pain, `${sv.pain}/10 · ${t()["band_" + band(sv.pain)]}`)}${row(t().change, t()["ch_" + sv.change])}
      ${row(t().exam, t()["ex_" + sv.exam])}${sv.exam === "brief" ? row(t().exBriefL, sv.examNote, 1) : ""}</div>`;
    if (k === "fuTx") return `<div class="np-sum">${rowH(t().txQ, `<ul class="fu-txl">${sv.done.map(d => { const rows = (sv.items[d] || []).filter(r => r.name || r.dose || r.note);
        return `<li><b>${E(d === "other" ? sv.otherName : t()["tx_" + d])}</b>${rows.map(r => `<small dir="auto">${E(J([r.name, r.dose, r.note]).replace(/, /g, " · "))}</small>`).join("")}</li>`; }).join("")}</ul>`, 1)}
      ${row(t().resp, t()["rs_" + sv.response], 1)}${row(t().note, sv.note, 1)}</div>`;
    if (k === "fuNext") return `<div class="np-sum">${row(t().dec, t()["dc_" + sv.decision], 1)}${sv.decision === "discharge" ? row(t().why, sv.why, 1) : ""}${sv.recs ? row(t().recs, sv.recs, 1) : ""}</div>`;
    return "";
  }
  function signCard(o) {
    const s = stepsOf(o), miss = ["fuToday", "fuTx", "fuNext"].filter(k => !s[k]), sv = s.fuSign, dr = pvOf(o).fuSignDraft;
    const part = (k, h) => s[k] ? `<div class="fu-sg"><h3 class="fu-h">${S(ICONS[k], 2)}${h}</h3>${summary(o, k, s[k])}</div>` : "";
    return `<section class="nu-card ${sv ? "" : "open"}">${sv ? `<div class="nu-ch"><span class="nu-n0 done">${S(I.check, 2.6)}</span><div><b>${t().approved}</b><small>${E(tx("approvedBy", { t: when(sv.at), n: nameOf(sv.by) }))}</small></div></div>` : ""}
      <div class="nu-cb">${miss.length ? hint(I.warn, tx("needAll", { s: miss.map(k => t()[k]).join(lang === "ar" ? "، " : ", ") }), "warn") : ""}
        ${part("fuToday", t().sumToday)}${part("fuTx", t().sumTx)}${part("fuNext", t().sumNext)}
        ${sv ? hint(I.info2, t().approveHint) : `${dr ? hint(I.draft, tx("draftAt", { t: when(dr.at) })) : ""}<div class="fu-acts"><button type="button" class="hx-btn soft" id="fuDraft">${S(I.draft, 2)}${t().draftSave}</button>
          <button type="button" class="hx-btn dark" id="fuApprove" ${miss.length ? "disabled" : ""}>${S(I.check, 2.4)}${t().approve}</button></div>`}</div></section>`;
  }
  function view(o, c, k) {
    ctx = c; lang = c.lang; load(o, k);
    const sv = stepsOf(o)[k], lock = locked(o);
    let card;
    if (k === "fuInfo") card = overview(o);
    else if (k === "fuSign") card = signCard(o);
    else card = editing && !lock
      ? `<section class="nu-card open"><div class="nu-cb">${form(o, k)}${sv ? `<div class="nu-acts"><button type="button" class="hx-btn out" id="fuCancel">${S(I.x, 2.2)}${t().cancel}</button></div>` : ""}</div></section>`
      : sv ? `<section class="nu-card"><div class="nu-ch"><span class="nu-n0 done">${S(I.check, 2.6)}</span><div><b>${t()[k]}</b><small>${E(tx("savedAt", { t: when(sv.at), n: nameOf(sv.by) }))}</small></div>
          ${lock ? "" : `<button type="button" class="hx-btn out sm" id="fuEdit">${S(I.pen)}${t().edit}</button>`}</div><div class="nu-cb">${lock && stepsOf(o).fuSign ? hint(I.info2, t().lockNote) : ""}${summary(o, k, sv)}</div></section>` : "";
    const showCont = k !== "fuSign" || stepsOf(o).fuSign;
    return `<div class="nu np ptx fu">
      <div class="ex-top"><span class="ex-tic">${S(ICONS[k])}</span><div><h1>${t()[k]}</h1><p>${t()[k + "S"]}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>
      ${card}
      <div class="ex-foot"><button type="button" class="hx-btn out pl-prevb" id="fuPrev"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${E(c.prevName || "")}</small></span></button><span class="hx-sp"></span>
        ${showCont ? `<button type="button" class="hx-btn dark" id="fuCont">${editing && !lock && k !== "fuInfo" && k !== "fuSign" ? t().cont : t().next}${S(I.arrow)}</button>` : ""}</div>
    </div>`;
  }
  function setPath(path, v) { const p = path.split("."); let x = st; while (p.length > 1) x = x[p.shift()]; x[p[0]] = v; }
  function bind(root, o, c, k) {
    ctx = c;
    const $ = s => root.querySelector(s), all = (s, f) => root.querySelectorAll(s).forEach(f), re = () => ctx.rerender();
    // Keep what was typed when the page redraws for a chip (kept on the visit as a draft, so nothing is lost if the physiotherapist leaves).
    const keep = () => { try { ctx.saveDraft(k, st); } catch (e) {} };
    all("[data-fsc]", el => el.addEventListener("click", () => { st.pain = Number(el.dataset.v); keep(); re(); }));
    all("[data-fone]", el => el.addEventListener("click", () => { st[el.dataset.fone] = el.dataset.v; keep(); re(); }));
    all("[data-fin]", el => { el.addEventListener("input", () => { setPath(el.dataset.fin, el.value); el.classList.remove("bad"); }); el.addEventListener("change", keep); });
    all("[data-ftx]", el => el.addEventListener("click", () => { const v = el.dataset.ftx, i = st.done.indexOf(v); if (i >= 0) st.done.splice(i, 1); else st.done.push(v); keep(); re(); }));
    all("[data-fadd]", el => el.addEventListener("click", () => { const ty = el.dataset.fadd; (st.items[ty] = st.items[ty] || []).push({ name: "", dose: "", note: "" }); re(); }));
    all("[data-fdel]", el => el.addEventListener("click", () => { const [ty, i] = el.dataset.fdel.split("."); st.items[ty].splice(+i, 1); keep(); re(); }));
    if ($("#fuEdit")) $("#fuEdit").addEventListener("click", () => { editing = true; re(); });
    if ($("#fuCancel")) $("#fuCancel").addEventListener("click", () => { try { ctx.saveDraft(k, null); } catch (e) {} reset(); re(); });
    $("#fuPrev").addEventListener("click", () => { reset(); ctx.go(ctx.prevKey); });
    if ($("#fuDraft")) $("#fuDraft").addEventListener("click", () => { try { ctx.saveDraft("fuSign", {}); } catch (e) { return ctx.toast(e.message || t().storeErr); } ctx.toast(t().draftOk); re(); });
    if ($("#fuApprove")) $("#fuApprove").addEventListener("click", () => {
      try { ctx.save("fuSign", { approved: true }); } catch (e) { return ctx.toast(e.message || t().storeErr); }
      ctx.toast(t().approvedOk); reset(); re();
    });
    if ($("#fuCont")) $("#fuCont").addEventListener("click", () => {
      if (k === "fuInfo" && !stepsOf(o).fuInfo) {
        const F = info(o);
        try { ctx.save("fuInfo", { seen: true }); ctx.link({ prevId: F.prev && F.prev.id, baseId: F.base && F.base.id, n: F.n, m: F.m, pkg: F.pkg }); } catch (e) { return ctx.toast(e.message || t().storeErr); }
      } else if (editing && !locked(o) && k !== "fuInfo" && k !== "fuSign") {
        const p = problem(k); if (p) { tried = true; re(); return ctx.toast(t()[p]); }
        const d = clone(st);
        if (k === "fuToday" && d.exam !== "brief") d.examNote = "";
        if (k === "fuTx") { d.items = Object.fromEntries(d.done.map(ty => [ty, (d.items[ty] || []).filter(r => (r.name || r.dose || r.note || "").trim())])); if (!d.done.includes("other")) d.otherName = ""; }
        if (k === "fuNext" && d.decision !== "discharge") d.why = "";
        try { ctx.save(k, d); } catch (e) { return ctx.toast(e.message || t().storeErr); }
        ctx.toast(t().saved);
      }
      reset(); ctx.go(ctx.nextKey);
    });
  }
  return { view, bind, reset, info, L, KEYS, ICONS };
})();
