// The patient's lab results as a PDF (A4) the care team sends to the patient, to share with any hospital or doctor.
// Built from a sample card (lab-samples.js: MadaSamples.list/get), in English or Arabic, then saved with html2pdf.
// Shows the patient's identification from the patient file (mada-patients), the sample and report times, who ordered and who
// entered and approved the results, then every test with its result, unit, normal range and flag. Ranges are the ones set on
// Services > Laboratory (medical.js); nothing is added here.
// Downloaded from Lab Results (lab-results.html) and Request Details (request-details.html).
const MadaLabReport = (() => {
  const L = {
    en: { title: "Laboratory Report", reportNo: "Report No.", issued: "Issued", tag: "Home Healthcare", patient: "Patient", name: "Patient name", file: "File No.", id: "ID number", dob: "Date of birth",
      age: "Age", years: "{n} years", gender: "Gender", m: "Male", f: "Female", mobile: "Mobile", booking: "Booking No.", sample: "Sample", collected: "Collected", types: "Sample type",
      blood: "Blood", urine: "Urine", stool: "Stool", ordered: "Requested by", self: "Patient request · Mada Care", verify: "Results", enteredBy: "Entered and approved by", sentAt: "Released",
      docOk: "Reviewed by the doctor", docWait: "Sent to the doctor for review", sum: "Summary", nIn: "Within the normal range", nOut: "Outside the normal range", nCrit: "Critical",
      results: "Test Results", param: "Test", result: "Result", unit: "Unit", range: "Normal range", flag: "Flag", s_normal: "Normal", s_low: "Low", s_high: "High", s_critical: "Critical",
      textRes: "Result as in the laboratory report", docNote: "Doctor's note", notes: "Notes", n1: "Normal ranges are the laboratory's reference values. Your doctor reads the results with your history and examination.",
      n2: "A result marked High, Low or Critical does not always mean illness. Please discuss it with your doctor.", n3: "The original laboratory report is kept in your Mada Care file.",
      foot: "Mada Care · Home Healthcare · This report was issued electronically.", page: "Lab results", making: "Preparing the PDF…", done: "{f} downloaded.", fail: "Could not create the file here. Use Save as PDF in the print window." },
    ar: { title: "تقرير نتائج المختبر", reportNo: "رقم التقرير", issued: "تاريخ الإصدار", tag: "رعاية صحية منزلية", patient: "المريض", name: "اسم المريض", file: "رقم الملف", id: "رقم الهوية", dob: "تاريخ الميلاد",
      age: "العمر", years: "{n} سنة", gender: "الجنس", m: "ذكر", f: "أنثى", mobile: "الجوال", booking: "رقم الحجز", sample: "العينة", collected: "وقت السحب", types: "نوع العينة",
      blood: "دم", urine: "بول", stool: "براز", ordered: "جهة الطلب", self: "طلب المريض · مدى كير", verify: "النتائج", enteredBy: "أدخلها واعتمدها", sentAt: "وقت الإصدار",
      docOk: "راجعها الطبيب", docWait: "أُرسلت للطبيب للمراجعة", sum: "الملخص", nIn: "ضمن المعدل الطبيعي", nOut: "خارج المعدل الطبيعي", nCrit: "حرجة",
      results: "نتائج التحاليل", param: "التحليل", result: "النتيجة", unit: "الوحدة", range: "المعدل الطبيعي", flag: "الحالة", s_normal: "طبيعي", s_low: "منخفض", s_high: "مرتفع", s_critical: "حرج",
      textRes: "النتيجة كما في تقرير المختبر", docNote: "ملاحظة الطبيب", notes: "ملاحظات", n1: "المعدلات الطبيعية هي القيم المرجعية للمختبر، والطبيب يقرأ النتائج مع تاريخك المرضي والفحص.",
      n2: "النتيجة المرتفعة أو المنخفضة أو الحرجة ما تعني دائماً وجود مرض، ناقشها مع طبيبك.", n3: "تقرير المختبر الأصلي محفوظ في ملفك لدى مدى كير.",
      foot: "مدى كير · رعاية صحية منزلية · هذا التقرير صادر إلكترونياً.", page: "نتائج التحاليل", making: "جاري تجهيز ملف PDF…", done: "تم تنزيل {f}.", fail: "ما قدرنا ننشئ الملف هنا. استخدم حفظ كـ PDF من نافذة الطباعة." }
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nm = (v, lg) => v && typeof v === "object" ? v[lg] || v.en : v || "";
  // Date and time as HTML: numbers kept left to right in their own boxes so they read the same in Arabic.
  const when = (iso, lg) => { if (!iso) return "—"; const d = new Date(iso), p2 = n => String(n).padStart(2, "0"), h = d.getHours() % 12 || 12;
    const ap = d.getHours() < 12 ? (lg === "ar" ? "ص" : "AM") : (lg === "ar" ? "م" : "PM");
    return `<span dir="ltr" style="unicode-bidi:isolate">${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}</span> · <span dir="ltr" style="unicode-bidi:isolate">${h}:${p2(d.getMinutes())}</span> ${ap}`; };
  const fileOf = mrn => { try { return (MadaStore.getJSON("mada-patients", []) || []).find(p => p.fileNo === mrn) || {}; } catch (e) { return {}; } };
  const ageOf = dob => { const d = new Date(dob), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
  const G = "#0b6b5c", GD = "#07463d", INK = "#10232b", MU = "#6b7a80", LINE = "#e3e8ea", SOFT = "#f4f8f7", GOLD = "#c8a45a";
  const COL = { normal: ["#15803d", "#e7f6ec"], low: ["#b45309", "#fef3e2"], high: ["#b45309", "#fef3e2"], critical: ["#dc2626", "#fdecec"] };
  const reportNo = c => "LR-" + (c.o.bookingId || c.o.id || "").replace(/^BK-/, "") + (c.kind === "doctor" ? "-" + c.it.id.replace(/^IT-/, "") : "");

  function html(c, lg) {
    const t = L[lg], rtl = lg === "ar", al = rtl ? "right" : "left", ar2 = rtl ? "left" : "right", tx = (k, v) => t[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
    const ltr = v => `<span dir="ltr" style="unicode-bidi:isolate">${esc(v)}</span>`, o = c.o, p = fileOf(o.mrn);
    const rows = c.tests.flatMap(x => x.an.map(a => ({ x, a, v: x.entry && x.entry.values ? x.entry.values[a.code] : null }))).map(r => ({ ...r, s: MadaSamples.labStatus(r.a, r.v) })).filter(r => r.s);
    const nIn = rows.filter(r => r.s === "normal").length, nCrit = rows.filter(r => r.s === "critical").length, nOut = rows.length - nIn - nCrit;
    const kv = (k, v) => `<div style="padding:4px 0"><div style="color:${MU};font-size:10px">${esc(k)}</div><div style="font-weight:600;color:${INK};font-size:12px">${v}</div></div>`;
    const box = (title, body) => `<div class="pdf-avoid" style="border:1px solid ${LINE};border-radius:12px;padding:10px 14px;background:#fff"><div style="font-size:11px;font-weight:700;color:${G};margin-bottom:4px">${esc(title)}</div>${body}</div>`;
    const types = [...new Set(c.tests.map(x => x.sample || "blood"))].map(s => t[s] || s).join(rtl ? "، " : ", ");
    const flagCell = s => { const [fg, bg] = COL[s]; return `<span style="display:inline-block;padding:3px 10px;border-radius:11px;background:${bg};color:${fg};font-weight:700;font-size:10.5px">${esc(t["s_" + s])}${rtl ? "" : s === "high" ? " ▲" : s === "low" ? " ▼" : s === "critical" ? " !" : ""}</span>`; };
    const range = a => a.low != null && a.high != null ? `${a.low}–${a.high}` : a.high != null ? `≤${a.high}` : a.low != null ? `≥${a.low}` : "—";
    const th = (txt, align) => `<th style="text-align:${align || al};padding:7px 10px;font-weight:600;font-size:10.5px;color:#44545a">${esc(txt)}</th>`;
    const tests = c.tests.map(x => {
      const head = `<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:${SOFT};border-bottom:1px solid ${LINE}"><b style="font-size:12.5px;color:${INK}">${esc(nm(x.name, lg))}</b><span style="font-size:10px;font-weight:700;color:${G};background:#e3f4ee;padding:1px 7px;border-radius:6px">${ltr(x.code)}</span></div>`;
      if (!x.an.length) return `<div class="pdf-avoid" style="border:1px solid ${LINE};border-radius:12px;overflow:hidden;margin-top:8px">${head}<div style="padding:9px 12px;font-size:11.5px"><div style="color:${MU};font-size:10px;margin-bottom:3px">${esc(t.textRes)}</div><div dir="${/[\u0600-\u06FF]/.test((x.entry || {}).text || "") ? "rtl" : "ltr"}" style="white-space:pre-line;font-weight:600;unicode-bidi:isolate;text-align:${al}">${esc((x.entry || {}).text)}</div></div></div>`;
      return `<div class="pdf-avoid" style="border:1px solid ${LINE};border-radius:12px;overflow:hidden;margin-top:8px">${head}<table style="width:100%;border-collapse:collapse;font-size:11.5px">
        <tr>${th(t.param)}${th(t.result, "center")}${th(t.unit)}${th(t.range)}${th(t.flag, "center")}</tr>
        ${x.an.map(a => { const v = x.entry && x.entry.values ? x.entry.values[a.code] : null, s = MadaSamples.labStatus(a, v), fg = s ? COL[s][0] : INK;
          return `<tr style="${s && s !== "normal" ? `background:${s === "critical" ? "#fff8f8" : "#fffcf6"}` : ""}"><td style="padding:6px 10px;border-top:1px solid #eef2f3">${esc(nm(a.name, lg))}</td>
            <td style="padding:6px 10px;border-top:1px solid #eef2f3;text-align:center"><b style="font-size:13px;color:${fg}">${ltr(v == null ? "—" : v)}</b></td>
            <td style="padding:6px 10px;border-top:1px solid #eef2f3;color:#44545a">${ltr(a.unit || "")}</td><td style="padding:6px 10px;border-top:1px solid #eef2f3;color:#44545a">${ltr(range(a))}</td>
            <td style="padding:6px 10px;border-top:1px solid #eef2f3;text-align:center">${s ? flagCell(s) : ""}</td></tr>`; }).join("")}</table></div>`;
    }).join("");
    const big = (n, label, fg, bg) => `<div style="flex:1;border-radius:10px;background:${bg};padding:8px 10px;text-align:center"><div style="font-size:20px;font-weight:700;color:${fg};line-height:1.1">${n}</div><div style="font-size:10px;color:${fg};font-weight:600;margin-top:2px">${esc(label)}</div></div>`;
    const doctor = c.kind === "doctor" ? nm(c.doctor, lg) : t.self, rv = c.review;
    const ls = rtl ? "" : "letter-spacing:.14em;text-transform:uppercase;";
    return `<div dir="${rtl ? "rtl" : "ltr"}" style="width:744px;padding:14px 18px 10px;background:#fff;color:${INK};font-family:${rtl ? "Tajawal, Inter" : "Inter, Tajawal"}, Arial, sans-serif;text-align:${al};line-height:1.4">
      <div style="border-radius:16px;padding:14px 20px;background:linear-gradient(135deg, ${G} 0%, ${GD} 100%);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:18px">
        <div style="display:flex;align-items:center;gap:12px"><span style="width:54px;height:54px;border-radius:50%;background:#fff;display:inline-flex;align-items:center;justify-content:center"><img src="assets/mada-logo.png" style="height:38px;width:auto" alt=""></span>
          <div><div style="font-size:20px;font-weight:700">Mada Care</div><div style="font-size:11px;opacity:.85">${esc(t.tag)}</div></div></div>
        <div style="text-align:${ar2}"><div style="font-size:11px;${ls}color:#f3e3bd">${esc(t.title)}</div><div style="font-size:22px;font-weight:700;margin:2px 0">${ltr(reportNo(c))}</div>
          <div style="font-size:10.5px;opacity:.85">${esc(t.issued)} ${when(new Date().toISOString(), lg)}</div></div>
      </div>
      <div style="height:3px;background:${GOLD};border-radius:2px;margin:0 24px"></div>

      <div class="pdf-avoid" style="margin-top:12px;border:1px solid ${LINE};border-radius:14px;padding:12px 16px;background:${SOFT}">
        <div style="font-size:10.5px;color:${MU}">${esc(t.name)}</div><div style="font-size:19px;font-weight:700;margin:1px 0 6px">${esc(nm(o.patient, lg) || nm(p.name, lg) || "—")}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px 14px">${[o.mrn && kv(t.file, ltr(o.mrn)), p.idNumber && kv(t.id, ltr(p.idNumber)),
          p.dateOfBirth && kv(t.dob, ltr(p.dateOfBirth) + ` <span style="color:${MU};font-weight:500">${esc(tx("years", { n: ageOf(p.dateOfBirth) }))}</span>`), p.gender && kv(t.gender, esc(t[p.gender])),
          (o.mobile || p.mobile) && kv(t.mobile, ltr(o.mobile || p.mobile)), o.bookingId && kv(t.booking, ltr(o.bookingId))].filter(Boolean).join("")}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">
        ${box(t.sample, kv(t.collected, when(c.collectedAt, lg)) + kv(t.types, esc(types)))}
        ${box(t.ordered, kv(t.ordered, esc(doctor || "—")) + (c.kind === "doctor" ? kv(rv ? t.docOk : t.docWait, rv ? when(rv.at, lg) : "—") : ""))}
        ${box(t.verify, kv(t.enteredBy, esc(nm(c.sentBy, lg) || nm(c.nurse, lg) || "—")) + kv(t.sentAt, when(c.sentAt, lg)))}
      </div>

      ${rows.length ? `<div class="pdf-avoid" style="display:flex;gap:8px;margin-top:8px">${big(nIn, t.nIn, "#15803d", "#e7f6ec")}${big(nOut, t.nOut, "#b45309", "#fef3e2")}${big(nCrit, t.nCrit, "#dc2626", "#fdecec")}</div>` : ""}

      <div style="font-size:13px;font-weight:700;color:${INK};margin:12px 2px 0">${esc(t.results)}</div>
      ${tests}

      ${rv && rv.note ? `<div class="pdf-avoid" style="margin-top:8px;border:1px solid #bfe3cb;border-radius:12px;padding:10px 14px;background:#f6fcf8"><div style="font-size:11px;font-weight:700;color:${G};margin-bottom:3px">${esc(t.docNote)}</div><div style="font-size:11.5px;line-height:1.6">${esc(rv.note)}</div></div>` : ""}
      <div class="pdf-avoid" style="margin-top:8px;border:1px solid ${LINE};border-radius:12px;padding:10px 14px"><div style="font-size:11px;font-weight:700;color:${G};margin-bottom:3px">${esc(t.notes)}</div>
        <div style="font-size:10.5px;color:#44545a;line-height:1.6">• ${esc(t.n1)}<br>• ${esc(t.n2)}<br>• ${esc(t.n3)}</div></div>
      <div style="margin-top:10px;padding-top:8px;border-top:1px solid ${LINE};display:flex;justify-content:space-between;gap:12px;font-size:9.5px;color:#8a979c"><span>${esc(t.foot)}</span><span>${ltr(reportNo(c))}</span></div>
    </div>`;
  }
  // The PDF renderer draws each line left to right, which drops the spaces between Arabic words: give each word its own box (as lab-test.html does).
  function fixArabic(wrap) {
    const walk = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT), nodes = [];
    // Left-to-right parts (numbers, codes, English text) are drawn correctly as they are. Inline ones are single words (ranges have no spaces).
    while (walk.nextNode()) if (walk.currentNode.nodeValue.trim() && (walk.currentNode.parentElement.closest("[dir]") || {}).dir !== "ltr") nodes.push(walk.currentNode);
    nodes.forEach(nd => {
      const frag = document.createDocumentFragment();
      // A bracketed part such as "(HGB)" stays one left-to-right box so the brackets come out the right way round.
      nd.nodeValue.split(/(\([^()]*\)|\s+|[()،,.:·\-–]+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
        // Arabic inside brackets, such as "(تجريبية)": brackets and words each get their own box like the rest of the line (the renderer does not mirror a lone bracket, so it is swapped here).
        else if (/^\(.*\)$/.test(part) && /[\u0600-\u06FF]/.test(part)) part.split(/(\s+|[()])/).forEach(q => { if (!q) return; if (/^\s+$/.test(q)) frag.appendChild(document.createTextNode(q)); else { const sp = document.createElement("span"); sp.textContent = q === "(" ? ")" : q === ")" ? "(" : q; frag.appendChild(sp); } });
        else { const sp = document.createElement("span"); sp.textContent = part; if (/^\(.*\)$/.test(part)) { sp.dir = "ltr"; sp.style.unicodeBidi = "isolate"; } frag.appendChild(sp); }
      });
      nd.replaceWith(frag);
    });
  }
  const H2P = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
  const loadH2p = () => window.html2pdf ? Promise.resolve() : new Promise((ok, bad) => { const sc = document.createElement("script"); sc.src = H2P; sc.onload = ok; sc.onerror = bad; document.head.appendChild(sc); });
  const withTimeout = (pr, ms) => Promise.race([pr, new Promise((_, bad) => setTimeout(() => bad(new Error("timeout")), ms))]);
  // Saves the PDF. toast(msg) shows progress. Falls back to the print window when the PDF library can't load.
  async function download(c, lg, toast) {
    toast = toast || (() => {}); const t = L[lg], file = `Mada-Care-Lab-Results-${reportNo(c)}${lg === "ar" ? "-AR" : ""}.pdf`;
    const wrap = document.createElement("div"); wrap.style.cssText = "position:fixed;left:-10000px;top:0;z-index:-1";
    wrap.innerHTML = html(c, lg); document.body.appendChild(wrap);
    if (lg === "ar") fixArabic(wrap);
    toast(t.making);
    const sy = window.scrollY; window.scrollTo(0, 0);
    try {
      await withTimeout(loadH2p(), 10000);
      await withTimeout(window.html2pdf().set({ margin: [6, 6], filename: file, pagebreak: { mode: ["css"], avoid: ".pdf-avoid" }, image: { type: "jpeg", quality: 0.96 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(wrap.firstElementChild).save(), 25000);
      toast(t.done.replace("{f}", file));
    } catch (e) {
      const w = window.open("", "_blank");
      if (w) { w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${file}</title><base href="${location.href}"></head><body style="margin:0">${html(c, lg)}<script>onload=()=>print()<\/script></body></html>`); w.document.close(); }
      toast(t.fail);
    } finally { wrap.remove(); window.scrollTo(0, sy); }
  }
  // Any page: <button data-lrp="card key" data-lg="en|ar"> downloads that card's report.
  const btn = (key, lg, label) => `<button type="button" data-lrp="${esc(key)}" data-lg="${lg}" style="display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px;border-radius:9px;border:1px solid ${G};background:${G};color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>${esc(label)}</button>`;
  const btnLabel = (lg, forLg) => (lg === "ar" ? "PDF للمريض · " : "Patient PDF · ") + (forLg === "ar" ? "عربي" : "English");
  if (typeof document !== "undefined") document.addEventListener("click", async e => {
    const b = e.target.closest("[data-lrp]"); if (!b || b.disabled) return;
    const c = MadaSamples.get(null, b.dataset.lrp); if (!c || !c.sent) return;
    const ui = document.documentElement.lang === "ar" ? "ar" : "en", toast = window.toast || (m => {}); b.disabled = true;
    try { await download(c, b.dataset.lg || ui, typeof toast === "function" ? toast : null); } finally { b.disabled = false; }
  });
  const buttons = (key, ui) => btn(key, "en", btnLabel(ui, "en")) + btn(key, "ar", btnLabel(ui, "ar"));
  // fixArabic, loadH2p, when, fileOf and ageOf are shared with the imaging report (rad-report.js).
  return { html, download, reportNo, buttons, L, fixArabic, loadH2p, withTimeout, when, fileOf, ageOf, esc };
})();
