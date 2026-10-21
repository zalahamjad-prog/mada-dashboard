// Mada Care home exercise library, managed on services-physio.html (Exercises tab) and used for the Home Exercise Program at a physio visit.
// SAMPLE DATA ONLY: the exercises, instructions and default doses below are illustrative and must be reviewed by a physiotherapist before go-live.
// Kept in MadaStore "mada-pt-exercises": { list: [exercise], updatedAt, updatedBy }. Until it is first saved, the list below is used.
// exercise: { code "EX-####", area, name { en, ar }, steps { en, ar } (how to do it), sets, reps, hold (seconds), perDay,
//             img (small data URL, uploaded on the dashboard) | "", video (YouTube / Vimeo / .mp4 link) | "", active }
// An exercise with no photo shows the drawing of its area (FIG).
const MadaExercises = (() => {
  const KEY = "mada-pt-exercises";
  const AREAS = ["neck", "shoulder", "back", "hip", "knee", "ankle", "balance"];
  const AREA_NAME = { neck: { en: "Neck", ar: "الرقبة" }, shoulder: { en: "Shoulder", ar: "الكتف" }, back: { en: "Back", ar: "الظهر" }, hip: { en: "Hip", ar: "الورك" },
    knee: { en: "Knee", ar: "الركبة" }, ankle: { en: "Ankle & Foot", ar: "الكاحل والقدم" }, balance: { en: "Balance & General", ar: "التوازن وعام" } };
  // Simple line drawings, one per area (placeholders until real photos or videos are added).
  const FIG = {
    neck: '<circle cx="60" cy="30" r="14"/><path d="M60 44v10M40 62q20-10 40 0v40H40z"/><path d="M74 26l10-6M74 34l10 2" stroke-dasharray="3 3"/>',
    shoulder: '<circle cx="60" cy="24" r="12"/><path d="M60 36v40M60 46l-26-14M60 46l26 14M60 76l-12 30M60 76l12 30"/><path d="M28 24a10 10 0 0 1 8-6" stroke-dasharray="3 3"/>',
    back: '<circle cx="28" cy="70" r="10"/><path d="M38 72h40l14 18M78 72l-6 20M18 96h90"/><path d="M58 60q8-8 16 0" stroke-dasharray="3 3"/>',
    hip: '<circle cx="24" cy="80" r="9"/><path d="M33 82h38M71 82l18-22M71 82l20 6M14 96h94"/><path d="M92 54q6 4 4 12" stroke-dasharray="3 3"/>',
    knee: '<path d="M30 30h20v40H30zM50 70h34M50 54l34 4"/><circle cx="40" cy="20" r="9"/><path d="M90 50q6 6 0 14" stroke-dasharray="3 3"/><path d="M20 100h90"/>',
    ankle: '<circle cx="60" cy="18" r="10"/><path d="M60 28v42M60 40l-14 14M60 40l14 14M60 70l-8 30M60 70l8 30M44 104h20M58 104h20"/><path d="M84 96l6-8" stroke-dasharray="3 3"/>',
    balance: '<circle cx="60" cy="18" r="10"/><path d="M60 28v42M60 40l-22-6M60 40l22-6M60 70l-6 34M60 70l16 14"/><path d="M30 104h60" stroke-dasharray="3 3"/>'
  };
  const fig = area => `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${FIG[area] || FIG.balance}</svg>`;
  const E = (code, area, en, ar, sEn, sAr, sets, reps, hold, perDay) => ({ code, area, name: { en, ar }, steps: { en: sEn, ar: sAr }, sets, reps, hold, perDay, img: "", video: "", active: true });
  const DEF = [
    E("EX-1001", "neck", "Chin Tucks", "سحب الذقن للخلف", "Sit tall. Gently pull your chin straight back, keeping your eyes level. Hold, then relax.", "اجلس باستقامة. اسحب ذقنك للخلف بهدوء مع إبقاء النظر للأمام. اثبت ثم ارتخِ.", 2, 10, 5, 2),
    E("EX-1002", "neck", "Neck Side Bend Stretch", "إطالة الرقبة للجانب", "Sit tall. Tilt your ear towards your shoulder until you feel a gentle stretch. Hold, then switch sides.", "اجلس باستقامة. أمِل أذنك نحو كتفك حتى تحس بشد خفيف. اثبت ثم بدّل الجهة.", 1, 5, 20, 2),
    E("EX-1003", "shoulder", "Pendulum Swings", "تمرين البندول للكتف", "Lean on a table with your good arm. Let the other arm hang and swing it gently in small circles.", "استند على طاولة بيدك السليمة. خلّ اليد الثانية متدلية وحرّكها بدوائر صغيرة بهدوء.", 2, 10, 0, 2),
    E("EX-1004", "shoulder", "Shoulder Blade Squeeze", "ضم لوحي الكتف", "Sit or stand tall. Squeeze your shoulder blades together and down. Hold, then relax.", "اجلس أو قف باستقامة. اضغط لوحي الكتف لبعض وللأسفل. اثبت ثم ارتخِ.", 2, 10, 5, 2),
    E("EX-1005", "shoulder", "Wall Slides", "انزلاق اليدين على الجدار", "Stand facing a wall with your hands on it. Slowly slide your hands up as far as is comfortable, then down.", "قف مقابل الجدار ويديك عليه. حرّك يديك للأعلى ببطء قدر ما ترتاح، ثم انزل.", 2, 10, 0, 1),
    E("EX-1006", "back", "Knee to Chest", "ضم الركبة للصدر", "Lie on your back. Pull one knee towards your chest with both hands. Hold, then switch legs.", "استلقِ على ظهرك. اسحب ركبة وحدة لصدرك بيديك. اثبت ثم بدّل الرجل.", 1, 5, 20, 2),
    E("EX-1007", "back", "Cat-Camel", "تمرين القط والجمل", "On hands and knees, slowly arch your back up, then let it sag down. Move within comfort.", "على اليدين والركبتين، قوّس ظهرك للأعلى ببطء، ثم نزّله للأسفل. تحرّك بحدود الراحة.", 2, 10, 0, 1),
    E("EX-1008", "back", "Bridge", "تمرين الجسر", "Lie on your back with knees bent. Tighten your buttocks and lift your hips. Hold, then lower slowly.", "استلقِ على ظهرك والركب مثنية. شد عضلات المقعدة وارفع الحوض. اثبت ثم انزل ببطء.", 2, 10, 5, 1),
    E("EX-1009", "hip", "Clamshell", "تمرين الصدفة", "Lie on your side with knees bent. Keep your feet together and lift the top knee. Lower slowly.", "استلقِ على جنبك والركب مثنية. خلّ القدمين مع بعض وارفع الركبة العلوية. انزل ببطء.", 2, 10, 0, 1),
    E("EX-1010", "hip", "Side-Lying Leg Raise", "رفع الرجل على الجنب", "Lie on your side with the bottom knee bent. Keep the top leg straight and lift it up, then lower slowly.", "استلقِ على جنبك والركبة السفلية مثنية. خلّ الرجل العلوية مستقيمة وارفعها، ثم انزل ببطء.", 2, 10, 0, 1),
    E("EX-1011", "knee", "Quad Sets", "شد عضلة الفخذ", "Sit or lie with your leg straight. Tighten the muscle on top of your thigh, pushing the knee down. Hold, then relax.", "اجلس أو استلقِ والرجل ممدودة. شد عضلة الفخذ الأمامية واضغط الركبة للأسفل. اثبت ثم ارتخِ.", 2, 10, 5, 3),
    E("EX-1012", "knee", "Straight Leg Raise", "رفع الرجل مستقيمة", "Lie on your back, one knee bent. Tighten the straight leg and lift it to the height of the other knee. Lower slowly.", "استلقِ على ظهرك وركبة مثنية. شد الرجل الممدودة وارفعها لمستوى الركبة الثانية. انزل ببطء.", 2, 10, 0, 2),
    E("EX-1013", "knee", "Heel Slides", "سحب الكعب", "Lie on your back. Slowly slide your heel towards your buttock to bend the knee, then straighten.", "استلقِ على ظهرك. اسحب كعبك ببطء نحو المقعدة لثني الركبة، ثم مدّها.", 2, 10, 0, 2),
    E("EX-1014", "knee", "Sit to Stand", "الوقوف من الكرسي", "Sit on a firm chair. Lean forward and stand up without using your hands if you can. Sit back down slowly.", "اجلس على كرسي ثابت. مِل للأمام وقف بدون استخدام يديك إذا تقدر. اجلس ببطء.", 2, 8, 0, 1),
    E("EX-1015", "ankle", "Ankle Pumps", "تحريك الكاحل", "Sit or lie with your legs straight. Point your toes away, then pull them towards you.", "اجلس أو استلقِ والرجلين ممدودة. وجّه أصابع القدم للأمام، ثم اسحبها لجهتك.", 2, 15, 0, 3),
    E("EX-1016", "ankle", "Calf Raises", "رفع الكعبين", "Stand holding a chair. Rise up onto your toes, then lower slowly.", "قف وامسك كرسي. ارتفع على أطراف أصابعك، ثم انزل ببطء.", 2, 10, 0, 1),
    E("EX-1017", "balance", "Single-Leg Stand", "الوقوف على رجل وحدة", "Stand next to a counter for support. Lift one foot and balance. Hold, then switch.", "قف جنب طاولة للسند. ارفع قدم وحدة وحافظ على توازنك. اثبت ثم بدّل.", 1, 5, 15, 2),
    E("EX-1018", "balance", "Walking", "المشي", "Walk at a comfortable pace on a flat surface. Increase the time slowly as advised.", "امشِ بسرعة مريحة على أرض مستوية. زِد الوقت تدريجياً حسب توجيه الأخصائي.", 1, 1, 0, 1)
  ];
  const copy = x => JSON.parse(JSON.stringify(x));
  // Read on each use, so a list synced from the cloud after the page loaded is picked up.
  const all = () => { let s = null; try { s = typeof MadaStore !== "undefined" ? MadaStore.getJSON(KEY, null) : null; } catch (e) {} return s && Array.isArray(s.list) ? s.list : copy(DEF); };
  const areaName = (a, lang) => (AREA_NAME[a] || { en: a, ar: a })[lang] || a;
  const save = (list, by) => MadaStore.setJSON(KEY, { list, updatedAt: new Date().toISOString(), updatedBy: by || null });
  const nextCode = list => "EX-" + String(Math.max(1000, ...list.map(x => +((/^EX-(\d+)$/.exec(x.code) || [])[1] || 0))) + 1).padStart(4, "0");
  // A video link as an embeddable player URL (YouTube, Vimeo), the file itself (.mp4/.webm), or null when it can only be opened.
  function embed(url) {
    const u = String(url || "").trim(); if (!/^https:\/\//i.test(u)) return null;
    let m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i); if (m) return { kind: "frame", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` };
    m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i); if (m) return { kind: "frame", src: `https://player.vimeo.com/video/${m[1]}` };
    if (/\.(mp4|webm)(\?|$)/i.test(u)) return { kind: "video", src: u };
    return { kind: "link", src: u };
  }
  // Dose in words: "2 sets × 10 reps · hold 5 s · 2× a day".
  function dose(x, lang) {
    const ar = lang === "ar", p = [];
    if (x.sets) p.push(ar ? `${x.sets} مجموعات × ${x.reps} تكرار` : `${x.sets} sets × ${x.reps} reps`);
    if (Number(x.hold) > 0) p.push(ar ? `ثبات ${x.hold} ثانية` : `hold ${x.hold} s`);
    if (Number(x.perDay) > 0) p.push(ar ? `${x.perDay} مرات في اليوم` : `${x.perDay}× a day`);
    return p.join(" · ");
  }
  return { KEY, AREAS, AREA_NAME, areaName, fig, save, nextCode, embed, dose,
    get ALL() { return all(); }, get LIST() { return all().filter(x => x.active !== false); },
    get byCode() { return Object.fromEntries(all().map(x => [x.code, x])); }, edit: () => copy(all()) };
})();
