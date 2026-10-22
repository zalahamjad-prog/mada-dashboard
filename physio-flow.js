// The steps of a physiotherapy visit in the order the physiotherapist goes through them (physio-visit.html), for pages that only
// show them (Request Details, Physiotherapy Requests, patient file). A first visit is the assessment; a later visit of the same
// patient (or of a package) is a follow-up session with its own steps. Saved steps are order.physioVisit.steps[key] { at, by, ... };
// the first time a step was opened is order.physioVisit.stepLog[key].openedAt.
const PtFlow = (() => {
  const INITIAL = ["arrival", "ptPain", "ptHistory", "ptFunc", "ptExam", "ptGoals", "ptPlan", "ptHep", "idform", "consent"];
  const pv = o => (o && o.physioVisit) || {};
  const apptKey = o => ((o.appointment && o.appointment.date) || "") + String((o.appointment && o.appointment.minute) || 0).padStart(4, "0");
  // A follow-up: its own steps say so, or it is booked from an earlier physio visit, or the patient had an earlier assessed visit.
  function isFollow(o) {
    const s = pv(o).steps || {};
    if (s.fuInfo || s.fuToday || pv(o).follow) return true;
    if (s.ptPain || s.ptHistory || s.ptGoals) return false;
    if (o.fromPt || (o.pkgSession && o.pkgSession.n > 1)) return true;
    if (!o.mrn || typeof MadaOrders === "undefined") return false;
    const mine = apptKey(o);
    return MadaOrders.all().some(x => x.id !== o.id && x.mrn === o.mrn && x.physioVisit && x.physioVisit.steps && apptKey(x) < mine
      && Object.keys(x.physioVisit.steps).some(k => /^(pt|fu)/.test(k)));
  }
  function keys(o) {
    if (!isFollow(o)) return INITIAL;
    const s = pv(o).steps || {};
    return ["arrival", "fuInfo", "fuToday", ...((s.fuToday || {}).exam === "detailed" ? ["ptExam"] : []), "fuTx", "ptHep", "fuNext",
      ...((s.fuNext || {}).decision === "discharge" ? [] : ["ptPlan"]), "fuSign", "idform", "consent"];
  }
  const L = {
    en: { arrival: "Arrival Confirmation", ptPain: "Pain Assessment", ptHistory: "Medical History", ptFunc: "Functional Limitations", ptExam: "Objective Examination",
      ptGoals: "Treatment Goals", ptPlan: "Treatment Plan", ptHep: "Home Exercise Program", fuInfo: "Session Overview", fuToday: "Today's Assessment", fuTx: "Treatment Given",
      fuNext: "Next Plan", fuSign: "Session Approval", idform: "Identity Confirmation", consent: "Patient Consent",
      initial: "Assessment (first visit)", follow: "Follow-up session" },
    ar: { arrival: "تأكيد الوصول", ptPain: "تقييم الألم", ptHistory: "التاريخ المرضي وعوامل الخطورة", ptFunc: "القيود الوظيفية", ptExam: "الفحص السريري",
      ptGoals: "الأهداف العلاجية", ptPlan: "الخطة العلاجية", ptHep: "البرنامج المنزلي", fuInfo: "ملخص الجلسة", fuToday: "تقييم اليوم", fuTx: "العلاج المنفذ",
      fuNext: "الخطة القادمة", fuSign: "اعتماد الجلسة", idform: "تأكيد هوية المريض", consent: "موافقة المريض",
      initial: "جلسة كشف (تقييم أول)", follow: "جلسة متابعة" }
  };
  return { keys, isFollow, L, INITIAL };
})();
