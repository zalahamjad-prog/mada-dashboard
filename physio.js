// Mada Care physiotherapy service catalogue: categories and services, managed on services-physio.html.
// SAMPLE DATA ONLY: codes, prices, session counts and times are illustrative.
// Replace with the real physiotherapy price list (prices incl. VAT).
// Kept in MadaStore "mada-svc-physio": { cats: [{ id, icon, name }], services: [...], updatedAt, updatedBy }. Until it is first saved, the lists below are used.
// service: { code, cat, icon, price, mins, sessions, rx, name, desc, about, prep (each {en, ar}), active }
// package: { code "PTP-####", svc (the session service it is made of), sessions, price (total), name, desc ({en, ar}), active }
//   sessions: home sessions the price covers (1 = a single session). mins: time of one session. rx: needs a doctor's referral or order.
const MadaPhysio = (() => {
  const DEF_CATS = [
    { id: "assess", icon: "clipboard", name: { en: "Assessment", ar: "التقييم" } },
    { id: "musculo", icon: "spine", name: { en: "Back, Neck & Joints", ar: "الظهر والرقبة والمفاصل" } },
    { id: "postop", icon: "knee", name: { en: "Post-Surgery Rehab", ar: "التأهيل بعد العمليات" } },
    { id: "neuro", icon: "brain", name: { en: "Neurological Rehab", ar: "التأهيل العصبي" } },
    { id: "elderly", icon: "cane", name: { en: "Elderly & Mobility", ar: "كبار السن والحركة" } },
    { id: "sports", icon: "run", name: { en: "Sports Injuries", ar: "إصابات الملاعب" } },
    { id: "kids", icon: "child", name: { en: "Children", ar: "الأطفال" } },
    { id: "chest", icon: "lungs", name: { en: "Chest Physiotherapy", ar: "العلاج الطبيعي التنفسي" } }
  ];
  const S = (code, cat, icon, price, mins, sessions, rx, en, ar, dEn, dAr) => ({ code, cat, icon, price, mins, sessions, rx, name: { en, ar }, desc: { en: dEn, ar: dAr },
    about: { en: "", ar: "" }, prep: { en: "Wear comfortable clothes and have any medical reports or X-rays ready.", ar: "لبس مريح، وتجهيز أي تقارير طبية أو أشعة إن وجدت." } });
  const DEF_SERVICES = [
    S("PT-1001", "assess", "clipboard", 250, 60, 1, false, "Physiotherapy Assessment", "تقييم العلاج الطبيعي",
      "First home visit: assessment and a treatment plan.", "زيارة أولى في البيت: تقييم الحالة ووضع خطة العلاج."),
    S("PT-1002", "musculo", "spine", 250, 45, 1, false, "Physiotherapy Session", "جلسة علاج طبيعي",
      "One home physiotherapy session.", "جلسة علاج طبيعي وحدة في البيت."),
    S("PT-1003", "musculo", "spine", 1300, 45, 6, false, "Back Pain Program", "برنامج آلام الظهر",
      "Home sessions for lower back pain.", "جلسات منزلية لآلام أسفل الظهر."),
    S("PT-1004", "musculo", "spine", 1300, 45, 6, false, "Neck & Shoulder Program", "برنامج الرقبة والكتف",
      "Home sessions for neck and shoulder pain.", "جلسات منزلية لآلام الرقبة والكتف."),
    S("PT-1005", "postop", "knee", 1700, 45, 8, true, "Knee Rehab After Surgery", "تأهيل الركبة بعد العملية",
      "Home rehab after knee surgery.", "تأهيل منزلي بعد عملية الركبة."),
    S("PT-1006", "postop", "knee", 1700, 45, 8, true, "Hip Rehab After Surgery", "تأهيل الحوض بعد العملية",
      "Home rehab after hip surgery.", "تأهيل منزلي بعد عملية الحوض."),
    S("PT-1007", "neuro", "brain", 2400, 60, 10, true, "Stroke Rehabilitation", "تأهيل ما بعد الجلطة",
      "Home rehab to regain movement after a stroke.", "تأهيل منزلي لاستعادة الحركة بعد الجلطة."),
    S("PT-1008", "elderly", "cane", 1300, 45, 6, false, "Balance & Fall Prevention", "التوازن والوقاية من السقوط",
      "Balance and walking sessions for older adults.", "جلسات توازن ومشي لكبار السن."),
    S("PT-1009", "sports", "run", 1300, 45, 6, false, "Sports Injury Rehab", "تأهيل إصابات الملاعب",
      "Home sessions after a sports injury.", "جلسات منزلية بعد إصابة رياضية."),
    S("PT-1010", "kids", "child", 1500, 45, 6, true, "Children's Physiotherapy", "العلاج الطبيعي للأطفال",
      "Home sessions for children.", "جلسات منزلية للأطفال."),
    S("PT-1011", "chest", "lungs", 250, 45, 1, true, "Chest Physiotherapy Session", "جلسة علاج طبيعي تنفسي",
      "One home chest physiotherapy session.", "جلسة علاج طبيعي تنفسي وحدة في البيت.")
  ];
  // Session packages: several sessions of one service at one price (e.g. 3 or 4 sessions).
  const P = (code, sessions, price) => ({ code, svc: "PT-1002", sessions, price, name: { en: `${sessions} Physiotherapy Sessions`, ar: `باقة ${sessions} جلسات علاج طبيعي` },
    desc: { en: "", ar: "" }, active: true });
  const DEF_PACKAGES = [P("PTP-1001", 3, 700), P("PTP-1002", 4, 900), P("PTP-1003", 6, 1300), P("PTP-1004", 8, 1700), P("PTP-1005", 10, 2100)];
  // Icons a category or service can use (chosen on services-physio.html).
  const ICONS = {
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>',
    spine: '<path d="M12 2v20"/><rect x="9" y="4" width="6" height="3" rx="1"/><rect x="9" y="9" width="6" height="3" rx="1"/><rect x="9" y="14" width="6" height="3" rx="1"/>',
    knee: '<path d="M9 2v8l-1 4 2 8M15 2v7l1 5-2 8"/><circle cx="12" cy="12" r="2"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    cane: '<circle cx="10" cy="4" r="2"/><path d="M10 7v6l-2 8M10 13l3 8M7 10l3-2 3 3M17 9v12M17 9a2 2 0 0 0-3 0"/>',
    run: '<circle cx="14" cy="4" r="2"/><path d="M8 21l3-6 3 2v4M6 12l3-4h5l2 3 3 1M11 15l1-6"/>',
    child: '<circle cx="12" cy="6" r="3"/><path d="M8 21v-5l-2-3 6-2 6 2-2 3v5M10 21v-4h4v4"/>',
    lungs: '<path d="M12 4v7M12 11c-1 2-3 2-4 1M12 11c1 2 3 2 4 1M8 8c-3 0-5 4-5 9 0 2 1 3 3 3s3-1 3-3V9zM16 8c3 0 5 4 5 9 0 2-1 3-3 3s-3-1-3-3V9z"/>',
    hand: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 10V4a1.5 1.5 0 0 1 3 0v6M14 10V5a1.5 1.5 0 0 1 3 0v8c0 4-2 8-6 8-3 0-4-1-6-4l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 13"/>',
    dumbbell: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
    heat: '<path d="M8 3c-2 3 2 4 0 7M12 3c-2 3 2 4 0 7M16 3c-2 3 2 4 0 7"/><rect x="4" y="13" width="16" height="7" rx="2"/>',
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>'
  };
  const iconSvg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.spine}</svg>`;
  const KEY = "mada-svc-physio";
  const copy = x => JSON.parse(JSON.stringify(x));
  DEF_SERVICES.forEach(s => { s.active = true; });
  const saved = (() => { try { return typeof MadaStore !== "undefined" ? MadaStore.getJSON(KEY, null) : null; } catch (e) { return null; } })();
  const data = saved && Array.isArray(saved.cats) ? { packages: copy(DEF_PACKAGES), ...saved } : { cats: copy(DEF_CATS), services: copy(DEF_SERVICES), packages: copy(DEF_PACKAGES) };
  const CAT_LIST = data.cats, ALL_SERVICES = data.services, ALL_PACKAGES = data.packages || [];
  const PACKAGES = ALL_PACKAGES.filter(x => x.active !== false), pkgByCode = Object.fromEntries(ALL_PACKAGES.map(x => [x.code, x]));
  const CATS = CAT_LIST.map(c => c.id);
  const SERVICES = ALL_SERVICES.filter(s => s.active !== false);
  // byCode keeps hidden services so older requests still show their name and price.
  const byCode = Object.fromEntries(ALL_SERVICES.map(s => [s.code, s]));
  // A service or a package by code, in one shape: { code, name, price, mins, sessions, rx, pkg, svc }.
  const item = code => { const s = byCode[code]; if (s) return { ...s, sessions: s.sessions || 1, pkg: false };
    const p = pkgByCode[code]; if (!p) return null; const b = byCode[p.svc] || {};
    return { ...p, icon: b.icon || "spine", cat: b.cat || null, mins: b.mins || null, rx: !!b.rx, pkg: true }; };
  const catName = (id, lang) => { const c = CAT_LIST.find(x => x.id === id); return c ? (c.name[lang] || c.name.en) : id; };
  const save = (d, by) => MadaStore.setJSON(KEY, { cats: d.cats, services: d.services, packages: d.packages || [], updatedAt: new Date().toISOString(), updatedBy: by || null });
  const edit = () => copy({ cats: CAT_LIST, services: ALL_SERVICES, packages: ALL_PACKAGES });
  return { KEY, item, ICONS, iconSvg, CATS, CAT_LIST, SERVICES, ALL_SERVICES, byCode, PACKAGES, ALL_PACKAGES, pkgByCode, catName, save, edit };
})();
