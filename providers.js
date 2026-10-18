// Mada Care service providers: the centers Mada Care works with (imaging centers, labs, hospitals...), managed on providers.html.
// Kept in MadaStore "mada-providers" (one row per provider): { id: "PRV-001", name: { en, ar }, type, logo (PNG data URL, up to 360 px),
//   phone, city, active, createdAt, createdBy, updatedAt, updatedBy }.
// The imaging step "Appointment booked" on the Medical Requests page picks an imaging provider, and the patient's imaging report
// (rad-report.js) shows that provider's name and logo.
const MadaProviders = (() => {
  const KEY = "mada-providers";
  const TYPES = [
    { id: "imaging", en: "Imaging / X-ray center", ar: "مركز أشعة" },
    { id: "lab", en: "Laboratory", ar: "مختبر" },
    { id: "hospital", en: "Hospital", ar: "مستشفى" },
    { id: "clinic", en: "Clinic / Medical center", ar: "عيادة / مركز طبي" },
    { id: "pharmacy", en: "Pharmacy", ar: "صيدلية" },
    { id: "other", en: "Other", ar: "أخرى" }
  ];
  const all = () => MadaStore.getJSON(KEY, []) || [];
  const get = id => all().find(p => p.id === id) || null;
  const active = type => all().filter(p => p.active !== false && (!type || p.type === type));
  const typeName = (id, lg) => { const x = TYPES.find(t => t.id === id); return x ? x[lg] || x.en : id || ""; };
  // Add (no id) or change one provider. Returns the saved record.
  function save(p, by) {
    const list = all(), at = new Date().toISOString();
    if (p.id) { const i = list.findIndex(x => x.id === p.id); if (i < 0) return null; list[i] = { ...list[i], ...p, updatedAt: at, updatedBy: by || null }; MadaStore.setJSON(KEY, list); return list[i]; }
    const n = list.reduce((m, x) => Math.max(m, parseInt(String(x.id).split("-")[1], 10) || 0), 0) + 1;
    const rec = { active: true, ...p, id: "PRV-" + String(n).padStart(3, "0"), createdAt: at, createdBy: by || null };
    list.push(rec); MadaStore.setJSON(KEY, list); return rec;
  }
  // The logo from an image file, shrunk to fit 360 px (transparency kept) so it stays small in storage.
  function readLogo(file, max) {
    max = max || 360;
    return new Promise((ok, bad) => {
      const fr = new FileReader();
      fr.onerror = bad;
      fr.onload = () => { const im = new Image(); im.onerror = bad; im.onload = () => {
        const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL("image/png"));
      }; im.src = fr.result; };
      fr.readAsDataURL(file);
    });
  }
  return { KEY, TYPES, all, get, active, typeName, save, readLogo };
})();
