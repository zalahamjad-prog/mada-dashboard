// Mada Care radiology catalogue: categories and exams, managed on services-rad.html.
// SAMPLE DATA ONLY: exams, prices, result times and where they are done are illustrative (same list the Doctor Portal shows today).
// Kept in MadaStore "mada-svc-rad": { cats: [{ id, icon, name }], exams: [...], updatedAt, updatedBy }. Until it is first saved, the lists below are used.
// exam: { code, cat, name: {en, ar}, sub: {en, ar}, loc: "home" | "center" | "both", prep: "none" | "fast", fastHours, hours, price, desc: {en, ar}, active }
// TODO: replace with the Mada Care radiology provider's list; confirm which exams can be done at home.
const MadaRad = (() => {
  const DEF_CATS = [
    { id: "xray", icon: "xr", name: { en: "X-Ray (General)", ar: "أشعة سينية (عامة)" } },
    { id: "us", icon: "wave", name: { en: "Ultrasound", ar: "أشعة صوتية" } },
    { id: "mobile", icon: "home", name: { en: "Mobile X-Ray (Home)", ar: "أشعة متنقلة (المنزل)" } },
    { id: "other", icon: "rad", name: { en: "Other Imaging", ar: "تصوير آخر" } }
  ];
  const ex = (code, cat, en, ar, subEn, subAr, loc, price) => ({ code, cat, name: { en, ar }, sub: { en: subEn, ar: subAr }, loc, prep: "none", hours: 24, price, desc: { en: "", ar: "" }, active: true });
  const DEF_EXAMS = [
    ex("RAD-001", "xray", "Chest X-Ray", "أشعة الصدر", "Chest (PA)", "الصدر (أمامي خلفي)", "home", 180),
    ex("RAD-002", "xray", "Abdominal X-Ray", "أشعة البطن", "KUB", "الكلى والحالب والمثانة", "home", 180),
    ex("RAD-003", "mobile", "Portable X-Ray", "أشعة متنقلة", "Any part (mobile)", "أي جزء (متنقلة)", "home", 250),
    ex("RAD-004", "us", "Ultrasound Abdomen", "أشعة صوتية للبطن", "Upper abdomen", "أعلى البطن", "center", 350),
    ex("RAD-005", "us", "Ultrasound Pelvis", "أشعة صوتية للحوض", "Pelvic organs", "أعضاء الحوض", "center", 350),
    ex("RAD-006", "us", "Ultrasound Obstetric", "أشعة صوتية للحمل", "Fetal assessment", "تقييم الجنين", "center", 350),
    ex("RAD-007", "us", "Ultrasound Soft Tissue", "أشعة صوتية للأنسجة الرخوة", "e.g. lump, swelling", "مثل كتلة أو تورم", "both", 300),
    ex("RAD-008", "xray", "X-Ray Extremities", "أشعة الأطراف", "Hand / Foot / Knee", "اليد / القدم / الركبة", "home", 180),
    ex("RAD-009", "xray", "X-Ray Spine", "أشعة العمود الفقري", "Cervical / Thoracic / Lumbar", "عنقية / صدرية / قطنية", "center", 250),
    ex("RAD-010", "us", "Ultrasound Thyroid", "أشعة صوتية للغدة الدرقية", "Thyroid gland", "الغدة الدرقية", "center", 300),
    ex("RAD-011", "other", "Venous Doppler", "دوبلر الأوردة", "Lower limbs", "الأطراف السفلية", "center", 450),
    ex("RAD-012", "other", "ECG (12-lead)", "تخطيط القلب", "Resting", "أثناء الراحة", "home", 150),
    ex("RAD-013", "other", "Echocardiogram", "إيكو القلب", "Heart ultrasound", "أشعة صوتية للقلب", "center", 600)
  ];
  // Icons a category can use (chosen on services-rad.html, shown on the category chips).
  const ICONS = {
    xr: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 6v12M9 8.5c1 .8 2 1 3 1s2-.2 3-1M8.5 11.5c1.2.8 2.3 1.1 3.5 1.1s2.3-.3 3.5-1.1M9 14.5c1 .7 2 1 3 1s2-.3 3-1"/>',
    wave: '<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>',
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    rad: '<circle cx="12" cy="12" r="9"/><rect x="8" y="7.5" width="8" height="7" rx="1.5"/><path d="M9.5 18c.5-1.5 1.5-2.2 2.5-2.2s2 .7 2.5 2.2"/>',
    ct: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>',
    mri: '<rect x="2.5" y="6" width="19" height="12" rx="6"/><circle cx="12" cy="12" r="3"/>',
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    lungs: '<path d="M12 4v7"/><path d="M12 11c-1.5-1-2.5-3-4.5-3S4 12 4 16c0 2 1 3 2.5 3 3 0 5.5-2.5 5.5-8zM12 11c1.5-1 2.5-3 4.5-3S20 12 20 16c0 2-1 3-2.5 3-3 0-5.5-2.5-5.5-8z"/>',
    bone: '<path d="m8.5 8.5 7 7"/><circle cx="7" cy="5.5" r="2"/><circle cx="5.5" cy="7" r="2"/><circle cx="17" cy="18.5" r="2"/><circle cx="18.5" cy="17" r="2"/>',
    center: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3"/>'
  };
  const DEF_ICON = { xray: "xr", us: "wave", mobile: "home", other: "rad" };
  const iconOf = c => ICONS[(c && c.icon) || DEF_ICON[c && c.id]] || ICONS.rad;
  const KEY = "mada-svc-rad";
  const copy = x => JSON.parse(JSON.stringify(x));
  const saved = (() => { try { return typeof MadaStore !== "undefined" ? MadaStore.getJSON(KEY, null) : null; } catch (e) { return null; } })();
  const data = saved && Array.isArray(saved.cats) ? saved : { cats: copy(DEF_CATS), exams: copy(DEF_EXAMS) };
  const CATS = data.cats, ALL_EXAMS = data.exams, EXAMS = ALL_EXAMS.filter(x => x.active !== false);
  const byCode = Object.fromEntries(ALL_EXAMS.map(x => [x.code, x]));
  const catName = (id, lang) => { const c = CATS.find(x => x.id === id); return c ? (c.name[lang] || c.name.en) : id; };
  const save = (d, by) => MadaStore.setJSON(KEY, { cats: d.cats, exams: d.exams, updatedAt: new Date().toISOString(), updatedBy: by || null });
  const edit = () => copy({ cats: CATS, exams: ALL_EXAMS });
  return { KEY, ICONS, iconOf, CATS, EXAMS, ALL_EXAMS, byCode, catName, save, edit };
})();
