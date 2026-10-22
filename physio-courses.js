// Physiotherapy treatment courses: a patient's first physio visit (the assessment) and every session booked from it, as one course.
// A session belongs to the course of the visit it was booked from (order.fromPt.visitId) or of the package it uses (order.pkgSession.orderId).
// Used by the Physiotherapy Requests page (physio-requests.html) and the patient file (patient.html).
//   PtCourses.all() -> [course], PtCourses.ofPatient(mrn) -> [course]
//   course: { id (first visit's order id), root, mrn, patient, mobile, providerId, pkg: { code, name, m } | null, m (sessions planned or null),
//             sessions: [session], booked, done, cancelled, remaining (null without a package), next (session) | null,
//             unpaid: [session], state: "active" | "done" | "unpaid" | "stopped", follow: [{ at, by, res, text }] (order.ptFollow on the first visit) }
//   session: { o, n (number in the course), state: "done" | "booked" | "missed" | "pending" | "cancelled", pay: "paid" | "pkg" | "after" | "link" | "unpaid" | "none",
//              amount, at (Date of the appointment) | null, report: "approved" | "draft" | null }
const PtCourses = (() => {
  const pv = o => o.physioVisit || {};
  const at = o => o.appointment && o.appointment.date ? new Date(o.appointment.date + "T" + String(Math.floor((o.appointment.minute || 0) / 60)).padStart(2, "0") + ":" + String((o.appointment.minute || 0) % 60).padStart(2, "0") + ":00") : null;
  const pkgItem = o => (o.items || []).map(i => i.kind === "physio" && typeof MadaPhysio !== "undefined" ? MadaPhysio.item(i.code) : null).find(p => p && p.pkg && p.sessions > 1) || null;
  // What is still to pay for one visit, with VAT: its total, or the price of its physiotherapy items.
  function amount(o) {
    const vat = MadaOrders.vatRate ? MadaOrders.vatRate(o) : 0;
    const base = o.total != null ? Number(o.total || 0) : (o.items || []).reduce((a, i) => a + Number(((i.kind === "physio" && typeof MadaPhysio !== "undefined" ? MadaPhysio.item(i.code) : null) || {}).price || 0), 0);
    return Math.round(base * (1 + vat) * 100) / 100;
  }
  function payOf(o) {
    if (o.payment === "paid") return o.paidInfo && o.paidInfo.method === "package" || o.pkgSession ? "pkg" : "paid";
    if (!amount(o)) return "none";
    if (o.payWhen === "after") return "after";
    if (o.payLink && o.payLink.expiresAt && new Date(o.payLink.expiresAt) > new Date()) return "link";
    return "unpaid";
  }
  function stateOf(o) {
    if (o.status === "cancelled" || o.decision === "rejected") return "cancelled";
    if (pv(o).status === "done" || o.status === "completed") return "done";
    if (!o.bookingId) return "pending";
    const a = at(o); return a && a < new Date(Date.now() - 2 * 3600000) && !pv(o).startedAt ? "missed" : "booked";
  }
  function build(list) {
    const pts = list.filter(o => o.service === "physio" && o.decision !== "rejected"), byId = Object.fromEntries(pts.map(o => [o.id, o]));
    const rootOf = o => { let x = o, g = 0;
      while (g++ < 60) { const up = (x.pkgSession && x.pkgSession.orderId !== x.id && byId[x.pkgSession.orderId]) || (x.fromPt && byId[x.fromPt.visitId]) || null; if (!up || up === x) break; x = up; }
      return x; };
    const groups = new Map();
    pts.forEach(o => { const r = rootOf(o); if (!groups.has(r.id)) groups.set(r.id, []); groups.get(r.id).push(o); });
    return [...groups.entries()].map(([id, os]) => {
      const root = byId[id], key = o => (at(o) || new Date(o.createdAt || 0)).getTime();
      os.sort((a, b) => key(a) - key(b));
      let n = 0;
      const sessions = os.map(o => { const st = stateOf(o), rp = pv(o).report;
        return { o, n: st === "cancelled" ? null : ++n, state: st, pay: payOf(o), amount: amount(o), at: at(o), report: st === "done" ? (rp && rp.status === "approved" ? "approved" : "draft") : null }; });
      const live = sessions.filter(s => s.state !== "cancelled"), p = pkgItem(root);
      const m = p ? p.sessions : (os.map(o => o.pkgSession && o.pkgSession.m).find(Boolean) || null);
      const booked = live.filter(s => s.state !== "pending").length, done = live.filter(s => s.state === "done").length;
      const stopped = os.some(o => ((pv(o).steps || {}).fuNext || {}).decision === "discharge");
      const next = live.filter(s => (s.state === "booked" || s.state === "pending") && s.at && s.at >= new Date(Date.now() - 2 * 3600000)).sort((a, b) => a.at - b.at)[0] || null;
      const unpaid = live.filter(s => s.state !== "done" && ["unpaid", "link", "after"].includes(s.pay));
      const state = stopped ? "stopped" : unpaid.some(s => s.pay !== "after") ? "unpaid" : m && done >= m ? "done" : "active";
      return { id, root, mrn: root.mrn, patient: root.patient, mobile: root.mobile, providerId: (root.booking || {}).nurseId || (((live.find(s => s.o.booking && s.o.booking.nurseId) || {}).o || {}).booking || {}).nurseId || null,
        pkg: p ? { code: p.code, name: p.name, m: p.sessions } : null, m, sessions, booked, done, cancelled: sessions.length - live.length,
        remaining: m ? Math.max(0, m - booked) : null, next, unpaid, state, follow: root.ptFollow || [],
        last: Math.max(...os.map(o => new Date(o.updatedAt || o.createdAt || 0).getTime())) };
    }).sort((a, b) => b.last - a.last);
  }
  const all = () => build(MadaOrders.all());
  const ofPatient = mrn => all().filter(c => c.mrn === mrn);
  // A note on the customer follow-up (calls about booking and payment), kept on the course's first visit.
  function addFollow(courseId, res, text, by) {
    const o = MadaOrders.get(courseId); if (!o) return null;
    return MadaOrders.update(courseId, { ptFollow: [...(o.ptFollow || []), { at: new Date().toISOString(), by, res, text: text || "" }] });
  }
  return { all, ofPatient, build, amount, payOf, stateOf, addFollow };
})();
