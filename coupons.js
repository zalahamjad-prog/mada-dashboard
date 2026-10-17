// Discount coupons (MadaStore "mada-coupons"), made on coupons.html and used on the customer payment page (pay.html).
// coupon: { id, code: "DR-AMJAD15", owner: { type: "doctor" | "staff" | "other", id: staff id | null, name: { en, ar } },
//           kind: "pct" | "amount", value, cap: max discount in SAR for pct | null, minOrder: SAR | null,
//           services: [] (all) | ["doctor", "blood", "nursing", "iv"], starts: "YYYY-MM-DD" | "", ends: "YYYY-MM-DD" | "",
//           limit: total uses | null, once: one use per mobile number, active, note, createdAt, by, updatedAt }
// Uses are read from paid orders (order.paidInfo.couponId), so the counts always match the bookings.
// TODO: check the code and the limits in the backend when the payment is taken; the browser check is only for the screen.
const MadaCoupons = (() => {
  const KEY = "mada-coupons", SERVICES = ["doctor", "blood", "nursing", "iv"];
  // Sample codes for the demo build only (not saved).
  const SAMPLE = !MadaStore.SAMPLES ? [] : [
    { id: "CP-S1", code: "MADA10", owner: { type: "other", id: null, name: { en: "Mada Care", ar: "مدى كير" } }, kind: "pct", value: 10, cap: null, minOrder: null, services: [], starts: "", ends: "", limit: null, once: false, active: true, sample: true },
    { id: "CP-S2", code: "WELCOME50", owner: { type: "other", id: null, name: { en: "Welcome offer", ar: "عرض الترحيب" } }, kind: "amount", value: 50, cap: null, minOrder: null, services: [], starts: "", ends: "", limit: null, once: true, active: true, sample: true }
  ];
  const stored = () => MadaStore.getJSON(KEY, []) || [];
  const all = () => { const s = stored(), codes = new Set(s.map(c => c.code)); return [...s, ...SAMPLE.filter(c => !codes.has(c.code))]; };
  const save = list => MadaStore.setJSON(KEY, list.filter(c => !c.sample));
  const norm = s => String(s || "").trim().toUpperCase().replace(/\s+/g, "");
  const byCode = code => all().find(c => c.code === norm(code)) || null;
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  // Paid orders that used the coupon.
  const usesOf = c => (typeof MadaOrders === "undefined" ? [] : MadaOrders.all()).filter(o => o.paidInfo && (o.paidInfo.couponId === c.id || (!o.paidInfo.couponId && o.paidInfo.promo === c.code)));
  // Discount in SAR on a price before VAT.
  function discount(c, base) {
    if (!c || !(base > 0)) return 0;
    let d = c.kind === "pct" ? base * c.value / 100 : c.value;
    if (c.kind === "pct" && c.cap > 0) d = Math.min(d, c.cap);
    return Math.round(Math.min(base, d) * 100) / 100;
  }
  // { ok: true, c } or { ok: false, err: "bad" | "off" | "soon" | "expired" | "used" | "once" | "service" | "min", c }
  function check(code, o, base) {
    const c = byCode(code); if (!c) return { ok: false, err: "bad" };
    const d = today(), mob = String((o && o.mobile) || "").replace(/\D/g, "").slice(-9);
    if (!c.active) return { ok: false, err: "off", c };
    if (c.starts && d < c.starts) return { ok: false, err: "soon", c };
    if (c.ends && d > c.ends) return { ok: false, err: "expired", c };
    if (c.services && c.services.length && o && !c.services.includes(o.service)) return { ok: false, err: "service", c };
    if (c.minOrder > 0 && base < c.minOrder) return { ok: false, err: "min", c };
    const uses = usesOf(c).filter(x => !o || x.id !== o.id);
    if (c.limit > 0 && uses.length >= c.limit) return { ok: false, err: "used", c };
    if (c.once && mob && uses.some(x => String(x.mobile || "").replace(/\D/g, "").slice(-9) === mob)) return { ok: false, err: "once", c };
    return { ok: true, c };
  }
  return { KEY, SERVICES, all, save, norm, byCode, usesOf, discount, check, today };
})();
