// Mada Care booking schedule (booking-schedule.html): every booking on one timeline, per doctor and nurse.
// Two kinds of entries:
//  - paid requests from MadaOrders (bookingId + appointment), 60 minutes each (MadaNurses.VISIT_MINUTES);
//  - internal bookings added by staff (MadaStore "mada-internal-bookings"), with no request or payment:
//    a doctor follow-up for a patient, or a nursing care plan task set by the head nurse (e.g. give medication), daily for N days.
// internal: { id: "IB-1001" (internal key), orderId: "INT-1001", bookingId: "IBK-1001" (own series, so internal bookings never look like
//             call center ones (ORD- / BK-); one order for a whole care plan, one booking per day), kind: "followup" | "care", doctorId, nurseId, patient: { name: {en, ar} | string, mrn, mobile },
//             date: "YYYY-MM-DD", minute, mins, task, note, planId (same for every day of one care plan),
//             reason (doctor follow-up), status: "booked" | "cancelled", sentTo: "doctor" | "nurse", sentAt (approved and sent), reassigns: [...], by, at }
// reassigns (orders and internal): [{ role: "doctor" | "nurse", from, to, note, by, at }]
// Busy times here are not yet used by the slot pickers (New Request, Request Details): see notes/sync-map.md.
// Requires orders.js, nurses.js and staff.js. Replace with the real scheduling API.
const MadaSchedule = (() => {
  const KEY = "mada-internal-bookings";
  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const pad = n => String(n).padStart(2, "0");
  const toMin = v => { const [h, m] = v.split(":").map(Number); return h * 60 + m; };
  const dayOf = date => { const [y, m, d] = date.split("-").map(Number); return new Date(y, m - 1, d).getDay(); };

  // Doctors and nurses who can be booked. Staff page records carry their own work schedule.
  function people() {
    const staff = MadaStaff.all();
    const out = MadaOrders.DOCTORS.map(d => ({ id: d.id, role: "doctor", name: d.name, spec: d.spec, staff: !!d.staff, active: d.active !== false }));
    MadaNurses.NURSES.forEach(n => out.push({ id: n.id, role: n.role || "nurse", name: n.name, spec: null, staff: false, active: true }));
    staff.filter(s => s.role === "nurse" && !out.some(p => p.id === s.id)).forEach(s => out.push({ id: s.id, role: "nurse", name: s.name, spec: s.specialty ? { en: s.specialty, ar: s.specialty } : null, staff: true, active: s.status === "active" }));
    return out;
  }
  const person = id => people().find(p => p.id === id) || null;

  // SAMPLE DATA ONLY: work hours for the sample doctors (D01-D03), by weekday (0 = Sunday), as [startHour, endHour].
  // Doctors added on the Staff page use their own work schedule instead.
  const SAMPLE_DR = !MadaStore.SAMPLES ? {} : {
    D01: { 0: [9, 17], 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17] },
    D02: { 0: [10, 18], 1: [10, 18], 2: [10, 18], 3: [10, 18], 4: [10, 18], 5: [10, 16] },
    D03: { 0: [12, 20], 1: [12, 20], 2: [12, 20], 3: [12, 20], 6: [12, 20] }
  };
  // Work hours on a date: { from, to } in minutes (to may pass midnight: to > 1440), null = day off,
  // undefined = no work schedule set (any time is allowed).
  function hoursOn(id, date) {
    const wd = dayOf(date);
    const n = MadaNurses.NURSES.find(x => x.id === id);
    const sh = n ? n.shifts : SAMPLE_DR[id];
    if (sh) { const s = sh[wd]; return s ? { from: s[0] * 60, to: s[1] * 60 } : null; }
    const s = MadaStaff.get(id);
    if (!s || !s.schedule || !s.schedule.days) return undefined;
    const d = s.schedule.days[DAYS[wd]];
    if (!d) return null;
    const from = toMin(d.from); let to = toMin(d.to); if (to <= from) to += 1440;
    return { from, to };
  }

  const num = (v, base) => parseInt(String(v || "").split("-")[1], 10) || base;
  const ours = b => /^IBK-/.test(b.bookingId || "");
  // Highest internal order (INT-) and booking (IBK-) numbers used so far.
  function lastNums(list) {
    let ord = 1000, bk = 1000;
    list.filter(ours).forEach(b => { ord = Math.max(ord, num(b.orderId, 0)); bk = Math.max(bk, num(b.bookingId, 0)); });
    return { ord, bk };
  }
  // Next numbers, shown on the form before the booking is approved.
  const peek = (days = 1) => { const n = lastNums(internal()); return { orderId: "INT-" + (n.ord + 1), first: "IBK-" + (n.bk + 1), last: "IBK-" + (n.bk + days) }; };
  // Internal bookings saved before they had their own number series get them on first read.
  function internal() {
    const list = MadaStore.getJSON(KEY, []);
    if (list.some(b => !ours(b))) {
      const n = lastNums(list), plans = {};
      list.forEach(b => { if (ours(b)) return;
        b.orderId = (b.planId && plans[b.planId]) || "INT-" + (++n.ord); if (b.planId) plans[b.planId] = b.orderId;
        b.bookingId = "IBK-" + (++n.bk); });
      MadaStore.setJSON(KEY, list);
    }
    return list;
  }
  const saveInternal = list => {
    MadaStore.setJSON(KEY, list);
    if (JSON.stringify(MadaStore.getJSON(KEY, null)) !== JSON.stringify(list)) throw new Error("not saved");
  };
  function nextId(list) {
    return "IB-" + (list.reduce((m, b) => Math.max(m, parseInt(b.id.split("-")[1], 10) || 0), 1000) + 1);
  }
  // Adds one entry per day; returns the saved entries.
  function addInternal(entries) {
    const list = internal(), at = new Date().toISOString(), out = [], n = lastNums(list), orderId = "INT-" + (n.ord + 1);
    entries.forEach(e => { const b = { status: "booked", reassigns: [], ...e, id: nextId(list), orderId, bookingId: "IBK-" + (++n.bk), at }; list.push(b); out.push(b); });
    saveInternal(list);
    return out;
  }
  function updateInternal(id, patch) {
    const list = internal(), b = list.find(x => x.id === id);
    if (!b) return null;
    Object.assign(b, patch, { updatedAt: new Date().toISOString() });
    saveInternal(list);
    return b;
  }

  // One shape for both kinds. status: "upcoming" | "unscheduled" | "completed" | "cancelled".
  function entries() {
    const mins = MadaNurses.VISIT_MINUTES;
    const orders = MadaOrders.all().filter(o => o.bookingId).map(o => {
      const nid = o.booking && o.booking.nurseId;
      const byName = !nid && o.appointment && o.appointment.nurse ? MadaNurses.NURSES.find(n => n.name.en === (o.appointment.nurse.en || o.appointment.nurse)) : null;
      return { key: "o:" + o.id, src: "order", id: o.id, bookingId: o.bookingId, orderId: o.id, kind: o.service || "none",
        patient: o.patient, mrn: o.mrn, mobile: o.mobile, items: o.items || [],
        date: o.appointment ? o.appointment.date : null, minute: o.appointment ? o.appointment.minute : null, mins,
        doctorId: (o.booking && o.booking.doctorId) || null, nurseId: nid || (byName && byName.id) || null,
        status: o.status === "cancelled" ? "cancelled" : o.status === "completed" ? "completed" : o.appointment ? "upcoming" : "unscheduled", ref: o };
    });
    const now = Date.now();
    const inner = internal().map(b => {
      const [y, m, d] = b.date.split("-").map(Number), end = new Date(y, m - 1, d, 0, b.minute + b.mins).getTime();
      return { key: "i:" + b.id, src: "internal", id: b.id, bookingId: b.bookingId || b.id, orderId: b.orderId || null, kind: b.kind,
        patient: b.patient && b.patient.name, mrn: b.patient && b.patient.mrn, mobile: b.patient && b.patient.mobile, items: [], task: b.task, note: b.note, reason: b.reason || "", sentTo: b.sentTo || null,
        date: b.date, minute: b.minute, mins: b.mins, doctorId: b.doctorId || null, nurseId: b.nurseId || null, planId: b.planId || null,
        status: b.status === "cancelled" ? "cancelled" : end < now ? "completed" : "upcoming", ref: b };
    });
    return orders.concat(inner);
  }

  // Bookings that overlap [minute, minute + mins) on a date for one person (cancelled ones never block).
  function clashes(id, date, minute, mins, exceptKey, list) {
    return (list || entries()).filter(e => e.key !== exceptKey && e.date === date && e.status !== "cancelled" && e.minute != null &&
      (e.doctorId === id || e.nurseId === id) && e.minute < minute + mins && minute < e.minute + e.mins);
  }
  // "free" | "busy" | "off" (outside work hours) | "open" (no work schedule set).
  function availability(id, date, minute, mins, exceptKey, list) {
    if (clashes(id, date, minute, mins, exceptKey, list).length) return "busy";
    const h = hoursOn(id, date);
    if (h === undefined) return "open";
    if (!h || minute < h.from || minute + mins > h.to) return "off";
    return "free";
  }

  // Moves a booking to another doctor or nurse; keeps the change in reassigns.
  function reassign(e, role, toId, note, by) {
    const field = role === "doctor" ? "doctorId" : "nurseId", from = e[field] || null, at = new Date().toISOString();
    const rec = { role, from, to: toId, note: note || "", by, at };
    if (e.src === "internal") return updateInternal(e.id, { [field]: toId, reassigns: (e.ref.reassigns || []).concat(rec) });
    const o = MadaOrders.get(e.id), patch = { booking: { ...(o.booking || {}), [field]: toId, by, at }, reassigns: (o.reassigns || []).concat(rec) };
    if (role === "nurse" && o.appointment) { const p = person(toId); patch.appointment = { ...o.appointment, nurse: p ? p.name : null }; }
    const back = MadaOrders.update(e.id, patch);
    if (!back || (back.booking || {})[field] !== toId) throw new Error("not saved");
    return back;
  }

  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { KEY, DAYS, people, person, hoursOn, internal, addInternal, updateInternal, peek, entries, clashes, availability, reassign, ymd };
})();
