// Mada Care staff directory (MadaStore "mada-staff"), empty to start.
// staff: { id: "EMP-001", name: { en, ar }, mobile, email, idType: "national" | "iqama", idNumber, gender: "m" | "f",
//          role, specialty, license, city, startDate: "YYYY-MM-DD", photo (small data URL) | null,
//          password (temporary until changed), mustChangePassword, passwordChangedAt, status: "active" | "disabled", createdAt, createdBy,
//          docs: [{ id, name, expiry: "YYYY-MM-DD" | "", file: { name, type, size, data (data URL) } | null, verified: bool, note, verifiedBy, verifiedAt, addedAt, addedBy }],
//          schedule: { days: { sun|mon|tue|wed|thu|fri|sat: { from: "HH:MM", to: "HH:MM" } }, updatedAt, updatedBy } | null }
// Documents and the work schedule are managed on staff-profile.html.
// They log in with the employee ID. Without Supabase Auth (MADA_CLOUD.auth false) the password is kept on the record (demo only).
// With Supabase Auth the record never keeps a password: adding, resetting, changing the role or disabling a staff member
// calls the mada-admin Edge Function, which creates or updates their Supabase login (only managers can). The result is kept
// on the record as login: { status: "ok" | "failed", error, at }; a failed call throws, so the page shows it was not saved.
const MadaStaff = (() => {
  const KEY = "mada-staff";
  const ROLES = ["gm", "admin", "ops", "supervisor", "agent", "doctor", "nurse", "physio", "lab", "driver", "quality"];
  const MEDICAL = ["doctor", "nurse", "physio", "lab"];

  const all = () => MadaStore.getJSON(KEY, []);
  const save = list => MadaStore.setJSON(KEY, list);
  const get = id => all().find(s => s.id === id) || null;

  function nextId() {
    const n = all().reduce((m, s) => Math.max(m, parseInt(String(s.id).split("-")[1], 10) || 0), 0) + 1;
    return "EMP-" + String(n).padStart(3, "0");
  }
  function tempPassword() {
    const pick = s => s[Math.floor(Math.random() * s.length)];
    const up = "ABCDEFGHJKLMNPQRSTUVWXYZ", lo = "abcdefghijkmnpqrstuvwxyz", dg = "23456789";
    return pick(up) + Array.from({ length: 5 }, () => pick(lo)).join("") + "@" + Array.from({ length: 4 }, () => pick(dg)).join("");
  }
  const cloudAuth = () => typeof MadaStore !== "undefined" && MadaStore.auth && MadaStore.auth.on;
  // Creates or updates the Supabase login. Throws with the reason when it fails.
  function syncLogin(s, password) {
    const r = MadaStore.auth.fn("mada-admin", { action: "upsert", staffId: s.id, role: s.role, active: s.status === "active", password: password || undefined });
    if (!r.ok) throw new Error((r.json && r.json.error) || (r.status ? "HTTP " + r.status : "offline"));
    return { status: "ok", at: new Date().toISOString() };
  }
  function add(s) {
    const list = all(), rec = { ...s, id: nextId(), createdAt: new Date().toISOString() };
    if (cloudAuth()) {
      const pw = rec.password; delete rec.password;
      rec.login = syncLogin(rec, pw);
      list.push(rec); save(list);
      return { ...rec, password: pw };
    }
    list.push(rec); save(list);
    return rec;
  }
  function setStatus(id, status) {
    const list = all(), s = list.find(x => x.id === id);
    if (s) { s.status = status; s.updatedAt = new Date().toISOString(); if (cloudAuth()) s.login = syncLogin(s); save(list); }
    return s || null;
  }
  // Merge fields into one staff record (documents, schedule). Throws if the browser storage is full.
  function update(id, patch) {
    const list = all(), s = list.find(x => x.id === id);
    if (!s) return null;
    if (cloudAuth()) {
      const p = { ...patch }, pw = p.password; delete p.password;
      if (pw || ("role" in p && p.role !== s.role) || ("status" in p && p.status !== s.status)) p.login = syncLogin({ ...s, ...p }, pw);
      patch = p; delete s.password;
    }
    Object.assign(s, patch, { updatedAt: new Date().toISOString() }); save(list);
    const back = get(id); if (!back || JSON.stringify(back.updatedAt) !== JSON.stringify(s.updatedAt)) throw new Error("not saved");
    return back;
  }
  return { KEY, ROLES, MEDICAL, all, get, nextId, tempPassword, add, setStatus, update };
})();
