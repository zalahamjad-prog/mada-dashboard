// Prescriptions for services that need one (nursing.js / ivtherapy.js items with rx: true).
// The patient uploads photos of the doctor's prescription on the payment page (pay.html); the team can add them on
// Request Details, and the nurse sees them (and can add one at the visit) in nurse-visit.html.
// Photos are kept in MadaStore "mada-rx-<orderId>" as [{ id, img (JPEG data URL), at, by }]; the order keeps a summary in
// order.prescription = { count, at, by }.
// TODO: upload to file storage and keep only the file URLs; prescriptions are patient data, so only test photos until logins use Supabase Auth.
const MadaRx = (() => {
  const key = oid => "mada-rx-" + oid;
  const MAX = 4;
  const L = {
    en: { title: "Doctor's Prescription", need: "Needed for: {s}", sub: "Upload a clear photo of the prescription so the nurse can check it before the visit.",
      subNurse: "Check the prescription before you start.", none: "No prescription uploaded yet.", noneNurse: "No prescription uploaded. Ask the patient for it, or take a photo of it.",
      add: "Upload photo", addMore: "Add another photo", take: "Take a photo", remove: "Remove", count: "{n} photos uploaded", count1: "1 photo uploaded", max: "Up to {n} photos.",
      saved: "Prescription photo saved.", removed: "Photo removed.", err: "Couldn't save the photo. Try a smaller one.", type: "Choose an image file.", close: "Close", view: "Open photo" },
    ar: { title: "الوصفة الطبية", need: "مطلوبة لـ: {s}", sub: "ارفع صورة واضحة للوصفة عشان الممرض يراجعها قبل الزيارة.",
      subNurse: "راجع الوصفة قبل ما تبدأ.", none: "ما انرفعت وصفة للحين.", noneNurse: "ما انرفعت وصفة. اطلبها من المريض، أو صوّرها.",
      add: "رفع صورة", addMore: "إضافة صورة ثانية", take: "تصوير الوصفة", remove: "حذف", count: "انرفعت {n} صور", count1: "انرفعت صورة وحدة", max: "إلى {n} صور.",
      saved: "انحفظت صورة الوصفة.", removed: "انحذفت الصورة.", err: "ما قدرنا نحفظ الصورة. جرّب صورة أصغر.", type: "اختر ملف صورة.", close: "إغلاق", view: "فتح الصورة" }
  };
  const nameOf = (v, lg) => v && typeof v === "object" ? v[lg] || v.en : v || "";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Booked items that need a prescription.
  function needs(o) {
    const look = it => it.kind === "nursing" && typeof MadaNursing !== "undefined" ? MadaNursing.byCode[it.code] : it.kind === "iv" && typeof MadaIV !== "undefined" ? MadaIV.byCode[it.code] : null;
    return ((o && o.items) || []).map(it => ({ it, s: look(it) })).filter(x => x.s && x.s.rx).map(x => ({ code: x.it.code, name: x.s.name }));
  }
  const list = oid => { try { return JSON.parse(MadaStore.get(key(oid)) || "[]") || []; } catch (e) { return []; } };
  function put(oid, arr, by) {
    const v = JSON.stringify(arr);
    MadaStore.set(key(oid), arr.length ? v : null);
    if (arr.length && MadaStore.get(key(oid)) !== v) throw new Error("not saved");
    MadaOrders.update(oid, { prescription: arr.length ? { count: arr.length, at: new Date().toISOString(), by } : null });
  }
  // Shrink the photo so it fits in storage.
  function shrink(file) {
    return new Promise((res, rej) => {
      const r = new FileReader(); r.onerror = rej;
      r.onload = () => { const img = new Image(); img.onerror = rej; img.onload = () => {
        const k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.72)); }; img.src = r.result; };
      r.readAsDataURL(file);
    });
  }
  async function add(oid, file, by) {
    const img = await shrink(file), arr = list(oid);
    arr.push({ id: Date.now().toString(36), img, at: new Date().toISOString(), by });
    put(oid, arr, by);
  }
  const remove = (oid, pid, by) => put(oid, list(oid).filter(x => x.id !== pid), by);

  const CSS = `.rxd{border:1px solid #f3d9b8;background:#fffaf3;border-radius:14px;padding:16px;margin:0 0 16px;text-align:start}
.rxd-h{display:flex;gap:12px;align-items:flex-start}.rxd-ic{width:40px;height:40px;border-radius:50%;background:#fde9cf;color:#c2620a;display:grid;place-items:center;flex:none}
.rxd-ic svg{width:21px;height:21px}.rxd-h b{display:block;font-size:15.5px;color:#15304a}.rxd-h small{display:block;font-size:13px;color:#5d6d78;margin-top:3px;line-height:1.5}
.rxd-need{font-size:12.5px;color:#9a4a06;margin-top:6px;font-weight:600;line-height:1.5}
.rxd-ok{border-color:#bfe3d6;background:#f4fbf8}.rxd-ok .rxd-ic{background:#dff5ec;color:#0f8f6f}.rxd-ok .rxd-need{color:#0b6b5c}
.rxd-g{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.rxd-t{position:relative;width:120px;height:120px;border-radius:10px;overflow:hidden;border:1px solid #e3e8ea;background:#fff;padding:0;cursor:zoom-in}
.rxd-t img{width:100%;height:100%;object-fit:cover;display:block}.rxd-x{position:absolute;top:4px;inset-inline-end:4px;width:24px;height:24px;border-radius:50%;border:0;background:rgba(16,35,43,.72);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0}
.rxd-x svg{width:13px;height:13px}.rxd-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.rxd-b{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 14px;border-radius:9px;border:1px solid #d6dee1;background:#fff;color:#15304a;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer}
.rxd-b svg{width:17px;height:17px}.rxd-b.main{background:#15304a;border-color:#15304a;color:#fff}.rxd-m{font-size:12px;color:#6b7a80;align-self:center}
.rxd-lb{position:fixed;inset:0;z-index:200;background:rgba(10,20,25,.86);display:grid;place-items:center;padding:16px;cursor:zoom-out}
.rxd-lb img{max-width:100%;max-height:calc(100vh - 32px);border-radius:8px;background:#fff}`;
  const I = { rx: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h3a2 2 0 0 1 0 4H9v-4zM9 16v3M12 16l3 3"/>',
    up: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>', cam: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', ok: '<path d="m5 12 5 5 9-10"/>' };
  const S = (p, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 1.9}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  function style() { if (document.getElementById("rxdCss")) return; const s = document.createElement("style"); s.id = "rxdCss"; s.textContent = CSS; document.head.appendChild(s); }

  // The prescription card. opts: { lang, nurse (wording for the nurse), canEdit (add photos), canRemove (default: canEdit), camera (offer "Take a photo") }. Empty when nothing needs one.
  function card(o, opts) {
    const need = needs(o); if (!need.length) return "";
    style();
    const lg = opts.lang, t = L[lg], tx = (k, v) => t[k].replace(/\{(\w+)\}/g, (_, n) => v[n]), photos = list(o.id), has = photos.length > 0;
    return `<section class="rxd ${has ? "rxd-ok" : ""}" data-rxd="${esc(o.id)}">
      <div class="rxd-h"><span class="rxd-ic">${S(has ? I.ok : I.rx, 2)}</span><div><b>${t.title}</b><small>${has ? (photos.length === 1 ? t.count1 : tx("count", { n: photos.length })) : opts.nurse ? t.noneNurse : t.sub}</small>
        <div class="rxd-need">${esc(tx("need", { s: need.map(x => nameOf(x.name, lg)).join(lg === "ar" ? "، " : ", ") }))}</div></div></div>
      ${has ? `<div class="rxd-g">${photos.map(p => `<span class="rxd-t" role="button" tabindex="0" data-rxv="${esc(p.id)}" aria-label="${t.view}"><img src="${p.img}" alt="">${opts.canEdit && opts.canRemove !== false ? `<button type="button" class="rxd-x" data-rxr="${esc(p.id)}" aria-label="${t.remove}">${S(I.x, 2.4)}</button>` : ""}</span>`).join("")}</div>` : ""}
      ${opts.canEdit && photos.length < MAX ? `<div class="rxd-acts"><label class="rxd-b ${has ? "" : "main"}">${S(I.up)}${has ? t.addMore : t.add}<input type="file" accept="image/*" data-rxa hidden></label>
        ${opts.camera ? `<label class="rxd-b">${S(I.cam)}${t.take}<input type="file" accept="image/*" capture="environment" data-rxa hidden></label>` : ""}<span class="rxd-m">${tx("max", { n: MAX })}</span></div>` : ""}
    </section>`;
  }
  // Wires the card inside root. opts: as card(), plus by (who is adding), toast(msg), done() after a change.
  function bind(root, o, opts) {
    const box = root.querySelector(`[data-rxd="${o.id}"]`); if (!box) return;
    const t = L[opts.lang], toast = opts.toast || (() => {});
    const open = pid => { const p = list(o.id).find(x => x.id === pid); if (!p) return; const lb = document.createElement("div"); lb.className = "rxd-lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", t.title);
      lb.innerHTML = `<img src="${p.img}" alt="">`; const close = () => { lb.remove(); document.removeEventListener("keydown", esc2); }, esc2 = e => { if (e.key === "Escape") close(); };
      lb.addEventListener("click", close); document.addEventListener("keydown", esc2); document.body.appendChild(lb); };
    box.querySelectorAll("[data-rxv]").forEach(el => { el.addEventListener("click", e => { if (!e.target.closest("[data-rxr]")) open(el.dataset.rxv); }); el.addEventListener("keydown", e => { if (e.key === "Enter") open(el.dataset.rxv); }); });
    box.querySelectorAll("[data-rxr]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); try { remove(o.id, b.dataset.rxr, opts.by); toast(t.removed); } catch (x) { toast(t.err); } opts.done && opts.done(); }));
    box.querySelectorAll("[data-rxa]").forEach(inp => inp.addEventListener("change", async () => {
      const f = inp.files[0]; inp.value = ""; if (!f) return;
      if (!/^image\//.test(f.type)) return toast(t.type);
      try { await add(o.id, f, opts.by); toast(t.saved); } catch (x) { toast(t.err); }
      opts.done && opts.done();
    }));
  }
  return { needs, list, add, remove, card, bind, L };
})();
