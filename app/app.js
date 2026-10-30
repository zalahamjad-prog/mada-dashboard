// Which screen fills the app: sign in (Login) until a patient file is open, then the app (Home with its tabs).
(() => {
  const root = document.getElementById('root');
  let cur = null, host = null;
  function show(name, props) {
    document.getElementById('boot')?.remove();
    if (cur === name) { host.render(); return; }
    if (host) host.destroy();
    root.replaceChildren();
    cur = name;
    host = MadaDC.mount(name, props, root);
  }
  let busy = false;
  async function route() {
    if (busy) return; busy = true;
    try {
      const s = await Mada.session();
      if (!s) { Mada.live(false); return show('Login', { initial: 'default' }); }
      if (!navigator.onLine) return show('Offline', { initial: 'offline' });
      if (!Mada.st.loaded) {
        try { await Mada.load(); } catch (e) { return show('Offline', { initial: 'server' }); }
      }
      const f = Mada.files();
      if (!f.length) return show('Login', { initial: 'default' });
      if (!f.some((x) => x.fileNo === Mada.st.fileNo)) {
        if (f.length > 1) return show('Login', { initial: 'profiles' });
        Mada.st.fileNo = f[0].fileNo;
      }
      Mada.live(true);
      const r = Mada.toRate();
      if (r) return show('AfterVisit', { orderId: r });
      show('Home', { initial: 'live' });
    } finally { busy = false; }
  }
  Mada.on(() => (cur === 'Home' && Mada.st.session && !Mada.toRate() ? host.render() : route()));
  if (Mada.sb) Mada.sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') route(); });
  // "Back to my health file" in each health file section closes it (HealthFile sets Mada.healthBack).
  document.addEventListener('click', (e) => {
    if (e.target.closest('[aria-label="رجوع لملفي الصحي"]') && Mada.healthBack) Mada.healthBack();
  });
  // Bottom tab bar in every screen: the four buttons are Home, Orders, Health file, Account in that order.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('nav[aria-label="التنقل الرئيسي"] button');
    if (!b || !Mada.tab) return;
    Mada.tab([...b.parentElement.querySelectorAll('button')].indexOf(b));
  });
  // No internet or the server does not answer: the Offline screen, and back to where it was once it answers.
  window.addEventListener('offline', () => show('Offline', { initial: 'offline' }));
  window.addEventListener('online', () => route());
  Mada.retry = () => route();
  route();
})();
