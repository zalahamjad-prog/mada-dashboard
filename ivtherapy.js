// Mada Care IV therapy catalogue: categories and packages, managed on services-iv.html.
// SAMPLE DATA ONLY: categories, contents, prices and precautions are illustrative and must be
// confirmed by the medical team before use. Replace with the real package list.
// Kept in MadaStore "mada-svc-iv": { cats: [{ id, icon, name }], packages: [...], updatedAt, updatedBy }. Until it is first saved, the lists below are used.
// package: { code, cat, icon, price, mins, rx, name, about ({en, ar}), includes, benefits ({en: [], ar: []}), active }
const MadaIV = (() => {
  const DEF_CATS = [
    { id: "wellness", icon: "bolt", name: { en: "Vitamins & Wellness", ar: "الفيتامينات والعافية" } },
    { id: "hydration", icon: "drop", name: { en: "Hydration & Recovery", ar: "الترطيب والتعافي" } },
    { id: "beauty", icon: "sparkle", name: { en: "Beauty", ar: "التجميل والنضارة" } },
    { id: "medical", icon: "shield", name: { en: "Medical Infusions", ar: "المحاليل العلاجية" } }
  ];
  const DEF_CAT = { "IV-1001": "wellness", "IV-1002": "wellness", "IV-1003": "hydration", "IV-1004": "beauty", "IV-1005": "hydration", "IV-1006": "hydration", "IV-1007": "medical" };
  // rx: needs a doctor's prescription and recent lab results before the visit.
  const DEF_PACKAGES = [
    { code: "IV-1001", icon: "bolt", price: 299, mins: 45, rx: false,
      name: { en: "Energy Boost Package", ar: "باقة تعزيز الطاقة" },
      includes: { en: ["Vitamin C", "Vitamin B Complex", "Magnesium"], ar: ["فيتامين سي", "مجموعة فيتامين ب", "المغنيسيوم"] },
      benefits: { en: ["Boost energy", "Reduce fatigue", "Improve focus"], ar: ["رفع الطاقة", "تقليل الإرهاق", "تحسين التركيز"] },
      about: { en: "A vitamin drip for patients who feel tired or run down. Helps restore energy and focus.", ar: "محلول فيتامينات لمن يشعر بالتعب والخمول، يساعد على استعادة الطاقة والتركيز." } },
    { code: "IV-1002", icon: "shield", price: 399, mins: 45, rx: false,
      name: { en: "Immunity Support Package", ar: "باقة دعم المناعة" },
      includes: { en: ["High Dose Vitamin C", "Zinc", "Glutathione"], ar: ["جرعة عالية من فيتامين سي", "الزنك", "الجلوتاثيون"] },
      benefits: { en: ["Immune support", "Faster recovery", "Antioxidant support"], ar: ["دعم المناعة", "تعافٍ أسرع", "مضادات أكسدة"] },
      about: { en: "Supports the immune system, especially during flu season or after an illness.", ar: "يدعم جهاز المناعة، خاصة في موسم الإنفلونزا أو بعد المرض." } },
    { code: "IV-1003", icon: "drop", price: 249, mins: 60, rx: false,
      name: { en: "Hydration Recovery Package", ar: "باقة الترطيب والتعافي" },
      includes: { en: ["IV Fluids", "Electrolytes", "Vitamin B12"], ar: ["محاليل وريدية", "الأملاح المعدنية", "فيتامين ب12"] },
      benefits: { en: ["Rehydration", "Muscle recovery", "Improve hydration balance"], ar: ["تعويض السوائل", "تعافي العضلات", "توازن السوائل في الجسم"] },
      about: { en: "Replaces fluids and salts after vomiting, diarrhea, heat exhaustion or poor drinking.", ar: "يعوض السوائل والأملاح بعد الاستفراغ أو الإسهال أو الإجهاد الحراري أو قلة شرب السوائل." } },
    { code: "IV-1004", icon: "sparkle", price: 499, mins: 45, rx: false,
      name: { en: "Beauty Glow Package", ar: "باقة النضارة" },
      includes: { en: ["Glutathione", "Biotin", "Vitamin C"], ar: ["الجلوتاثيون", "البيوتين", "فيتامين سي"] },
      benefits: { en: ["Skin glow", "Hair support", "Antioxidant effect"], ar: ["نضارة البشرة", "دعم الشعر", "مضادات أكسدة"] },
      about: { en: "A vitamin and antioxidant drip for skin and hair health.", ar: "محلول فيتامينات ومضادات أكسدة لصحة البشرة والشعر." } },
    { code: "IV-1005", icon: "bolt", price: 349, mins: 60, rx: false,
      name: { en: "Athletic Recovery Package", ar: "باقة استشفاء الرياضيين" },
      includes: { en: ["IV Fluids", "Amino Acids", "Magnesium"], ar: ["محاليل وريدية", "أحماض أمينية", "المغنيسيوم"] },
      benefits: { en: ["Muscle recovery", "Less cramps", "Rehydration"], ar: ["استشفاء العضلات", "تقليل الشد العضلي", "تعويض السوائل"] },
      about: { en: "For recovery after intense exercise or long physical effort.", ar: "للاستشفاء بعد التمارين القوية أو المجهود البدني الطويل." } },
    { code: "IV-1006", icon: "drop", price: 329, mins: 45, rx: false,
      name: { en: "Headache Relief Package", ar: "باقة تخفيف الصداع" },
      includes: { en: ["IV Fluids", "Magnesium", "Vitamin B2"], ar: ["محاليل وريدية", "المغنيسيوم", "فيتامين ب2"] },
      benefits: { en: ["Headache relief", "Rehydration", "Relaxation"], ar: ["تخفيف الصداع", "تعويض السوائل", "الاسترخاء"] },
      about: { en: "Fluids and magnesium that can help with tension headaches and dehydration headaches.", ar: "سوائل ومغنيسيوم تساعد في صداع التوتر والصداع الناتج عن الجفاف." } },
    { code: "IV-1007", icon: "shield", price: 450, mins: 60, rx: true,
      name: { en: "Iron Infusion", ar: "حقن الحديد الوريدي" },
      includes: { en: ["IV Iron", "Saline"], ar: ["حديد وريدي", "محلول ملحي"] },
      benefits: { en: ["Treats iron deficiency", "Less fatigue", "Faster than tablets"], ar: ["علاج نقص الحديد", "تقليل التعب", "أسرع من الحبوب"] },
      about: { en: "For confirmed iron deficiency anemia. Needs a doctor's prescription and a recent iron test.", ar: "لحالات فقر الدم بسبب نقص الحديد المؤكد. يحتاج وصفة طبيب وتحليل حديد حديث." } }
  ];
  // Questions the agent asks before booking any IV package.
  const SCREENING = {
    en: ["Pregnant or breastfeeding", "Kidney or heart disease", "Allergy to any vitamin or medicine", "Currently on blood thinners"],
    ar: ["حامل أو مرضعة", "أمراض الكلى أو القلب", "حساسية من أي فيتامين أو دواء", "يتناول أدوية سيولة حالياً"]
  };
  // Icons a category or package can use (chosen on services-iv.html, shown in New Request).
  const ICONS = {
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    shield: '<path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    drip: '<path d="M8 2h8v7a4 4 0 0 1-8 0zM12 13v4a3 3 0 0 0 3 3h3M8 5h8"/>',
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19 13 11"/>',
    flask: '<path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3L14 9V3"/><path d="M7.5 14h9"/>',
    pill: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    muscle: '<path d="M4 15c2-1 3-4 3-7 0-2 1.5-3 3-3s2 1 2 2-1 2-2 2"/><path d="M4 15c3 4 10 5 15 1 1.5-1.2 1.5-4-.5-5-2.5-1.3-5 .5-6.5 2"/>'
  };
  const iconSvg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.drip}</svg>`;
  const KEY = "mada-svc-iv";
  const copy = x => JSON.parse(JSON.stringify(x));
  DEF_PACKAGES.forEach(p => { p.cat = DEF_CAT[p.code]; p.active = true; });
  const saved = (() => { try { return typeof MadaStore !== "undefined" ? MadaStore.getJSON(KEY, null) : null; } catch (e) { return null; } })();
  const data = saved && Array.isArray(saved.cats) ? saved : { cats: copy(DEF_CATS), packages: copy(DEF_PACKAGES) };
  const CAT_LIST = data.cats, ALL_PACKAGES = data.packages;
  const CATS = CAT_LIST.map(c => c.id);
  const PACKAGES = ALL_PACKAGES.filter(p => p.active !== false);
  // byCode keeps hidden packages so older requests still show their name and price.
  const byCode = Object.fromEntries(ALL_PACKAGES.map(p => [p.code, p]));
  const catName = (id, lang) => { const c = CAT_LIST.find(x => x.id === id); return c ? (c.name[lang] || c.name.en) : id; };
  const save = (d, by) => MadaStore.setJSON(KEY, { cats: d.cats, packages: d.packages, updatedAt: new Date().toISOString(), updatedBy: by || null });
  const edit = () => copy({ cats: CAT_LIST, packages: ALL_PACKAGES });
  return { KEY, ICONS, iconSvg, CATS, CAT_LIST, PACKAGES, ALL_PACKAGES, SCREENING, byCode, catName, save, edit };
})();
