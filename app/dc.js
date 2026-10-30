// Mada Care app runtime: renders the approved design screens (*.dc.html, x-dc templates) as the live app.
// Each screen file keeps its template exactly as designed; only its Component class (logic) talks to real data.
// Template features: {{path}} values, <sc-if value>, <sc-for list as>, <dc-import name ...props>, onX="{{handler}}".
(function () {
  class DCLogic {
    constructor(props, host) { this.props = props; this.state = undefined; this._host = host; }
    setState(p) {
      this.state = { ...(this.state || {}), ...(typeof p === 'function' ? p(this.state || {}) : p) };
      this._host && this._host.schedule();
    }
    forceUpdate() { this._host && this._host.schedule(); }
  }
  window.DCLogic = DCLogic;

  const get = (scope, path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), scope);
  const evalExpr = (scope, e) => {
    e = e.trim();
    if (e === 'true') return true; if (e === 'false') return false; if (e === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(e)) return Number(e);
    return get(scope, e);
  };
  const sub = (scope, s) => {
    const m = s.match(/^\s*\{\{([^}]*)\}\}\s*$/);
    if (m) return evalExpr(scope, m[1]);
    return s.replace(/\{\{([^}]*)\}\}/g, (_, e) => { const v = evalExpr(scope, e); return v == null ? '' : String(v); });
  };

  // ---------- Screen files ----------
  const base = (document.currentScript && document.currentScript.src.replace(/[^/]*$/, '')) || './';
  const defs = {};
  const helmets = new Set();
  function load(name) {
    if (!defs[name]) {
      const x = new XMLHttpRequest(); x.open('GET', base + 'screens/' + name + '.dc.html', false); x.send();
      if (x.status >= 400 || !x.responseText) throw new Error('Screen not found: ' + name);
      defs[name] = parse(x.responseText, name);
    }
    return defs[name];
  }
  let uid = 0;
  function parse(html, name) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const xdc = doc.querySelector('x-dc');
    const helmet = xdc.querySelector('helmet');
    if (helmet) helmet.remove();
    const sc = doc.querySelector('script[data-dc-script]');
    let Cls = DCLogic, meta = {};
    if (sc) {
      Cls = new Function('DCLogic', sc.textContent + '\n;return Component;')(DCLogic);
      try { meta = JSON.parse(sc.getAttribute('data-props') || '{}'); } catch (e) {}
    }
    (function tag(n) { if (n.nodeType === 1) { n._id = ++uid; [...n.childNodes].forEach(tag); } })(xdc);
    return { name, nodes: [...xdc.childNodes], helmet, Cls, meta };
  }
  function addHelmet(def) {
    if (!def.helmet || helmets.has(def.name)) return;
    helmets.add(def.name);
    [...def.helmet.childNodes].forEach((c) => {
      if (c.nodeType !== 1) return;
      if (c.tagName === 'LINK' && /fonts\.googleapis/.test(c.getAttribute('href') || '')) return; // fonts are bundled (fonts.css)
      document.head.append(document.importNode(c, true));
    });
  }

  // ---------- Components ----------
  class Host {
    constructor(def, props, el) {
      this.def = def; this.el = el; this.kids = new Map();
      addHelmet(def);
      this.props = this.fill(props);
      this.comp = new def.Cls(this.props, this);
      this.render();
      if (this.comp.componentDidMount) try { this.comp.componentDidMount(); } catch (e) { console.error(e); }
    }
    fill(props) {
      const p = {};
      for (const [k, v] of Object.entries(this.def.meta)) if (v && typeof v === 'object' && 'default' in v) p[k] = v.default;
      return Object.assign(p, props);
    }
    update(props) { this.props = this.fill(props); this.comp.props = this.props; this.render(); }
    schedule() { if (this.q) return; this.q = true; queueMicrotask(() => { this.q = false; if (!this.dead) this.render(); }); }
    render() {
      let vals = {};
      try { vals = this.comp.renderVals ? this.comp.renderVals() || {} : {}; } catch (e) { console.error(this.def.name, e); }
      const scope = { ...this.props, ...vals };
      this.seen = new Set();
      patchKids(this.el, this.def.nodes.map((n) => build(n, scope, '', this)).flat(), this);
      for (const [k, h] of this.kids) if (!this.seen.has(k)) { h.destroy(); this.kids.delete(k); }
    }
    destroy() {
      this.dead = true;
      for (const h of this.kids.values()) h.destroy();
      if (this.comp.componentWillUnmount) try { this.comp.componentWillUnmount(); } catch (e) {}
    }
  }

  // Template → light virtual nodes.
  function build(n, scope, path, host) {
    if (n.nodeType === 3) return [{ text: sub(scope, n.textContent) }];
    if (n.nodeType !== 1) return [];
    const tag = n.tagName.toLowerCase();
    const kids = (sc, p) => [...n.childNodes].map((c) => build(c, sc, p, host)).flat();
    if (tag === 'sc-if') return sub(scope, n.getAttribute('value')) ? kids(scope, path) : [];
    if (tag === 'sc-for') {
      const list = sub(scope, n.getAttribute('list')) || [], as = n.getAttribute('as');
      return list.map((it, i) => kids({ ...scope, [as]: it, index: i }, path + '/' + n._id + ':' + i)).flat();
    }
    if (tag === 'dc-import') {
      const props = {};
      for (const a of n.attributes) if (!a.name.startsWith('hint-') && a.name !== 'name') props[a.name] = sub(scope, a.value);
      const name = n.getAttribute('name');
      return [{ comp: name, props, key: path + '/' + n._id + '/' + name }];
    }
    const attrs = {}, on = {};
    for (const a of n.attributes) {
      if (/^on[a-z]/i.test(a.name)) { const f = sub(scope, a.value); if (typeof f === 'function') on[a.name.slice(2).toLowerCase()] = f; continue; }
      if (a.name.startsWith('hint-')) continue;
      const v = sub(scope, a.value);
      if (v === false || v == null) continue;
      attrs[a.name] = v === true ? '' : String(v);
    }
    return [{ tag: n.localName, ns: n.namespaceURI, attrs, on, kids: kids(scope, path) }];
  }

  // Virtual nodes → real DOM, reusing nodes in place so inputs keep focus and the caret.
  function patchKids(parent, vkids, host) {
    const real = [...parent.childNodes];
    vkids.forEach((v, i) => {
      let el = real[i];
      if (v.text !== undefined) {
        if (el && el.nodeType === 3) { if (el.data !== v.text) el.data = v.text; }
        else { const t = document.createTextNode(v.text); el ? parent.replaceChild(t, el) : parent.appendChild(t); }
        return;
      }
      if (v.comp) {
        host.seen.add(v.key);
        let h = host.kids.get(v.key);
        if (h && el === h.el) { h.update(v.props); return; }
        if (h) { h.destroy(); host.kids.delete(v.key); }
        const box = document.createElement('div'); box.style.display = 'contents'; box.dataset.screen = v.comp;
        el ? parent.replaceChild(box, el) : parent.appendChild(box);
        host.kids.set(v.key, new Host(load(v.comp), v.props, box));
        return;
      }
      if (!el || el.nodeType !== 1 || el.localName !== v.tag || el.namespaceURI !== v.ns || (el.dataset && el.dataset.screen)) {
        const n = document.createElementNS(v.ns, v.tag);
        el ? parent.replaceChild(n, el) : parent.appendChild(n);
        el = n;
      }
      for (const a of [...el.attributes]) if (!(a.name in v.attrs)) el.removeAttribute(a.name);
      for (const [k, val] of Object.entries(v.attrs)) {
        if (k === 'value' && 'value' in el) { if (el.value !== val) el.value = val; continue; }
        if (k === 'checked' && 'checked' in el) { el.checked = true; continue; }
        if (el.getAttribute(k) !== val) el.setAttribute(k, val);
      }
      if ('checked' in el && !('checked' in v.attrs) && el.type !== 'text') el.checked = false;
      el._on = el._on || {};
      for (const ev of Object.keys(el._on)) if (!v.on[ev]) el._on[ev] = null;
      for (const [ev, f] of Object.entries(v.on)) {
        const type = ev === 'change' && /^(INPUT|TEXTAREA)$/.test(el.tagName) && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'file' ? 'input' : ev;
        if (!(type in el._on)) el.addEventListener(type, (e) => el._on[type] && el._on[type](e));
        el._on[type] = f;
      }
      patchKids(el, v.kids, host);
    });
    for (let i = real.length - 1; i >= vkids.length; i--) {
      const el = real[i];
      if (el.dataset && el.dataset.screen) for (const [k, h] of host.kids) if (h.el === el) { h.destroy(); host.kids.delete(k); }
      parent.removeChild(el);
    }
  }

  // Mount a screen by name into an element: MadaDC.mount('Login', { initial: 'default' }, el)
  window.MadaDC = {
    mount(name, props, el) { const h = new Host(load(name), props || {}, el); return h; },
  };
})();
