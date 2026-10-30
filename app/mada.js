// Mada Care app data: the signed in customer's records from Supabase (notes/supabase-app.sql, mada_app_* functions),
// shaped for the design screens. Field names follow the ops dashboard (orders.js, patients.js, medical.js, ops.html phase()).
window.Mada = (() => {
  const CFG = window.MADA_CONFIG || {};
  const SUPPORT = CFG.support || '920000000';
  const sb = window.supabase && CFG.url ? window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage } }) : null;
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };

  const st = { rows: [], loaded: false, loading: false, error: null, fileNo: ls.get('mada-file'), session: null };
  const subs = new Set();
  const emit = () => subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } });

  // ---------- Text and dates ----------
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const ar = (v) => (v && typeof v === 'object' ? v.ar || v.en || '' : v == null ? '' : String(v));
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dateOf = (s) => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };
  const dayMonth = (d) => (d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '');
  // "اليوم، 24 أكتوبر" · "غدًا، 25 أكتوبر" · "السبت، 26 أكتوبر"
  function dayLabel(d) {
    if (!d) return '';
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - t) / 864e5);
    const w = diff === 0 ? 'اليوم' : diff === 1 ? 'غدًا' : diff === -1 ? 'أمس' : DAYS[d.getDay()];
    return `${w}، ${dayMonth(d)}`;
  }
  const time = (min) => { if (min == null) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`; };
  const timeOf = (iso) => { if (!iso) return ''; const d = new Date(iso); return time(d.getHours() * 60 + d.getMinutes()); };
  const plural = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`);
  function ago(iso) {
    if (!iso) return '';
    const d = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 864e5));
    if (d === 0) return 'اليوم';
    if (d === 1) return 'أمس';
    return 'منذ ' + plural(d, 'يوم', 'يومين', 'أيام', 'يومًا');
  }
  function until(ms) {
    const m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60), r = m % 60;
    const hs = h ? plural(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة') : '', ms_ = r ? plural(r, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة') : '';
    if (h >= 48) return plural(Math.round(h / 24), 'يوم', 'يومين', 'أيام', 'يومًا');
    return [hs, ms_].filter(Boolean).join(' و ') || 'الآن';
  }

  // ---------- Records ----------
  const parse = (r) => { try { return JSON.parse(r.v); } catch (e) { return {}; } };
  const by = (k) => st.rows.filter((r) => r.k === k).map(parse);
  const row = (k) => { const r = st.rows.find((x) => x.k === k); return r ? parse(r) : null; };
  const files = () => by('mada-patients').sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  const me = () => { const f = files(); return f.find((p) => p.fileNo === st.fileNo) || f[0] || null; };
  const staff = () => new Map(by('mada-staff').map((s) => [String(s.id), s]));
  const mine = (o) => { const p = me(); return !p || !o.mrn || o.mrn === p.fileNo; };

  // Only paid bookings (bookingId) show in the app; requests waiting for the call center or the doctor never do (HomeMap).
  const orders = () => by('mada-orders').filter((o) => o.bookingId && mine(o));
  // Customer stage (HomeMap): booked → ontheway → arrived (until the visit closes) → done; cancelled.
  function stage(o) {
    const s = (o.visit && o.visit.steps) || {}, dv = o.doctorVisit || {}, nv = o.nurseVisit || {}, pv = o.physioVisit || {};
    if (o.status === 'cancelled') return 'cancelled';
    if (o.status === 'completed' || s.report || dv.status === 'done') return 'done';
    if (s.arrived || o.arrival || dv.startedAt || ['arrived', 'ongoing', 'paused'].includes(nv.status) || ['arrived', 'ongoing', 'paused'].includes(pv.status)) return 'arrived';
    if (s.ontheway || nv.status === 'ontheway' || pv.status === 'ontheway') return 'ontheway';
    return 'booked';
  }
  const at = (o) => { const a = o.appointment || {}; const d = dateOf(a.date); if (!d) return null; d.setMinutes(a.minute || 0); return d; };
  const current = () => orders().filter((o) => !['done', 'cancelled'].includes(stage(o))).sort((a, b) => (at(a) || 0) - (at(b) || 0));
  const past = () => orders().filter((o) => ['done', 'cancelled'].includes(stage(o)))
    .sort((a, b) => String(b.completedAt || b.updatedAt || '').localeCompare(String(a.completedAt || a.updatedAt || '')));

  // Service names as the dashboard (requests.html sv_*).
  const SERVICE = {
    doctor: 'زيارة طبيب منزلية', nursing: 'خدمات تمريضية', nurse: 'خدمات تمريضية', blood: 'تحاليل الدم', lab: 'تحاليل الدم',
    iv: 'المحاليل الوريدية', physio: 'العلاج الطبيعي', rad: 'الأشعة المنزلية', radiology: 'الأشعة المنزلية',
  };
  const ROLE = { doctor: 'طبيب', nurse: 'تمريض', nursing: 'تمريض', physio: 'أخصائي علاج طبيعي', driver: 'سائق' };
  function team(o) {
    const S = staff(), b = o.booking || {}, a = o.appointment || {};
    return [b.doctorId, b.nurseId || a.nurseId].filter(Boolean).map((id) => S.get(String(id))).filter(Boolean).map((s) => {
      const name = ar(s.name);
      return { name, initial: name.replace(/^(د\.|أ\.)\s*/, '').trim().charAt(0), role: ar(s.specialty) || ROLE[s.role] || ar(s.role) || '' };
    });
  }
  // Everything a screen shows about one booking.
  function view(o) {
    if (!o) return null;
    const d = at(o), a = o.appointment || {};
    const g = stage(o);
    return {
      o, id: o.id, bookingId: o.bookingId, stage: g, service: SERVICE[o.service] || ar(o.serviceName) || 'زيارة منزلية',
      date: dayLabel(d), dayMonth: dayMonth(d), time: time(a.minute), when: d ? `${dayLabel(d)} · ${time(a.minute)}` : '',
      msLeft: d ? d.getTime() - Date.now() : null, left: d ? until(d.getTime() - Date.now()) : '',
      team: team(o), location: o.location || {}, rating: o.rating || null,
      doneAt: o.completedAt || (o.doctorVisit && o.doctorVisit.completedAt) || o.updatedAt,
    };
  }

  // ---------- Health file ----------
  // Every section of the open patient file, shaped like the sample lists in the design screens (Reports, Labs, Vitals,
  // Referrals, Rx, SickLeave). The database sends clinical content only after the doctor approved it (mada_app_clean).
  const fullDate = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${dayMonth(d)} ${d.getFullYear()}`; };
  const stamp = (iso) => (iso ? `${dayMonth(new Date(iso))} · ${timeOf(iso)}` : '');
  const AV = [['#E6EFF2', '#014359'], ['#FEF4E5', '#8A5A12'], ['#E9F6F1', '#22684F']];
  function person(name, role, n) {
    const nm = ar(name) || '—', [bg, fg] = AV[(n || 0) % 3];
    return { ini: nm.replace(/^(د\.|أ\.)\s*/, '').trim().charAt(0), name: nm, role: role || '',
      av: `width: 34px; height: 34px; border-radius: 17px; background: ${bg}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px; font-weight: 700; color: ${fg};` };
  }
  const medical = () => by('mada-medical').filter(mine);
  const items = (type) => medical().flatMap((r) => (r.items || []).filter((it) => it.type === type).map((it) => ({ r, it })));
  const logAt = (it, step) => (it.log || []).find((l) => l.step === step);
  const vit = (v) => { if (!v) return null; const o = {}; ['temp', 'bp', 'hr', 'spo2', 'rr', 'sugar'].forEach((k) => { let x = v[k]; if (x && typeof x === 'object') x = x.sys && x.dia ? `${x.sys}/${x.dia}` : ''; if (x != null && x !== '') o[k] = String(x); }); return Object.keys(o).length ? o : null; };
  const doctorOf = (o) => { const d = staff().get(String((o.booking || {}).doctorId)); return d ? ar(d.name) : ''; };

  function reports() {
    const S = staff();
    return orders().flatMap((o) => {
      const out = [], b = o.booking || {}, dv = o.doctorVisit, pv = o.physioVisit;
      const tm = [b.doctorId, b.nurseId].filter(Boolean).map((id, n) => { const x = S.get(String(id)); return x ? person(x.name, ar(x.specialty) || ROLE[x.role] || '', n) : null; }).filter(Boolean);
      if (dv && (dv.report || dv.status === 'done')) {
        const ok = (dv.report || {}).status === 'approved', vt = (dv.steps || {}).vitals;
        out.push({ id: 'D-' + o.id, kind: 'doctor', title: 'تقرير زيارة طبيب', date: fullDate(dv.completedAt || o.completedAt), orderNo: o.id, bookingNo: o.bookingId,
          team: tm, byP: tm[1] || tm[0] || person('—'), at: stamp(vt && vt.at), approved: ok,
          appr: ok ? `اعتمده ${ar(dv.report.approvedBy) || doctorOf(o)} · ${dayMonth(new Date(dv.report.approvedAt || dv.completedAt))}` : '',
          reportNo: 'MR-' + String(o.id).replace(/^\D+-?/, ''), docName: 'التقرير الطبي', v: ok ? vit(vt) || {} : {}, doctor: doctorOf(o), sort: dv.completedAt || o.completedAt || '' });
      }
      if (pv && pv.status === 'done') {
        const rp = pv.report || {}, ok = rp.status === 'approved';
        const th = S.get(String(b.nurseId));
        out.push({ id: 'P-' + o.id, kind: 'physio', title: 'تقرير علاج طبيعي', date: fullDate(pv.completedAt || o.completedAt), orderNo: o.id, bookingNo: o.bookingId,
          team: tm, byP: tm[0] || person('—'), at: stamp(pv.completedAt), approved: ok,
          appr: ok ? `اعتمدته ${ar(rp.approvedBy) || (th ? ar(th.name) : '')} · ${dayMonth(new Date(rp.approvedAt || pv.completedAt))}` : '',
          reportNo: 'PT-' + String(o.id).replace(/^\D+-?/, ''), docName: 'تقرير العلاج الطبيعي', v: {}, doctor: th ? ar(th.name) : '', sort: pv.completedAt || '' });
      }
      return out;
    }).sort((a, b) => String(b.sort).localeCompare(String(a.sort)));
  }

  // Lab results: the doctor's orders (medical.js item type "lab") and the patient's own lab bookings (order.labResults).
  // Stage: 0 sample to collect, 1 at the lab, 2 with the doctor, 3 ready (doctor reviewed: values shown).
  const LAB_STATE = (v, lo, hi) => (lo != null && v < lo ? 'low' : hi != null && v > hi ? 'high' : 'ok');
  function labs() {
    const svc = row('mada-svc-lab'), params = Object.fromEntries(((svc && svc.tests) || []).filter((x) => x.params && x.params.length).map((x) => [x.code, x.params]));
    const byOrder = new Map(orders().map((o) => [o.id, o]));
    const list = items('lab').map(({ r, it }) => {
      const st = it.step || 0, at = st >= 4 ? 3 : st === 3 ? 2 : st >= 1 ? 1 : 0;
      const o = byOrder.get(r.orderId) || {}, col = logAt(it, 1), rv = logAt(it, 4);
      const rows = at === 3 ? (it.tests || []).flatMap((code) => params[code] || ANALYTES[code] || []).filter((p) => it.results && it.results[p.code] != null && it.results[p.code] !== '')
        .map((p) => { const v = Number(it.results[p.code]); return [ar(p.name), String(it.results[p.code]), p.unit || '', p.low != null && p.high != null ? `${p.low}–${p.high}` : '', LAB_STATE(v, p.low, p.high)]; }) : [];
      const hi = rows.filter((x) => x[4] !== 'ok').length;
      return { id: r.id + '-' + it.id, title: ar(it.title) || 'تحاليل', date: dayMonth(new Date(r.createdAt || Date.now())), orderNo: r.orderId || '', bookingNo: r.bookingId || o.bookingId || '',
        doctor: true, doctorName: r.byDoctor || doctorOf(o), at, nurse: col ? ar(col.by) : '', collected: stamp(col && col.at), reviewed: stamp(rv && rv.at),
        note: at === 3 ? `جاهزة · ${rows.length - hi} طبيعية${hi ? ` و${hi} خارج الطبيعي` : ''}` : at === 2 ? 'النتيجة وصلت، وطبيب من مدى كير يراجعها الحين' : at === 1 ? 'العينة في المختبر' : 'بانتظار سحب العينة',
        docNote: rv && rv.data && rv.data.docNote ? ar(rv.data.docNote) : '', rows, isNew: at === 3 && !(r.appSeen || {})[it.id], medId: r.id, itemId: it.id, sort: r.createdAt || '' };
    });
    orders().filter((o) => ['blood', 'lab'].includes(o.service)).forEach((o) => {
      const lr = o.labResults || {}, smp = ((o.nurseVisit || {}).steps || {}).sample;
      const at = lr.approved ? 3 : lr.status === 'sent' ? 2 : smp ? 1 : 0;
      list.push({ id: o.id, title: SERVICE[o.service], date: dayMonth(at ? new Date((smp && smp.at) || o.updatedAt) : (dateOf((o.appointment || {}).date) || new Date())), orderNo: o.id, bookingNo: o.bookingId,
        doctor: false, at: Math.min(at, 2), nurse: smp ? ar(smp.by) : '', collected: stamp(smp && smp.at), reviewed: '', rows: [],
        note: at >= 2 ? 'النتيجة وصلت، وطبيب من مدى كير يراجعها الحين' : at === 1 ? 'العينة في المختبر' : 'بانتظار سحب العينة', docNote: '', sort: o.updatedAt || '' });
    });
    return list.sort((a, b) => String(b.sort).localeCompare(String(a.sort)));
  }

  // Vital signs of every doctor visit (shown once the report is approved) and nursing visit, oldest first.
  function vitals() {
    return orders().flatMap((o) => {
      const out = [], dv = vit(((o.doctorVisit || {}).steps || {}).vitals), nv = vit(((o.nurseVisit || {}).steps || {}).vitals);
      const at = (x) => (x && x.at) || o.completedAt || o.updatedAt;
      if (dv) { const x = o.doctorVisit.steps.vitals; out.push({ iso: at(x), kind: 'doctor', by: ar(x.by), order: o.id, v: dv }); }
      if (nv) { const x = o.nurseVisit.steps.vitals; out.push({ iso: at(x), kind: 'nurse', by: ar(x.by), order: o.id, v: nv }); }
      return out;
    }).sort((a, b) => String(a.iso).localeCompare(String(b.iso))).map((r) => ({ ...r, d: dayMonth(new Date(r.iso)) }));
  }

  // Referrals (medical.js type "referral": requested → consent → procedures → attended; procedures data on the log).
  function referrals() {
    return items('referral').map(({ r, it }) => {
      const st = Math.min(it.step || 0, 3), pr = ((it.log || []).filter((l) => l.step === 2).pop() || {}).data || {};
      const ttl = ar(it.title), det = ar(it.details);
      const when = pr.date ? `${dayMonth(dateOf(pr.date))}${pr.time ? ' · ' + pr.time : ''}` : '';
      return { id: r.id + '-' + it.id, spec: ttl.split(' · ')[0] || ttl, doctor: r.byDoctor || '', date: dayMonth(new Date(r.createdAt || Date.now())), orderNo: r.orderId || '', bookingNo: r.bookingId || '',
        urgent: /عاجل|urgent/i.test(ttl + det) || it.priority === 'urgent', step: st, dest: [pr.facility].filter(Boolean).join(''), reason: det, rec: '',
        when, facility: pr.facility || '', provider: pr.provider || '', cost: pr.cost ? `${pr.cost} ريال` : '', payWhen: pr.payWhen === 'before' ? 'قبل الموعد' : pr.payWhen === 'after' ? 'بعد الموعد' : (pr.payWhen || ''),
        note: st >= 3 ? 'تم تقديم الخدمة' : when ? `موعدك ${when}${pr.facility ? ' · ' + pr.facility : ''}` : st >= 1 ? 'فريق الرعاية يرتب إجراءات التحويل' : 'فريق الرعاية بيتواصل معك ياخذ موافقتك على التحويل' };
    });
  }
  // Sick leaves (medical.js type "leave": requested → issued → sent).
  function leaves() {
    return items('leave').map(({ r, it }) => {
      const st = it.step || 0, det = ar(it.details), ttl = ar(it.title);
      // Details start with the first day (YYYY-MM-DD); the title carries the length ("إجازة مرضية · 3 أيام", "يومين", "يوم").
      const start = dateOf(det.split(' · ')[0]) || new Date(r.createdAt || Date.now());
      const days = /يومين/.test(ttl) ? 2 : Number((ttl.match(/(\d+)/) || [])[1]) || 1;
      return { id: r.id + '-' + it.id, title: ttl || 'إجازة مرضية', doctor: r.byDoctor || '', date: dayMonth(new Date(r.createdAt || Date.now())), orderNo: r.orderId || '', bookingNo: r.bookingId || '',
        from: dayMonth(start), to: dayMonth(new Date(start.getTime() + (days - 1) * 864e5)), step: st, issued: st >= 1 };
    });
  }
  // Prescriptions: approved doctor visits with medicines in the plan.
  function rx() {
    return orders().filter((o) => ((o.doctorVisit || {}).report || {}).status === 'approved' && ((((o.doctorVisit || {}).steps || {}).plan || {}).meds || []).length)
      .map((o) => ({ id: o.id, doctor: doctorOf(o), date: fullDate(o.doctorVisit.completedAt || o.completedAt), orderNo: o.id, bookingNo: o.bookingId, meds: o.doctorVisit.steps.plan.meds }));
  }
  // Allergies: the latest approved doctor visit (doctorVisit.steps.allergy, doctor-allergy.js), else what the patient added (appHealth.allergy).
  const ALLERGEN = { penicillin: 'البنسلين', amoxicillin: 'الأموكسيسيلين', cephalosporins: 'السيفالوسبورينات', aspirin: 'الأسبرين', ibuprofen: 'الإيبوبروفين', sulfa: 'أدوية السلفا',
    nsaids: 'مضادات الالتهاب', codeine: 'الكودايين', morphine: 'المورفين', latex: 'اللاتكس', peanut: 'الفول السوداني', nuts: 'المكسرات', egg: 'البيض', milk: 'الحليب', shellfish: 'المأكولات البحرية', fish: 'السمك', wheat: 'القمح', soy: 'الصويا', dust: 'الغبار', pollen: 'حبوب اللقاح', bee: 'لسع النحل', contrast: 'الصبغة' };
  function allergies() {
    const o = orders().filter((x) => ((x.doctorVisit || {}).report || {}).status === 'approved' && ((x.doctorVisit.steps || {}).allergy || {}).status)
      .sort((a, b) => String(b.doctorVisit.completedAt || '').localeCompare(String(a.doctorVisit.completedAt || '')))[0];
    const a = o ? o.doctorVisit.steps.allergy : ((me() || {}).appHealth || {}).allergy || {};
    const names = (a.items || []).map((it) => ALLERGEN[it.cause] || ar(it.name) || ar(it.cause) || '').filter(Boolean);
    return { status: a.status || 'unknown', items: names, text: a.status === 'yes' ? (names.length ? 'حساسية ' + names.slice(0, 2).join(' و') : 'عندك حساسية') : '' };
  }
  // Medicines: the doctor's approved treatment plans (doctorVisit.steps.plan.meds, doctor-plan.js fields), read-only.
  // The patient turns reminders on (patients.prefs.meds = { active, on: { medId: bool } }) and confirms each dose
  // (mada_app_dose → "mada-pmed-doses-<fileNo>" = { "<medId>|<YYYY-MM-DD>|<HH:mm>": "taken" | "missed" }).
  const DOSE_U = { tab: ['حبة وحدة', 'حبتين', 'حبات'], cap: ['كبسولة وحدة', 'كبسولتين', 'كبسولات'], ml: ['مل', 'مل', 'مل'], supp: ['تحميلة', 'تحميلتين', 'تحاميل'], app: ['دهان مرة', 'دهان مرتين', 'مرات دهان'], puff: ['بخة وحدة', 'بختين', 'بخات'], sachet: ['كيس واحد', 'كيسين', 'أكياس'] };
  const FREQ = { od: 'مرة يوميًا', bid: 'مرتين يوميًا', tid: 'كل 8 ساعات', q6h: 'كل 6 ساعات', q4h: 'كل 4 ساعات', hs: 'قبل النوم', prn: 'عند الحاجة', stat: 'جرعة وحدة' };
  const TIMES = { od: [540], bid: [480, 1200], tid: [0, 480, 960], q6h: [0, 360, 720, 1080], q4h: [0, 240, 480, 720, 960, 1200], hs: [1320] };
  const TIMING = { beforeFood: 'قبل الأكل', afterFood: 'بعد الأكل', withFood: 'مع الأكل', morning: 'الصبح', bedtime: 'قبل النوم' };
  const INSTR = { 'after food': 'بعد الأكل', 'before food': 'قبل الأكل', 'with food': 'مع الأكل' };
  const shortTime = (min) => { const h = Math.floor(min / 60) % 24, m = min % 60; return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'ص' : 'م'}`; };
  const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  function doseText(m) {
    const n = Number(m.doseN) || 1, u = DOSE_U[m.doseU];
    if (!u) return `${m.doseN || 1} ${m.doseU || ''}`.trim();
    if (m.doseU === 'ml') return `${m.doseN} مل`;
    return n === 1 ? u[0] : n === 2 ? u[1] : n === 0.5 ? 'نص ' + u[0].split(' ')[0] : `${m.doseN} ${u[2]}`;
  }
  function meds() {
    const doses = (row('mada-pmed-doses-' + ((me() || {}).fileNo || '')) || {});
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const now = Date.now();
    return orders().filter((o) => ((o.doctorVisit || {}).report || {}).status === 'approved' && ((((o.doctorVisit || {}).steps || {}).plan || {}).meds || []).length)
      .sort((a, b) => String(b.doctorVisit.completedAt || b.completedAt || '').localeCompare(String(a.doctorVisit.completedAt || a.completedAt || '')))
      .map((o) => {
        const done = new Date(o.doctorVisit.completedAt || o.completedAt || o.updatedAt || Date.now());
        const start = new Date(done); start.setHours(0, 0, 0, 0);
        const b = o.booking || {}, S = staff(), nurse = S.get(String(b.nurseId));
        const list = o.doctorVisit.steps.plan.meds.map((m, i) => {
          const days = m.durU === 'ongoing' ? 3650 : (Number(m.durN) || 1) * (m.durU === 'weeks' ? 7 : m.durU === 'months' ? 30 : 1);
          const end = new Date(start.getTime() + (days - 1) * 864e5);
          const times = m.prn ? [] : TIMES[m.freq] || [];
          const id = `${o.id}-${m.id || i}`;
          // Every dose from the first one after the visit up to the end of today, plus the next one.
          const all = [];
          for (let d = new Date(start); d <= end && d.getTime() <= today.getTime() + 864e5; d = new Date(d.getTime() + 864e5)) {
            times.forEach((t) => { const at = d.getTime() + t * 6e4; if (at >= done.getTime()) all.push({ key: `${id}|${ymd(d)}|${hhmm(t)}`, at, t, d: new Date(d) }); });
          }
          const past = all.filter((x) => x.at <= now), next = all.find((x) => x.at > now);
          const taken = past.filter((x) => doses[x.key] === 'taken').length;
          const generic = ar(m.generic);
          const timing = (m.timing || []).map((k) => TIMING[k]).filter(Boolean).join('، ') || INSTR[String(m.instr || '').toLowerCase()] || '';
          return { id, no: i + 1, name: [m.name, m.strength].filter(Boolean).join(' '), generic: generic && generic !== m.name ? generic : '', dose: doseText(m),
            freq: m.prn ? 'عند الحاجة' + (m.prnFor ? ' · ' + ar(m.prnFor) : '') : FREQ[m.freq] || '', times: times.map(shortTime).join(' · ') || '—', timing: timing || '—',
            dur: m.durU === 'ongoing' ? 'مستمر' : `${m.durN || 1} ${m.durU === 'weeks' ? 'أسابيع' : m.durU === 'months' ? 'شهور' : Number(m.durN) === 1 ? 'يوم' : 'أيام'}`,
            from: dayMonth(start), to: m.durU === 'ongoing' ? 'مستمر' : dayMonth(end), range: m.durU === 'ongoing' ? `من ${dayMonth(start)}` : `${dayMonth(start)} – ${dayMonth(end)}`,
            instr: (m.instr && !INSTR[String(m.instr).toLowerCase()] ? ar(m.instr) : '') || 'خذه زي ما وصفه الطبيب.',
            ended: end.getTime() + 864e5 <= now, reminds: times.length > 0,
            pct: past.length ? Math.round(taken / past.length * 100) : 100, due: past.length, taken,
            doses: past.slice(-3).concat(next ? [next] : []).map((x) => ({ key: x.key, at: x.at, day: dayMonth(x.d), time: shortTime(x.t), n: all.indexOf(x) + 1,
              st: x.at > now ? 'next' : doses[x.key] || 'open' })),
            all, doseMap: doses };
        });
        return { id: o.id, title: SERVICE[o.service] || 'زيارة طبيب منزلية', date: `${fullDate(done.toISOString())} · ${timeOf(done.toISOString())}`, dayMonth: dayMonth(done),
          doctor: doctorOf(o), nurse: nurse ? ar(nurse.name) : '—', bookingNo: o.bookingId || '', meds: list, active: list.some((m) => !m.ended) };
      });
  }
  // One line for the health file hub: adherence and the next dose.
  function medsLine() {
    const p = prefs().meds || {}, all = meds().flatMap((x) => x.meds).filter((m) => !m.ended);
    if (!all.length) return '';
    const on = all.filter((m) => p.active && (p.on || {})[m.id] !== false && m.reminds);
    if (!on.length) return `${all.length === 1 ? 'دواء واحد' : all.length === 2 ? 'دوائين' : all.length + ' أدوية'} في خطتك · فعّل التذكير`;
    const due = on.reduce((a, m) => a + m.due, 0), tk = on.reduce((a, m) => a + m.taken, 0);
    const nx = on.flatMap((m) => m.doses.filter((d) => d.st === 'next')).sort((a, b) => a.at - b.at)[0];
    return [due ? `التزامك ${Math.round(tk / due * 100)}%` : '', nx ? `الجرعة الجاية ${timeOf(new Date(nx.at).toISOString())}` : ''].filter(Boolean).join(' · ');
  }
  // Marks a dose taken or missed ("clear" undoes it). Shown at once, then saved.
  async function dose(key, state) {
    const fileNo = (me() || {}).fileNo, k = 'mada-pmed-doses-' + fileNo;
    let r = st.rows.find((x) => x.k === k);
    if (!r) { r = { k, rid: '', v: '{}' }; st.rows.push(r); }
    const v = JSON.parse(r.v || '{}'); if (state === 'clear') delete v[key]; else v[key] = state;
    r.v = JSON.stringify(v); emit();
    if (sb) { const { error } = await sb.rpc('mada_app_dose', { file_no: fileNo, dose_key: key, state }); if (error) throw error; }
  }
  // SAMPLE DATA ONLY in the dashboard too (medical.js ANALYTES): result fields when Services > Laboratory has none for a test.
  const ANALYTES = {
    CBC: [{ code: 'HGB', name: 'الهيموجلوبين (HGB)', unit: 'g/dL', low: 13, high: 17 }, { code: 'WBC', name: 'كريات الدم البيضاء (WBC)', unit: '10³/µL', low: 4, high: 11 }, { code: 'PLT', name: 'الصفائح الدموية (PLT)', unit: '10³/µL', low: 150, high: 400 }, { code: 'LYM', name: 'الخلايا الليمفاوية (%)', unit: '%', low: 20, high: 40 }],
    FBS: [{ code: 'GLU', name: 'سكر الدم الصائم', unit: 'mg/dL', low: 70, high: 100 }],
    HBA1C: [{ code: 'A1C', name: 'السكر التراكمي HbA1c', unit: '%', low: 4, high: 5.6 }],
    LIPID: [{ code: 'CHOL', name: 'الكوليسترول الكلي', unit: 'mg/dL', low: 0, high: 200 }, { code: 'LDL', name: 'الكوليسترول الضار LDL', unit: 'mg/dL', low: 0, high: 130 }, { code: 'HDL', name: 'الكوليسترول النافع HDL', unit: 'mg/dL', low: 40, high: 100 }, { code: 'TG', name: 'الدهون الثلاثية', unit: 'mg/dL', low: 0, high: 150 }],
    KFT: [{ code: 'CREA', name: 'الكرياتينين', unit: 'mg/dL', low: 0.6, high: 1.3 }, { code: 'UREA', name: 'اليوريا', unit: 'mg/dL', low: 15, high: 45 }],
    LFT: [{ code: 'ALT', name: 'إنزيم ALT', unit: 'U/L', low: 7, high: 56 }, { code: 'AST', name: 'إنزيم AST', unit: 'U/L', low: 10, high: 40 }, { code: 'ALP', name: 'الفوسفاتيز القلوي ALP', unit: 'U/L', low: 44, high: 147 }, { code: 'TBIL', name: 'البيليروبين الكلي', unit: 'mg/dL', low: 0.1, high: 1.2 }],
    VD25: [{ code: 'VITD', name: 'فيتامين د', unit: 'ng/mL', low: 30, high: 100 }],
  };

  // ---------- Server ----------
  async function load() {
    if (!sb) return;
    st.loading = true;
    const { data, error } = await sb.rpc('mada_app_get');
    st.loading = false;
    if (error) { st.error = error; if (!st.loaded) throw error; emit(); return; }
    st.rows = data || []; st.loaded = true; st.error = null;
    emit();
  }
  async function put(key, id, patch) {
    const { data, error } = await sb.rpc('mada_app_put', { key, id, patch: JSON.stringify(patch) });
    if (error || !data) throw error || new Error('not saved');
    await load();
    return data;
  }
  const phone = (digits) => '+966' + digits;
  async function sendOtp(digits) { const { error } = await sb.auth.signInWithOtp({ phone: phone(digits) }); if (error) throw error; }
  async function verifyOtp(digits, code) {
    const { data, error } = await sb.auth.verifyOtp({ phone: phone(digits), token: code, type: 'sms' });
    if (error) throw error;
    st.session = data.session;
    await load();
    return files();
  }
  // Sign in with the medical file number (supabase-functions/mada-file-login): the server finds the file and texts the code to
  // its registered phone; the app only ever sees the last two digits.
  async function fileCall(body) {
    const r = await fetch(CFG.url + '/functions/v1/mada-file-login', { method: 'POST', headers: { 'content-type': 'application/json', apikey: CFG.key }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok && !j.notfound) { const e = new Error(j.error || 'failed'); e.status = r.status; throw e; }
    return j;
  }
  const fileOtp = (fileNo) => fileCall({ action: 'send', fileNo });
  async function fileVerify(fileNo, code) {
    const j = await fileCall({ action: 'verify', fileNo, code });
    if (!j.session) { const e = new Error('bad code'); e.status = 400; throw e; }
    const { error } = await sb.auth.setSession(j.session);
    if (error) throw error;
    await load();
    return files();
  }
  async function signOut() { if (sb) await sb.auth.signOut(); st.rows = []; st.loaded = false; pick(null); emit(); }
  function pick(fileNo) { st.fileNo = fileNo; ls.set('mada-file', fileNo); emit(); }
  async function session() { if (!sb) return null; const { data } = await sb.auth.getSession(); st.session = data.session; return data.session; }
  // Settings of the open patient file (patients.prefs): notification switches, language, delete request.
  const prefs = () => (me() || {}).prefs || {};
  const savePrefs = (p) => put('mada-patients', me().fileNo, { prefs: { ...prefs(), ...p } });
  // A lab result the customer opened (medical item appSeen, mada_app_put): clears its "new" mark.
  function seen(medId, itemId) {
    const r = by('mada-medical').find((x) => x.id === medId); if (!r) return;
    put('mada-medical', medId, { appSeen: { ...(r.appSeen || {}), [itemId]: new Date().toISOString() } }).catch(() => {});
  }
  // Printable copy of a document (the phone's print sheet saves it as PDF). Only for approved / ready documents.
  // TODO: use the same PDF the doctors portal makes (medical-report.js MadaReport, lab-report.js) once it can run here.
  function pdf(kind, id) {
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const p = me() || {}, rows = (list) => `<table>${list.filter((r) => r && r[1]).map((r) => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}</table>`;
    const pick = (list) => list.find((x) => x.id === id) || list[0];
    const VL = { temp: ['الحرارة', '°C'], bp: ['الضغط', 'mmHg'], hr: ['النبض', 'bpm'], spo2: ['الأكسجين', '%'], rr: ['التنفس', '/min'], sugar: ['السكر', 'mg/dL'] };
    let title = '', body = '';
    if (kind === 'report') {
      const r = pick(reports()); if (!r || !r.approved) return;
      const o = orders().find((x) => x.id === r.orderNo) || {}, meds = ((((o.doctorVisit || {}).steps || {}).plan || {}).meds || []);
      title = r.docName;
      body = rows([['الزيارة', r.title], ['التاريخ', r.date], ['رقم الطلب', r.orderNo], ['رقم الحجز', r.bookingNo], ['الفريق', r.team.map((t) => t.name).join('، ')], ['الاعتماد', r.appr]])
        + (Object.keys(r.v || {}).length ? `<h2>العلامات الحيوية</h2>${rows(Object.entries(r.v).map(([k, v]) => [(VL[k] || [k])[0], `${v} ${(VL[k] || ['', ''])[1]}`]))}` : '')
        + (meds.length ? `<h2>الأدوية</h2><ul>${meds.map((m) => `<li dir="ltr">${esc([m.name, m.strength].filter(Boolean).join(' '))}</li>`).join('')}</ul>` : '');
    } else if (kind === 'rx') {
      const r = pick(rx()); if (!r) return;
      title = 'وصفة طبية';
      body = rows([['الطبيب', r.doctor], ['التاريخ', r.date], ['رقم الطلب', r.orderNo], ['رقم الحجز', r.bookingNo]])
        + `<h2>الأدوية</h2><ul>${r.meds.map((m) => `<li><b dir="ltr">${esc([m.name, m.strength].filter(Boolean).join(' '))}</b> · ${esc(doseText(m))} · ${esc(FREQ[m.freq] || '')}${m.durN ? ` · ${esc(m.durN)} ${m.durU === 'weeks' ? 'أسابيع' : m.durU === 'months' ? 'شهور' : 'أيام'}` : ''}${m.instr ? ` · ${esc(ar(m.instr))}` : ''}</li>`).join('')}</ul>`;
    } else if (kind === 'leave') {
      const r = pick(leaves()); if (!r || !r.issued) return;
      title = 'إجازة مرضية';
      body = rows([['', r.title], ['من', r.from], ['إلى', r.to], ['الطبيب', r.doctor], ['تاريخ الإصدار', r.date], ['رقم الطلب', r.orderNo], ['رقم الحجز', r.bookingNo]]);
    } else if (kind === 'lab') {
      const r = pick(labs()); if (!r || r.at !== 3) return;
      title = 'تقرير المختبر';
      body = rows([['التحليل', r.title], ['التاريخ', r.date], ['الطبيب', r.doctorName], ['سحب العينة', r.collected], ['المراجعة', r.reviewed], ['رقم الطلب', r.orderNo]])
        + `<h2>النتائج</h2><table><tr><th>الفحص</th><th>النتيجة</th><th>الطبيعي</th></tr>${r.rows.map((x) => `<tr><td>${esc(x[0])}</td><td dir="ltr">${esc(x[1])} ${esc(x[2])}</td><td dir="ltr">${esc(x[3])}</td></tr>`).join('')}</table>`
        + (r.docNote ? `<h2>ملاحظة الطبيب</h2><p>${esc(r.docNote)}</p>` : '');
    } else if (kind === 'referral') {
      const r = pick(referrals()); if (!r) return;
      title = 'نموذج إحالة';
      body = rows([['التخصص', r.spec], ['الطبيب المحيل', r.doctor], ['التاريخ', r.date], ['السبب', r.reason], ['الجهة', r.facility], ['مقدم الخدمة', r.provider], ['الموعد', r.when], ['التكلفة', r.cost], ['رقم الطلب', r.orderNo]]);
    } else return;
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · مدى كير</title>
<style>body{font-family:Tajawal,system-ui,sans-serif;color:#0E2A33;margin:24px;line-height:1.6}header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #4CB491;padding-bottom:10px;margin-bottom:16px}
h1{font-size:22px;margin:0;color:#014359}h2{font-size:16px;color:#014359;margin:18px 0 6px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:right;padding:6px 8px;border-bottom:1px solid #E8EEEF;vertical-align:top}th{color:#51656B;font-weight:500;width:35%}
.pt{background:#F6F8F8;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:12px}footer{margin-top:24px;font-size:12px;color:#51656B}@media print{button{display:none}}</style></head><body>
<header><h1>${esc(title)}</h1><strong style="color:#2B7F62">مدى كير</strong></header>
<div class="pt">المريض: <b>${esc(ar(p.name))}</b> · رقم الملف <span dir="ltr">${esc(p.fileNo)}</span></div>${body}
<footer>صدر من تطبيق مدى كير · ${esc(fullDate(new Date().toISOString()))}</footer><p><button onclick="print()" style="font:inherit;padding:10px 18px;border-radius:10px;border:0;background:#2B7F62;color:#fff">حفظ PDF أو طباعة</button></p></body></html>`;
    // Inside the phone app: the phone prints it or saves it as PDF.
    if (window.MADA_NATIVE && window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'print', html: html.replace(/<p><button[\s\S]*?<\/p>/, '') })); return; }
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html); w.document.close();
    setTimeout(() => { try { w.print(); } catch (e) {} }, 400);
  }
  // The finished visit to rate (shown once after the visit, within 3 days, until rated or skipped).
  function toRate() {
    if (st.holdRate) return st.holdRate;
    const o = past().find((x) => stage(x) === 'done');
    if (!o || o.rating || ls.get('mada-rated-' + o.id)) return null;
    const at = new Date(o.completedAt || (o.doctorVisit || {}).completedAt || o.updatedAt || 0).getTime();
    return Date.now() - at < 3 * 864e5 ? o.id : null;
  }
  const openHealth = (view) => { st.healthView = view; };
  function skipRate(id) { ls.set('mada-rated-' + id, '1'); st.holdRate = null; emit(); }
  const call = () => { window.open('tel:' + SUPPORT, '_self'); };

  let timer = null;
  function live(on) {
    clearInterval(timer);
    if (on) timer = setInterval(() => { if (document.visibilityState !== 'hidden') load(); }, 30000);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && st.loaded) load(); });

  return {
    sb, st, on: (f) => (subs.add(f), () => subs.delete(f)), emit,
    load, put, seen, prefs, savePrefs, sendOtp, verifyOtp, fileOtp, fileVerify, signOut, pick, session, live, call, SUPPORT,
    files, me, orders, current, past, stage, view, staff, by, row, ar,
    reports, labs, vitals, referrals, leaves, rx, medical, person, meds, medsLine, dose, allergies, toRate, skipRate, openHealth, pdf,
    fmt: { dayLabel, dayMonth, time, timeOf, ago, until, dateOf, ymd, MONTHS, DAYS },
  };
})();
