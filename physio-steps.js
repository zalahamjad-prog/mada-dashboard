// The physiotherapy steps of a physio visit (physio-visit.html), saved in order.physioVisit.steps[key]:
//   ptPain    (Pain Assessment):       { now, low, high (0–10; low/high optional), period: "24h" | "week" | "month" | "other", periodOther,
//                                        nature: [..], natureOther, pattern: "constant" | "intermittent" | "activity", worse: [..], worseOther, ease: [..], easeOther }
//   ptHistory (History & Risk Factors): { chronic: [..] or ["none"], chronicNote, surg: [{ type, date, side }], meds: [{ name }], medsNone, medsOk,
//                                        allergy: "none" | "yes", allergies: [{ sub, react }], reports, symptoms: [..], symptomsNote,
//                                        red: "none" | "yes", redNote, redAction: "continue" | "referred" | "stopped", level, work, daily }
//                                        Starts from the last physio visit of the same patient file, so nothing is asked twice.
//   ptFunc    (Functional Limitations): { none, acts: { walk: { lvl, ex }, .. } }, lvl: "mild" | "moderate" | "help" | "unable"
// Everything is tap-first: chips and 0–10 buttons, with a free-text box only where "Other" is picked.
const PtSteps = (() => {
  const I = {
    pain: '<path d="M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M9 10h.01M15 10h.01M9 16c1.5-1.3 4.5-1.3 6 0"/>',
    hist: '<path d="M12 8v4l3 2"/><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4h4"/>',
    func: '<circle cx="13" cy="4" r="2"/><path d="m9 20 3-6 3 3v4M6 12l3-4 4 1 3 3M12 14l-2-3"/>',
    check: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', warn: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>'
  };
  const L = {
    en: {
      stepOf: "Step {n} of {m}", prev: "Previous", cont: "Save & Continue", next: "Continue", edit: "Edit", cancel: "Cancel", opt: "(Optional)", other: "Other",
      otherPh: "Write it here", savedAt: "Saved {t} · {n}", saved: "Saved.", storeErr: "Couldn't save. Try again.", add: "Add", remove: "Remove", none: "None", yes: "Yes", no: "No",
      ptPain: "Pain Assessment", ptPainS: "Tap the pain scores, then what the pain is like and what changes it.",
      pNow: "Current pain", pLow: "Lowest pain in the period", pHigh: "Highest pain in the period", p0: "0 No pain", p10: "10 Worst pain",
      period: "Reference period", periodS: "Recorded so the next visit compares the same period.", per_24h: "Last 24 hours", per_week: "Last week", per_month: "Last month",
      nature: "Nature of pain", nat_ache: "Aching / constant ache", nat_sharp: "Sharp / stabbing", nat_burn: "Burning", nat_rad: "Spreads to another area",
      natOtherPh: "Other type, or the patient's own words",
      pattern: "Pain pattern", pat_constant: "Constant", pat_intermittent: "Intermittent", pat_activity: "With activity or movement",
      worse: "What makes it worse?", ease: "What eases it?",
      w_walk: "Walking", w_sit: "Sitting", w_stand: "Standing", w_bend: "Bending", w_sleep: "Sleeping",
      e_rest: "Rest", e_move: "A certain movement", e_meds: "Medicines", e_pos: "Changing position",
      sumT: "Pain summary", sumL: "Current: {a}/10 · Lowest: {b}/10 · Highest: {c}/10",
      needNow: "Tap the current pain score.", needPeriod: "Choose the reference period.", needPattern: "Choose the pain pattern.", needRange: "The lowest pain can't be above the highest.", needOther: "Write the other answer.",
      ptHistory: "Medical History & Risk Factors", ptHistoryS: "Review what is on file and update only what changed.",
      fromLast: "Filled from the last physiotherapy visit on {d}. Review it with the patient and update what changed.",
      chronic: "Chronic conditions", c_dm: "Diabetes", c_htn: "High blood pressure", c_heart: "Heart disease", c_lung: "Asthma / lung disease", c_osteo: "Osteoporosis",
      c_arth: "Arthritis", c_stroke: "Stroke", c_kidney: "Kidney disease", c_thyroid: "Thyroid disease", chronicNotePh: "Details, if needed",
      surg: "Previous surgeries and injuries", surgType: "Type", surgTypePh: "e.g. Knee replacement", surgDate: "Date", surgSide: "Side", sd_r: "Right", sd_l: "Left", sd_b: "Both", sd_na: "N/A", noSurg: "No surgeries or injuries added.",
      meds: "Current medicines", medsNone: "No current medicines", medPh: "Medicine name", medsOk: "Reviewed the medicine list with the patient",
      allergy: "Allergies", alNone: "No known allergies", al_none: "No known allergies", al_yes: "Has allergies", alSub: "Substance", alReact: "Reaction",
      reports: "Previous reports and tests", reportsPh: "Report, date and source (e.g. Knee MRI · Mar 2026 · King Fahad Hospital)",
      symptoms: "Associated symptoms", s_numb: "Numbness", s_ting: "Tingling", s_weak: "Weakness", s_swell: "Swelling", s_stiff: "Stiffness", s_dizzy: "Dizziness", s_head: "Headache",
      red: "Red flags", redS: "Result of the red-flag review and the action taken.", redNone: "No red flags", redYes: "Red flag found", red_none: "No red flags", red_yes: "Red flag found", redNotePh: "What was found",
      redAction: "Action taken", ra_continue: "Session continued", ra_referred: "Referred to the doctor", ra_stopped: "Session stopped",
      fnHist: "Functional history", level: "Previous activity level", lv_indep: "Independent", lv_some: "Needed some help", lv_dep: "Dependent",
      work: "Work", workPh: "Job or daily work", daily: "Daily needs", dailyPh: "What the patient needs to do every day",
      needChronic: "Choose the chronic conditions, or None.", needMeds: "Add the current medicines, or choose No current medicines.", needMedsOk: "Confirm you reviewed the medicine list.",
      needAllergy: "Choose the allergy status.", needAlRows: "Write each allergy's substance.", needRed: "Choose the red-flag result.", needRedNote: "Write what was found and choose the action.", needSurg: "Write the type of each surgery or injury.",
      ptFunc: "Functional Limitations", ptFuncS: "Tap each affected activity, then how hard it is.",
      fnQ: "Which activities are affected?", fnNone: "No functional limitations",
      a_walk: "Walking", a_stairs: "Climbing stairs", a_sit: "Sitting", a_stand: "Standing", a_sleep: "Sleeping", a_dress: "Bathing and dressing",
      a_work: "Work", a_lift: "Lifting things", a_balance: "Balance", a_sport: "Sports",
      lvl_mild: "Mild difficulty", lvl_moderate: "Moderate difficulty", lvl_help: "Needs help", lvl_unable: "Unable", exPh: "Example from the patient (optional)",
      needFn: "Tap the affected activities, or No functional limitations.", needLvl: "Choose how hard each activity is."
    },
    ar: {
      stepOf: "الخطوة {n} من {m}", prev: "السابق", cont: "حفظ ومتابعة", next: "متابعة", edit: "تعديل", cancel: "إلغاء", opt: "(اختياري)", other: "أخرى",
      otherPh: "اكتبها هنا", savedAt: "انحفظت {t} · {n}", saved: "انحفظ.", storeErr: "ما قدرنا نحفظ. حاول مرة ثانية.", add: "إضافة", remove: "حذف", none: "لا يوجد", yes: "نعم", no: "لا",
      ptPain: "تقييم الألم", ptPainS: "اضغط درجات الألم، بعدها طبيعة الألم ووش اللي يغيّره.",
      pNow: "شدة الألم الحالية", pLow: "أقل شدة للألم خلال الفترة", pHigh: "أعلى شدة للألم خلال الفترة", p0: "0 لا يوجد", p10: "10 أقصى ألم",
      period: "الفترة المرجعية", periodS: "تنحفظ عشان المقارنة في الزيارة الجاية تكون لنفس الفترة.", per_24h: "آخر 24 ساعة", per_week: "الأسبوع الماضي", per_month: "الشهر الماضي",
      nature: "طبيعة الألم", nat_ache: "وجع أو ألم مستمر", nat_sharp: "حاد أو طاعن", nat_burn: "حارق", nat_rad: "يمتد إلى منطقة أخرى",
      natOtherPh: "نوع آخر أو وصف المريض",
      pattern: "نمط الألم", pat_constant: "مستمر", pat_intermittent: "متقطع", pat_activity: "مرتبط بالنشاط أو الحركة",
      worse: "وش اللي يزيد الأعراض؟", ease: "وش اللي يخفف الأعراض؟",
      w_walk: "المشي", w_sit: "الجلوس", w_stand: "الوقوف", w_bend: "الانحناء", w_sleep: "النوم",
      e_rest: "الراحة", e_move: "حركة معينة", e_meds: "الأدوية", e_pos: "تغيير الوضعية",
      sumT: "ملخص الألم", sumL: "الحالي: {a}/10 · الأقل: {b}/10 · الأعلى: {c}/10",
      needNow: "اضغط درجة الألم الحالية.", needPeriod: "اختر الفترة المرجعية.", needPattern: "اختر نمط الألم.", needRange: "أقل شدة ما تكون أعلى من أعلى شدة.", needOther: "اكتب الإجابة الأخرى.",
      ptHistory: "التاريخ المرضي وعوامل الخطورة", ptHistoryS: "راجع اللي في الملف وحدّث بس اللي تغيّر.",
      fromLast: "تعبّت من آخر زيارة علاج طبيعي بتاريخ {d}. راجعها مع المريض وحدّث اللي تغيّر.",
      chronic: "الأمراض المزمنة", c_dm: "السكري", c_htn: "ارتفاع ضغط الدم", c_heart: "أمراض القلب", c_lung: "الربو أو أمراض الرئة", c_osteo: "هشاشة العظام",
      c_arth: "التهاب المفاصل", c_stroke: "جلطة دماغية", c_kidney: "أمراض الكلى", c_thyroid: "أمراض الغدة الدرقية", chronicNotePh: "تفاصيل عند الحاجة",
      surg: "العمليات والإصابات السابقة", surgType: "النوع", surgTypePh: "مثال: تغيير مفصل الركبة", surgDate: "التاريخ", surgSide: "الجهة", sd_r: "يمين", sd_l: "يسار", sd_b: "الجهتين", sd_na: "لا ينطبق", noSurg: "ما فيه عمليات أو إصابات مضافة.",
      meds: "الأدوية الحالية", medsNone: "ما يستخدم أدوية حالياً", medPh: "اسم الدواء", medsOk: "راجعت قائمة الأدوية مع المريض",
      allergy: "الحساسية", alNone: "ما عنده حساسية معروفة", al_none: "ما عنده حساسية معروفة", al_yes: "عنده حساسية", alSub: "المادة", alReact: "رد الفعل",
      reports: "التقارير والفحوصات السابقة", reportsPh: "التقرير وتاريخه ومصدره (مثال: رنين الركبة · مارس 2026 · مستشفى الملك فهد)",
      symptoms: "الأعراض المصاحبة", s_numb: "تنميل", s_ting: "وخز", s_weak: "ضعف", s_swell: "تورم", s_stiff: "تيبس", s_dizzy: "دوخة", s_head: "صداع",
      red: "علامات الخطر", redS: "نتيجة مراجعة علامات الخطر والإجراء المتخذ.", redNone: "ما فيه علامات خطر", redYes: "فيه علامة خطر", red_none: "ما فيه علامات خطر", red_yes: "فيه علامة خطر", redNotePh: "وش اللي لقيته",
      redAction: "الإجراء المتخذ", ra_continue: "استمرت الجلسة", ra_referred: "تحويل للطبيب", ra_stopped: "إيقاف الجلسة",
      fnHist: "التاريخ الوظيفي", level: "مستوى النشاط السابق", lv_indep: "مستقل", lv_some: "يحتاج مساعدة بسيطة", lv_dep: "معتمد على غيره",
      work: "العمل", workPh: "الوظيفة أو العمل اليومي", daily: "الاحتياجات اليومية", dailyPh: "وش يحتاج المريض يسويه كل يوم",
      needChronic: "اختر الأمراض المزمنة، أو لا يوجد.", needMeds: "أضف الأدوية الحالية، أو اختر ما يستخدم أدوية.", needMedsOk: "أكّد إنك راجعت قائمة الأدوية.",
      needAllergy: "اختر حالة الحساسية.", needAlRows: "اكتب المادة لكل حساسية.", needRed: "اختر نتيجة علامات الخطر.", needRedNote: "اكتب وش لقيت واختر الإجراء.", needSurg: "اكتب نوع كل عملية أو إصابة.",
      ptFunc: "القيود الوظيفية", ptFuncS: "اضغط كل نشاط متأثر، بعدها مستوى الصعوبة.",
      fnQ: "وش الأنشطة اللي تأثرت؟", fnNone: "ما فيه قيود وظيفية",
      a_walk: "المشي", a_stairs: "صعود الدرج", a_sit: "الجلوس", a_stand: "الوقوف", a_sleep: "النوم", a_dress: "الاستحمام وارتداء الملابس",
      a_work: "العمل", a_lift: "رفع الأشياء", a_balance: "التوازن", a_sport: "الأنشطة الرياضية",
      lvl_mild: "صعوبة بسيطة", lvl_moderate: "صعوبة متوسطة", lvl_help: "يحتاج مساعدة", lvl_unable: "ما يقدر", exPh: "مثال يذكره المريض (اختياري)",
      needFn: "اضغط الأنشطة المتأثرة، أو ما فيه قيود وظيفية.", needLvl: "اختر مستوى الصعوبة لكل نشاط."
    }
  };
  const PERIODS = ["24h", "week", "month", "other"], NATURE = ["ache", "sharp", "burn", "rad"], PATTERN = ["constant", "intermittent", "activity"];
  const WORSE = ["walk", "sit", "stand", "bend", "sleep"], EASE = ["rest", "move", "meds", "pos"];
  const CHRONIC = ["dm", "htn", "heart", "lung", "osteo", "arth", "stroke", "kidney", "thyroid"], SYMPTOMS = ["numb", "ting", "weak", "swell", "stiff", "dizzy", "head"];
  const SIDES = ["r", "l", "b", "na"], ACTS = ["walk", "stairs", "sit", "stand", "sleep", "dress", "work", "lift", "balance", "sport"], LVLS = ["mild", "moderate", "help", "unable"];
  const HEAD = { ptPain: I.pain, ptHistory: I.hist, ptFunc: I.func };
  let ctx = null, lang = "en", st = null, forKey = null, editing = false, tried = false, fromLast = null;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const reset = () => { st = null; forKey = null; editing = false; tried = false; fromLast = null; };
  const nameOf = v => v && typeof v === "object" ? v[lang] || v.en : v || "";
  const savedOf = (o, k) => ((o.doctorVisit || {}).steps || {})[k];
  const clone = x => JSON.parse(JSON.stringify(x));
  // The last physio visit of this patient file with a saved history (to start from it).
  function lastHistory(o) {
    if (!o.mrn || typeof MadaOrders === "undefined") return null;
    return MadaOrders.all().filter(x => x.id !== o.id && x.mrn === o.mrn && x.physioVisit && x.physioVisit.steps && x.physioVisit.steps.ptHistory)
      .map(x => x.physioVisit.steps.ptHistory).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0] || null;
  }
  function load(o, k) {
    if (st && forKey === o.id + k) return;
    const sv = savedOf(o, k);
    if (k === "ptPain") st = { now: null, low: null, high: null, period: "", periodOther: "", nature: [], natureOther: "", pattern: "", worse: [], worseOther: "", ease: [], easeOther: "", ...clone(sv || {}) };
    if (k === "ptHistory") {
      const last = sv ? null : lastHistory(o); fromLast = last && last.at;
      const base = sv || last || {};
      st = { chronic: [], chronicNote: "", surg: [], meds: [], medsNone: false, medsOk: false, allergy: "", allergies: [], reports: "", symptoms: [], symptomsNote: "",
        red: "", redNote: "", redAction: "", level: "", work: "", daily: "", ...clone(base) };
      // What only applies to today's visit is asked again: the medicine review and the red-flag check.
      if (!sv) { st.medsOk = false; st.red = ""; st.redNote = ""; st.redAction = ""; }
    }
    if (k === "ptFunc") st = { none: false, acts: {}, ...clone(sv || {}) };
    delete st.at; delete st.by;
    forKey = o.id + k; editing = !sv;
  }
  // Building blocks: 0–10 scale, single-choice chips, multi-choice chips, inputs.
  const scale = (key, val, bad) => `<div class="pt-sc ${bad ? "bad" : ""}" role="group">${Array.from({ length: 11 }, (_, n) =>
    `<button type="button" class="pt-scb s${n} ${val === n ? "on" : ""}" data-sc="${key}" data-v="${n}" aria-pressed="${val === n}">${n}</button>`).join("")}</div>
    <div class="pt-scl"><span>${t().p0}</span><span>5</span><span>${t().p10}</span></div>`;
  const one = (key, val, opts, pre, bad) => `<div class="pt-chips ${bad ? "bad" : ""}">${opts.map(v => `<button type="button" class="pt-chip rd ${val === v ? "on" : ""}" data-one="${key}" data-v="${v}" aria-pressed="${val === v}">${val === v ? S(I.check, 2.8) : ""}${E(v === "other" ? t().other : t()[pre + v])}</button>`).join("")}</div>`;
  const many = (key, arr, opts, pre, bad, noneKey) => `<div class="pt-chips ${bad ? "bad" : ""}">${opts.map(v => { const on = arr.includes(v);
    return `<button type="button" class="pt-chip ${on ? "on" : ""} ${v === "none" ? "nn" : ""}" data-many="${key}" data-v="${v}" aria-pressed="${on}">${on ? S(I.check, 2.8) : ""}${E(v === "other" ? t().other : v === "none" ? t()[noneKey || "none"] : t()[pre + v])}</button>`; }).join("")}</div>`;
  const inp = (key, val, ph, bad, cls) => `<input class="hx-in ${cls || ""} ${bad ? "bad" : ""}" data-in="${key}" value="${E(val || "")}" placeholder="${E(ph || "")}" maxlength="200" dir="auto">`;
  const fld = (label, req, inner, sub) => `<div class="pt-f"><label>${label} ${req ? '<span class="req">*</span>' : `<span class="hx-opt">${t().opt}</span>`}</label>${sub ? `<small class="pt-sub">${sub}</small>` : ""}${inner}</div>`;
  const sec = (title, inner) => `<div class="pt-sec"><h3>${title}</h3>${inner}</div>`;
  const needOther = (arr, txt) => arr.includes("other") && !String(txt || "").trim();
  function invalid(k) {
    if (k === "ptPain") return st.now === null ? "needNow" : st.low !== null && st.high !== null && st.low > st.high ? "needRange" : !st.period ? "needPeriod"
      : st.period === "other" && !st.periodOther.trim() ? "needOther" : !st.pattern ? "needPattern"
      : needOther(st.nature, st.natureOther) || needOther(st.worse, st.worseOther) || needOther(st.ease, st.easeOther) ? "needOther" : "";
    if (k === "ptHistory") return !st.chronic.length ? "needChronic" : st.surg.some(r => !r.type.trim()) ? "needSurg" : !st.medsNone && !st.meds.some(r => r.name.trim()) ? "needMeds"
      : !st.medsNone && !st.medsOk ? "needMedsOk" : !st.allergy ? "needAllergy" : st.allergy === "yes" && (!st.allergies.length || st.allergies.some(r => !r.sub.trim())) ? "needAlRows"
      : !st.red ? "needRed" : st.red === "yes" && (!st.redNote.trim() || !st.redAction) ? "needRedNote" : "";
    if (k === "ptFunc") { const keys = Object.keys(st.acts); return !st.none && !keys.length ? "needFn" : keys.some(a => !st.acts[a].lvl) ? "needLvl" : ""; }
    return "";
  }
  function painSum(d) { return tx("sumL", { a: d.now ?? "—", b: d.low ?? "—", c: d.high ?? "—" }); }
  function form(o, k) {
    const b = c => tried && c;
    if (k === "ptPain") return `
      ${fld(t().pNow, 1, scale("now", st.now, b(st.now === null)))}
      <div class="pt-two">${fld(t().pLow, 0, scale("low", st.low, b(st.low !== null && st.high !== null && st.low > st.high)))}${fld(t().pHigh, 0, scale("high", st.high, false))}</div>
      ${fld(t().period, 1, one("period", st.period, PERIODS, "per_", b(!st.period)) + (st.period === "other" ? inp("periodOther", st.periodOther, t().otherPh, b(!st.periodOther.trim())) : ""), t().periodS)}
      ${fld(t().nature, 0, many("nature", st.nature, [...NATURE, "other"], "nat_") + (st.nature.includes("other") ? inp("natureOther", st.natureOther, t().natOtherPh, b(!st.natureOther.trim())) : ""))}
      ${fld(t().pattern, 1, one("pattern", st.pattern, PATTERN, "pat_", b(!st.pattern)))}
      <div class="pt-two">${fld(t().worse, 0, many("worse", st.worse, [...WORSE, "other"], "w_") + (st.worse.includes("other") ? inp("worseOther", st.worseOther, t().otherPh, b(!st.worseOther.trim())) : ""))}
        ${fld(t().ease, 0, many("ease", st.ease, [...EASE, "other"], "e_") + (st.ease.includes("other") ? inp("easeOther", st.easeOther, t().otherPh, b(!st.easeOther.trim())) : ""))}</div>
      <div class="pt-psum">${S(I.pain, 2)}<span><b>${t().sumT}</b>${E(painSum(st))}</span></div>`;
    if (k === "ptHistory") {
      const rows = (list, cols, empty) => `${list.length ? `<div class="pt-rows">${list.map((r, i) => `<div class="pt-row">${cols(r, i)}<button type="button" class="pt-del" data-del="${list === st.surg ? "surg" : list === st.meds ? "meds" : "allergies"}" data-i="${i}" aria-label="${t().remove}">${S(I.x, 2.2)}</button></div>`).join("")}</div>` : empty ? `<p class="pt-mt">${empty}</p>` : ""}`;
      const addBtn = key => `<button type="button" class="pt-add" data-add="${key}">${S(I.plus, 2.4)}${t().add}</button>`;
      return `${fromLast ? `<div class="pt-last">${S(I.info, 2)}<span>${E(tx("fromLast", { d: new Date(fromLast).toLocaleDateString(ctx.loc(), { day: "numeric", month: "short", year: "numeric" }) }))}</span></div>` : ""}
      ${sec(t().chronic, `${many("chronic", st.chronic, [...CHRONIC, "none"], "c_", b(!st.chronic.length))}${st.chronic.length && !st.chronic.includes("none") ? inp("chronicNote", st.chronicNote, t().chronicNotePh) : ""}`)}
      ${sec(t().surg, rows(st.surg, (r, i) => `${inp(`surg.${i}.type`, r.type, t().surgTypePh, b(!r.type.trim()), "grow")}<input class="hx-in pt-mon" type="month" dir="ltr" data-in="surg.${i}.date" value="${E(r.date || "")}" aria-label="${t().surgDate}">
        <select class="hx-in pt-side" data-in="surg.${i}.side" aria-label="${t().surgSide}"><option value="">${t().surgSide}</option>${SIDES.map(s => `<option value="${s}" ${r.side === s ? "selected" : ""}>${t()["sd_" + s]}</option>`).join("")}</select>`, t().noSurg) + addBtn("surg"))}
      ${sec(t().meds, `${many("medsNone", st.medsNone ? ["none"] : [], ["none"], "", b(!st.medsNone && !st.meds.some(r => r.name.trim())), "medsNone")}
        ${st.medsNone ? "" : rows(st.meds, (r, i) => inp(`meds.${i}.name`, r.name, t().medPh, b(!r.name.trim()), "grow")) + addBtn("meds") +
          `<label class="pt-ok ${b(!st.medsOk) ? "bad" : ""}"><input type="checkbox" data-chk="medsOk" ${st.medsOk ? "checked" : ""}><span>${t().medsOk}</span></label>`}`)}
      ${sec(t().allergy, `${one("allergy", st.allergy, ["none", "yes"], "al_", b(!st.allergy))}
        ${st.allergy === "yes" ? rows(st.allergies, (r, i) => `${inp(`allergies.${i}.sub`, r.sub, t().alSub, b(!r.sub.trim()), "grow")}${inp(`allergies.${i}.react`, r.react, t().alReact, false, "grow")}`) + addBtn("allergies") : ""}`)}
      ${sec(t().reports, `<textarea class="hx-in pt-ta" data-in="reports" rows="2" maxlength="500" dir="auto" placeholder="${E(t().reportsPh)}">${E(st.reports)}</textarea>`)}
      ${sec(t().symptoms, `${many("symptoms", st.symptoms, [...SYMPTOMS, "other"], "s_")}${st.symptoms.includes("other") ? inp("symptomsNote", st.symptomsNote, t().otherPh, b(!st.symptomsNote.trim())) : ""}`)}
      ${sec(t().red, `<small class="pt-sub">${t().redS}</small>${one("red", st.red, ["none", "yes"], "red_", b(!st.red))}
        ${st.red === "yes" ? `<div class="pt-redbox">${inp("redNote", st.redNote, t().redNotePh, b(!st.redNote.trim()))}${fld(t().redAction, 1, one("redAction", st.redAction, ["continue", "referred", "stopped"], "ra_", b(!st.redAction)))}</div>` : ""}`)}
      ${sec(t().fnHist, `${fld(t().level, 0, one("level", st.level, ["indep", "some", "dep"], "lv_"))}<div class="pt-two">${fld(t().work, 0, inp("work", st.work, t().workPh))}${fld(t().daily, 0, inp("daily", st.daily, t().dailyPh))}</div>`)}`;
    }
    if (k === "ptFunc") {
      const keys = Object.keys(st.acts);
      return `${fld(t().fnQ, 1, `<div class="pt-chips ${b(!st.none && !keys.length) ? "bad" : ""}">${ACTS.map(a => { const on = !!st.acts[a];
          return `<button type="button" class="pt-chip ${on ? "on" : ""}" data-act="${a}" aria-pressed="${on}">${on ? S(I.check, 2.8) : ""}${t()["a_" + a]}</button>`; }).join("")}
          <button type="button" class="pt-chip nn ${st.none ? "on" : ""}" data-act="none" aria-pressed="${st.none}">${st.none ? S(I.check, 2.8) : ""}${t().fnNone}</button></div>`)}
        ${keys.length ? `<div class="pt-acts">${ACTS.filter(a => st.acts[a]).map(a => `<div class="pt-act ${b(!st.acts[a].lvl) ? "bad" : ""}"><b>${t()["a_" + a]}</b>
          <div class="pt-lv">${LVLS.map(l => `<button type="button" class="pt-lvb ${l} ${st.acts[a].lvl === l ? "on" : ""}" data-lvl="${a}" data-v="${l}" aria-pressed="${st.acts[a].lvl === l}">${t()["lvl_" + l]}</button>`).join("")}</div>
          ${inp(`acts.${a}.ex`, st.acts[a].ex, t().exPh)}</div>`).join("")}</div>` : ""}`;
    }
    return "";
  }
  function summary(o, k, sv) {
    const row = (l, v, wide) => v ? `<div class="${wide ? "w" : ""}"><span>${l}</span><b dir="auto">${E(v)}</b></div>` : "";
    const J = a => a.filter(Boolean).join(lang === "ar" ? "، " : ", ");
    const lst = (arr, pre, other) => J((arr || []).map(v => v === "other" ? other : v === "none" ? t().none : t()[pre + v]));
    if (k === "ptPain") return `<div class="np-sum">${row(t().sumT, painSum(sv), 1)}${row(t().period, sv.period === "other" ? sv.periodOther : t()["per_" + sv.period])}${row(t().pattern, t()["pat_" + sv.pattern])}
      ${row(t().nature, lst(sv.nature, "nat_", sv.natureOther))}${row(t().worse, lst(sv.worse, "w_", sv.worseOther))}${row(t().ease, lst(sv.ease, "e_", sv.easeOther))}</div>`;
    if (k === "ptHistory") return `<div class="np-sum">${row(t().chronic, lst(sv.chronic, "c_") + (sv.chronicNote ? " · " + sv.chronicNote : ""))}
      ${row(t().surg, J((sv.surg || []).map(r => J([r.type, r.date, r.side && t()["sd_" + r.side]]).replace(/, /g, " · "))))}
      ${row(t().meds, sv.medsNone ? t().medsNone : J((sv.meds || []).map(r => r.name)))}${row(t().allergy, sv.allergy === "none" ? t().alNone : J((sv.allergies || []).map(r => r.sub + (r.react ? " (" + r.react + ")" : ""))))}
      ${row(t().reports, sv.reports)}${row(t().symptoms, lst(sv.symptoms, "s_", sv.symptomsNote))}
      ${row(t().red, sv.red === "yes" ? `${sv.redNote} · ${t()["ra_" + sv.redAction]}` : t().redNone, sv.red === "yes")}
      ${row(t().level, sv.level && t()["lv_" + sv.level])}${row(t().work, sv.work)}${row(t().daily, sv.daily)}</div>`;
    if (k === "ptFunc") return `<div class="np-sum">${sv.none ? row(t().fnQ, t().fnNone, 1) : ACTS.filter(a => sv.acts && sv.acts[a]).map(a => row(t()["a_" + a], t()["lvl_" + sv.acts[a].lvl] + (sv.acts[a].ex ? " · " + sv.acts[a].ex : ""))).join("")}</div>`;
    return "";
  }
  function view(o, c, k) {
    ctx = c; lang = c.lang; load(o, k);
    const sv = savedOf(o, k), when = sv && new Date(sv.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const red = sv && k === "ptHistory" && sv.red === "yes";
    const card = editing
      ? `<section class="nu-card open"><div class="nu-cb">${form(o, k)}${sv ? `<div class="nu-acts"><button type="button" class="hx-btn out" id="ptCancel">${S(I.x, 2.2)}${t().cancel}</button></div>` : ""}</div></section>`
      : `<section class="nu-card"><div class="nu-ch"><span class="nu-n0 done">${S(I.check, 2.6)}</span><div><b>${t()[k]}</b><small>${E(tx("savedAt", { t: when, n: nameOf(sv.by) }))}</small></div>
          ${(o.doctorVisit || {}).status === "done" ? "" : `<button type="button" class="hx-btn out sm" id="ptEdit">${S(I.pen)}${t().edit}</button>`}</div>
          <div class="nu-cb">${red ? `<div class="pt-redw">${S(I.warn, 2.2)}<span>${t().redYes}</span></div>` : ""}${summary(o, k, sv)}</div></section>`;
    return `<div class="nu np ptx">
      <div class="ex-top"><span class="ex-tic">${S(HEAD[k])}</span><div><h1>${t()[k]}</h1><p>${t()[k + "S"]}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>
      ${card}
      <div class="ex-foot"><button type="button" class="hx-btn out pl-prevb" id="ptPrev"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${E(c.prevName || "")}</small></span></button><span class="hx-sp"></span>
        <button type="button" class="hx-btn dark" id="ptCont">${editing ? t().cont : t().next}${S(I.arrow)}</button></div>
    </div>`;
  }
  // Text inputs write into st by path ("surg.0.type", "acts.walk.ex", "reports").
  function setPath(path, v) { const p = path.split("."); let o = st; while (p.length > 1) o = o[p.shift()]; o[p[0]] = v; }
  function bind(root, o, c, k) {
    ctx = c;
    const $ = s => root.querySelector(s), all = (s, f) => root.querySelectorAll(s).forEach(f), re = () => ctx.rerender();
    all("[data-sc]", b => b.addEventListener("click", () => { const key = b.dataset.sc, v = +b.dataset.v; st[key] = st[key] === v && key !== "now" ? null : v; re(); }));
    all("[data-one]", b => b.addEventListener("click", () => { st[b.dataset.one] = b.dataset.v; re(); }));
    all("[data-many]", b => b.addEventListener("click", () => {
      const key = b.dataset.many, v = b.dataset.v;
      if (key === "medsNone") { st.medsNone = !st.medsNone; return re(); }
      const arr = st[key], i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1); else if (v === "none") arr.splice(0, arr.length, "none"); else { const n = arr.indexOf("none"); if (n >= 0) arr.splice(n, 1); arr.push(v); }
      re();
    }));
    all("[data-act]", b => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "none") { st.none = !st.none; if (st.none) st.acts = {}; }
      else { st.none = false; if (st.acts[a]) delete st.acts[a]; else st.acts[a] = { lvl: "", ex: "" }; }
      re();
    }));
    all("[data-lvl]", b => b.addEventListener("click", () => { st.acts[b.dataset.lvl].lvl = b.dataset.v; re(); }));
    all("[data-add]", b => b.addEventListener("click", () => {
      const key = b.dataset.add; st[key].push(key === "surg" ? { type: "", date: "", side: "" } : key === "meds" ? { name: "" } : { sub: "", react: "" }); re();
      const ins = root.querySelectorAll(`[data-in^="${key}.${st[key].length - 1}."]`); if (ins[0]) ins[0].focus();
    }));
    all("[data-del]", b => b.addEventListener("click", () => { st[b.dataset.del].splice(+b.dataset.i, 1); re(); }));
    all("[data-in]", el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => { setPath(el.dataset.in, el.value); if (el.value.trim()) el.classList.remove("bad"); }));
    all("[data-chk]", el => el.addEventListener("change", () => { st[el.dataset.chk] = el.checked; el.closest(".pt-ok").classList.toggle("bad", !el.checked && tried); }));
    if ($("#ptEdit")) $("#ptEdit").addEventListener("click", () => { editing = true; re(); });
    if ($("#ptCancel")) $("#ptCancel").addEventListener("click", () => { reset(); re(); });
    $("#ptPrev").addEventListener("click", () => { reset(); ctx.go(ctx.prevKey); });
    $("#ptCont").addEventListener("click", () => {
      if (editing) {
        const miss = invalid(k);
        if (miss) { tried = true; re(); const el = root.querySelector(".bad"); if (el) el.scrollIntoView({ block: "center" }); return ctx.toast(t()[miss]); }
        const d = clone(st);
        if (k === "ptHistory") { d.surg = d.surg.filter(r => r.type.trim()); d.meds = d.medsNone ? [] : d.meds.filter(r => r.name.trim()); if (d.allergy !== "yes") d.allergies = [];
          if (d.red !== "yes") { d.redNote = ""; d.redAction = ""; } if (d.chronic.includes("none")) d.chronicNote = ""; }
        try { ctx.save(k, d); } catch (e) { return ctx.toast(e.message || t().storeErr); }
        ctx.toast(t().saved);
      }
      reset(); ctx.go(ctx.nextKey);
    });
  }
  return { view, bind, reset, L, KEYS: Object.keys(HEAD), ICONS: HEAD };
})();
