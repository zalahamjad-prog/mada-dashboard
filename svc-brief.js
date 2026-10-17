// What the nurse is going to do on a visit, from the booked items (order.items) and the catalogues
// (labs.js, nursing.js, ivtherapy.js). Shown from My Visits (nurse-visits.html) before the nurse goes.
// Lab packages are opened into their tests, grouped by sample type with the tube each test goes in.
const MadaBrief = (() => {
  const L = {
    en: { title: "Service Details", sub: "What you will do on this visit.", labT: "Lab Tests", nurseT: "Nursing Services", ivT: "IV Therapy", docT: "Doctor Visit",
      docS: "You go with the doctor. Record the arrival, vitals and the nurse note.", none: "No services on this booking.",
      g_blood: "Blood sample", g_urine: "Urine sample", g_stool: "Stool sample", nTests: "{n} tests", nTests1: "1 test", inPkg: "In {p}",
      tubesT: "Tubes to prepare", noTube: "Tube not set", fast: "Fasting {h} h", fast0: "Fasting", morning: "Morning sample", fastWarn: "The patient must fast: {s}",
      mins: "{n} min", rx: "Needs a prescription", does: "What you do", prep: "Patient preparation", incl: "Includes", close: "Close", total: "{n} services" },
    ar: { title: "تفاصيل الخدمة", sub: "اللي بتسويه في هذي الزيارة.", labT: "التحاليل", nurseT: "خدمات التمريض", ivT: "العلاج الوريدي", docT: "زيارة طبيب",
      docS: "تروح مع الطبيب. سجّل الوصول والعلامات الحيوية وملاحظة التمريض.", none: "ما فيه خدمات على هذا الحجز.",
      g_blood: "عينة دم", g_urine: "عينة بول", g_stool: "عينة براز", nTests: "{n} تحاليل", nTests1: "تحليل واحد", inPkg: "ضمن {p}",
      tubesT: "الأنابيب المطلوبة", noTube: "الأنبوب غير محدد", fast: "صيام {h} ساعات", fast0: "صيام", morning: "عينة صباحية", fastWarn: "المريض لازم يكون صايم: {s}",
      mins: "{n} دقيقة", rx: "تحتاج وصفة طبية", does: "وش تسوي", prep: "تجهيز المريض", incl: "يشمل", close: "إغلاق", total: "{n} خدمات" }
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CSS = `.bf h4{display:flex;align-items:center;gap:8px;font-size:15px;color:#15304a;margin:18px 0 10px}.bf h4:first-child{margin-top:4px}
.bf-g{border:1px solid #e3e8ea;border-radius:12px;overflow:hidden;margin-bottom:10px}.bf-gh{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#f5f8f9;font-size:13.5px}
.bf-gh b{color:#15304a}.bf-gh small{margin-inline-start:auto;color:#6b7a80}.bf-ts{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;border-top:1px dashed #e3e8ea;background:#fbfcfc;font-size:12.5px;color:#5d6d78;align-items:center}
.bf ul{list-style:none;margin:0;padding:0}.bf-t{padding:10px 12px;border-top:1px solid #eef2f3;display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}.bf-t b{font-size:14px;color:#15304a}
.bf-c{font-size:11px;font-weight:700;color:#0b6b5c;background:#e3f4ee;padding:2px 7px;border-radius:6px;direction:ltr}.bf-tg{font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:10px;background:#eef2f7;color:#3a5068}
.bf-tg.f{background:#fff1e0;color:#a4520a}.bf-tg.rx{background:#fde9cf;color:#9a4a06}.bf-n{flex-basis:100%;font-size:12.5px;color:#6b7a80;line-height:1.5}
.bf-u{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#2c3d43;background:#fff;border:1px solid #e3e8ea;padding:2px 9px 2px 7px;border-radius:11px}
.bf-u i{width:11px;height:11px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}.bf-u.none{color:#8a979c;border-style:dashed}
.bf-warn{display:flex;gap:8px;padding:10px 12px;border-radius:10px;background:#fff7ed;color:#9a4a06;font-size:13px;line-height:1.5;margin-bottom:10px}
.bf-s{border:1px solid #e3e8ea;border-radius:12px;padding:12px 14px;margin-bottom:10px}.bf-s>div{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}
.bf-s dl{margin:10px 0 0;display:grid;gap:8px}.bf-s dt{font-size:12px;color:#6b7a80}.bf-s dd{margin:2px 0 0;font-size:13.5px;color:#2c3d43;line-height:1.55}`;
  function style() { if (document.getElementById("bfCss")) return; const s = document.createElement("style"); s.id = "bfCss"; s.textContent = CSS; document.head.appendChild(s); }
  function html(o, lg) {
    style();
    const t = L[lg], tx = (k, v) => t[k].replace(/\{(\w+)\}/g, (_, n) => v[n]), nm = v => v && typeof v === "object" ? v[lg] || v.en : v || "";
    const items = o.items || [], Lb = typeof MadaLabs !== "undefined" ? MadaLabs : null, Nu = typeof MadaNursing !== "undefined" ? MadaNursing : null, Iv = typeof MadaIV !== "undefined" ? MadaIV : null;
    let out = "";
    // Lab tests: packages opened, each test once.
    if (Lb) {
      const map = new Map(), add = (c, from) => { const x = Lb.byCode[c]; const r = map.get(c) || { c, x, from: [] }; if (from && !r.from.includes(from)) r.from.push(from); map.set(c, r); };
      items.forEach(it => { if (it.kind === "test") add(it.code, ""); if (it.kind === "pkg") { const p = Lb.pkgById[it.code]; if (p) p.tests.forEach(c => add(c, nm(p.name))); } });
      const tests = [...map.values()];
      if (tests.length) {
        const fastL = tests.filter(r => r.x && r.x.fasting === "fast");
        const tubeOf = r => r.x && Lb.tubeOf ? Lb.tubeOf(r.x.tube) : null, chip = u => `<span class="bf-u"><i style="background:${u.color}"></i>${esc(nm(u.name))}</span>`;
        const groups = ["blood", "urine", "stool"].map(g => ({ g, list: tests.filter(r => ((r.x && r.x.sample) || "blood") === g) })).filter(x => x.list.length);
        out += `<h4>${t.labT}</h4>${fastL.length ? `<div class="bf-warn">${esc(tx("fastWarn", { s: fastL.map(r => nm(r.x.name)).join(lg === "ar" ? "، " : ", ") }))}</div>` : ""}
          ${groups.map(({ g, list }) => { const us = []; list.forEach(r => { const u = tubeOf(r); if (u && !us.some(y => y.id === u.id)) us.push(u); }); const miss = list.filter(r => !tubeOf(r)).length;
            return `<div class="bf-g"><div class="bf-gh"><b>${t["g_" + g]}</b><small>${list.length === 1 ? t.nTests1 : tx("nTests", { n: list.length })}</small></div>
            <ul>${list.map(r => { const u = tubeOf(r), x = r.x || {};
              return `<li class="bf-t"><b>${esc(nm(x.name) || r.c)}</b><span class="bf-c">${esc(r.c)}</span>${u ? chip(u) : ""}${r.from.map(p => `<span class="bf-tg">${esc(tx("inPkg", { p }))}</span>`).join("")}
                ${x.fasting === "fast" ? `<span class="bf-tg f">${esc(x.fastHours ? tx("fast", { h: x.fastHours }) : t.fast0)}</span>` : x.fasting === "morning" ? `<span class="bf-tg f">${t.morning}</span>` : ""}
                ${x.note ? `<span class="bf-n">${esc(nm(x.note))}</span>` : ""}</li>`; }).join("")}</ul>
            <div class="bf-ts"><span>${t.tubesT}:</span>${us.map(u => `${chip(u)}`).join("")}${miss ? `<span class="bf-u none">${t.noTube} ×${miss}</span>` : ""}</div></div>`; }).join("")}`;
      }
    }
    const svc = (x, code, extra) => `<div class="bf-s"><div><b style="font-size:14.5px;color:#15304a">${esc(nm(x.name) || code)}</b><span class="bf-c">${esc(code)}</span>
        ${x.mins ? `<span class="bf-tg">${esc(tx("mins", { n: x.mins }))}</span>` : ""}${x.rx ? `<span class="bf-tg rx">${t.rx}</span>` : ""}</div>
        <dl>${extra || ""}${x.about ? `<div><dt>${t.does}</dt><dd>${esc(nm(x.about))}</dd></div>` : x.desc ? `<div><dt>${t.does}</dt><dd>${esc(nm(x.desc))}</dd></div>` : ""}
        ${x.prep ? `<div><dt>${t.prep}</dt><dd>${esc(nm(x.prep))}</dd></div>` : ""}</dl></div>`;
    const ns = items.filter(it => it.kind === "nursing").map(it => ({ it, x: Nu && Nu.byCode[it.code] })).filter(r => r.x);
    if (ns.length) out += `<h4>${t.nurseT}</h4>${ns.map(r => svc(r.x, r.it.code)).join("")}`;
    const iv = items.filter(it => it.kind === "iv").map(it => ({ it, x: Iv && Iv.byCode[it.code] })).filter(r => r.x);
    if (iv.length) out += `<h4>${t.ivT}</h4>${iv.map(r => svc(r.x, r.it.code, r.x.includes ? `<div><dt>${t.incl}</dt><dd>${esc((r.x.includes[lg] || r.x.includes.en || []).join(lg === "ar" ? "، " : ", "))}</dd></div>` : "")).join("")}`;
    if (o.service === "doctor" && !out) out = `<h4>${t.docT}</h4><p style="font-size:13.5px;color:#44545a;line-height:1.6">${t.docS}</p>`;
    return `<div class="bf">${out || `<p style="color:#6b7a80">${t.none}</p>`}</div>`;
  }
  return { html, L };
})();
