// Mada Care nursing service catalogue: categories and services, managed on services-nurse.html.
// SAMPLE DATA ONLY: codes, prices and visit times are illustrative.
// Replace with the real nursing price list (prices incl. VAT).
// Kept in MadaStore "mada-svc-nurse": { cats: [{ id, icon, name }], services: [...], updatedAt, updatedBy }. Until it is first saved, the lists below are used.
// service: { code, cat, icon, price, mins, rx, name, desc, about, prep (each {en, ar}), active }
const MadaNursing = (() => {
  const DEF_CATS = [
    { id: "injections", icon: "syringe", name: { en: "Injections & IV", ar: "الحقن والمحاليل" } },
    { id: "wound", icon: "bandage", name: { en: "Wound Care", ar: "العناية بالجروح" } },
    { id: "monitoring", icon: "pulse", name: { en: "Monitoring", ar: "القياسات والمتابعة" } },
    { id: "tubes", icon: "catheter", name: { en: "Tubes & Catheters", ar: "الأنابيب والقساطر" } },
    { id: "respiratory", icon: "lungs", name: { en: "Respiratory", ar: "الجهاز التنفسي" } },
    { id: "medication", icon: "pill", name: { en: "Medication", ar: "الأدوية" } },
    { id: "general", icon: "care", name: { en: "General Care", ar: "رعاية عامة" } }
  ];
  // rx: needs a doctor's prescription or order. mins: typical visit time.
  const DEF_SERVICES = [
    { code: "NS-1001", cat: "injections", icon: "syringe", price: 80, mins: 30, rx: true,
      name: { en: "Antibiotic Administration (IM/IV)", ar: "إعطاء المضاد الحيوي (عضل/وريد)" },
      desc: { en: "Administration of prescribed antibiotics (injection or IV).", ar: "إعطاء المضاد الحيوي الموصوف (حقن أو وريد)." },
      about: { en: "The nurse checks the prescription and allergies, prepares the dose and gives it by injection or IV drip, then watches the patient for a reaction.",
               ar: "تتحقق الممرضة من الوصفة والحساسية، وتجهز الجرعة وتعطيها حقناً أو بالمحلول الوريدي، ثم تراقب المريض لأي رد فعل." },
      prep: { en: "Have the prescription and the medicine ready. Tell us about any drug allergy.", ar: "تجهيز الوصفة والدواء، وإبلاغنا بأي حساسية من الأدوية." } },
    { code: "NS-1002", cat: "wound", icon: "bandage", price: 60, mins: 30, rx: false,
      name: { en: "Wound Dressing", ar: "تغيير ضماد الجروح" },
      desc: { en: "Wound cleaning and dressing as per medical order.", ar: "تنظيف الجرح وتغيير الضماد حسب التعليمات الطبية." },
      about: { en: "Removes the old dressing, cleans the wound, checks for signs of infection and applies a new sterile dressing. Supplies are included.",
               ar: "إزالة الضماد القديم وتنظيف الجرح والتأكد من عدم وجود التهاب، ثم وضع ضماد معقم جديد. المستلزمات مشمولة." },
      prep: { en: "Share any doctor instructions about the wound.", ar: "مشاركة أي تعليمات من الطبيب بخصوص الجرح." } },
    { code: "NS-1003", cat: "injections", icon: "drip", price: 100, mins: 30, rx: true,
      name: { en: "IV Cannulation", ar: "تركيب الكانيولا الوريدية" },
      desc: { en: "Peripheral IV cannulation and line securing.", ar: "تركيب كانيولا في الوريد الطرفي وتثبيتها." },
      about: { en: "Inserts a cannula into a vein so IV medicine or fluids can be given, and secures it with a sterile dressing.",
               ar: "تركيب كانيولا في الوريد لإعطاء الأدوية أو المحاليل الوريدية، وتثبيتها بضماد معقم." },
      prep: { en: "Have the doctor's order ready.", ar: "تجهيز طلب الطبيب." } },
    { code: "NS-1004", cat: "monitoring", icon: "glucose", price: 35, mins: 15, rx: false,
      name: { en: "Blood Glucose Monitoring", ar: "قياس سكر الدم" },
      desc: { en: "Blood sugar level check and documentation.", ar: "قياس مستوى السكر في الدم وتوثيقه." },
      about: { en: "Finger-prick sugar check with a calibrated device. The reading is recorded in the patient file and shared with the family.",
               ar: "قياس السكر بوخزة الإصبع بجهاز معاير، وتسجيل القراءة في ملف المريض ومشاركتها مع الأهل." },
      prep: { en: "Tell us if the reading should be fasting or after a meal.", ar: "تحديد هل القياس صائم أو بعد الأكل." } },
    { code: "NS-1005", cat: "tubes", icon: "catheter", price: 70, mins: 30, rx: false,
      name: { en: "Urinary Catheter Care", ar: "العناية بالقسطرة البولية" },
      desc: { en: "Catheter insertion care and maintenance.", ar: "العناية بالقسطرة البولية وصيانتها." },
      about: { en: "Cleans the catheter site, checks that urine drains well, changes the bag if needed and looks for signs of infection.",
               ar: "تنظيف مكان القسطرة والتأكد من تصريف البول وتغيير الكيس عند الحاجة ومراقبة علامات الالتهاب." },
      prep: { en: "Have spare urine bags available if the patient has them.", ar: "توفير أكياس بول احتياطية إن وجدت." } },
    { code: "NS-1006", cat: "monitoring", icon: "pulse", price: 40, mins: 20, rx: false,
      name: { en: "Vital Signs Monitoring", ar: "قياس العلامات الحيوية" },
      desc: { en: "Measure and record vital signs.", ar: "قياس العلامات الحيوية وتسجيلها." },
      about: { en: "Blood pressure, pulse, temperature, breathing rate and oxygen level, recorded in the patient file.",
               ar: "قياس الضغط والنبض والحرارة ومعدل التنفس ونسبة الأكسجين، وتسجيلها في ملف المريض." },
      prep: { en: "No preparation needed.", ar: "لا يحتاج تجهيز." } },
    { code: "NS-1007", cat: "respiratory", icon: "lungs", price: 60, mins: 30, rx: true,
      name: { en: "Nebulization Therapy", ar: "جلسة البخار (نيبولايزر)" },
      desc: { en: "Nebulization treatment and monitoring.", ar: "جلسة علاج بالبخار مع المتابعة." },
      about: { en: "Gives the prescribed medicine through a nebulizer and monitors breathing and oxygen during the session.",
               ar: "إعطاء الدواء الموصوف بجهاز البخار ومراقبة التنفس ونسبة الأكسجين أثناء الجلسة." },
      prep: { en: "Have the prescription and medicine ready.", ar: "تجهيز الوصفة والدواء." } },
    { code: "NS-1008", cat: "medication", icon: "pill", price: 30, mins: 20, rx: true,
      name: { en: "Medication Administration (Oral)", ar: "إعطاء الأدوية عن طريق الفم" },
      desc: { en: "Administration of oral medications as prescribed.", ar: "إعطاء الأدوية الفموية حسب الوصفة." },
      about: { en: "Checks the medicine list, gives the right dose at the right time and records it. Useful for elderly patients with many medicines.",
               ar: "مراجعة قائمة الأدوية وإعطاء الجرعة الصحيحة في وقتها وتوثيقها. مفيد لكبار السن الذين يتناولون أدوية كثيرة." },
      prep: { en: "Have all current medicines and prescriptions in one place.", ar: "تجهيز كل الأدوية الحالية والوصفات في مكان واحد." } },
    { code: "NS-1009", cat: "injections", icon: "syringe", price: 50, mins: 20, rx: true,
      name: { en: "Intramuscular Injection", ar: "إبرة عضل" },
      desc: { en: "Single intramuscular injection as prescribed.", ar: "إعطاء إبرة عضل واحدة حسب الوصفة." },
      about: { en: "Gives a prescribed injection in the muscle and watches the patient for a few minutes afterwards.",
               ar: "إعطاء الإبرة الموصوفة في العضل ومراقبة المريض لبضع دقائق بعدها." },
      prep: { en: "Have the prescription and the medicine ready.", ar: "تجهيز الوصفة والدواء." } },
    { code: "NS-1010", cat: "injections", icon: "drip", price: 150, mins: 60, rx: true,
      name: { en: "IV Fluids Infusion", ar: "تركيب المحاليل الوريدية" },
      desc: { en: "IV fluid drip with monitoring until complete.", ar: "تركيب محلول وريدي مع المتابعة حتى الانتهاء." },
      about: { en: "Starts the prescribed IV fluids, sets the rate and stays with the patient until the bag finishes.",
               ar: "تركيب المحلول الموصوف وضبط سرعته والبقاء مع المريض حتى ينتهي." },
      prep: { en: "Have the doctor's order ready. The visit takes about an hour.", ar: "تجهيز طلب الطبيب. تستغرق الزيارة حوالي ساعة." } },
    { code: "NS-1011", cat: "wound", icon: "bandage", price: 90, mins: 45, rx: false,
      name: { en: "Bedsore (Pressure Ulcer) Care", ar: "العناية بقرح الفراش" },
      desc: { en: "Cleaning and dressing of pressure ulcers.", ar: "تنظيف قرح الفراش وتضميدها." },
      about: { en: "Cleans and dresses the sore, repositions the patient and teaches the family how to prevent new sores.",
               ar: "تنظيف القرحة وتضميدها وتغيير وضعية المريض وتعليم الأهل طرق منع ظهور قرح جديدة." },
      prep: { en: "Tell us the size and location of the sores if known.", ar: "إبلاغنا بحجم ومكان القرح إن أمكن." } },
    { code: "NS-1012", cat: "wound", icon: "bandage", price: 120, mins: 30, rx: true,
      name: { en: "Suture / Staple Removal", ar: "فك الغرز أو الدبابيس الجراحية" },
      desc: { en: "Removal of stitches or staples after surgery.", ar: "إزالة الغرز أو الدبابيس بعد العملية." },
      about: { en: "Checks that the wound has healed, removes the stitches or staples and applies a light dressing.",
               ar: "التأكد من التئام الجرح، ثم إزالة الغرز أو الدبابيس ووضع ضماد خفيف." },
      prep: { en: "Have the surgeon's discharge note with the removal date.", ar: "تجهيز تقرير الخروج من الجراح وفيه موعد الفك." } },
    { code: "NS-1013", cat: "tubes", icon: "catheter", price: 150, mins: 45, rx: true,
      name: { en: "Urinary Catheter Insertion / Change", ar: "تركيب أو تغيير القسطرة البولية" },
      desc: { en: "Insertion or replacement of a urinary catheter.", ar: "تركيب قسطرة بولية جديدة أو تغييرها." },
      about: { en: "Inserts a new catheter using sterile technique and connects a new drainage bag.", ar: "تركيب قسطرة جديدة بطريقة معقمة وتوصيل كيس تصريف جديد." },
      prep: { en: "Have the doctor's order ready.", ar: "تجهيز طلب الطبيب." } },
    { code: "NS-1014", cat: "tubes", icon: "tube", price: 90, mins: 30, rx: true,
      name: { en: "Feeding Tube (NG) Care", ar: "العناية بأنبوب التغذية" },
      desc: { en: "Feeding tube check, flushing and feeding.", ar: "فحص أنبوب التغذية وغسله والتغذية من خلاله." },
      about: { en: "Checks the tube position, flushes it, gives the feed and teaches the family how to do it safely.",
               ar: "التأكد من مكان الأنبوب وغسله وإعطاء الوجبة وتعليم الأهل الطريقة الآمنة." },
      prep: { en: "Have the feeding formula ready.", ar: "تجهيز الحليب أو الوجبة الخاصة." } },
    { code: "NS-1015", cat: "respiratory", icon: "lungs", price: 120, mins: 45, rx: false,
      name: { en: "Tracheostomy Care", ar: "العناية بفتحة القصبة الهوائية" },
      desc: { en: "Cleaning and suctioning of the tracheostomy.", ar: "تنظيف فتحة القصبة الهوائية وشفط الإفرازات." },
      about: { en: "Cleans the stoma and inner tube, suctions secretions and changes the ties and dressing.",
               ar: "تنظيف الفتحة والأنبوب الداخلي وشفط الإفرازات وتغيير الرباط والضماد." },
      prep: { en: "Have spare tubes and suction catheters if available.", ar: "توفير أنابيب وقساطر شفط احتياطية إن وجدت." } },
    { code: "NS-1016", cat: "medication", icon: "syringe", price: 60, mins: 30, rx: true,
      name: { en: "Insulin Injection & Training", ar: "إبرة الإنسولين مع التدريب" },
      desc: { en: "Insulin dose with training for the patient or family.", ar: "إعطاء جرعة الإنسولين مع تدريب المريض أو الأهل." },
      about: { en: "Checks blood sugar, gives the insulin dose and trains the patient or family to inject safely.",
               ar: "قياس السكر وإعطاء جرعة الإنسولين وتدريب المريض أو الأهل على الحقن بطريقة آمنة." },
      prep: { en: "Have the insulin pen and the dose plan from the doctor.", ar: "تجهيز قلم الإنسولين وخطة الجرعات من الطبيب." } },
    { code: "NS-1017", cat: "general", icon: "care", price: 120, mins: 60, rx: false,
      name: { en: "Elderly Care Visit", ar: "زيارة رعاية كبار السن" },
      desc: { en: "Personal care, positioning and general check.", ar: "عناية شخصية وتغيير وضعية وفحص عام." },
      about: { en: "Helps with bathing and hygiene, changes position, checks the skin and vital signs, and reviews medicines with the family.",
               ar: "المساعدة في الاستحمام والنظافة، وتغيير الوضعية، وفحص الجلد والعلامات الحيوية، ومراجعة الأدوية مع الأهل." },
      prep: { en: "No preparation needed.", ar: "لا يحتاج تجهيز." } },
    { code: "NS-1018", cat: "general", icon: "pulse", price: 150, mins: 45, rx: false,
      name: { en: "Post-Hospital Discharge Visit", ar: "زيارة ما بعد الخروج من المستشفى" },
      desc: { en: "Follow-up visit after hospital discharge.", ar: "زيارة متابعة بعد الخروج من المستشفى." },
      about: { en: "Reviews the discharge plan and medicines, checks vital signs and wounds, and tells the family what to watch for.",
               ar: "مراجعة خطة الخروج والأدوية، وفحص العلامات الحيوية والجروح، وتوضيح ما يجب على الأهل ملاحظته." },
      prep: { en: "Have the hospital discharge report ready.", ar: "تجهيز تقرير الخروج من المستشفى." } }
  ];
  // Icons a category or service can use (chosen on services-nurse.html, shown in New Request).
  const ICONS = {
    syringe: '<path d="m18 2 4 4M17 7l3-3M19 9 8.7 19.3a1.7 1.7 0 0 1-2.4 0l-1.6-1.6a1.7 1.7 0 0 1 0-2.4L15 5M9 11l4 4M5 19l-3 3M14 4l6 6"/>',
    bandage: '<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M10 10h.01M14 14h.01M10 14h.01M14 10h.01"/>',
    drip: '<path d="M8 2h8v7a4 4 0 0 1-8 0zM12 13v4a3 3 0 0 0 3 3h3M8 5h8"/>',
    glucose: '<rect x="5" y="3" width="12" height="18" rx="3"/><rect x="8" y="6" width="6" height="5" rx="1"/><path d="M11 15v.5M17 9h3"/>',
    catheter: '<path d="M12 3v6M8 9h8l-1 4H9zM12 13v4c0 2 1 4 4 4h2"/>',
    pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    lungs: '<path d="M12 4v7M12 11c-1 2-3 2-4 1M12 11c1 2 3 2 4 1M8 8c-3 0-5 4-5 9 0 2 1 3 3 3s3-1 3-3V9zM16 8c3 0 5 4 5 9 0 2-1 3-3 3s-3-1-3-3V9z"/>',
    pill: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>',
    tube: '<path d="M7 3c0 4 10 4 10 8s-10 4-10 8M7 21h4M13 3h4"/>',
    care: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    thermo: '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>',
    baby: '<circle cx="12" cy="8" r="4"/><path d="M10.5 8h.01M13.5 8h.01M6 21c0-3.5 2.7-6 6-6s6 2.5 6 6"/>',
    bed: '<path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="10.5" r="1.5"/>'
  };
  const iconSvg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.care}</svg>`;
  const KEY = "mada-svc-nurse";
  const copy = x => JSON.parse(JSON.stringify(x));
  DEF_SERVICES.forEach(s => { s.active = true; });
  const saved = (() => { try { return typeof MadaStore !== "undefined" ? MadaStore.getJSON(KEY, null) : null; } catch (e) { return null; } })();
  const data = saved && Array.isArray(saved.cats) ? saved : { cats: copy(DEF_CATS), services: copy(DEF_SERVICES) };
  const CAT_LIST = data.cats, ALL_SERVICES = data.services;
  const CATS = CAT_LIST.map(c => c.id);
  const SERVICES = ALL_SERVICES.filter(s => s.active !== false);
  // byCode keeps hidden services so older requests still show their name and price.
  const byCode = Object.fromEntries(ALL_SERVICES.map(s => [s.code, s]));
  const catName = (id, lang) => { const c = CAT_LIST.find(x => x.id === id); return c ? (c.name[lang] || c.name.en) : id; };
  const save = (d, by) => MadaStore.setJSON(KEY, { cats: d.cats, services: d.services, updatedAt: new Date().toISOString(), updatedBy: by || null });
  const edit = () => copy({ cats: CAT_LIST, services: ALL_SERVICES });
  return { KEY, ICONS, iconSvg, CATS, CAT_LIST, SERVICES, ALL_SERVICES, byCode, catName, save, edit };
})();
