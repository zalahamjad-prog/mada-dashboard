// Mada Care Physiotherapy Report: one report per completed physio visit (an initial assessment or a follow-up session), built from what
// was recorded at the visit (order.physioVisit, physio-steps.js, physio-follow.js, physio-plan.js, physio-hep.js) and the patient file.
// Nothing is typed again. Before it can be viewed or downloaded the physiotherapist approves it (physio-reports.html, Review & Approve):
// they choose which sections show, can change a section's text and add their own sections. Kept in order.physioVisit.report:
//   { status: "draft" | "approved", hidden: [section keys], edits: { en: { key: html }, ar: {...} }, custom: [{ id, title, text }], updatedAt, approvedAt, approvedBy }.
// PtReport.html(order, lang, opt) gives the report page; PtReport.download(order, lang, toast) saves it as a branded PDF (the medical report's PDF maker).
// Needs: orders.js, patients.js, physio.js, exercises.js, physio-steps.js, physio-follow.js, medical-report.js (PDF and logo).
const PtReport = (() => {
  const R = {
    en: {
      title: "Physiotherapy Report", reportNo: "Report No.", issued: "Issued", patientT: "Patient Information", name: "Patient Name", fileNo: "Medical File No.", idNo: "ID Number",
      dob: "Date of Birth", age: "Age", years: "{n} years", gender: "Gender", g_m: "Male", g_f: "Female", mobile: "Mobile Number",
      visitT: "Session Information", visitDate: "Session Date", visitNo: "Visit No.", type: "Session Type", initial: "Initial assessment", follow: "Follow-up session {n}", followOf: "Follow-up session {n} of {m}",
      by: "Physiotherapist", specialty: "Specialty", pkg: "Package", place: "Place of Visit", home: "Home visit",
      s_pain: "Pain Assessment", s_history: "Medical History & Risk Factors", s_func: "Functional Limitations", s_exam: "Objective Examination", s_goals: "Treatment Goals",
      s_today: "Today's Assessment", s_tx: "Treatment Given", s_next: "Next Plan", s_plan: "Treatment Plan", s_hep: "Home Exercise Program", s_patient: "Patient Information", s_glance: "Assessment at a Glance",
      planT: "Plan", imaging: "Imaging requested", nextS: "Next session", nextAt: "{d} at {t} · Booking {b}", inPkg: "covered by the package",
      days: "{n} days a week", exNote: "Note", hepNone: "No home program for this patient.", hepNote: "Notes for the patient",
      draftTag: "Draft · not approved yet", apprBy: "Approved by {n} on {d}", none: "Not recorded", sign: "Physiotherapist",
      signNote: "Generated from the Mada Care record on {d}.", page: "Mada Care · Home healthcare", ed: "Edited",
      glance: "Assessment at a Glance", glanceS: "Key findings of the first physiotherapy visit", curPain: "Current pain", range: "Lowest {a} · Highest {b}",
      b0: "No pain", b1: "Mild", b2: "Moderate", b3: "Severe", areaT: "Affected area", fnT: "Functional ability", expT: "Expected improvement",
      goalsT: "Treatment Goals", gShort: "Short-term", gLong: "Long-term", measT: "Measured by", within: "Within {d}", subInit: "Initial Physiotherapy Assessment", signLine: "Signature"
    },
    ar: {
      title: "تقرير العلاج الطبيعي", reportNo: "رقم التقرير", issued: "تاريخ الإصدار", patientT: "بيانات المريض", name: "اسم المريض", fileNo: "رقم الملف الطبي", idNo: "رقم الهوية",
      dob: "تاريخ الميلاد", age: "العمر", years: "{n} سنة", gender: "الجنس", g_m: "ذكر", g_f: "أنثى", mobile: "رقم الجوال",
      visitT: "معلومات الجلسة", visitDate: "تاريخ الجلسة", visitNo: "رقم الزيارة", type: "نوع الجلسة", initial: "جلسة تقييم (كشف)", follow: "جلسة متابعة {n}", followOf: "جلسة متابعة {n} من {m}",
      by: "أخصائي العلاج الطبيعي", specialty: "التخصص", pkg: "الباقة", place: "مكان الزيارة", home: "زيارة منزلية",
      s_pain: "تقييم الألم", s_history: "التاريخ المرضي وعوامل الخطورة", s_func: "القيود الوظيفية", s_exam: "الفحص السريري", s_goals: "الأهداف العلاجية",
      s_today: "تقييم اليوم", s_tx: "العلاج المنفذ", s_next: "الخطة القادمة", s_plan: "الخطة العلاجية", s_hep: "البرنامج المنزلي", s_patient: "بيانات المريض", s_glance: "ملخص التقييم",
      planT: "الخطة", imaging: "طلب أشعة", nextS: "الجلسة الجاية", nextAt: "{d} الساعة {t} · حجز {b}", inPkg: "ضمن الباقة",
      days: "{n} أيام في الأسبوع", exNote: "ملاحظة", hepNone: "ما فيه برنامج منزلي لهذا المريض.", hepNote: "ملاحظات للمريض",
      draftTag: "مسودة · ما انعتمد للحين", apprBy: "اعتمده {n} بتاريخ {d}", none: "ما انسجل", sign: "أخصائي العلاج الطبيعي",
      signNote: "صادر من سجل مدى كير بتاريخ {d}.", page: "مدى كير · رعاية صحية منزلية", ed: "معدّل",
      glance: "ملخص التقييم", glanceS: "أهم نتائج الزيارة الأولى للعلاج الطبيعي", curPain: "الألم الحالي", range: "الأدنى {a} · الأعلى {b}",
      b0: "بدون ألم", b1: "خفيف", b2: "متوسط", b3: "شديد", areaT: "المنطقة المصابة", fnT: "القدرة الوظيفية", expT: "مدة التحسن المتوقعة",
      goalsT: "الأهداف العلاجية", gShort: "قصيرة المدى", gLong: "طويلة المدى", measT: "طريقة القياس", within: "خلال {d}", subInit: "تقييم العلاج الطبيعي الأولي", signLine: "التوقيع"
    }
  };
  const G = "#0b6b5c", GD = "#07463d", INK = "#10232b", MU = "#6b7a80", LINE = "#e3e8ea", SOFT = "#f4f8f7", GOLD = "#c8a45a";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nm = v => v && typeof v === "object" ? v : { en: v || "", ar: v || "" };
  const has = v => v != null && String(v).trim() !== "";
  const tx = (s, v) => s.replace(/\{(\w+)\}/g, (_, x) => v[x]);
  const pvOf = o => (o && (o.physioVisit || o.doctorVisit)) || {};
  const stepsOf = o => pvOf(o).steps || {};
  const ctx = { esc, svg: () => "", loc: () => "en-GB" };
  // Sections in report order, with the visit step each comes from.
  const INITIAL = [["pain", "ptPain"], ["history", "ptHistory"], ["func", "ptFunc"], ["exam", "ptExam"], ["goals", "ptGoals"], ["plan", "ptPlan"], ["hep", "ptHep"]];
  const FOLLOW = [["today", "fuToday"], ["exam", "ptExam"], ["tx", "fuTx"], ["hep", "ptHep"], ["next", "fuNext"], ["plan", "ptPlan"]];
  const isFollow = o => !!(stepsOf(o).fuInfo || stepsOf(o).fuToday);
  const secsOf = o => ["patient", ...(isFollow(o) ? [] : ["glance"]), ...(isFollow(o) ? FOLLOW : INITIAL).map(x => x[0])];
  const stepOf = (o, k) => ((isFollow(o) ? FOLLOW : INITIAL).find(x => x[0] === k) || [])[1];
  const secHas = (o, k) => k === "patient" || (k === "glance" ? !isFollow(o) && !!(stepsOf(o).ptPain || stepsOf(o).ptExam || stepsOf(o).ptGoals) : !!stepsOf(o)[stepOf(o, k)]);
  const SEC_IC = {
    patient: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', visit: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    pain: '<path d="M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M9 10h.01M15 10h.01M9 16c1.5-1.3 4.5-1.3 6 0"/>', history: '<path d="M12 8v4l3 2"/><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4h4"/>',
    func: '<circle cx="13" cy="4" r="2"/><path d="m9 20 3-6 3 3v4M6 12l3-4 4 1 3 3M12 14l-2-3"/>', exam: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M8 9.5h8M12 14l-3 7M12 14l3 7"/>',
    goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>', plan: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h4"/>',
    hep: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>', today: '<path d="M3 12h4l2-5 4 10 2-5h6"/>', tx: '<path d="M6.5 6.5h11M6.5 17.5h11M4 9v6M7 7v10M17 7v10M20 9v6"/>',
    next: '<path d="M4 12h12M12 6l6 6-6 6"/><path d="M20 5v14"/>', cu: '<path d="M4 20h4L19 9l-4-4L4 16z"/>'
  };
  // The step summaries (label/value boxes) drawn with inline styles, so they look the same in the PDF and survive the text editor.
  function inline(h, rtl) {
    const doc = new DOMParser().parseFromString(`<div>${h}</div>`, "text/html"), root = doc.body.firstChild;
    root.querySelectorAll(".np-sum").forEach(el => { el.removeAttribute("class"); el.setAttribute("style", "display:flex;flex-wrap:wrap;column-gap:16px"); });
    root.querySelectorAll("div > span:first-child + b").forEach(b => {
      const box = b.parentElement, wide = box.classList.contains("w"); box.removeAttribute("class");
      box.setAttribute("style", `flex:1 1 ${wide ? "100%" : "40%"};min-width:150px;padding:5px 0`);
      b.previousElementSibling.setAttribute("style", `display:block;color:${MU};font-size:10.5px`);
      b.setAttribute("style", `display:block;font-weight:600;color:${INK};font-size:12.5px;margin-top:1px;line-height:1.6`);
    });
    root.querySelectorAll("ul, ol").forEach(l => { l.removeAttribute("class"); l.setAttribute("style", `margin:0;padding-${rtl ? "right" : "left"}:18px`); });
    root.querySelectorAll("small").forEach(s => s.setAttribute("style", `display:block;font-weight:400;color:${MU};font-size:11px`));
    root.querySelectorAll("i").forEach(s => { s.removeAttribute("class"); s.setAttribute("style", `font-style:normal;font-weight:400;color:${MU}`); });
    root.querySelectorAll("[class]").forEach(el => el.removeAttribute("class"));
    return root.innerHTML;
  }
  function data(o) {
    const f = (typeof MadaPatients !== "undefined" && (MadaPatients.get(o.mrn) || (MadaPatients.sample && MadaPatients.sample(o.mrn)))) || {}, arr = stepsOf(o).arrival || {};
    const staff = (typeof MadaStore !== "undefined" ? MadaStore.getJSON("mada-staff", []) : []).find(s => s.id === (o.booking || {}).nurseId) || null;
    const F = typeof PtFu !== "undefined" ? PtFu.info(o) : null, fol = pvOf(o).follow || (F && F.follow ? { n: F.n, m: F.m, pkg: F.pkg } : null);
    return { o, st: stepsOf(o), staff, fol, F,
      p: { name: nm(f.name || o.patient), fileNo: o.mrn || f.fileNo, idNumber: f.idNumber || arr.idNumber || "", dob: f.dateOfBirth || arr.dob || "",
        age: (f.dateOfBirth || arr.dob) && typeof MadaPatients !== "undefined" ? MadaPatients.ageOf(f.dateOfBirth || arr.dob) : f.age || "", gender: f.gender || "", mobile: f.mobile || o.mobile || "" },
      date: String((o.appointment && o.appointment.date) || pvOf(o).completedAt || o.createdAt || "") };
  }
  // A session's type in words: the first assessment, or "Follow-up session 3 of 4".
  function typeOf(o, lang) {
    const t = R[lang], fol = isFollow(o) ? data(o).fol : null;
    if (!fol) return t.initial;
    return fol.m ? tx(t.followOf, { n: fol.n, m: fol.m }) : tx(t.follow, { n: fol.n });
  }
  function html(o, lang, opt) {
    opt = opt || {};
    const d = data(o), t = R[lang], rtl = lang === "ar", al = rtl ? "right" : "left", rp = opt.rp || pvOf(o).report || {}, hid = new Set(rp.hidden || []);
    const loc = rtl ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", approved = rp.status === "approved", now = new Date().toISOString();
    const fmtD = s => { if (!s) return ""; const dt = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00") : new Date(s); return dt.toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }); };
    const fmtT = hm => { if (!hm) return ""; const [h, m] = String(hm).split(":").map(Number); return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${rtl ? (h < 12 ? "ص" : "م") : (h < 12 ? "AM" : "PM")}`; };
    const ltr = v => `<span dir="ltr" style="unicode-bidi:isolate">${esc(v)}</span>`;
    const txt = v => `<span dir="auto" style="unicode-bidi:plaintext">${esc(v)}</span>`;
    const kv = (k, v) => `<div style="flex:1 1 30%;min-width:130px;padding:6px 0"><div style="color:${MU};font-size:10.5px">${k}</div><div style="font-weight:600;color:${INK};font-size:12.5px;margin-top:1px">${v || `<span style="color:${MU};font-weight:400">—</span>`}</div></div>`;
    const ic = p => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${G}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    const empty = `<div style="font-size:12px;color:${MU}">${t.none}</div>`;
    const edited = k => ((rp.edits || {})[lang] || {})[k];
    const card = (k, title, body, sec) => { const ed = sec && edited(sec), clean = typeof MadaReport !== "undefined" ? MadaReport.clean : (x => esc(x));
      return `<div style="border:1px solid ${LINE};border-radius:12px;padding:12px 16px;margin-top:10px;background:#fff">
      <div class="pdf-avoid" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;break-inside:avoid;page-break-inside:avoid;break-after:avoid;page-break-after:avoid"><span style="width:28px;height:28px;border-radius:8px;background:#e6f3ef;display:inline-flex;align-items:center;justify-content:center">${ic(SEC_IC[k] || SEC_IC.cu)}</span><span style="font-size:14px;font-weight:700;color:${INK}">${title}</span>${ed != null ? `<span style="display:inline-block;padding:0 7px;border-radius:8px;background:#fdf2e3;color:#b45309;font-size:10.5px;font-weight:700">${t.ed}</span>` : ""}</div>
      ${sec ? `<div data-sec="${sec}" ${opt.edit ? `class="mr-ed${ed != null ? " edited" : ""}" contenteditable="true" spellcheck="false"` : ""}>${ed != null ? clean(ed) : body}</div>` : body}</div>`; };
    const sumOf = (k, sv) => { if (!sv) return empty;
      const h = /^pt/.test(k) && typeof PtSteps !== "undefined" && k !== "ptPlan" && k !== "ptHep" ? PtSteps.sum(k, sv, lang, ctx) : typeof PtFu !== "undefined" ? PtFu.sum(k, sv, lang, ctx) : "";
      return h ? inline(h, rtl) : empty; };
    const X = typeof MadaExercises !== "undefined" ? MadaExercises : null;
    function body(k) {
      const k2 = stepOf(o, k), sv = d.st[k2];
      if (!sv) return empty;
      if (k === "plan") {
        const nx = sv.next, bo = nx && typeof MadaOrders !== "undefined" ? MadaOrders.get(nx.orderId) : null;
        return `<div style="font-size:12px;line-height:1.7;color:#2c3d43;white-space:pre-line">${sv.plan ? txt(sv.plan) : empty}</div>
          ${(sv.imaging || []).map(r => `<div style="font-size:12px;line-height:1.7;margin-top:6px"><span style="color:${MU}">${t.imaging}:</span> ${txt(r.reason)} ${r.mrId ? ltr("(" + r.mrId + ")") : ""}</div>`).join("")}
          ${nx ? `<div style="font-size:12px;line-height:1.7;margin-top:6px"><span style="color:${MU}">${t.nextS}:</span> ${esc(tx(t.nextAt, { d: fmtD(nx.date), t: fmtT(nx.time), b: (bo && bo.bookingId) || nx.bookingId || "—" }))}${bo && bo.pkgSession ? ` · ${t.inPkg}` : ""}</div>` : ""}`;
      }
      if (k === "hep") {
        if (sv.none) return `<div style="font-size:12px;color:${MU}">${t.hepNone}</div>`;
        return `<table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-top:4px"><tbody>${(sv.items || []).map((it, i) => { const x = X && X.byCode[it.code];
            return `<tr class="pdf-avoid" style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 8px;border-bottom:1px solid #f0f3f4;width:22px;color:${G};font-weight:700">${i + 1}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #f0f3f4"><b>${esc(x ? nm(x.name)[lang] : it.code)}</b>${it.note ? `<div style="color:${MU}">${t.exNote}: ${txt(it.note)}</div>` : ""}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #f0f3f4;color:#2c3d43">${esc(X ? X.dose(it, lang) : "")}</td></tr>`; }).join("")}</tbody></table>
          <div style="font-size:12px;line-height:1.7;margin-top:6px">${esc(tx(t.days, { n: sv.days || 7 }))}${sv.note ? ` · <span style="color:${MU}">${t.hepNote}:</span> ${txt(sv.note)}` : ""}</div>`;
      }
      return sumOf(k2, sv);
    }
    // Initial assessment: a summary band at the top (pain gauge, area, function, expected improvement, the two goals).
    function glance() {
      if (isFollow(o) || hid.has("glance")) return "";
      const PL = typeof PtSteps !== "undefined" ? PtSteps.L[lang] : {}, pn = d.st.ptPain, ex = d.st.ptExam, gl = d.st.ptGoals;
      if (!pn && !ex && !gl) return "";
      const band = v => v == null ? null : v === 0 ? 0 : v <= 3 ? 1 : v <= 6 ? 2 : 3;
      const BC = [["#e3f4ee", "#0f6b52"], ["#eef7e3", "#3f6b17"], ["#fff4dc", "#8a5a00"], ["#fdecec", "#a3201b"]];
      const SEG = ["#2fb380", "#7cc36a", "#b9d25a", "#e3d14f", "#f2c04a", "#f4a23d", "#f2853a", "#ee6a37", "#e24f33", "#d0372f", "#b3222a"];
      const now = pn && pn.now, b = band(now);
      const gauge = now == null ? "" : `<div style="display:flex;gap:2px;margin-top:8px;direction:ltr">${SEG.map((c, i) => `<span style="flex:1;height:${i === now ? 14 : 8}px;border-radius:3px;background:${c};opacity:${i === now ? 1 : .35};align-self:flex-end"></span>`).join("")}</div>
        <div style="display:flex;justify-content:space-between;font-size:9.5px;color:${MU};margin-top:2px;direction:ltr"><span>0</span><span>5</span><span>10</span></div>`;
      const tile = (label, val, sub, extra) => `<div style="flex:1 1 22%;min-width:130px;box-sizing:border-box;background:#fff;border:1px solid ${LINE};border-radius:12px;padding:10px 12px">
        <div style="font-size:10.5px;color:${MU}">${label}</div><div style="font-size:14px;font-weight:700;color:${INK};margin-top:3px;line-height:1.4">${val || `<span style="color:${MU};font-weight:400">—</span>`}</div>${sub ? `<div style="font-size:11px;color:${MU};margin-top:2px">${sub}</div>` : ""}${extra || ""}</div>`;
      const painV = now == null ? "" : `<span dir="ltr" style="unicode-bidi:isolate"><span style="font-size:22px;font-weight:800;color:${BC[b][1]}">${now}</span><span style="font-size:12px;color:${MU}">/10</span></span> <span style="display:inline-block;padding:1px 8px;border-radius:10px;background:${BC[b][0]};color:${BC[b][1]};font-size:11px;font-weight:700;vertical-align:middle">${t["b" + b]}</span>`;
      const painS = pn && pn.low != null && pn.high != null ? esc(tx(t.range, { a: pn.low + "/10", b: pn.high + "/10" })) : "";
      const areas = ex ? (ex.areas || []).map(a => a === "other" ? ex.areaOther : PL["ar_" + a]).filter(Boolean).join(rtl ? "، " : ", ") : "";
      const side = ex && ex.side && ex.side !== "na" ? PL["sd_" + ex.side] : "";
      const fnV = ex && ex.fn ? PL["fx_" + ex.fn] : "", expV = gl ? (gl.expect === "other" ? gl.expectOther : PL["ex_" + gl.expect]) : "";
      const durOf = g => g.dur === "other" ? g.durOther : PL["d_" + g.dur];
      const goal = (lbl, g, c) => !g || !has(g.goal) ? "" : `<div style="flex:1 1 45%;min-width:220px;box-sizing:border-box;border-radius:12px;padding:10px 14px;background:#fff;border:1px solid ${LINE};border-${al}:4px solid ${c}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="font-size:11px;font-weight:700;color:${c};text-transform:uppercase;letter-spacing:.3px">${lbl}</span>${durOf(g) ? `<span style="font-size:10.5px;padding:1px 8px;border-radius:10px;background:${SOFT};color:${GD};font-weight:600">${esc(tx(t.within, { d: durOf(g) }))}</span>` : ""}</div>
        <div style="font-size:13px;font-weight:600;color:${INK};margin-top:4px;line-height:1.6">${txt(g.goal)}</div>${has(g.measure) ? `<div style="font-size:11.5px;color:${MU};margin-top:3px">${t.measT}: <span style="color:#2c3d43">${txt(g.measure)}</span></div>` : ""}</div>`;
      const goals = gl ? goal(t.gShort, gl.short, G) + goal(t.gLong, gl.long, GOLD) : "";
      return `<div class="pdf-avoid" style="break-inside:avoid;page-break-inside:avoid;margin-top:12px;border-radius:14px;padding:14px 16px;background:linear-gradient(135deg, ${SOFT}, #fbf7ee);border:1px solid #dbe9e4">
        <div style="display:flex;align-items:center;gap:10px"><span style="width:32px;height:32px;border-radius:10px;background:${G};display:inline-flex;align-items:center;justify-content:center"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SEC_IC.exam}</svg></span>
          <div><div style="font-size:15px;font-weight:800;color:${GD}">${t.glance}</div><div style="font-size:11px;color:${MU}">${t.glanceS}</div></div></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">${tile(t.curPain, painV, painS, gauge)}${tile(t.areaT, esc(areas), esc(side))}${tile(t.fnT, esc(fnV))}${tile(t.expT, esc(expV))}</div>
        ${goals ? `<div style="font-size:12px;font-weight:700;color:${GD};margin:12px 0 6px">${t.goalsT}</div><div style="display:flex;flex-wrap:wrap;gap:8px">${goals}</div>` : ""}
      </div>`;
    }
    const pt = d.p, staffName = nm((o.appointment || {}).nurse || (d.staff && d.staff.name)), spec = d.staff && d.staff.specialty;
    const pkg = d.fol && d.fol.pkg && typeof MadaPhysio !== "undefined" ? MadaPhysio.item(d.fol.pkg.code) : null;
    let n = 0;
    const secs = secsOf(o).filter(k => k !== "patient" && k !== "glance" && !hid.has(k) && secHas(o, k)).map(k => card(k, `${++n}. ${t["s_" + k]}`, body(k), k)).join("")
      + (rp.custom || []).filter(c => has(c.title) || has(c.text)).map(c => card("cu", `${++n}. ${txt(c.title)}`, `<div style="font-size:12px;line-height:1.7;white-space:pre-line">${txt(c.text)}</div>`)).join("");
    const LOGO = typeof MadaReport !== "undefined" && MadaReport.LOGO ? MadaReport.LOGO : "assets/mada-logo.png";
    return `<div class="mr-doc" dir="${rtl ? "rtl" : "ltr"}" lang="${lang}" style="width:794px;max-width:100%;margin:0 auto;background:#fff;color:${INK};font-family:${rtl ? "Tajawal, Inter" : "Inter, Tajawal"}, Arial, sans-serif;text-align:${al};box-sizing:border-box">
      <div style="background:linear-gradient(120deg, ${GD}, ${G});color:#fff;padding:18px 24px;display:flex;align-items:center;gap:14px;border-radius:0 0 18px 18px">
        <span style="width:58px;height:58px;border-radius:50%;background:#fff;display:inline-flex;align-items:center;justify-content:center;flex:none"><img src="${LOGO}" style="height:40px;width:auto" alt=""></span>
        <div style="flex:1"><div style="font-size:20px;font-weight:700">Mada Care <span style="font-weight:500">| مدى كير</span></div><div style="font-size:11.5px;opacity:.85">${rtl ? "رعاية كالعائلة" : "Caring Like Family"}</div></div>
        <div style="text-align:${rtl ? "left" : "right"}"><div style="font-size:18px;font-weight:700">${t.title}</div>${isFollow(o) ? "" : `<div style="font-size:11.5px;font-weight:600;color:#f3e3b8">${t.subInit}</div>`}<div style="font-size:11px;opacity:.85">${t.reportNo}: ${ltr("PR-" + o.id.replace(/^ORD-/, ""))}</div><div style="font-size:11px;opacity:.85">${t.issued}: ${esc(fmtD(approved ? rp.approvedAt : now))}</div></div>
      </div>
      <div style="height:3px;background:${GOLD};margin:0 40px;border-radius:2px"></div>
      ${approved ? "" : `<div style="margin:10px 20px 0;padding:6px 12px;border-radius:8px;background:#fef3e2;color:#b45309;font-size:11.5px;font-weight:700;text-align:center">${t.draftTag}</div>`}
      <div style="padding:6px 20px 16px">
        ${hid.has("patient") ? "" : card("patient", t.patientT, `<div style="display:flex;flex-wrap:wrap;column-gap:16px">${kv(t.name, txt(pt.name[lang] || pt.name.en))}${kv(t.fileNo, pt.fileNo && ltr(pt.fileNo))}${kv(t.idNo, pt.idNumber && ltr(pt.idNumber))}
          ${kv(t.dob, pt.dob && esc(fmtD(pt.dob)))}${kv(t.age, has(pt.age) ? esc(tx(t.years, { n: pt.age })) : "")}${kv(t.gender, pt.gender ? t["g_" + pt.gender] : "")}${kv(t.mobile, pt.mobile && ltr(pt.mobile))}</div>`)}
        ${card("visit", t.visitT, `<div style="display:flex;flex-wrap:wrap;column-gap:16px">${kv(t.visitDate, esc(fmtD(d.date)))}${kv(t.visitNo, ltr(o.id))}${kv(t.type, esc(typeOf(o, lang)))}${kv(t.by, esc(staffName[lang] || staffName.en))}${kv(t.specialty, spec ? esc(nm(spec)[lang] || nm(spec).en) : "")}${kv(t.place, t.home)}${pkg ? kv(t.pkg, esc(nm(pkg.name)[lang] + " · " + pkg.code)) : ""}</div>`)}
        ${glance()}
        ${secs}
        <div class="pdf-avoid" style="break-inside:avoid;page-break-inside:avoid;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:16px;padding-top:12px;border-top:1px solid ${LINE}">
          <div><div style="width:180px;height:34px;border-bottom:1px dashed #b8c4c8;margin-bottom:4px"></div><div style="color:${MU};font-size:10.5px">${t.sign} · ${t.signLine}</div><div style="font-weight:700;font-size:13px">${esc(staffName[lang] || staffName.en)}</div><div style="color:${MU};font-size:11px">${spec ? esc(nm(spec)[lang] || nm(spec).en) : ""}</div>
            ${approved ? `<div style="color:${G};font-size:11px;font-weight:600;margin-top:4px">${esc(tx(t.apprBy, { n: nm(rp.approvedBy)[lang] || nm(rp.approvedBy).en || staffName[lang], d: fmtD(rp.approvedAt) }))}</div>` : ""}</div>
          <div style="color:${MU};font-size:10.5px;text-align:${rtl ? "left" : "right"}">${esc(tx(t.signNote, { d: fmtD(approved ? rp.approvedAt : now) }))}<br>${t.page}</div>
        </div>
      </div></div>`;
  }
  const ready = o => !!(o && o.service === "physio" && pvOf(o).status === "done");
  const approved = o => ready(o) && (pvOf(o).report || {}).status === "approved";
  const fileName = o => `Mada-Care-Physiotherapy-Report-${o.id}.pdf`;
  const download = (o, lang, toast) => MadaReport.save(html(o, lang), fileName(o), lang, toast);
  return { html, download, ready, approved, fileName, typeOf, isFollow, secsOf, secHas, L: R };
})();
