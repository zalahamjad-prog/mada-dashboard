// Mada Care finance basics (finance.html): what each booking costs Mada Care, the expenses, quotations and the monthly budget.
// Official tax invoices, the chart of accounts, journal entries and VAT returns stay in the accounting system Mada Care will link to.
// mada-costs (one value): { svc: { blood: { mode: "pct" | "fixed", value, providerId } ... }, items: { CODE: cost }, updatedAt, updatedBy }
//   Cost of a booking: each item uses its own cost (items[code]) when set, otherwise the service rule: "pct" = value % of the item price,
//   "fixed" = value SAR once per visit. No rule and no item cost = cost not set (counted as 0 and shown as "not set").
// mada-expenses (one row each): { id: "EXP-0001", date: "YYYY-MM-DD", cat, amount (before VAT), vat, vendor, providerId, note, createdAt, createdBy }
// mada-quotes (one row each): { id: "QT-0001", customer: { name, mobile }, lines: [{ kind, code, name: { en, ar }, price, qty }], discount (SAR),
//   vat (true = add VAT), validDays, note, status: "draft" | "sent" | "accepted" | "rejected", createdAt, createdBy, updatedAt }
// mada-budget (one value): { "YYYY-MM": { revenue, cats: { cat: amount } } }
// Prices in the catalogues are SAMPLE prices until the real price lists are entered on the Services pages.
const MadaFinance = (() => {
  const SVCS = ["blood", "nursing", "iv", "physio", "doctor", "rad"];
  const CATS = [
    { id: "salaries", en: "Salaries", ar: "الرواتب" }, { id: "providers", en: "Service providers", ar: "مقدمو الخدمة" },
    { id: "rent", en: "Rent", ar: "الإيجار" }, { id: "cars", en: "Cars and fuel", ar: "السيارات والوقود" },
    { id: "supplies", en: "Medical supplies", ar: "المستلزمات الطبية" }, { id: "marketing", en: "Marketing", ar: "التسويق" },
    { id: "tech", en: "Systems and subscriptions", ar: "الأنظمة والاشتراكات" }, { id: "gov", en: "Government fees", ar: "الرسوم الحكومية" },
    { id: "other", en: "Other", ar: "أخرى" }
  ];
  const ymd = d => { const x = new Date(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
  const by = u => u ? { en: u.name && u.name.en, ar: u.name && u.name.ar, id: u.staffId || u.username || null } : null;

  // ---------- Catalogue ----------
  // Name and price of one booking item ({ kind, code }), from the Services catalogues.
  function itemOf(it) {
    const k = it && it.kind, c = it && it.code; let x = null;
    if (k === "test" && typeof MadaLabs !== "undefined") x = MadaLabs.byCode[c];
    else if (k === "pkg" && typeof MadaLabs !== "undefined") x = MadaLabs.pkgById[c];
    else if (k === "nursing" && typeof MadaNursing !== "undefined") x = MadaNursing.byCode[c];
    else if (k === "iv" && typeof MadaIV !== "undefined") x = MadaIV.byCode[c];
    else if (k === "rad" && typeof MadaRad !== "undefined") x = MadaRad.byCode[c];
    else if (k === "physio" && typeof MadaPhysio !== "undefined") x = MadaPhysio.byCode[c] || (MadaPhysio.pkgByCode && MadaPhysio.pkgByCode[c]);
    return x ? { name: x.name, price: Number(x.price || 0) } : null;
  }
  // Everything that can go on a quotation, grouped by service.
  function catalogue() {
    const out = [], add = (svc, kind, list, key) => (list || []).filter(x => x.active !== false).forEach(x => out.push({ svc, kind, code: x[key || "code"], name: x.name, price: Number(x.price || 0) }));
    if (typeof MadaLabs !== "undefined") { add("blood", "test", MadaLabs.TESTS || MadaLabs.ALL_TESTS); add("blood", "pkg", MadaLabs.PACKAGES || MadaLabs.ALL_PACKAGES, "id"); }
    if (typeof MadaNursing !== "undefined") add("nursing", "nursing", MadaNursing.SERVICES || MadaNursing.ALL_SERVICES);
    if (typeof MadaIV !== "undefined") add("iv", "iv", MadaIV.PACKAGES || MadaIV.ALL_PACKAGES);
    if (typeof MadaPhysio !== "undefined") { add("physio", "physio", MadaPhysio.SERVICES || MadaPhysio.ALL_SERVICES); add("physio", "physio", MadaPhysio.PACKAGES || MadaPhysio.ALL_PACKAGES); }
    if (typeof MadaRad !== "undefined") add("rad", "rad", MadaRad.EXAMS || MadaRad.ALL_EXAMS);
    return out;
  }

  // ---------- Costs ----------
  const costs = () => { const c = MadaStore.getJSON("mada-costs", null) || {}; return { svc: c.svc || {}, items: c.items || {}, updatedAt: c.updatedAt || null, updatedBy: c.updatedBy || null }; };
  function saveCosts(c, u) { MadaStore.setJSON("mada-costs", { svc: c.svc || {}, items: c.items || {}, updatedAt: new Date().toISOString(), updatedBy: by(u) }); }
  // What one booking costs Mada Care: { amount, set (false = no cost entered), providerId }.
  function costOf(o) {
    const c = costs(), svc = o.service || "other", rule = c.svc[svc], items = Array.isArray(o.items) ? o.items : [];
    let amount = 0, set = false, rest = 0, restPrice = 0;
    items.forEach(it => {
      const own = c.items[it.code];
      if (own != null && own !== "") { amount += Number(own) || 0; set = true; }
      else { rest++; const x = itemOf(it); restPrice += x ? x.price : 0; }
    });
    const ok = rule && rule.value !== "" && rule.value != null && !isNaN(Number(rule.value));
    if (ok && (rest || !items.length)) {
      const base = items.length ? restPrice : Number(o.total || 0);
      amount += rule.mode === "fixed" ? Number(rule.value) : base * Number(rule.value) / 100; set = true;
    }
    return { amount: Math.round(amount * 100) / 100, set, providerId: (rule && rule.providerId) || null };
  }

  // ---------- Expenses ----------
  const expenses = () => MadaStore.getJSON("mada-expenses", []) || [];
  const nextId = (list, p) => p + "-" + String(list.reduce((m, x) => Math.max(m, parseInt(String(x.id).split("-")[1], 10) || 0), 0) + 1).padStart(4, "0");
  function saveExpense(x, u) {
    const list = expenses(), at = new Date().toISOString();
    if (x.id) { const i = list.findIndex(e => e.id === x.id); if (i < 0) return null; list[i] = { ...list[i], ...x, updatedAt: at, updatedBy: by(u) }; MadaStore.setJSON("mada-expenses", list); return list[i]; }
    const rec = { ...x, id: nextId(list, "EXP"), createdAt: at, createdBy: by(u) }; list.push(rec); MadaStore.setJSON("mada-expenses", list); return rec;
  }
  const removeExpense = id => MadaStore.setJSON("mada-expenses", expenses().filter(e => e.id !== id));

  // ---------- Quotations ----------
  const quotes = () => MadaStore.getJSON("mada-quotes", []) || [];
  function saveQuote(q, u) {
    const list = quotes(), at = new Date().toISOString();
    if (q.id) { const i = list.findIndex(e => e.id === q.id); if (i < 0) return null; list[i] = { ...list[i], ...q, updatedAt: at, updatedBy: by(u) }; MadaStore.setJSON("mada-quotes", list); return list[i]; }
    const rec = { status: "draft", ...q, id: nextId(list, "QT"), createdAt: at, createdBy: by(u) }; list.push(rec); MadaStore.setJSON("mada-quotes", list); return rec;
  }
  const removeQuote = id => MadaStore.setJSON("mada-quotes", quotes().filter(e => e.id !== id));
  // Totals of a quotation: { sub, discount, net, vat, total }.
  function quoteTotals(q) {
    const sub = (q.lines || []).reduce((s, l) => s + Number(l.price || 0) * Number(l.qty || 1), 0), discount = Math.min(sub, Number(q.discount || 0));
    const net = sub - discount, rate = q.vat && typeof MadaOrders !== "undefined" ? MadaOrders.VAT : 0, vat = Math.round(net * rate * 100) / 100;
    return { sub, discount, net, vat, total: net + vat, rate };
  }
  const expired = q => q.status !== "accepted" && q.status !== "rejected" && q.validDays && Date.now() > new Date(q.createdAt).getTime() + q.validDays * 864e5;

  // ---------- Budget ----------
  const budget = () => MadaStore.getJSON("mada-budget", null) || {};
  function saveBudget(month, b) { const all = budget(); all[month] = b; MadaStore.setJSON("mada-budget", all); }

  return { SVCS, CATS, ymd, itemOf, catalogue, costs, saveCosts, costOf, expenses, saveExpense, removeExpense, quotes, saveQuote, removeQuote, quoteTotals, expired, budget, saveBudget };
})();
