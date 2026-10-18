// The patient's own file link: one link the operations team sends to the patient (WhatsApp or SMS) from the patient file
// (patient.html > Files & Sharing). records.html?t=TOKEN opens it: the patient sees and downloads their imaging reports,
// lab results, the doctor's approved medical reports and the doctor's prescriptions. Nothing is uploaded: a prescription is the
// medicines the doctor wrote in the visit's Treatment Plan (MadaReport.prescription in medical-report.js), with any later changes.
// The link: patient.shareLink = { token (random 128-bit), createdAt, by, off, hide: [item keys], sent: [{ ch, at, by }], opens, lastOpenAt }.
// Only what is already approved shows: imaging after the doctor reviews it, lab results after approval, medical reports after the doctor approves them.
// TODO: patient data, so test files only until logins use Supabase Auth. Before real data the server must return only this patient's
// files for the token (the page now reads the shared store).
const MadaPatientDocs = (() => {
  // Everything that can be shared, newest first in each group. Each entry has a key used to hide it from the link.
  function collect(f) {
    const out = { rx: [], rad: [], lab: [], rep: [] };
    if (typeof MadaReport !== "undefined")
      MadaOrders.all().filter(o => o.mrn === f && MadaReport.hasRx(o)).forEach(o => { const pl = o.doctorVisit.steps.plan, am = (o.doctorVisit.amendments || []).filter(a => a.step === "plan").slice(-1)[0];
        out.rx.push({ key: "x:" + o.id, o, at: (am && am.at) || pl.at || o.doctorVisit.completedAt || o.createdAt, amended: !!am }); });
    if (typeof MadaMedical !== "undefined" && typeof MadaRadReport !== "undefined")
      MadaMedical.all().filter(r => r.mrn === f && r.status !== "cancelled").forEach(r => r.items.forEach(it => { if (MadaRadReport.ready(it)) {
        const rv = [...(it.log || [])].reverse().find(l => (MadaMedical.STEPS.radiology || [])[l.step] === "reviewed"); out.rad.push({ key: "r:" + r.id + ":" + it.id, r, it, at: rv ? rv.at : r.createdAt }); } }));
    if (typeof MadaSamples !== "undefined")
      MadaSamples.list(null).filter(c => c.o.mrn === f && c.tests.length && c.sent && (c.kind === "patient" || c.reviewed))
        .forEach(c => out.lab.push({ key: "l:" + c.key, c, at: (c.review || {}).at || c.sentAt }));
    if (typeof MadaReport !== "undefined")
      MadaOrders.all().filter(o => o.mrn === f && MadaReport.approved(o)).forEach(o => out.rep.push({ key: "v:" + o.id, o, at: (o.doctorVisit.report || {}).approvedAt || o.doctorVisit.doneAt || o.createdAt }));
    Object.values(out).forEach(a => a.sort((x, y) => String(y.at || "").localeCompare(String(x.at || ""))));
    return out;
  }
  const shown = (f, link) => { const h = (link && link.hide) || [], c = collect(f); Object.keys(c).forEach(k => { c[k] = c[k].filter(x => !h.includes(x.key)); }); return c; };
  const count = c => Object.values(c).reduce((s, a) => s + a.length, 0);

  // The link.
  const newToken = () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, "0")).join(""); };
  const linkOf = p => (p && p.shareLink) || null;
  function setLink(fileNo, patch) { const p = MadaPatients.get(fileNo); const l = { ...(linkOf(p) || {}), ...patch }; MadaPatients.upsert({ fileNo, shareLink: l }); return l; }
  const ensure = (fileNo, by) => { const l = linkOf(MadaPatients.get(fileNo)); return l && l.token && !l.off ? l : setLink(fileNo, { token: newToken(), createdAt: new Date().toISOString(), by, off: false, opens: 0, lastOpenAt: null, sent: [] }); };
  const stop = (fileNo, by) => setLink(fileNo, { off: true, offAt: new Date().toISOString(), offBy: by });
  const toggle = (fileNo, k, hide) => { const l = linkOf(MadaPatients.get(fileNo)) || {}, h = new Set(l.hide || []); hide ? h.add(k) : h.delete(k); return setLink(fileNo, { hide: [...h] }); };
  const logSent = (fileNo, ch, by) => { const l = linkOf(MadaPatients.get(fileNo)) || {}; return setLink(fileNo, { sent: [...(l.sent || []), { ch, at: new Date().toISOString(), by }] }); };
  const find = token => token && token.length >= 32 ? MadaPatients.all().find(p => p.shareLink && p.shareLink.token === token && !p.shareLink.off) || null : null;
  const url = (token, lg) => new URL(`${/github\.io$/.test(location.hostname) ? "f" : "f.html"}?${token}${lg === "en" ? ".en" : ""}`, location.href).href;
  function waNum(v) {
    const d = String(v || "").replace(/[٠-٩]/g, c => "٠١٢٣٤٥٦٧٨٩".indexOf(c)).replace(/\D/g, "");
    const m = d.match(/^(?:00966|966|0)?(5\d{8})$/); return m ? "966" + m[1] : "";
  }
  const MSG = {
    ar: "مرحباً {n}،\nملفك من مدى كير جاهز: الأشعة والتحاليل وتقارير الطبيب والوصفات.\nتقدر تشوفها وتحمّلها من هنا:\n{u}\nنتمنى لك الصحة والعافية 💚",
    en: "Hello {n},\nYour Mada Care file is ready: imaging, lab results, doctor's reports and prescriptions.\nView and download them here:\n{u}\nWishing you good health 💚"
  };
  const message = (p, lg) => MSG[lg].replace("{n}", (p.name && (p.name[lg] || p.name.en)) || "").replace("{u}", url(p.shareLink.token, lg));
  return { collect, shown, count, ensure, stop, toggle, logSent, setLink, find, url, waNum, message, linkOf };
})();
