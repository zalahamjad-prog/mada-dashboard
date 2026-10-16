// Mada Care demo request queue shared by the call center and doctors.
// Stored in the browser (MadaStore), so it only works within one browser.
// Replace with the real requests API.
// status: "awaiting_doctor" → doctor chooses tests → "ready_to_confirm" → agent books → "booked"
const MadaRequests = (() => {
  const KEY = "mada-requests";

  // One sample request so the doctor screen is not empty on first use.
  const SAMPLE = [{
    id: "REQ-1001", status: "awaiting_doctor", createdAt: null, sample: true,
    mrn: "MC-2026-004", mobile: "0509876543",
    patient: { fullName: { en: "Abdullah Nasser Al-Harbi", ar: "عبدالله ناصر الحربي" }, gender: "m", age: 71, city: "riyadh", district: { en: "Al Malqa", ar: "الملقا" } },
    complaint: { en: "Feels tired all the time and has lost weight in the last two months. Known diabetic.", ar: "يشعر بتعب مستمر ونقص وزنه في آخر شهرين. مريض سكري." },
    suggested: [], createdBy: { en: "Sarah Ahmed", ar: "سارة أحمد" }
  }];

  function all() {
    let list = MadaStore.getJSON(KEY, null);
    if (!list) {
      list = !MadaStore.SAMPLES ? [] : SAMPLE.map(r => ({ ...r, createdAt: new Date(Date.now() - 25 * 60000).toISOString() }));
      MadaStore.setJSON(KEY, list);
    }
    return list;
  }
  const save = list => MadaStore.setJSON(KEY, list);
  const get = id => all().find(r => r.id === id) || null;
  const byStatus = status => all().filter(r => r.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function add(req) {
    const list = all();
    const n = list.reduce((m, r) => Math.max(m, parseInt(r.id.split("-")[1], 10) || 0), 1000) + 1;
    const item = { ...req, id: "REQ-" + n, createdAt: new Date().toISOString() };
    list.push(item); save(list);
    return item;
  }
  function update(id, patch) {
    const list = all(), i = list.findIndex(r => r.id === id);
    if (i < 0) return null;
    list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
    save(list);
    return list[i];
  }
  // Names may be stored as plain text or as { en, ar }.
  const text = (v, lang) => v && typeof v === "object" ? (v[lang] || v.en) : (v || "");

  return { all, get, byStatus, add, update, text };
})();
