// Mada Care staff directory (MadaStore "mada-staff"), empty to start.
// staff: { id: "EMP-001", name: { en, ar }, mobile, email, idType: "national" | "iqama", idNumber, gender: "m" | "f",
//          role, specialty, license, city, startDate: "YYYY-MM-DD", photo (small data URL) | null,
//          password (temporary until changed), mustChangePassword, passwordChangedAt, status: "active" | "disabled", createdAt, createdBy,
//          docs: [{ id, name, expiry: "YYYY-MM-DD" | "", file: { name, type, size, data (data URL) } | null, verified: bool, note, verifiedBy, verifiedAt, addedAt, addedBy }],
//          schedule: { days: { sun|mon|tue|wed|thu|fri|sat: { from: "HH:MM", to: "HH:MM" } }, updatedAt, updatedBy } | null }
// Documents and the work schedule are managed on staff-profile.html.
// They log in with the employee ID. Demo only: the password is kept in the browser so the account can log in here.
// Replace with the real staff API; the backend must create the account and never store plain passwords.
const MadaStaff = (() => {
  const KEY = "mada-staff";
  const ROLES = ["admin", "supervisor", "agent", "doctor", "nurse", "physio", "lab", "driver", "quality"];
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
  function add(s) {
    const list = all(), rec = { ...s, id: nextId(), createdAt: new Date().toISOString() };
    list.push(rec); save(list);
    return rec;
  }
  function setStatus(id, status) {
    const list = all(), s = list.find(x => x.id === id);
    if (s) { s.status = status; s.updatedAt = new Date().toISOString(); save(list); }
    return s || null;
  }
  // Merge fields into one staff record (documents, schedule). Throws if the browser storage is full.
  function update(id, patch) {
    const list = all(), s = list.find(x => x.id === id);
    if (!s) return null;
    Object.assign(s, patch, { updatedAt: new Date().toISOString() }); save(list);
    const back = get(id); if (!back || JSON.stringify(back.updatedAt) !== JSON.stringify(s.updatedAt)) throw new Error("not saved");
    return back;
  }
  return { KEY, ROLES, MEDICAL, all, get, nextId, tempPassword, add, setStatus, update };
})();
