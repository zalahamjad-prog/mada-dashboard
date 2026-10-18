// The patient's imaging report as one PDF (A4) the care team sends to the patient, to share with any hospital or doctor.
// Page 1 is Mada Care's cover: the patient's identification (mada-patients), the exam, the imaging center Mada Care works with,
// who requested it and the doctor's review and comment. The imaging center's own report (the file reception attached on the
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
      partial: "The cover was downloaded and the center's report opened in a new tab. Joining the files needs an internet connection.", fail: "Could not create the file here. Try again." },
    ar: { title: "تقرير الأشعة", reportNo: "رقم التقرير", issued: "تاريخ الإصدار", tag: "رعاية صحية منزلية", name: "اسم المريض", file: "رقم الملف", id: "رقم الهوية", dob: "تاريخ الميلاد",
      years: "{n} سنة", gender: "الجنس", m: "ذكر", f: "أنثى", mobile: "الجوال", booking: "رقم الحجز",
      exam: "الفحص", reason: "المعلومات السريرية", center: "مركز الأشعة", contracted: "مركز أشعة متعاقد مع مدى كير", examDate: "تاريخ الفحص", repAt: "وصول التقرير",
      doctor: "طلبها وراجعها", reqBy: "طلبها", revAt: "وقت المراجعة", sum: "ملخص التقرير", docNote: "تعليق الطبيب",
      attached: "تقرير مركز الأشعة الأصلي مرفق في الصفحات التالية.", noFile: "تقرير مركز الأشعة محفوظ في ملفك لدى مدى كير.",
      foot: "مدى كير · رعاية صحية منزلية · هذا التقرير صادر إلكترونياً.", making: "جاري تجهيز ملف PDF…", done: "تم تنزيل {f}.",
      partial: "نزل الغلاف وانفتح تقرير المركز في تبويب جديد. دمج الملفين يحتاج اتصال بالإنترنت.", fail: "ما قدرنا ننشئ الملف هنا. حاول مرة ثانية." }
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
    const t = L[lg], rtl = lg === "ar", al = rtl ? "right" : "left", ar2 = rtl ? "left" : "right", tx = (k, v) => t[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
    const { esc, when, fileOf, ageOf } = LR(), ltr = v => `<span dir="ltr" style="unicode-bidi:isolate">${esc(v)}</span>`;
    const p = fileOf(r.mrn), o = (typeof MadaOrders !== "undefined" && MadaOrders.get(r.orderId)) || {};
    const sc = (logOf(it, "scheduled") || {}).data || {}, pv = sc.providerId && typeof MadaProviders !== "undefined" ? MadaProviders.get(sc.providerId) : null, rs = logOf(it, "resulted"), rv = logOf(it, "reviewed"), file = fileOfItem(it);
    const day = d => { if (!d) return "—"; const [y, m, dd] = String(d).slice(0, 10).split("-"); return ltr(`${dd}/${m}/${y}`); };
    const kv = (k, v) => `<div style="padding:4px 0"><div style="color:${MU};font-size:10px">${esc(k)}</div><div style="font-weight:600;color:${INK};font-size:12px">${v}</div></div>`;
    const box = (title, body) => `<div class="pdf-avoid" style="border:1px solid ${LINE};border-radius:12px;padding:10px 14px;background:#fff"><div style="font-size:11px;font-weight:700;color:${G};margin-bottom:4px">${esc(title)}</div>${body}</div>`;
    // Free text keeps its own direction (an Arabic comment in the English report too).
    const para = v => { const r2 = /[\u0600-\u06FF]/.test(v); return `<div dir="${r2 ? "rtl" : "ltr"}" style="white-space:pre-line;font-size:12px;line-height:1.65;color:${INK};text-align:${r2 ? "right" : "left"}">${esc(v)}</div>`; };
    const ls = rtl ? "" : "letter-spacing:.14em;text-transform:uppercase;";
    const note = rv && rv.data && rv.data.docNote, sum = rs && rs.data && rs.data.result, why = nm(it.details, lg);
    return `<div dir="${rtl ? "rtl" : "ltr"}" style="width:744px;padding:14px 18px 10px;background:#fff;color:${INK};font-family:${rtl ? "Tajawal, Inter" : "Inter, Tajawal"}, Arial, sans-serif;text-align:${al};line-height:1.4">
      <div style="border-radius:16px;padding:14px 20px;background:linear-gradient(135deg, ${G} 0%, ${GD} 100%);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:18px">
        <div style="display:flex;align-items:center;gap:12px"><span style="width:54px;height:54px;border-radius:50%;background:#fff;display:inline-flex;align-items:center;justify-content:center"><img src="assets/mada-logo.png" style="height:38px;width:auto" alt=""></span>
          <div><div style="font-size:20px;font-weight:700">Mada Care</div><div style="font-size:11px;opacity:.85">${esc(t.tag)}</div></div></div>
        <div style="text-align:${ar2}"><div style="font-size:11px;${ls}color:#f3e3bd">${esc(t.title)}</div><div style="font-size:22px;font-weight:700;margin:2px 0">${ltr(reportNo(r, it))}</div>
          <div style="font-size:10.5px;opacity:.85">${esc(t.issued)} ${when(new Date().toISOString(), lg)}</div></div>
      </div>
      <div style="height:3px;background:${GOLD};border-radius:2px;margin:0 24px"></div>

      <div class="pdf-avoid" style="margin-top:12px;border:1px solid ${LINE};border-radius:14px;padding:12px 16px;background:${SOFT}">
        <div style="font-size:10.5px;color:${MU}">${esc(t.name)}</div><div style="font-size:19px;font-weight:700;margin:1px 0 6px">${esc(nm(r.patient, lg) || nm(p.name, lg) || "—")}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px 14px">${[r.mrn && kv(t.file, ltr(r.mrn)), p.idNumber && kv(t.id, ltr(p.idNumber)),
          p.dateOfBirth && kv(t.dob, ltr(p.dateOfBirth) + ` <span style="color:${MU};font-weight:500">${esc(tx("years", { n: ageOf(p.dateOfBirth) }))}</span>`), p.gender && kv(t.gender, esc(t[p.gender])),
          (r.mobile || p.mobile) && kv(t.mobile, ltr(r.mobile || p.mobile)), (r.bookingId || o.bookingId) && kv(t.booking, ltr(r.bookingId || o.bookingId))].filter(Boolean).join("")}</div>
      </div>

      <div class="pdf-avoid" style="margin-top:8px;border:1px solid ${LINE};border-radius:12px;padding:12px 16px;display:flex;gap:14px;align-items:flex-start">
        <span style="width:42px;height:42px;border-radius:12px;background:#e3f4ee;color:${G};display:inline-flex;align-items:center;justify-content:center;flex:none"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 8v8M9 10h6M9 13h6"/></svg></span>
        <div style="flex:1"><div style="font-size:10.5px;color:${MU}">${esc(t.exam)}</div><div style="font-size:16px;font-weight:700;margin-top:1px">${esc(nm(it.title, lg) || "—")}</div>
          ${why ? `<div style="font-size:11.5px;color:#44545a;margin-top:4px"><b style="font-weight:600">${esc(t.reason)}:</b> ${esc(why)}</div>` : ""}</div>
      </div>

      <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:8px;margin-top:8px">
        ${box(t.center, `<div style="display:flex;align-items:center;gap:12px;padding-top:2px">${pv && pv.logo ? `<span style="width:120px;height:64px;border:1px solid ${LINE};border-radius:10px;background:#fff;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:4px"><img src="${pv.logo}" style="max-width:100%;max-height:100%;object-fit:contain" alt=""></span>` : ""}<div style="font-size:15px;font-weight:700;color:${INK}">${esc((pv && (pv.name[lg] || pv.name.en)) || sc.center || "—")}</div></div>
          <div style="display:inline-block;margin-top:5px;padding:3px 10px;border-radius:11px;background:#fbf4e4;color:#8a6a1f;font-size:10.5px;font-weight:700">${esc(t.contracted)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;margin-top:4px">${kv(t.examDate, day(sc.date))}${kv(t.repAt, rs ? when(rs.at, lg) : "—")}</div>`)}
        ${box(rv ? t.doctor : t.reqBy, kv(rv ? t.doctor : t.reqBy, esc(nm(doctorOf(r), lg) || "—")) + (rv ? kv(t.revAt, when(rv.at, lg)) : ""))}
      </div>

      ${sum ? `<div class="pdf-avoid" style="margin-top:8px">${box(t.sum, para(sum))}</div>` : ""}
      ${note ? `<div class="pdf-avoid" style="margin-top:8px;border:1px solid #bfe3cb;border-radius:12px;padding:10px 14px;background:#f6fcf8"><div style="font-size:11px;font-weight:700;color:${G};margin-bottom:3px">${esc(t.docNote)}</div>${para(note)}</div>` : ""}

      <div class="pdf-avoid" style="margin-top:10px;border:1px dashed #b7d9cf;border-radius:12px;padding:10px 14px;background:${SOFT};display:flex;align-items:center;gap:10px;font-size:11.5px;color:${GD};font-weight:600">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/></svg><span>${esc(file ? t.attached : t.noFile)}</span></div>
      <div style="margin-top:10px;padding-top:8px;border-top:1px solid ${LINE};display:flex;justify-content:space-between;gap:12px;font-size:9.5px;color:#8a979c"><span>${esc(t.foot)}</span><span>${ltr(reportNo(r, it))}</span></div>
    </div>`;
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
      cover = await X.withTimeout(window.html2pdf().set({ margin: [6, 6], pagebreak: { mode: ["css"], avoid: ".pdf-avoid" }, image: { type: "jpeg", quality: 0.96 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(wrap.firstElementChild).outputPdf("arraybuffer"), 25000);
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
