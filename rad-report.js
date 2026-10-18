// The patient's imaging report as one PDF (A4) the care team sends to the patient, to share with any hospital or doctor.
// Page 1 is Mada Care's cover (patient, exam, the imaging center and its logo); page 2 is "Report sent from the radiology center"
// (patient, file, mobile, exam date, center, the doctor's comment and the center's responsibility statement). The imaging center's own report (the file reception attached on the
// Medical Requests page) follows as the next pages: a PDF is joined page by page (pdf-lib), a photo gets its own page.
// Built from a medical request's radiology item (medical.js): steps ordered → scheduled { center, date } → resulted { file, result } → reviewed { docNote }.
// Needs lab-report.js (shared header style, Arabic fix and html2pdf loader).
const MadaRadReport = (() => {
  const L = {
    en: { title: "Imaging Report", reportNo: "Report No.", issued: "Issued", tag: "Home Healthcare", name: "Patient name", file: "File No.", id: "ID number", dob: "Date of birth",
      years: "{n} years", gender: "Gender", m: "Male", f: "Female", mobile: "Mobile", booking: "Booking No.",
      exam: "Exam", reason: "Clinical details", center: "Imaging center", contracted: "Contracted imaging center of Mada Care", examDate: "Exam date", repAt: "Report received",
      doctor: "Requested and reviewed by", reqBy: "Requested by", revAt: "Reviewed", sum: "Report summary", docNote: "Doctor's comment",
      attached: "The imaging center's original report is attached on the next pages.", noFile: "The imaging center's report is kept in your Mada Care file.",
      foot: "Mada Care · Home Healthcare · This report was issued electronically.", making: "Preparing the PDF…", done: "{f} downloaded.",
      partial: "The cover was downloaded and the center's report opened in a new tab. Joining the files needs an internet connection.", fail: "Could not create the file here. Try again.",
      coverKicker: "Patient report", coverNote: "Caring Like Family", sentKicker: "Radiology center report", sentTitle: "Report sent from the radiology center", fileLong: "Medical file number", radCenter: "Radiology center", radType: "Imaging center", centerName: "Center name",
      disclaimer: "This report is issued and approved by the responsible radiology center, which is responsible for its findings and interpretation. MADA CARE facilitates the delivery of the report to the patient." },
    ar: { title: "تقرير الأشعة", reportNo: "رقم التقرير", issued: "تاريخ الإصدار", tag: "رعاية صحية منزلية", name: "اسم المريض", file: "رقم الملف", id: "رقم الهوية", dob: "تاريخ الميلاد",
      years: "{n} سنة", gender: "الجنس", m: "ذكر", f: "أنثى", mobile: "الجوال", booking: "رقم الحجز",
      exam: "الفحص", reason: "المعلومات السريرية", center: "مركز الأشعة", contracted: "مركز أشعة متعاقد مع مدى كير", examDate: "تاريخ الفحص", repAt: "وصول التقرير",
      doctor: "طلبها وراجعها", reqBy: "طلبها", revAt: "وقت المراجعة", sum: "ملخص التقرير", docNote: "تعليق الطبيب",
      attached: "تقرير مركز الأشعة الأصلي مرفق في الصفحات التالية.", noFile: "تقرير مركز الأشعة محفوظ في ملفك لدى مدى كير.",
      foot: "مدى كير · رعاية صحية منزلية · هذا التقرير صادر إلكترونياً.", making: "جاري تجهيز ملف PDF…", done: "تم تنزيل {f}.",
      partial: "نزل الغلاف وانفتح تقرير المركز في تبويب جديد. دمج الملفين يحتاج اتصال بالإنترنت.", fail: "ما قدرنا ننشئ الملف هنا. حاول مرة ثانية.",
      coverKicker: "تقرير المريض", coverNote: "رعاية كالعائلة", sentKicker: "تقرير مركز الأشعة", sentTitle: "تقرير مرسل من مركز الأشعة", fileLong: "رقم الملف الطبي", radCenter: "مركز الأشعة", radType: "مركز أشعة", centerName: "اسم المركز",
      disclaimer: "هذا التقرير صادر ومعتمد من مركز الأشعة المسؤول، وهو المسؤول عن نتائجه وتفسيرها. وتقوم مدى كير بتسهيل إيصال التقرير إلى المريض." }
  };
  const LR = () => MadaLabReport;
  const nm = (v, lg) => v && typeof v === "object" ? v[lg] || v.en : v || "";
  const G = "#0b6b5c", GD = "#07463d", INK = "#10232b", MU = "#6b7a80", LINE = "#e3e8ea", SOFT = "#f4f8f7", GOLD = "#c8a45a";
  const S = () => MadaMedical.STEPS.radiology;
  const logOf = (it, k) => [...(it.log || [])].reverse().find(l => S()[l.step] === k) || null;
  const reportNo = (r, it) => "RR-" + String(r.id).replace(/^MR-/, "") + "-" + String(it.id).replace(/^IT-/, "");
  const fileOfItem = it => { const l = logOf(it, "resulted"); return it.report || (l && l.data && l.data.file) || null; };
  const doctorOf = r => { const d = typeof MadaOrders !== "undefined" && (MadaOrders.DOCTORS || []).find(x => x.id === r.doctorId); return d ? d.name : r.byDoctor; };
  const ready = it => it.type === "radiology" && !!logOf(it, "reviewed") && !it.rejected;

  function html(r, it, lg) {
    const t = L[lg], rtl = lg === "ar", al = rtl ? "right" : "left";
    const { esc, when, fileOf } = LR(), ltr = v => `<span dir="ltr" style="unicode-bidi:isolate">${esc(v)}</span>`;
    const p = fileOf(r.mrn);
    const sc = (logOf(it, "scheduled") || {}).data || {}, pv = sc.providerId && typeof MadaProviders !== "undefined" ? MadaProviders.get(sc.providerId) : null,
      rs = logOf(it, "resulted"), rv = logOf(it, "reviewed"), file = fileOfItem(it);
    const day = d => { if (!d) return "—"; const [y, m, dd] = String(d).slice(0, 10).split("-"); return ltr(`${dd}/${m}/${y}`); };
    // Free text keeps its own direction (an Arabic comment in the English report too).
    const para = v => { const r2 = /[؀-ۿ]/.test(v); return `<div dir="${r2 ? "rtl" : "ltr"}" style="white-space:pre-line;font-size:12.5px;line-height:1.7;color:${INK};text-align:${r2 ? "right" : "left"}">${esc(v)}</div>`; };
    const ls = rtl ? "" : "letter-spacing:.16em;text-transform:uppercase;";
    const note = rv && rv.data && rv.data.docNote, exam = nm(it.title, lg), pname = nm(r.patient, lg) || nm(p.name, lg) || "—";
    const center = (pv && (pv.name[lg] || pv.name.en)) || sc.center || "—", no = reportNo(r, it), font = `${rtl ? "Tajawal, Inter" : "Inter, Tajawal"}, Arial, sans-serif`;
    const logoBox = (w, h) => pv && pv.logo ? `<span style="width:${w}px;height:${h}px;border-radius:14px;background:#fff;border:1px solid ${LINE};display:inline-flex;align-items:center;justify-content:center;padding:8px;box-sizing:border-box"><img src="${pv.logo}" style="max-width:100%;max-height:100%;object-fit:contain" alt=""></span>`
      : `<span style="width:${h}px;height:${h}px;border-radius:14px;background:#e3f4ee;color:${G};display:inline-flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="${h / 2}" height="${h / 2}" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 8v8M9 10h6M9 13h6"/></svg></span>`;
    // One row of the details page: label, then the value.
    const row = (k, v, last) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 4px;${last ? "" : `border-bottom:1px solid ${LINE};`}"><span style="font-size:12px;color:${MU}">${esc(k)}</span><span style="font-size:14px;font-weight:700;color:${INK};text-align:${rtl ? "left" : "right"}">${v}</span></div>`;
    const foot = `<div style="position:absolute;left:52px;right:52px;bottom:34px;padding-top:10px;border-top:1px solid ${LINE};display:flex;justify-content:space-between;gap:12px;font-size:9.5px;color:#8a979c"><span>${esc(t.foot)}</span><span>${ltr(no)}</span></div>`;

    // Page 1: the cover.
    const cover = `<div style="position:relative;height:1120px;overflow:hidden;background:#fff">
      <div style="position:relative;height:600px;background:linear-gradient(150deg, ${G} 0%, ${GD} 70%);color:#fff;padding:52px 52px 0;box-sizing:border-box;overflow:hidden">
        <div style="position:absolute;width:520px;height:520px;border-radius:50%;border:1px solid rgba(255,255,255,.08);${rtl ? "left" : "right"}:-200px;top:-180px"></div>
        <div style="position:absolute;width:360px;height:360px;border-radius:50%;border:1px solid rgba(200,164,90,.28);${rtl ? "left" : "right"}:-110px;top:-90px"></div>
        <div style="display:flex;align-items:center;gap:14px"><span style="width:64px;height:64px;border-radius:50%;background:#fff;display:inline-flex;align-items:center;justify-content:center"><img src="assets/mada-logo.png" style="height:44px;width:auto" alt=""></span>
          <div><div style="font-size:24px;font-weight:700">Mada Care</div><div style="font-size:12px;opacity:.85">${esc(t.tag)}</div></div></div>
        <div style="margin-top:120px;font-size:13px;${ls}color:#f3e3bd">${esc(t.coverKicker)}</div>
        <div style="font-size:46px;font-weight:700;line-height:1.15;margin-top:8px">${esc(t.title)}</div>
        <div style="width:90px;height:4px;background:${GOLD};border-radius:2px;margin:20px 0 18px"></div>
        <div style="font-size:20px;font-weight:600;opacity:.95">${esc(exam || "—")}</div>
        <div style="font-size:12.5px;opacity:.8;margin-top:8px">${esc(t.reportNo)} ${ltr(no)}</div>
      </div>
      <div style="padding:0 52px">
        <div style="margin-top:-56px;position:relative;background:#fff;border-radius:18px;box-shadow:0 10px 30px rgba(7,70,61,.14);border:1px solid ${LINE};padding:22px 26px;display:grid;grid-template-columns:1fr 1fr;gap:16px 24px">
          <div><div style="font-size:11px;color:${MU}">${esc(t.name)}</div><div style="font-size:19px;font-weight:700;margin-top:3px">${esc(pname)}</div></div>
          <div><div style="font-size:11px;color:${MU}">${esc(t.file)}</div><div style="font-size:17px;font-weight:700;margin-top:3px">${ltr(r.mrn || "—")}</div></div>
          <div><div style="font-size:11px;color:${MU}">${esc(t.examDate)}</div><div style="font-size:15px;font-weight:600;margin-top:3px">${day(sc.date)}</div></div>
          <div><div style="font-size:11px;color:${MU}">${esc(t.issued)}</div><div style="font-size:15px;font-weight:600;margin-top:3px">${when(new Date().toISOString(), lg)}</div></div>
        </div>
        <div style="margin-top:34px;display:flex;align-items:center;gap:18px">
          ${logoBox(150, 78)}
          <div><div style="font-size:11px;color:${MU}">${esc(t.center)}</div><div style="font-size:18px;font-weight:700;margin-top:2px">${esc(center)}</div>
            <div style="display:inline-block;margin-top:6px;padding:4px 12px;border-radius:12px;background:#fbf4e4;color:#8a6a1f;font-size:11px;font-weight:700">${esc(t.contracted)}</div></div>
        </div>
      </div>
      <div style="position:absolute;left:52px;right:52px;bottom:76px;display:flex;align-items:center;gap:14px;color:${GD}">
        <span style="flex:1;height:1px;background:${LINE}"></span><span style="font-size:12px;font-weight:600">${esc(t.coverNote)}</span><span style="flex:1;height:1px;background:${LINE}"></span></div>
      ${foot}
      <div style="position:absolute;left:0;right:0;bottom:0;height:10px;background:linear-gradient(90deg, ${G}, ${GD})"></div><div style="position:absolute;left:0;right:0;bottom:10px;height:3px;background:${GOLD}"></div>
    </div>`;

    // Page 2: the report sent from the imaging center, with the responsibility statement.
    const info = `<div style="position:relative;height:1120px;overflow:hidden;background:#fff;padding:46px 52px 0;box-sizing:border-box;page-break-before:always">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:3px solid ${GOLD}">
        <div style="display:flex;align-items:center;gap:10px"><img src="assets/mada-logo.png" style="height:34px;width:auto" alt=""><div><div style="font-size:16px;font-weight:700;color:${GD}">Mada Care</div><div style="font-size:10.5px;color:${MU}">${esc(t.tag)}</div></div></div>
        <div style="font-size:11px;color:${MU};text-align:${rtl ? "left" : "right"}">${esc(t.reportNo)}<div style="font-size:14px;font-weight:700;color:${INK}">${ltr(no)}</div></div>
      </div>
      <div style="margin-top:26px;display:flex;align-items:center;gap:16px">
        ${logoBox(120, 64)}
        <div><div style="font-size:12px;${ls}color:${G};font-weight:700">${esc(t.sentKicker)}</div><div style="font-size:24px;font-weight:700;margin-top:2px">${esc(t.sentTitle)}</div></div>
      </div>
      <div style="margin-top:22px;border:1px solid ${LINE};border-radius:16px;padding:6px 20px;background:${SOFT}">
        ${row(t.name, esc(pname))}${row(t.fileLong, ltr(r.mrn || "—"))}${row(t.mobile, ltr(r.mobile || p.mobile || "—"))}${row(t.exam, esc(exam || "—"))}${row(t.examDate, day(sc.date))}
        ${row(t.radCenter, pv && pv.logo ? `<img src="${pv.logo}" style="height:30px;max-width:150px;object-fit:contain;vertical-align:middle" alt="">` : esc(t.radType))}${row(t.centerName, esc(center), true)}
      </div>
      ${note ? `<div class="pdf-avoid" style="margin-top:16px;border:1px solid #bfe3cb;border-radius:14px;padding:12px 18px;background:#f6fcf8"><div style="font-size:11.5px;font-weight:700;color:${G};margin-bottom:4px">${esc(t.docNote)}${rv ? ` · <span style="font-weight:500;color:${MU}">${esc(nm(doctorOf(r), lg) || "")}</span>` : ""}</div>${para(note)}</div>` : ""}
      <div style="margin-top:18px;border-radius:14px;padding:16px 20px;background:#fbf8f0;border:1px solid #ecdcb5;display:flex;gap:12px;align-items:flex-start">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#8a6a1f" stroke-width="1.9" style="flex:none;margin-top:1px"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>
        <div style="font-size:12.5px;line-height:1.75;color:#5c4a1c">${esc(t.disclaimer)}</div>
      </div>
      <div style="margin-top:14px;display:flex;align-items:center;gap:10px;font-size:12px;color:${GD};font-weight:600">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/></svg><span>${esc(file ? t.attached : t.noFile)}</span></div>
      ${foot}
    </div>`;
    return `<div dir="${rtl ? "rtl" : "ltr"}" style="width:794px;background:#fff;color:${INK};font-family:${font};text-align:${al};line-height:1.4">${cover}${info}</div>`;
  }

  const PDFLIB = ["https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js", "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"];
  const loadScript = src => new Promise((ok, bad) => { const sc = document.createElement("script"); sc.src = src; sc.onload = ok; sc.onerror = bad; document.head.appendChild(sc); });
  const loadPdfLib = async () => { if (window.PDFLib) return; for (const u of PDFLIB) { try { await loadScript(u); if (window.PDFLib) return; } catch (e) {} } throw new Error("pdf-lib"); };
  const bytesOf = url => { const bin = atob(url.split(",")[1]), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); return buf; };
  // A photo in any format the browser shows, as JPEG bytes for the PDF.
  const toJpeg = url => new Promise((ok, bad) => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0); ok(bytesOf(c.toDataURL("image/jpeg", 0.92))); }; im.onerror = bad; im.src = url; });
  function save(bytes, name) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  // Saves cover + the center's report as one PDF. toast(msg) shows progress.
  async function download(r, it, lg, toast) {
    toast = toast || (() => {}); const t = L[lg], X = LR(), name = `Mada-Care-Imaging-Report-${reportNo(r, it)}${lg === "ar" ? "-AR" : ""}.pdf`;
    const f = fileOfItem(it), url = f && MadaStore.get(f.key);
    const wrap = document.createElement("div"); wrap.style.cssText = "position:fixed;left:-10000px;top:0;z-index:-1";
    wrap.innerHTML = html(r, it, lg); document.body.appendChild(wrap);
    X.fixArabic(wrap); // Arabic words (the whole report, or an Arabic comment in the English one) keep their spaces
    toast(t.making);
    const sy = window.scrollY; window.scrollTo(0, 0);
    let cover = null;
    try {
      await X.withTimeout(X.loadH2p(), 10000);
      cover = await X.withTimeout(window.html2pdf().set({ margin: 0, pagebreak: { mode: ["css"], avoid: ".pdf-avoid" }, image: { type: "jpeg", quality: 0.96 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(wrap.firstElementChild).outputPdf("arraybuffer"), 25000);
    } catch (e) { toast(t.fail); return false; } finally { wrap.remove(); window.scrollTo(0, sy); }
    if (!url) { save(cover, name); toast(t.done.replace("{f}", name)); return true; }
    try {
      await X.withTimeout(loadPdfLib(), 10000);
      const { PDFDocument } = window.PDFLib, out = await PDFDocument.load(cover);
      if (/pdf/i.test(f.type || "") || /^data:application\/pdf/.test(url)) {
        const src = await PDFDocument.load(bytesOf(url), { ignoreEncryption: true });
        (await out.copyPages(src, src.getPageIndices())).forEach(pg => out.addPage(pg));
      } else {
        const img = await out.embedJpg(await toJpeg(url)), W = 595.28, H = 841.89, M = 28, k = Math.min((W - 2 * M) / img.width, (H - 2 * M) / img.height);
        out.addPage([W, H]).drawImage(img, { x: (W - img.width * k) / 2, y: (H - img.height * k) / 2, width: img.width * k, height: img.height * k });
      }
      save(await out.save(), name); toast(t.done.replace("{f}", name)); return true;
    } catch (e) {
      // No pdf-lib (offline) or a report it can't read: the cover alone, and the center's report opened as it is.
      save(cover, name);
      window.open(URL.createObjectURL(new Blob([bytesOf(url)], { type: f.type || "application/octet-stream" })), "_blank");
      toast(t.partial); return false;
    }
  }
  // Any page: <button data-rrp="MR-id|IT-id" data-lg="en|ar"> downloads that imaging report.
  const btnLabel = (ui, forLg) => (ui === "ar" ? "تقرير الأشعة للمريض · " : "Patient imaging report · ") + (forLg === "ar" ? "عربي" : "English");
  const btn = (r, it, lg, ui) => `<button type="button" class="btn btn-primary btn-sm" data-rrp="${LR().esc(r.id + "|" + it.id)}" data-lg="${lg}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>${LR().esc(btnLabel(ui, lg))}</button>`;
  const buttons = (r, it, ui) => btn(r, it, "en", ui) + btn(r, it, "ar", ui);
  if (typeof document !== "undefined") document.addEventListener("click", async e => {
    const b = e.target.closest("[data-rrp]"); if (!b || b.disabled) return;
    const [rid, iid] = b.dataset.rrp.split("|"), r = MadaMedical.get(rid), it = r && r.items.find(x => x.id === iid); if (!it || !ready(it)) return;
    b.disabled = true;
    try { await download(r, it, b.dataset.lg || "en", typeof window.toast === "function" ? window.toast : null); } finally { b.disabled = false; }
  });
  return { html, download, buttons, ready, reportNo, L };
})();
