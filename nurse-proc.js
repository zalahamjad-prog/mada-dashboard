// The service step of a nurse visit (nurse-visit.html). One step per service, saved in order.nurseVisit.steps[kind]:
//   sample (Lab Tests):  { status: "collected" | "partial" | "not", tests: [{ code, sample, ok, reason }], fasting: "yes" | "no" | "",
//                          time, tubes, note, reason, items, at, by }. Packages are opened into their tests (labs.js); a test booked
//                          twice (alone and in a package) is listed once. Each test is confirmed on its own, grouped by sample type.
//   care   (Nursing):    { items: [{ code, done, reason }], note, at, by }
//   iv     (IV Therapy): { site, start, end, reaction: "none" | "yes", details, note, items, at, by }
// The booked items come from order.items (codes from labs.js, nursing.js and ivtherapy.js).
// Nursing and IV steps also show the prescription the patient uploaded (rx-docs.js), when a booked item needs one.
const NrProc = (() => {
  const I = {
    tube: '<path d="M9 3h6M10 3v13a2 2 0 0 0 4 0V3"/><path d="M10 10h4"/>',
    care: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M9.5 11h5M12 8.5v5"/>',
    iv: '<path d="M8 3h8v7a4 4 0 0 1-8 0z"/><path d="M8 7h8M12 14v3M12 17c0 2 1 4 4 4"/>',
    check: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>'
  };
  const L = {
    en: {
      stepOf: "Step {n} of {m}", prev: "Previous", cont: "Save & Continue", next: "Continue", edit: "Edit", cancel: "Cancel", opt: "(Optional)",
      booked: "Booked", none: "No items on this booking.", note: "Note", notePh: "Anything the team should know", reason: "Reason", reasonPh: "e.g. Patient refused",
      savedAt: "Saved {t} · {n}", saved: "Saved.", storeErr: "Couldn't save. Try again.",
      sample: "Sample Collection", sampleS: "Confirm the sample was collected for the booked tests.", smYes: "Sample collected", smNo: "Not collected",
      smTime: "Collection time", tubes: "Number of tubes", needSm: "Choose whether the sample was collected.", needReason: "Write the reason.", needTime: "Enter the collection time.",
      g_blood: "Blood sample", g_urine: "Urine sample", g_stool: "Stool sample", nTests: "{n} tests", nTests1: "1 test", allOk: "All collected", ynY: "Collected", ynN: "Not collected", inPkg: "In {p}",
      tagFast: "Fasting {h} h", tagFast0: "Fasting", tagMorning: "Morning sample", fastQ: "Did the patient fast as required?", fastFor: "Needed for: {s}",
      fastYes: "Fasted", fastNo: "Not fasting", needFast: "Choose whether the patient fasted.", needRows: "Mark every test as collected or not.",
      okN: "{a} of {n} collected", smPart: "Partly collected", smNone: "Nothing collected", testsT: "Tests", tubesT: "Tubes to prepare", noTube: "Tube not set",
      care: "Nursing Procedure", careS: "Mark each booked service as done, or write why it was not done.", done: "Done", notDone: "Not done",
      needCare: "Mark every service as done or not done.", careFree: "Procedure performed", careFreePh: "Describe what was done", needFree: "Describe the procedure.",
      iv: "IV Therapy", ivS: "Record the cannula site, the infusion time and any reaction.", site: "Cannula site", sitePick: "Choose the site",
      sites: { rh: "Right hand", lh: "Left hand", rf: "Right forearm", lf: "Left forearm", ra: "Right antecubital", la: "Left antecubital", other: "Other" },
      start: "Start time", end: "End time", reaction: "Any reaction during the infusion?", rxNo: "No reaction", rxYes: "Reaction", details: "Reaction details", detailsPh: "What happened and what was done",
      needSite: "Choose the cannula site.", needStart: "Enter the start time.", needEnd: "Enter the end time.", needRx: "Choose whether there was a reaction.", needDetails: "Describe the reaction."
    },
    ar: {
      stepOf: "الخطوة {n} من {m}", prev: "السابق", cont: "حفظ ومتابعة", next: "متابعة", edit: "تعديل", cancel: "إلغاء", opt: "(اختياري)",
      booked: "المحجوز", none: "ما فيه عناصر على هذا الحجز.", note: "ملاحظة", notePh: "أي شي يحتاج الفريق يعرفه", reason: "السبب", reasonPh: "مثال: المريض رفض",
      savedAt: "انحفظت {t} · {n}", saved: "انحفظ.", storeErr: "ما قدرنا نحفظ. حاول مرة ثانية.",
      sample: "سحب العينة", sampleS: "أكّد إنه تم سحب العينة للتحاليل المحجوزة.", smYes: "تم سحب العينة", smNo: "ما تم السحب",
      smTime: "وقت السحب", tubes: "عدد الأنابيب", needSm: "اختر هل تم سحب العينة أو لا.", needReason: "اكتب السبب.", needTime: "أدخل وقت السحب.",
      g_blood: "عينة دم", g_urine: "عينة بول", g_stool: "عينة براز", nTests: "{n} تحاليل", nTests1: "تحليل واحد", allOk: "تم سحب الكل", ynY: "تم السحب", ynN: "ما تم", inPkg: "ضمن {p}",
      tagFast: "صيام {h} ساعات", tagFast0: "صيام", tagMorning: "عينة صباحية", fastQ: "هل المريض صايم حسب المطلوب؟", fastFor: "مطلوب لـ: {s}",
      fastYes: "صايم", fastNo: "مو صايم", needFast: "اختر هل المريض صايم أو لا.", needRows: "حدد كل تحليل: تم سحبه أو لا.",
      okN: "تم سحب {a} من {n}", smPart: "تم سحب جزء", smNone: "ما تم سحب شي", testsT: "التحاليل", tubesT: "الأنابيب المطلوبة", noTube: "الأنبوب غير محدد",
      care: "الإجراء التمريضي", careS: "حدد كل خدمة محجوزة إنها تمت، أو اكتب ليش ما تمت.", done: "تمت", notDone: "ما تمت",
      needCare: "حدد كل خدمة: تمت أو ما تمت.", careFree: "الإجراء اللي تم", careFreePh: "اكتب وش اللي سويته", needFree: "اكتب الإجراء.",
      iv: "العلاج الوريدي", ivS: "سجّل مكان الكانيولا ووقت المحلول وأي تفاعل.", site: "مكان الكانيولا", sitePick: "اختر المكان",
      sites: { rh: "اليد اليمين", lh: "اليد اليسار", rf: "الساعد اليمين", lf: "الساعد اليسار", ra: "ثنية الكوع اليمين", la: "ثنية الكوع اليسار", other: "مكان آخر" },
      start: "وقت البداية", end: "وقت النهاية", reaction: "صار أي تفاعل أثناء المحلول؟", rxNo: "ما فيه تفاعل", rxYes: "فيه تفاعل", details: "تفاصيل التفاعل", detailsPh: "وش صار ووش سويت",
      needSite: "اختر مكان الكانيولا.", needStart: "أدخل وقت البداية.", needEnd: "أدخل وقت النهاية.", needRx: "اختر هل صار تفاعل أو لا.", needDetails: "اكتب تفاصيل التفاعل."
    }
  };
  const HEAD = { sample: ["sample", "sampleS", I.tube], care: ["care", "careS", I.care], iv: ["iv", "ivS", I.iv] };
  let ctx = null, lang = "en", st = null, forKey = null, editing = false, tried = false;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const reset = () => { st = null; forKey = null; editing = false; tried = false; };
  const nameOf = v => v && typeof v === "object" ? v[lang] || v.en : v || "";
  const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  // Booked items for this service, with their names.
  function items(o) {
    const has = typeof MadaLabs !== "undefined", look = it => it.kind === "pkg" ? has && MadaLabs.pkgById[it.code] : it.kind === "test" ? has && MadaLabs.byCode[it.code]
      : it.kind === "nursing" ? typeof MadaNursing !== "undefined" && MadaNursing.byCode[it.code] : it.kind === "iv" ? typeof MadaIV !== "undefined" && MadaIV.byCode[it.code] : null;
    return (o.items || []).map(it => { const r = look(it); return { code: it.code, name: r ? nameOf(r.name) || it.code : it.code }; });
  }
  // Every lab test to collect: single tests and the tests inside each package, once each, with where they came from.
  function labTests(o) {
    if (typeof MadaLabs === "undefined") return [];
    const map = new Map(), add = (code, from) => {
      const x = MadaLabs.byCode[code], r = map.get(code) || { code, name: x ? nameOf(x.name) : code, sample: (x && x.sample) || "blood",
        fasting: x && x.fasting, fastHours: x && x.fastHours, tube: x && MadaLabs.tubeOf && MadaLabs.tubeOf(x.tube), note: x && x.note ? nameOf(x.note) : "", from: [] };
      if (from && !r.from.includes(from)) r.from.push(from); map.set(code, r);
    };
    (o.items || []).forEach(it => { if (it.kind === "test") add(it.code, ""); if (it.kind === "pkg") { const p = MadaLabs.pkgById[it.code]; if (p) p.tests.forEach(c => add(c, nameOf(p.name))); } });
    return [...map.values()];
  }
  const GROUPS = ["blood", "urine", "stool"];
  // The tube each test goes in (labs.js TUBES), and the tubes a sample group needs.
  const tubeChip = x => x.tube ? `<span class="np-tube"><i style="background:${x.tube.color}"></i>${E(nameOf(x.tube.name))}</span>` : "";
  function tubeSum(tests) {
    const u = []; tests.forEach(x => { if (x.tube && !u.some(y => y.id === x.tube.id)) u.push(x.tube); });
    const miss = tests.filter(x => !x.tube).length;
    if (!u.length && !miss) return "";
    return `<div class="np-tsum"><span>${t().tubesT}:</span>${u.map(y => `<span class="np-tube"><i style="background:${y.color}"></i>${E(nameOf(y.name))} <b class="num">×${tests.filter(x => x.tube && x.tube.id === y.id).length}</b></span>`).join("")}${miss ? `<span class="np-tube none">${E(t().noTube)} <b class="num">×${miss}</b></span>` : ""}</div>`;
  }
  const groupsOf = tests => GROUPS.concat([...new Set(tests.map(x => x.sample))].filter(g => !GROUPS.includes(g))).map(g => ({ g, tests: tests.filter(x => x.sample === g) })).filter(x => x.tests.length);
  const fastTests = tests => tests.filter(x => x.fasting === "fast");
  const savedOf = (o, k) => ((o.doctorVisit || {}).steps || {})[k];
  function load(o, k) {
    if (st && forKey === o.id + k) return;
    const sv = savedOf(o, k) || {}, list = items(o);
    if (k === "sample") { const lt = labTests(o);
      st = { status: sv.status || "", time: sv.time || now(), tubes: sv.tubes || "", note: sv.note || "", reason: sv.reason || "", fasting: sv.fasting || "",
        rows: lt.map(x => { const r = (sv.tests || []).find(y => y.code === x.code) || {}; return { code: x.code, ok: r.ok === undefined ? (sv.status === "collected" ? true : null) : r.ok, reason: r.reason || "" }; }) }; }
    if (k === "care") st = { rows: list.map(x => { const r = (sv.items || []).find(y => y.code === x.code) || {}; return { code: x.code, done: r.done === undefined ? null : r.done, reason: r.reason || "" }; }), note: sv.note || "" };
    if (k === "iv") st = { site: sv.site || "", start: sv.start || now(), end: sv.end || "", reaction: sv.reaction || "", details: sv.details || "", note: sv.note || "" };
    forKey = o.id + k; editing = !savedOf(o, k);
  }
  const pills = (key, val, opts) => `<div class="or-pills">${opts.map(([v, l, no]) => `<button type="button" class="or-pill ${val === v ? "on" : ""} ${no ? "no" : ""}" data-np="${key}" data-v="${v}" aria-pressed="${val === v}"><span class="or-rd">${val === v ? S(I.check, 3) : ""}</span>${t()[l]}</button>`).join("")}</div>`;
  const fld = (id, label, req, inner) => `<div class="pl-f"><label for="${id}">${label} ${req ? '<span class="req">*</span>' : `<span class="hx-opt">${t().opt}</span>`}</label>${inner}</div>`;
  const inp = (id, val, bad, extra) => `<input class="hx-in ${bad ? "bad" : ""}" id="${id}" value="${E(val)}" ${extra || ""}>`;
  // What is missing before the step can be saved (first message), or "".
  function invalid(k) {
    if (k === "sample" && st.rows.length) return st.rows.some(r => r.ok === null) ? "needRows" : st.rows.some(r => r.ok === false && !r.reason.trim()) ? "needReason"
      : st.rows.some(r => r.ok) && !st.time ? "needTime" : st.needFast && !st.fasting ? "needFast" : "";
    if (k === "sample") return !st.status ? "needSm" : st.status === "not" && !st.reason.trim() ? "needReason" : st.status === "collected" && !st.time ? "needTime" : "";
    if (k === "care") return !st.rows.length ? (!st.note.trim() ? "needFree" : "") : st.rows.some(r => r.done === null) ? "needCare" : st.rows.some(r => r.done === false && !r.reason.trim()) ? "needReason" : "";
    if (k === "iv") return !st.site ? "needSite" : !st.start ? "needStart" : !st.end ? "needEnd" : !st.reaction ? "needRx" : st.reaction === "yes" && !st.details.trim() ? "needDetails" : "";
    return "";
  }
  function form(o, k) {
    const list = items(o), bad = c => tried && c;
    if (k === "sample" && st.rows.length) {
      const lt = labTests(o), by = c => lt.find(x => x.code === c) || { code: c, name: c, from: [] }, ft = fastTests(lt), anyOk = st.rows.some(r => r.ok), blood = st.rows.some(r => r.ok && by(r.code).sample === "blood");
      st.needFast = ft.length > 0;
      const okN = st.rows.filter(r => r.ok).length;
      const tag = x => [...x.from.map(p => `<span class="np-tg pk">${E(tx("inPkg", { p }))}</span>`), x.fasting === "fast" ? `<span class="np-tg fs">${E(x.fastHours ? tx("tagFast", { h: x.fastHours }) : t().tagFast0)}</span>` : "",
        x.fasting === "morning" ? `<span class="np-tg fs">${t().tagMorning}</span>` : ""].join("");
      return `<div class="np-lt-h"><b>${t().testsT}</b><span class="num">${E(tx("okN", { a: okN, n: st.rows.length }))}</span><button type="button" class="hx-btn out sm" id="npAllOk">${S(I.check, 2.4)}${t().allOk}</button></div>
        ${groupsOf(lt).map(({ g, tests }) => `<div class="np-grp"><div class="np-gh">${S(I.tube, 2)}<b>${E(t()["g_" + g] || g)}</b><small>${E(tests.length === 1 ? t().nTests1 : tx("nTests", { n: tests.length }))}</small></div>${tubeSum(tests)}
          <ul class="np-lt">${tests.map(x => { const i = st.rows.findIndex(r => r.code === x.code), r = st.rows[i];
            return `<li class="${r.ok === true ? "ok" : r.ok === false ? "no" : ""} ${bad(r.ok === null) ? "bad" : ""}">
              <div class="np-lt-t"><b>${E(x.name)}</b><code>${E(x.code)}</code>${tubeChip(x)}${tag(x)}${x.note ? `<small>${E(x.note)}</small>` : ""}</div>
              <div class="np-yn">${[["y", "ynY", I.check], ["n", "ynN", I.x]].map(([v, l, ic]) => `<button type="button" class="np-ynb ${v} ${(v === "y" ? r.ok === true : r.ok === false) ? "on" : ""}" data-lt="${i}" data-v="${v}" aria-pressed="${v === "y" ? r.ok === true : r.ok === false}" title="${E(t()[l])}">${S(ic, 2.6)}<span>${t()[l]}</span></button>`).join("")}</div>
              ${r.ok === false ? inp("npLr" + i, r.reason, bad(!r.reason.trim()), `data-lr="${i}" maxlength="200" dir="auto" placeholder="${E(t().reasonPh)}"`) : ""}</li>`; }).join("")}</ul></div>`).join("")}
        ${ft.length ? `<div class="pl-f np-fast ${bad(!st.fasting) ? "bad" : ""}"><label>${t().fastQ} <span class="req">*</span></label><small>${E(tx("fastFor", { s: ft.map(x => x.name).join(lang === "ar" ? "، " : ", ") }))}</small>${pills("fasting", st.fasting, [["yes", "fastYes"], ["no", "fastNo", 1]])}</div>` : ""}
        ${anyOk ? `<div class="np-grid">${fld("npTime", t().smTime, 1, inp("npTime", st.time, bad(!st.time), 'type="time" dir="ltr"'))}${blood ? fld("npTubes", t().tubes, 0, inp("npTubes", st.tubes, false, 'inputmode="numeric" maxlength="2" dir="ltr"')) : ""}</div>` : ""}
        ${fld("npNote", t().note, 0, inp("npNote", st.note, false, `maxlength="200" dir="auto" placeholder="${E(t().notePh)}"`))}`;
    }
    if (k === "sample") return `${pills("status", st.status, [["collected", "smYes"], ["not", "smNo", 1]])}
      ${st.status === "collected" ? `<div class="np-grid">${fld("npTime", t().smTime, 1, inp("npTime", st.time, bad(!st.time), 'type="time" dir="ltr"'))}${fld("npTubes", t().tubes, 0, inp("npTubes", st.tubes, false, 'inputmode="numeric" maxlength="2" dir="ltr"'))}</div>
        ${fld("npNote", t().note, 0, inp("npNote", st.note, false, `maxlength="200" dir="auto" placeholder="${E(t().notePh)}"`))}` : ""}
      ${st.status === "not" ? fld("npReason", t().reason, 1, inp("npReason", st.reason, bad(!st.reason.trim()), `maxlength="200" dir="auto" placeholder="${E(t().reasonPh)}"`)) : ""}`;
    if (k === "care") return (st.rows.length ? `<ul class="np-rows">${st.rows.map((r, i) => `<li class="${bad(r.done === null) ? "bad" : ""}"><b>${E((list.find(x => x.code === r.code) || {}).name || r.code)}</b>
        ${pills("row" + i, r.done === true ? "y" : r.done === false ? "n" : "", [["y", "done"], ["n", "notDone", 1]])}
        ${r.done === false ? inp("npR" + i, r.reason, bad(!r.reason.trim()), `data-r="${i}" maxlength="200" dir="auto" placeholder="${E(t().reasonPh)}"`) : ""}</li>`).join("")}</ul>
      ${fld("npNote", t().note, 0, inp("npNote", st.note, false, `maxlength="300" dir="auto" placeholder="${E(t().notePh)}"`))}`
      : fld("npNote", t().careFree, 1, `<textarea class="hx-in np-ta ${bad(!st.note.trim()) ? "bad" : ""}" id="npNote" maxlength="500" rows="4" dir="auto" placeholder="${E(t().careFreePh)}">${E(st.note)}</textarea>`));
    if (k === "iv") return `<div class="np-grid">${fld("npSite", t().site, 1, `<select class="hx-in ${bad(!st.site) ? "bad" : ""}" id="npSite"><option value="">${t().sitePick}</option>${Object.entries(t().sites).map(([v, l]) => `<option value="${v}" ${st.site === v ? "selected" : ""}>${l}</option>`).join("")}</select>`)}
        ${fld("npStart", t().start, 1, inp("npStart", st.start, bad(!st.start), 'type="time" dir="ltr"'))}${fld("npEnd", t().end, 1, inp("npEnd", st.end, bad(!st.end), 'type="time" dir="ltr"'))}</div>
      <div class="pl-f"><label>${t().reaction} <span class="req">*</span></label>${pills("reaction", st.reaction, [["none", "rxNo"], ["yes", "rxYes", 1]])}</div>
      ${st.reaction === "yes" ? fld("npDetails", t().details, 1, inp("npDetails", st.details, bad(!st.details.trim()), `maxlength="300" dir="auto" placeholder="${E(t().detailsPh)}"`)) : ""}
      ${fld("npNote", t().note, 0, inp("npNote", st.note, false, `maxlength="300" dir="auto" placeholder="${E(t().notePh)}"`))}`;
  }
  function summary(o, k, sv) {
    const list = items(o), nm = c => (list.find(x => x.code === c) || {}).name || c, row = (l, v) => v ? `<div><span>${l}</span><b dir="auto">${E(v)}</b></div>` : "";
    if (k === "sample" && (sv.tests || []).length) {
      const lt = labTests(o), by = c => lt.find(x => x.code === c) || { code: c, name: c, sample: "blood" }, okN = sv.tests.filter(r => r.ok).length;
      const st0 = sv.status === "collected" ? t().smYes : sv.status === "partial" ? t().smPart : t().smNone;
      return `<div class="np-sum">${row(t().sample, `${st0} · ${tx("okN", { a: okN, n: sv.tests.length })}`)}${row(t().smTime, sv.time)}${row(t().tubes, sv.tubes)}${row(t().fastQ, sv.fasting === "yes" ? t().fastYes : sv.fasting === "no" ? t().fastNo : "")}${row(t().note, sv.note)}</div>
        ${groupsOf(sv.tests.map(r => ({ ...by(r.code), r }))).map(({ g, tests }) => `<div class="np-grp"><div class="np-gh">${S(I.tube, 2)}<b>${E(t()["g_" + g] || g)}</b><small>${E(tests.length === 1 ? t().nTests1 : tx("nTests", { n: tests.length }))}</small></div>${tubeSum(tests)}
          <ul class="np-lt ro">${tests.map(x => `<li class="${x.r.ok ? "ok" : "no"}"><div class="np-lt-t"><b>${E(x.name)}</b><code>${E(x.code)}</code>${tubeChip(x)}${x.r.ok ? "" : `<small>${E(x.r.reason)}</small>`}</div>
            <span class="np-st ${x.r.ok ? "y" : "n"}">${S(x.r.ok ? I.check : I.x, 2.6)}${x.r.ok ? t().smYes : t().smNo}</span></li>`).join("")}</ul></div>`).join("")}`;
    }
    if (k === "sample") return `<div class="np-sum">${row(t().sample, sv.status === "collected" ? t().smYes : t().smNo)}${row(t().smTime, sv.time)}${row(t().tubes, sv.tubes)}${row(t().reason, sv.reason)}${row(t().note, sv.note)}</div>`;
    if (k === "care") return `<div class="np-sum">${(sv.items || []).map(r => row(nm(r.code), r.done ? t().done : `${t().notDone} · ${r.reason}`)).join("")}${row((sv.items || []).length ? t().note : t().careFree, sv.note)}</div>`;
    if (k === "iv") return `<div class="np-sum">${row(t().site, t().sites[sv.site] || sv.site)}${row(t().start, sv.start)}${row(t().end, sv.end)}${row(t().reaction, sv.reaction === "yes" ? t().rxYes : t().rxNo)}${row(t().details, sv.details)}${row(t().note, sv.note)}</div>`;
  }
  function view(o, c, k) {
    ctx = c; lang = c.lang; load(o, k);
    const sv = savedOf(o, k), [h, s, ic] = HEAD[k], list = items(o);
    const when = sv && new Date(sv.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const booked = `<p class="nu-smt"><span>${t().booked}:</span> ${list.length ? E(list.map(x => x.name).join(lang === "ar" ? "، " : ", ")) : t().none}</p>`;
    const card = editing
      ? `<section class="nu-card open"><div class="nu-ch"><span class="nu-n0">${c.stepOf.n}</span><div><b>${t()[h]}</b><small>${t()[s]}</small></div></div>
          <div class="nu-cb">${booked}${form(o, k)}${sv ? `<div class="nu-acts"><button type="button" class="hx-btn out" id="npCancel">${S(I.x, 2.2)}${t().cancel}</button></div>` : ""}</div></section>`
      : `<section class="nu-card"><div class="nu-ch"><span class="nu-n0 done">${S(I.check, 2.6)}</span><div><b>${t()[h]}</b><small>${E(tx("savedAt", { t: when, n: nameOf(sv.by) }))}</small></div>
          ${(o.doctorVisit || {}).status === "done" ? "" : `<button type="button" class="hx-btn out sm" id="npEdit">${S(I.pen)}${t().edit}</button>`}</div><div class="nu-cb">${booked}${summary(o, k, sv)}</div></section>`;
    return `<div class="nu np">
      <div class="ex-top"><span class="ex-tic">${S(ic)}</span><div><h1>${t()[h]}</h1><p>${t()[s]}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>
      ${c.rx && k !== "sample" ? MadaRx.card(o, c.rx) : ""}
      ${card}
      <div class="ex-foot"><button type="button" class="hx-btn out pl-prevb" id="npPrev"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${E(c.prevName || "")}</small></span></button><span class="hx-sp"></span>
        <button type="button" class="hx-btn dark" id="npCont">${editing ? t().cont : t().next}${S(I.arrow)}</button></div>
    </div>`;
  }
  function bind(root, o, c, k) {
    ctx = c;
    const $ = s => root.querySelector(s), all = (s, f) => root.querySelectorAll(s).forEach(f);
    if (c.rx && k !== "sample") MadaRx.bind(root, o, c.rx);
    all("[data-np]", b => b.addEventListener("click", () => {
      const key = b.dataset.np, v = b.dataset.v;
      if (key.startsWith("row")) st.rows[+key.slice(3)].done = v === "y"; else st[key] = v;
      ctx.rerender();
    }));
    const bindIn = (sel, key) => { if ($(sel)) $(sel).addEventListener("input", e => { st[key] = key === "tubes" ? e.target.value.replace(/\D/g, "") : e.target.value; if (key === "tubes") e.target.value = st[key]; if (e.target.value.trim()) e.target.classList.remove("bad"); }); };
    [["#npTime", "time"], ["#npTubes", "tubes"], ["#npNote", "note"], ["#npReason", "reason"], ["#npStart", "start"], ["#npEnd", "end"], ["#npDetails", "details"]].forEach(([s, key]) => bindIn(s, key));
    if ($("#npSite")) $("#npSite").addEventListener("change", e => { st.site = e.target.value; e.target.classList.toggle("bad", !st.site && tried); });
    all("[data-lt]", b => b.addEventListener("click", () => { const r = st.rows[+b.dataset.lt]; r.ok = b.dataset.v === "y"; ctx.rerender(); }));
    all("[data-lr]", el => el.addEventListener("input", () => { st.rows[+el.dataset.lr].reason = el.value; if (el.value.trim()) el.classList.remove("bad"); }));
    if ($("#npAllOk")) $("#npAllOk").addEventListener("click", () => { st.rows.forEach(r => { r.ok = true; }); ctx.rerender(); });
    all("[data-r]", el => el.addEventListener("input", () => { st.rows[+el.dataset.r].reason = el.value; if (el.value.trim()) el.classList.remove("bad"); }));
    if ($("#npEdit")) $("#npEdit").addEventListener("click", () => { editing = true; ctx.rerender(); });
    if ($("#npCancel")) $("#npCancel").addEventListener("click", () => { reset(); ctx.rerender(); });
    $("#npPrev").addEventListener("click", () => { reset(); ctx.go(ctx.prevKey); });
    $("#npCont").addEventListener("click", () => {
      if (editing) {
        const miss = invalid(k);
        if (miss) { tried = true; ctx.rerender(); const el = root.querySelector(".bad"); if (el) el.scrollIntoView({ block: "center" }); return ctx.toast(t()[miss]); }
        let d;
        if (k === "sample" && st.rows.length) { const lt = labTests(o), okN = st.rows.filter(r => r.ok).length, any = okN > 0;
          d = { status: okN === st.rows.length ? "collected" : any ? "partial" : "not", tests: st.rows.map(r => ({ code: r.code, sample: (lt.find(x => x.code === r.code) || {}).sample || "blood", ok: r.ok, reason: r.ok ? "" : r.reason.trim() })),
            fasting: st.needFast ? st.fasting : "", time: any ? st.time : "", tubes: any ? st.tubes : "", note: st.note.trim(), reason: st.rows.filter(r => !r.ok).map(r => r.code + ": " + r.reason.trim()).join(" · ") }; }
        else if (k === "sample") d = { status: st.status, time: st.status === "collected" ? st.time : "", tubes: st.status === "collected" ? st.tubes : "", note: st.status === "collected" ? st.note.trim() : "", reason: st.status === "not" ? st.reason.trim() : "" };
        if (k === "care") d = { items: st.rows.map(r => ({ code: r.code, done: r.done, reason: r.done ? "" : r.reason.trim() })), note: st.note.trim() };
        if (k === "iv") d = { site: st.site, start: st.start, end: st.end, reaction: st.reaction, details: st.reaction === "yes" ? st.details.trim() : "", note: st.note.trim() };
        d.items = d.items || items(o).map(x => x.code);
        try { ctx.save(k, d); } catch (e) { return ctx.toast(e.message || t().storeErr); }
        ctx.toast(t().saved);
      }
      reset(); ctx.go(ctx.nextKey);
    });
  }
  return { view, bind, reset, L };
})();
