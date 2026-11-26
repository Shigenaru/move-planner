(function () {
  const D = window.MOVE_DATA;
  const KEY = 'moveplanner.v1';
  const ME_KEY = 'moveplanner.me';
  const SESSION_URL = 'https://app.devin.ai/sessions/df5ab0c16eb64067b12c25abbc4fa94e';

  // ---------- helpers ----------
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const now = () => Date.now();
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const toD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const iso = (d) => d.toISOString().slice(0, 10);
  const add = (s, n) => { const d = toD(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const diff = (a, b) => Math.round((toD(b) - toD(a)) / 864e5);
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const wd = (s) => WD[toD(s).getUTCDay()];
  const fmt = (s) => { if (!s) return ''; const d = toD(s); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${WD[d.getUTCDay()]}`; };
  const yen = (n) => '¥' + Math.round(Number(n) || 0).toLocaleString('en-US');
  const isYearEnd = (s) => { const d = toD(s); const m = d.getUTCMonth() + 1, day = d.getUTCDate(); return (m === 12 && day >= 29) || (m === 1 && day <= 3); };
  const officeClosed = (s) => { const w = toD(s).getUTCDay(); return w === 0 || w === 6 || !!D.HOLIDAYS[s] || isYearEnd(s); };
  const officeAdjust = (s, dir) => { let x = s, g = 0; while (officeClosed(x) && g++ < 30) x = add(x, dir === 'after' ? 1 : -1); return x; };
  const relDays = (s) => {
    const n = diff(todayISO(), s);
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return 'yesterday';
    return n > 0 ? `in ${n} days` : `${-n} days ago`;
  };

  // ---------- state ----------
  function seedExpenses() {
    const rows = [
      ['New home move-in costs (初期費用)', 'Housing'], ['Overlap rent – old home', 'Housing'], ['Fire insurance (火災保険)', 'Housing'],
      ['Moving company', 'Moving'], ['粗大ごみ / recycling fees', 'Moving'], ['Internet installation', 'Utilities'], ['Neighbor gifts', 'Other'],
    ];
    return rows.map(([label, cat], i) => ({ id: 'seed-e' + i, label, cat, est: '', actual: '', paidBy: 'a', shared: true, updatedAt: 0 }));
  }
  function seedContacts() {
    const rows = [
      ['Current management company (管理会社)', ''], ['New home agent / management', ''], ['Moving company', ''], ['Internet provider', ''],
      ['Gas – opening appointment', 'Tokyo Gas'], ['Minato City Office', '港区役所'], ['Shibuya City Office', '渋谷区役所'],
    ];
    return rows.map(([role, name], i) => ({ id: 'seed-c' + i, role, name, phone: '', url: '', ref: '', notes: '', updatedAt: 0 }));
  }
  function defaultState() {
    const profile = {};
    D.PROFILE.forEach((p) => (profile[p.key] = p.def));
    return {
      version: 1,
      settings: {
        names: ['Shigenaru', 'Partner'],
        dates: { start: todayISO(), keys: '2026-12-12', move: '2026-12-28', oldEnd: '2027-01-25' },
        addresses: { old: '', new: '' },
        profile, onboarded: false, updatedAt: 0,
      },
      tasks: {}, custom: [], notes: [], expenses: seedExpenses(), contacts: seedContacts(),
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { console.error(e); }
    return defaultState();
  }
  let S = load();
  let me = localStorage.getItem(ME_KEY) || 'a';
  const ui = { modal: null, filter: 'all', who: 'all', q: '', showSkipped: false, calDay: null, flash: '' };

  let saveTimer;
  function save() {
    localStorage.setItem(KEY, JSON.stringify(S));
    const el = document.getElementById('saved');
    if (el) { el.textContent = 'Saved'; el.classList.add('show'); clearTimeout(saveTimer); saveTimer = setTimeout(() => el.classList.remove('show'), 1200); }
    window.SYNC?.push();
  }
  const touch = (o) => { o.updatedAt = now(); return o; };
  const touchSettings = () => touch(S.settings);
  const names = () => S.settings.names;
  const nameOf = (k) => (k === 'a' ? names()[0] : k === 'b' ? names()[1] : k === 'both' ? 'Both' : 'Anyone');
  const initial = (k) => (k === 'both' ? '2' : (nameOf(k) || '?').trim().charAt(0).toUpperCase() || '?');

  // ---------- steps ----------
  const STEP_BY_ID = Object.fromEntries(D.STEPS.map((s) => [s.id, s]));
  const PHASE_BY_ID = Object.fromEntries(D.PHASES.map((p) => [p.id, p]));
  const ts = (id) => S.tasks[id] || (S.tasks[id] = { updatedAt: 0 });
  const live = (arr) => arr.filter((x) => !x.deleted);

  function ruleDate(rule, office) {
    if (!rule) return '';
    const base = S.settings.dates[rule.a] || todayISO();
    let d = add(base, rule.o || 0);
    if (rule.a === 'start' && d < todayISO() && diff(d, todayISO()) > 60) d = todayISO();
    return office ? officeAdjust(d, office) : d;
  }
  function allSteps() {
    const lib = D.STEPS.map((s) => {
      const t = S.tasks[s.id] || {};
      const enabled = t.enabled ?? (s.cond ? !!S.settings.profile[s.cond] : s.def);
      const suggested = ruleDate(s.due, s.office);
      return Object.assign({}, s, {
        enabled, done: !!t.done, assign: t.assign ?? s.assign ?? 'both', due: t.due || suggested, suggested,
        noteIds: (t.noteIds || []).filter((id) => noteById(id)), memo: t.memo || '', custom: false,
        winFrom: s.win ? ruleDate(s.win.from) : '', hardDate: s.hard ? ruleDate(s.hard) : '',
      });
    });
    const custom = live(S.custom).map((c) => Object.assign({}, c, {
      enabled: c.enabled !== false, done: !!c.done, custom: true, suggested: c.due,
      noteIds: (c.noteIds || []).filter((id) => noteById(id)), how: c.details ? c.details.split('\n').filter(Boolean) : [],
    }));
    return lib.concat(custom);
  }
  const stepState = (step) => (step.custom ? S.custom.find((c) => c.id === step.id) : ts(step.id));
  const stepById = (id) => allSteps().find((s) => s.id === id);
  const noteById = (id) => S.notes.find((n) => n.id === id && !n.deleted);
  const activeSteps = () => allSteps().filter((s) => s.enabled);
  const sortByDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999');

  function dueClass(s) {
    if (s.done || !s.due) return '';
    const n = diff(todayISO(), s.due);
    return n < 0 ? 'overdue' : n === 0 ? 'today' : n <= 3 ? 'soon' : '';
  }

  // ---------- notes ----------
  function newNote(tpl) {
    const t = D.NOTE_TEMPLATES[tpl];
    const n = touch({ id: uid(), title: t ? t.title : 'New note', body: t ? t.body : '', tpl: tpl || '', items: [] });
    if (t) n.items = t.items.map(([text, tag]) => touch({ id: uid(), text, tag, done: false, qty: '', price: '' }));
    S.notes.push(n);
    return n;
  }
  const noteItems = (n) => live(n.items || []);
  const notePrice = (n, onlyDone) => noteItems(n).filter((i) => !onlyDone || i.done).reduce((a, i) => a + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
  const linkedSteps = (noteId) => allSteps().filter((s) => s.noteIds.includes(noteId));
  function linkNote(step, noteId) {
    const st = stepState(step);
    st.noteIds = Array.from(new Set([...(st.noteIds || []), noteId]));
    touch(st);
  }

  // ---------- merge (for syncing between two phones) ----------
  const newer = (x, y) => ((y?.updatedAt || 0) > (x?.updatedAt || 0) ? y : x);
  function mergeList(a = [], b = [], deep) {
    const m = new Map();
    [...a, ...b].forEach((r) => {
      const cur = m.get(r.id);
      if (!cur) return m.set(r.id, r);
      const win = Object.assign({}, newer(cur, r));
      if (deep) win.items = mergeList(cur.items, r.items);
      m.set(r.id, win);
    });
    return [...m.values()];
  }
  function mergeState(a, b) {
    const out = Object.assign({}, a);
    out.settings = newer(a.settings, b.settings);
    out.tasks = {};
    new Set([...Object.keys(a.tasks || {}), ...Object.keys(b.tasks || {})]).forEach((id) => (out.tasks[id] = newer((a.tasks || {})[id], (b.tasks || {})[id])));
    out.custom = mergeList(a.custom, b.custom);
    out.notes = mergeList(a.notes, b.notes, true);
    out.expenses = mergeList(a.expenses, b.expenses);
    out.contacts = mergeList(a.contacts, b.contacts);
    return out;
  }

  // Order-independent form of the state, used to tell whether two copies really differ.
  function canon(x) {
    if (Array.isArray(x)) {
      const arr = x.map(canon);
      return x.every((r) => r && r.id) ? arr.sort((p, q) => (p.id < q.id ? -1 : 1)) : arr;
    }
    if (x && typeof x === 'object') { const o = {}; Object.keys(x).sort().forEach((k) => (o[k] = canon(x[k]))); return o; }
    return x;
  }
  const sameState = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

  // ---------- rendering ----------
  const ICON = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    plan: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    notes: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    budget: '<path d="m6 4 6 8 6-8M12 12v9M7 13h10M7 17h10"/>',
    contacts: '<path d="M5 4h14v16H5z"/><circle cx="12" cy="10" r="3"/><path d="M8 17c1-2 2.5-3 4-3s3 1 4 3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const NAV = [['home', 'Home'], ['plan', 'Steps'], ['calendar', 'Calendar'], ['notes', 'Notes'], ['budget', 'Budget'], ['contacts', 'Info'], ['settings', 'Settings']];

  function route() {
    const h = location.hash.replace(/^#\/?/, '') || 'home';
    const [view, id] = h.split('/');
    return { view: NAV.some((n) => n[0] === view) || view === 'note' ? view : 'home', id };
  }

  function gate() {
    const z = window.SYNC_STATUS || { configured: !!window.FIREBASE_CONFIG?.apiKey };
    if (!z.configured) return '';
    const card = (inner) => `<section class="gate card"><img src="icon.svg" alt="" width="56" height="56"><h1>Our Move</h1>${inner}</section>`;
    if (!z.ready) return card(`<p class="muted">${z.error ? esc(z.error) : 'Loading…'}</p>${z.error ? '<button class="btn" data-act="reload">Try again</button>' : ''}`);
    if (!z.user) return card(`<p>Sign in to open your shared moving plan.</p><button class="btn primary" data-act="syncIn">Sign in with Google</button>${z.error ? `<p class="small bad-text">${esc(z.error)}</p>` : ''}`);
    if (z.denied) return card(`<p><strong>${esc(z.user)}</strong> doesn’t have access to this plan.</p><button class="btn primary" data-act="syncOut">Use a different account</button>`);
    if (!z.loaded) return card('<p class="muted">Loading your plan…</p>');
    return '';
  }

  function render() {
    const locked = gate();
    document.body.classList.toggle('locked', !!locked);
    if (locked) {
      renderSyncBadge();
      document.getElementById('nav').innerHTML = '';
      document.getElementById('me').innerHTML = '';
      document.getElementById('view').innerHTML = locked;
      document.getElementById('modal').innerHTML = '';
      document.body.classList.remove('modal-open');
      return;
    }
    const fk = document.activeElement?.dataset?.fk;
    const sel = fk && 'selectionStart' in document.activeElement ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    const r = route();
    const navView = r.view === 'note' ? 'notes' : r.view;
    document.getElementById('nav').innerHTML = NAV.map(([k, l]) => `<a href="#${k}" class="${navView === k ? 'on' : ''}">${icon(k)}<span>${l}</span></a>`).join('');
    renderSyncBadge();
    document.getElementById('me').innerHTML = ['a', 'b'].map((k) => `<button class="${me === k ? 'on' : ''}" data-act="me" data-id="${k}" title="I am ${esc(nameOf(k))}">${esc(nameOf(k))}</button>`).join('');
    const v = { home: vHome, plan: vPlan, calendar: vCalendar, notes: vNotes, note: vNote, budget: vBudget, contacts: vContacts, settings: vSettings }[r.view];
    document.getElementById('view').innerHTML = v(r.id);
    document.getElementById('modal').innerHTML = renderModal();
    document.body.classList.toggle('modal-open', !!ui.modal);
    if (fk) {
      const el = document.querySelector(`[data-fk="${CSS.escape(fk)}"]`);
      if (el) { el.focus(); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* ignore */ } }
    }
  }

  function syncInfo() {
    const z = window.SYNC_STATUS || {};
    if (!z.configured) return { cls: 'off', label: 'This device only' };
    if (!z.user) return { cls: 'off', label: 'Not signed in' };
    if (z.state === 'error') return { cls: 'bad', label: 'Sync problem' };
    if (z.state === 'offline') return { cls: 'warn', label: 'Offline – will sync later' };
    if (z.state === 'saving' || z.state === 'connecting') return { cls: 'warn', label: 'Syncing…' };
    return { cls: 'ok', label: 'Synced' };
  }
  function renderSyncBadge() {
    const el = document.getElementById('sync');
    if (!el) return;
    const z = window.SYNC_STATUS || {};
    const i = syncInfo();
    el.hidden = !z.configured;
    el.className = 'sync ' + i.cls;
    el.title = i.label;
    el.innerHTML = `<i></i><span>${esc(i.label)}</span>`;
  }
  function syncCard() {
    const z = window.SYNC_STATUS || {};
    if (!z.configured) return `<p class="small muted">Live sync is not set up yet, so data is saved in this browser only.</p>`;
    const i = syncInfo();
    if (!z.user) return `<p class="small">Sign in with Google so both of your phones show the same plan, updated live.</p>
      <div class="row gap wrap"><button class="btn primary" data-act="syncIn">Sign in with Google</button></div>
      ${z.error ? `<p class="small bad-text">${esc(z.error)}</p>` : ''}`;
    return `<p class="small"><span class="sync inline ${i.cls}"><i></i><span>${esc(i.label)}</span></span> Signed in as <strong>${esc(z.user)}</strong>${z.last ? ` · last synced ${new Date(z.last).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
      ${z.error ? `<p class="small bad-text">${esc(z.error)}</p>` : ''}
      <div class="row gap wrap"><button class="btn ghost" data-act="syncOut">Sign out</button></div>`;
  }

  const progress = (done, total) => `<div class="bar" role="progressbar" aria-valuenow="${done}" aria-valuemax="${total}"><i style="width:${total ? Math.round((done / total) * 100) : 0}%"></i></div>`;

  function stepRow(s, opts = {}) {
    const notes = s.noteIds.map(noteById).filter(Boolean);
    return `<div class="step ${s.done ? 'done' : ''} ${s.enabled ? '' : 'skipped'}">
      <label class="check"><input type="checkbox" data-act="toggleDone" data-id="${s.id}" ${s.done ? 'checked' : ''} ${s.enabled ? '' : 'disabled'} aria-label="Mark done"></label>
      <button class="step-main" data-act="openStep" data-id="${s.id}">
        <span class="step-title">${esc(s.title)}</span>
        ${s.ja ? `<span class="ja">${esc(s.ja)}</span>` : ''}
        <span class="meta">
          ${s.due ? `<span class="chip due ${dueClass(s)}">${fmt(s.due)}${!s.done && dueClass(s) === 'overdue' ? ' · overdue' : ''}</span>` : ''}
          ${opts.phase ? `<span class="chip">${esc(PHASE_BY_ID[s.phase]?.title || '')}</span>` : ''}
          ${s.hardDate ? `<span class="chip warn">Deadline ${fmt(s.hardDate)}</span>` : ''}
          ${notes.map((n) => { const it = noteItems(n); return `<span class="chip note">${esc(n.title)}${it.length ? ` ${it.filter((i) => i.done).length}/${it.length}` : ''}</span>`; }).join('')}
          ${s.custom ? '<span class="chip">Your step</span>' : ''}
        </span>
      </button>
      ${s.enabled ? `<span class="avatar ${s.assign}" title="${esc(nameOf(s.assign))}">${esc(initial(s.assign))}</span>` : `<button class="btn small" data-act="include" data-id="${s.id}">Include</button>`}
    </div>`;
  }

  // ----- Home -----
  function vHome() {
    const d = S.settings.dates;
    const t = todayISO();
    const act = activeSteps();
    const done = act.filter((s) => s.done).length;
    const pending = act.filter((s) => !s.done).sort(sortByDue);
    const overdue = pending.filter((s) => s.due && s.due < t);
    const upcoming = pending.filter((s) => !s.due || s.due >= t).slice(0, 6);
    const moveIn = diff(t, d.move);
    const keyCards = [
      ['Keys to the new home', d.keys, 'New lease starts'],
      ['Moving day', d.move, isYearEnd(d.move) ? 'Offices closed that day' : ''],
      ['City offices closed', '2026-12-29', 'Usually 12/29 – 1/3'],
      ['Old lease ends', d.oldEnd, 'Move-out inspection before this'],
    ];
    const myOpen = pending.filter((s) => s.assign === me || s.assign === 'both').length;
    return `
      <section class="hero">
        <div>
          <p class="eyebrow">${esc(S.settings.names.join(' & '))} · Minato-ku → Shibuya-ku</p>
          <h1>${moveIn > 0 ? `${moveIn} days until moving day` : moveIn === 0 ? 'Moving day is today!' : 'Welcome home!'}</h1>
          <p class="muted">Moving day: ${fmt(d.move)}. ${done} of ${act.length} steps done. ${myOpen} open steps for ${esc(nameOf(me))}.</p>
          ${progress(done, act.length)}
        </div>
      </section>
      ${moveDayPicker()}
      <section class="keydates">
        ${keyCards.map(([l, date, sub]) => `<div class="card kd ${date === d.move ? 'accent' : ''}"><span class="muted small">${l}</span><strong>${fmt(date)}</strong><span class="small">${relDays(date)}</span>${sub ? `<span class="muted small">${esc(sub)}</span>` : ''}</div>`).join('')}
      </section>
      <div class="cols">
        <section class="card">
          <h2>Next up</h2>
          ${overdue.length ? `<p class="small warn-text">${overdue.length} overdue</p>${overdue.map((s) => stepRow(s, { phase: true })).join('')}` : ''}
          ${upcoming.map((s) => stepRow(s, { phase: true })).join('') || '<p class="muted">Nothing left. Enjoy the new home!</p>'}
          <a class="btn ghost" href="#plan">See all steps</a>
        </section>
        <section class="card">
          <h2>Progress by phase</h2>
          ${D.PHASES.map((p) => { const ps = act.filter((s) => s.phase === p.id); const pd = ps.filter((s) => s.done).length; return `<a class="phase-row" href="#plan" data-act="jumpPhase" data-id="${p.id}"><span><strong>${esc(p.title)}</strong> <span class="muted small">${esc(p.when)}</span></span><span class="small">${pd}/${ps.length}</span>${progress(pd, ps.length)}</a>`; }).join('')}
        </section>
      </div>
      <section class="card tip">
        <h2>Year-end checklist</h2>
        <ul>
          <li>Ward offices are usually closed <strong>12/29 – 1/3</strong>. File the 転出届 (Minato) before then and the 転入届 (Shibuya) from 1/4.</li>
          <li>Movers, gas opening appointments, internet installation and 粗大ごみ pickups are fully booked late in December. Book these first.</li>
          <li>Garbage collection stops over New Year in both wards. Plan your cardboard and trash.</li>
        </ul>
      </section>`;
  }

  function moveDayPicker() {
    const d = S.settings.dates;
    const field = (k, l) => `<label><span>${l}</span><input type="date" value="${d[k]}" data-on="date" data-field="${k}"></label>`;
    const warn = [];
    if (d.move < d.keys) warn.push('Moving day is before you get the keys.');
    if (d.move > d.oldEnd) warn.push('Moving day is after the old lease ends.');
    if (isYearEnd(d.move)) warn.push('City offices are closed that day (12/29 – 1/3). That is fine for moving, and the paperwork steps are scheduled around it.');
    const overlap = diff(d.keys, d.oldEnd);
    return `<section class="card form">
      <h2>Key dates</h2>
      <div class="datefields">${field('move', 'Moving day')}${field('keys', 'New lease starts')}${field('oldEnd', 'Old lease ends')}</div>
      ${warn.map((w) => `<p class="small warn-text">${esc(w)}</p>`).join('')}
      <p class="muted small">${overlap > 0 ? `You have both homes for ${overlap} days. ` : ''}Change a date and every step's suggested date moves with it. Dates you set by hand on a step stay as they are.</p>
    </section>`;
  }

  // ----- Plan -----
  function filteredSteps() {
    const q = ui.q.trim().toLowerCase();
    return allSteps().filter((s) => {
      if (!s.enabled && !ui.showSkipped) return false;
      if (ui.filter === 'todo' && s.done) return false;
      if (ui.filter === 'done' && !s.done) return false;
      if (ui.who !== 'all' && !(s.assign === ui.who || s.assign === 'both')) return false;
      if (q && !`${s.title} ${s.ja || ''} ${s.why || ''} ${(s.how || []).join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }
  function vPlan() {
    const list = filteredSteps();
    const act = activeSteps();
    const skipped = allSteps().filter((s) => !s.enabled).length;
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${ui[key] === v ? 'on' : ''}" data-act="setUi" data-key="${key}" data-id="${v}">${esc(l)}</button>`).join('')}</div>`;
    return `
      <div class="page-head">
        <div><h1>Moving steps</h1><p class="muted">${act.filter((s) => s.done).length} of ${act.length} done · ${skipped} skipped. Tap a step to see what it involves.</p></div>
        <div class="row gap"><button class="btn" data-act="openProfile">Tailor plan</button><button class="btn primary" data-act="addStep">+ Add step</button></div>
      </div>
      <div class="toolbar">
        ${seg('filter', [['all', 'All'], ['todo', 'To do'], ['done', 'Done']])}
        ${seg('who', [['all', 'Everyone'], ['a', names()[0]], ['b', names()[1]]])}
        <input type="search" placeholder="Search steps…" value="${esc(ui.q)}" data-on="search" data-fk="search">
        <label class="switch"><input type="checkbox" data-act="toggleSkipped" ${ui.showSkipped ? 'checked' : ''}> Show skipped steps</label>
      </div>
      ${D.PHASES.map((p) => {
        const ps = list.filter((s) => s.phase === p.id).sort(sortByDue);
        const all = act.filter((s) => s.phase === p.id);
        if (!ps.length && !all.length) return '';
        return `<section class="phase" id="phase-${p.id}">
          <header><div><h2>${esc(p.title)} <span class="ja">${esc(p.ja)}</span></h2><span class="muted small">${esc(p.when)}</span></div><span class="small">${all.filter((s) => s.done).length}/${all.length}</span></header>
          ${progress(all.filter((s) => s.done).length, all.length)}
          ${ps.map((s) => stepRow(s)).join('') || '<p class="muted small empty">Nothing here for this filter.</p>'}
        </section>`;
      }).join('')}`;
  }

  // ----- Calendar -----
  function vCalendar() {
    const d = S.settings.dates;
    const steps = activeSteps();
    const byDay = {};
    steps.forEach((s) => { if (s.due) (byDay[s.due] = byDay[s.due] || []).push(s); });
    const keyLabel = { [d.keys]: 'Keys', [d.move]: 'Move', [d.oldEnd]: 'Lease ends' };
    const start = toD(d.start < '2026-12-01' ? d.start : '2026-12-01');
    const endD = toD(add(d.oldEnd, 31));
    const months = [];
    for (let y = start.getUTCFullYear(), m = start.getUTCMonth(); y < endD.getUTCFullYear() || (y === endD.getUTCFullYear() && m <= endD.getUTCMonth()); m === 11 ? (y++, (m = 0)) : m++) months.push([y, m]);
    const t = todayISO();
    const sel = ui.calDay;
    const cal = months.map(([y, m]) => {
      const first = new Date(Date.UTC(y, m, 1));
      const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      let cells = '';
      for (let i = 0; i < first.getUTCDay(); i++) cells += '<div class="cell blank"></div>';
      for (let day = 1; day <= dim; day++) {
        const x = `${y}-${pad(m + 1)}-${pad(day)}`;
        const items = (byDay[x] || []).sort((a, b) => a.done - b.done);
        const cls = [isYearEnd(x) ? 'closed' : '', x === t ? 'today' : '', x === sel ? 'sel' : '', keyLabel[x] ? 'key' : '', x > d.keys && x < d.oldEnd && x <= d.oldEnd ? 'overlap' : '', D.HOLIDAYS[x] || toD(x).getUTCDay() === 0 ? 'hol' : ''].join(' ');
        cells += `<button class="cell ${cls}" data-act="calDay" data-id="${x}">
          <span class="dn">${day}</span>
          ${keyLabel[x] ? `<span class="kl">${keyLabel[x]}</span>` : ''}
          ${D.HOLIDAYS[x] ? `<span class="hl">${esc(D.HOLIDAYS[x])}</span>` : ''}
          ${items.slice(0, 3).map((s) => `<span class="ev ${s.done ? 'done' : ''}">${esc(s.title)}</span>`).join('')}
          ${items.length > 3 ? `<span class="ev more">+${items.length - 3}</span>` : ''}
          ${items.length ? `<span class="dots">${items.map((s) => `<i class="${s.done ? 'done' : ''}"></i>`).join('')}</span>` : ''}
        </button>`;
      }
      return `<section class="month"><h2>${MONTHS[m]} ${y}</h2><div class="grid">${WD.map((w) => `<div class="wh">${w}</div>`).join('')}${cells}</div></section>`;
    }).join('');
    const selList = sel ? (byDay[sel] || []) : [];
    return `
      <div class="page-head"><div><h1>Calendar</h1><p class="muted">Tap a day to see its steps or add an appointment.</p></div></div>
      <div class="legend small"><span><i class="lg key"></i>Key date</span><span><i class="lg overlap"></i>Overlap (both homes)</span><span><i class="lg closed"></i>Offices closed</span></div>
      ${sel ? `<section class="card dayview"><header class="row between"><h2>${fmt(sel)}</h2><button class="btn small primary" data-act="addStep" data-id="${sel}">+ Add on this day</button></header>
        ${isYearEnd(sel) ? '<p class="small warn-text">Ward offices are usually closed on this day.</p>' : ''}
        ${selList.map((s) => stepRow(s, { phase: true })).join('') || '<p class="muted small">No steps on this day.</p>'}</section>` : ''}
      <div class="months">${cal}</div>`;
  }

  // ----- Notes -----
  function vNotes() {
    const notes = live(S.notes).sort((a, b) => b.updatedAt - a.updatedAt);
    return `
      <div class="page-head">
        <div><h1>Notes &amp; lists</h1><p class="muted">Shopping lists, measurements, quotes… Link them to steps so they are one tap away.</p></div>
        <div class="row gap">
          <select data-on="newFromTpl" aria-label="New from template"><option value="">New from template…</option>${Object.entries(D.NOTE_TEMPLATES).map(([k, t]) => `<option value="${k}">${esc(t.title)}</option>`).join('')}</select>
          <button class="btn primary" data-act="newNote">+ New note</button>
        </div>
      </div>
      <div class="note-grid">
        ${notes.map((n) => {
          const it = noteItems(n);
          const linked = linkedSteps(n.id);
          const total = notePrice(n);
          return `<a class="card note-card" href="#note/${n.id}">
            <strong>${esc(n.title || 'Untitled')}</strong>
            ${it.length ? `<span class="small">${it.filter((i) => i.done).length}/${it.length} checked</span>${progress(it.filter((i) => i.done).length, it.length)}` : `<span class="muted small">${esc((n.body || '').slice(0, 80))}</span>`}
            ${total ? `<span class="small">${yen(total)} planned</span>` : ''}
            ${linked.length ? `<span class="small muted">Linked: ${linked.map((s) => esc(s.title)).join(', ')}</span>` : ''}
          </a>`;
        }).join('') || '<p class="muted">No notes yet. Open a step and tap “Create linked note”, or start from a template.</p>'}
      </div>`;
  }

  function vNote(id) {
    const n = noteById(id);
    if (!n) return '<p>Note not found. <a href="#notes">Back to notes</a></p>';
    const it = noteItems(n);
    const tags = Array.from(new Set(it.map((i) => i.tag || '')));
    const grouped = tags.map((tag) => [tag, it.filter((i) => (i.tag || '') === tag)]);
    const linked = linkedSteps(n.id);
    const total = notePrice(n), bought = notePrice(n, true);
    const row = (i) => `<div class="item ${i.done ? 'done' : ''}">
        <input type="checkbox" data-act="itemDone" data-id="${n.id}" data-item="${i.id}" ${i.done ? 'checked' : ''} aria-label="Done">
        <input class="grow" value="${esc(i.text)}" placeholder="Item" data-on="item" data-field="text" data-id="${n.id}" data-item="${i.id}" data-fk="it-${i.id}-text">
        <input class="tag" value="${esc(i.tag)}" placeholder="Group" data-on="item" data-field="tag" data-id="${n.id}" data-item="${i.id}" data-fk="it-${i.id}-tag" list="taglist">
        <input class="qty" type="number" min="0" inputmode="numeric" value="${esc(i.qty)}" placeholder="Qty" data-on="item" data-field="qty" data-id="${n.id}" data-item="${i.id}" data-fk="it-${i.id}-qty">
        <input class="price" type="number" min="0" inputmode="numeric" value="${esc(i.price)}" placeholder="¥" data-on="item" data-field="price" data-id="${n.id}" data-item="${i.id}" data-fk="it-${i.id}-price">
        <button class="icon-btn" data-act="delItem" data-id="${n.id}" data-item="${i.id}" aria-label="Delete item">×</button>
      </div>`;
    return `
      <div class="page-head"><a href="#notes" class="btn ghost small">← Notes</a>
        <div class="row gap"><button class="btn" data-act="shareNote" data-id="${n.id}">Share / copy</button><button class="btn danger" data-act="delNote" data-id="${n.id}">Delete</button></div></div>
      <section class="card note-edit">
        <input class="title-input" value="${esc(n.title)}" placeholder="Title" data-on="noteField" data-field="title" data-id="${n.id}" data-fk="note-title">
        <textarea rows="3" placeholder="Write anything…" data-on="noteField" data-field="body" data-id="${n.id}" data-fk="note-body">${esc(n.body)}</textarea>
        ${linked.length ? `<p class="small">Linked to: ${linked.map((s) => `<button class="chip note" data-act="openStep" data-id="${s.id}">${esc(s.title)}</button>`).join(' ')}</p>` : `<p class="small muted">Not linked to a step yet. Open a step and choose this note to link it.</p>`}
        <div class="items">
          ${grouped.map(([tag, rows]) => `${tag ? `<h3>${esc(tag)} <span class="muted small">${rows.filter((i) => i.done).length}/${rows.length}</span></h3>` : ''}${rows.map(row).join('')}`).join('')}
        </div>
        <datalist id="taglist">${tags.filter(Boolean).map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
        <div class="row gap"><button class="btn" data-act="addItem" data-id="${n.id}">+ Add item</button>${it.some((i) => i.done) ? `<button class="btn ghost small" data-act="clearDone" data-id="${n.id}">Remove checked</button>` : ''}</div>
        ${total ? `<p class="totals">Planned ${yen(total)} · Checked ${yen(bought)}</p>` : ''}
      </section>`;
  }

  // ----- Budget -----
  function vBudget() {
    const ex = live(S.expenses);
    const shopping = live(S.notes).filter((n) => notePrice(n) > 0);
    const shopPlanned = shopping.reduce((a, n) => a + notePrice(n), 0);
    const shopBought = shopping.reduce((a, n) => a + notePrice(n, true), 0);
    const est = ex.reduce((a, e) => a + (Number(e.est) || 0), 0) + shopPlanned;
    const actual = ex.reduce((a, e) => a + (Number(e.actual) || 0), 0);
    const paid = { a: 0, b: 0 };
    ex.filter((e) => e.shared && Number(e.actual)).forEach((e) => (paid[e.paidBy] += Number(e.actual)));
    const half = (paid.a + paid.b) / 2;
    const owe = paid.a - half;
    const cats = {};
    ex.forEach((e) => (cats[e.cat || 'Other'] = (cats[e.cat || 'Other'] || 0) + (Number(e.actual) || Number(e.est) || 0)));
    const catNames = ['Housing', 'Moving', 'Furniture', 'Utilities', 'Other'];
    return `
      <div class="page-head"><div><h1>Budget</h1><p class="muted">Track estimates against actual spending, and who paid for what.</p></div><button class="btn primary" data-act="addExpense">+ Add cost</button></div>
      <section class="keydates">
        <div class="card kd"><span class="muted small">Estimated total</span><strong>${yen(est)}</strong><span class="muted small">includes shopping lists</span></div>
        <div class="card kd"><span class="muted small">Spent so far</span><strong>${yen(actual)}</strong></div>
        <div class="card kd"><span class="muted small">Shopping lists</span><strong>${yen(shopBought)}</strong><span class="muted small">bought of ${yen(shopPlanned)}</span></div>
        <div class="card kd accent"><span class="muted small">Settle up (shared costs, 50/50)</span><strong>${Math.abs(owe) < 1 ? 'All even' : `${esc(owe > 0 ? names()[1] : names()[0])} owes ${yen(Math.abs(owe))}`}</strong><span class="muted small">${esc(names()[0])} paid ${yen(paid.a)} · ${esc(names()[1])} paid ${yen(paid.b)}</span></div>
      </section>
      <section class="card">
        <div class="table-wrap"><table class="exp">
          <thead><tr><th>Item</th><th>Category</th><th class="num">Estimate</th><th class="num">Actual</th><th>Paid by</th><th>Shared</th><th></th></tr></thead>
          <tbody>${ex.map((e) => `<tr>
            <td><input value="${esc(e.label)}" data-on="exp" data-field="label" data-id="${e.id}" data-fk="ex-${e.id}-label" placeholder="What"></td>
            <td><select data-on="exp" data-field="cat" data-id="${e.id}">${catNames.map((c) => `<option ${e.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
            <td class="num"><input type="number" inputmode="numeric" value="${esc(e.est)}" data-on="exp" data-field="est" data-id="${e.id}" data-fk="ex-${e.id}-est" placeholder="¥"></td>
            <td class="num"><input type="number" inputmode="numeric" value="${esc(e.actual)}" data-on="exp" data-field="actual" data-id="${e.id}" data-fk="ex-${e.id}-actual" placeholder="¥"></td>
            <td><select data-on="exp" data-field="paidBy" data-id="${e.id}"><option value="a" ${e.paidBy === 'a' ? 'selected' : ''}>${esc(names()[0])}</option><option value="b" ${e.paidBy === 'b' ? 'selected' : ''}>${esc(names()[1])}</option></select></td>
            <td><input type="checkbox" data-act="expShared" data-id="${e.id}" ${e.shared ? 'checked' : ''} aria-label="Shared 50/50"></td>
            <td><button class="icon-btn" data-act="delExpense" data-id="${e.id}" aria-label="Delete">×</button></td>
          </tr>`).join('')}</tbody>
        </table></div>
        <p class="small muted">By category: ${Object.entries(cats).map(([c, v]) => `${esc(c)} ${yen(v)}`).join(' · ')}</p>
      </section>`;
  }

  // ----- Contacts / info -----
  function vContacts() {
    const a = S.settings.addresses || {};
    const cs = live(S.contacts);
    const f = (c, k, ph, type = 'text') => `<input type="${type}" value="${esc(c[k])}" placeholder="${ph}" data-on="contact" data-field="${k}" data-id="${c.id}" data-fk="c-${c.id}-${k}">`;
    return `
      <div class="page-head"><div><h1>Info &amp; contacts</h1><p class="muted">Addresses, phone numbers and confirmation numbers in one place. Handy when filling in forms or calling.</p></div><button class="btn primary" data-act="addContact">+ Add contact</button></div>
      <section class="card">
        <h2>Our addresses</h2>
        <div class="addr">
          ${[['old', 'Old home (Minato-ku)'], ['new', 'New home (Shibuya-ku)']].map(([k, l]) => `<label><span class="small muted">${l}</span><textarea rows="2" placeholder="〒… 東京都…区… / building / room" data-on="addr" data-field="${k}" data-fk="addr-${k}">${esc(a[k])}</textarea><button class="btn small" data-act="copy" data-text="${esc(a[k])}">Copy</button></label>`).join('')}
        </div>
      </section>
      <div class="contact-grid">
        ${cs.map((c) => `<section class="card contact">
          <div class="row between">${f(c, 'role', 'Role (e.g. Moving company)')}<button class="icon-btn" data-act="delContact" data-id="${c.id}" aria-label="Delete">×</button></div>
          ${f(c, 'name', 'Name / company')}
          <div class="row gap">${f(c, 'phone', 'Phone', 'tel')}${c.phone ? `<a class="btn small" href="tel:${esc(c.phone)}">Call</a>` : ''}</div>
          ${f(c, 'ref', 'Confirmation / contract no.')}
          <div class="row gap">${f(c, 'url', 'Website', 'url')}${c.url ? `<a class="btn small" href="${esc(c.url)}" target="_blank" rel="noopener">Open</a>` : ''}</div>
          <textarea rows="2" placeholder="Notes (appointment time, who to ask for…)" data-on="contact" data-field="notes" data-id="${c.id}" data-fk="c-${c.id}-notes">${esc(c.notes)}</textarea>
        </section>`).join('')}
      </div>`;
  }

  // ----- Settings -----
  function vSettings() {
    const st = S.settings;
    const dateField = (k, l) => `<label><span>${l}</span><input type="date" value="${st.dates[k]}" data-on="date" data-field="${k}"></label>`;
    return `
      <div class="page-head"><div><h1>Settings</h1></div></div>
      <section class="card form">
        <h2>The two of you</h2>
        <label><span>Name 1</span><input value="${esc(st.names[0])}" data-on="name" data-field="0" data-fk="name0"></label>
        <label><span>Name 2</span><input value="${esc(st.names[1])}" data-on="name" data-field="1" data-fk="name1"></label>
        <p class="small muted">“I am” (top right) is saved on this device only. It filters “my” steps.</p>
      </section>
      <section class="card form">
        <h2>Key dates</h2>
        ${dateField('keys', 'New lease starts / keys')}${dateField('move', 'Moving day')}${dateField('oldEnd', 'Old lease ends')}${dateField('start', 'Plan start (for “book now” steps)')}
        <p class="small muted">Step dates follow these. Dates you set by hand on a step stay as they are.</p>
      </section>
      <section class="card form">
        <h2>Tailor the plan</h2>
        ${profileForm()}
      </section>
      <section class="card form">
        <h2>Live sync</h2>
        ${syncCard()}
      </section>
      <section class="card form">
        <h2>Backup</h2>
        <p class="small">Save a copy of everything as a file, or merge in a file from the other phone. For each item, the most recent change wins.</p>
        <div class="row gap wrap">
          <button class="btn primary" data-act="export">Export / share backup</button>
          <label class="btn">Import &amp; merge<input type="file" accept="application/json,.json" data-on="import" hidden></label>
          <label class="btn ghost">Replace with file<input type="file" accept="application/json,.json" data-on="importReplace" hidden></label>
        </div>
        ${ui.flash ? `<p class="small ok-text">${esc(ui.flash)}</p>` : ''}
      </section>
      <section class="card form">
        <h2>Reset</h2>
        <button class="btn danger" data-act="reset">Erase everything on this device</button>
      </section>
      <p class="small muted center">Need a change? <a href="${SESSION_URL}" target="_blank" rel="noopener">Request changes</a></p>`;
  }
  function profileForm() {
    return D.PROFILE.map((p) => `<label class="switch line"><input type="checkbox" data-act="profile" data-id="${p.key}" ${S.settings.profile[p.key] ? 'checked' : ''}> ${esc(p.q)}</label>`).join('') +
      '<p class="small muted">Answers switch related steps on or off. You can still include or skip any step by hand.</p>';
  }

  // ----- Modals -----
  function renderModal() {
    const m = ui.modal;
    if (!m) return '';
    let body = '';
    if (m.type === 'step') body = modalStep(m.id);
    if (m.type === 'profile') body = `<h2>Tailor your plan</h2>${profileForm()}<div class="row end"><button class="btn primary" data-act="close">Done</button></div>`;
    if (m.type === 'onboard') body = modalOnboard();
    return `<div class="backdrop" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true">${body}</div>`;
  }

  function modalStep(id) {
    const s = stepById(id);
    if (!s) return '<p>Step not found.</p>';
    const st = stepState(s);
    const notes = s.noteIds.map(noteById).filter(Boolean);
    const others = live(S.notes).filter((n) => !s.noteIds.includes(n.id));
    const tpl = s.note && !notes.some((n) => n.tpl === s.note) ? s.note : '';
    const list = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `
      <header class="sheet-head">
        <div><span class="eyebrow">${esc(PHASE_BY_ID[s.phase]?.title || '')}</span>
        ${s.custom ? `<input class="title-input" value="${esc(s.title)}" data-on="customField" data-field="title" data-id="${s.id}" data-fk="cs-title">` : `<h2>${esc(s.title)}</h2>`}
        ${s.ja ? `<p class="ja big">${esc(s.ja)}</p>` : ''}</div>
        <button class="icon-btn" data-act="close" aria-label="Close">×</button>
      </header>
      <div class="sheet-controls">
        <label class="switch"><input type="checkbox" data-act="toggleDone" data-id="${s.id}" ${s.done ? 'checked' : ''} ${s.enabled ? '' : 'disabled'}> Done</label>
        <label><span class="small muted">Due</span><input type="date" value="${s.due || ''}" data-on="stepDue" data-id="${s.id}">${!s.custom && st.due ? `<button class="link small" data-act="resetDue" data-id="${s.id}">reset to ${fmt(s.suggested)}</button>` : ''}</label>
        <label><span class="small muted">Who</span><select data-on="stepAssign" data-id="${s.id}">${['both', 'a', 'b', ''].map((k) => `<option value="${k}" ${s.assign === k ? 'selected' : ''}>${esc(nameOf(k))}</option>`).join('')}</select></label>
        <button class="btn small ${s.enabled ? 'ghost' : 'primary'}" data-act="${s.enabled ? 'skip' : 'include'}" data-id="${s.id}">${s.enabled ? 'Skip this step' : 'Include this step'}</button>
      </div>
      ${s.deadline || s.winFrom || s.hardDate ? `<p class="callout">${s.winFrom ? `Can be done from <strong>${fmt(s.winFrom)}</strong>. ` : ''}${s.hardDate ? `Legal deadline: <strong>${fmt(s.hardDate)}</strong>. ` : ''}${esc(s.deadline || '')}</p>` : ''}
      ${s.why ? `<h3>Why</h3><p>${esc(s.why)}</p>` : ''}
      ${s.how && s.how.length ? `<h3>How</h3>${list(s.how)}` : ''}
      ${s.custom ? `<textarea rows="3" placeholder="Details (one per line)" data-on="customField" data-field="details" data-id="${s.id}" data-fk="cs-details">${esc(s.details || '')}</textarea>` : ''}
      ${s.where ? `<h3>Where</h3><p>${esc(s.where)}</p>` : ''}
      ${s.bring ? `<h3>What to bring</h3>${list(s.bring)}` : ''}
      ${s.cost ? `<h3>Typical cost</h3><p>${esc(s.cost)}</p>` : ''}
      ${s.tip ? `<p class="tipline"><strong>Tip:</strong> ${esc(s.tip)}</p>` : ''}
      ${s.links ? `<h3>Links</h3><p class="links">${s.links.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('')}</p>` : ''}
      <h3>Linked notes</h3>
      ${notes.map((n) => { const it = noteItems(n); return `<div class="row between linked"><a href="#note/${n.id}" data-act="close">${esc(n.title)}${it.length ? ` <span class="muted small">${it.filter((i) => i.done).length}/${it.length}</span>` : ''}</a><button class="link small" data-act="unlink" data-id="${s.id}" data-note="${n.id}">unlink</button></div>`; }).join('')}
      <div class="row gap wrap">
        ${tpl ? `<button class="btn primary small" data-act="createNote" data-id="${s.id}" data-tpl="${tpl}">Create “${esc(D.NOTE_TEMPLATES[tpl].title)}”</button>` : ''}
        <button class="btn small" data-act="createNote" data-id="${s.id}">+ Create linked note</button>
        ${others.length ? `<select data-on="linkExisting" data-id="${s.id}"><option value="">Link existing note…</option>${others.map((n) => `<option value="${n.id}">${esc(n.title)}</option>`).join('')}</select>` : ''}
      </div>
      <h3>Our memo</h3>
      <textarea rows="3" placeholder="Quick notes: reservation number, time, who said what…" data-on="stepMemo" data-id="${s.id}" data-fk="memo-${s.id}">${esc(s.memo || '')}</textarea>
      ${s.custom ? `<div class="row end"><button class="btn danger small" data-act="delCustom" data-id="${s.id}">Delete step</button></div>` : ''}`;
  }

  function modalOnboard() {
    const st = S.settings;
    return `<h2>Welcome to your moving planner</h2>
      <p>This plan covers every step of a move in Japan, from Minato-ku to Shibuya-ku: paperwork, utilities, customs and setting up the new home. A few questions tailor it to you.</p>
      <div class="form">
        <label><span>Your name</span><input value="${esc(st.names[0])}" data-on="name" data-field="0" data-fk="on-name0"></label>
        <label><span>Partner’s name</span><input value="${esc(st.names[1])}" data-on="name" data-field="1" data-fk="on-name1"></label>
        <label><span>New lease starts</span><input type="date" value="${st.dates.keys}" data-on="date" data-field="keys"></label>
        <label><span>Moving day (you can change it later)</span><input type="date" value="${st.dates.move}" data-on="date" data-field="move"></label>
        <label><span>Old lease ends</span><input type="date" value="${st.dates.oldEnd}" data-on="date" data-field="oldEnd"></label>
      </div>
      <h3>About you</h3>
      ${profileForm()}
      <div class="row end"><button class="btn primary" data-act="finishOnboard">Start planning</button></div>`;
  }

  // ---------- actions ----------
  function setStepField(id, field, value) {
    const s = stepById(id);
    const st = stepState(s);
    st[field] = value;
    touch(st);
  }
  function download(name, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Move planner backup' }).catch(() => {});
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function noteAsText(n) {
    const lines = [n.title, n.body || ''];
    let tag = null;
    noteItems(n).forEach((i) => {
      if ((i.tag || '') !== tag) { tag = i.tag || ''; if (tag) lines.push('', `【${tag}】`); }
      lines.push(`${i.done ? '☑' : '☐'} ${i.text}${i.qty ? ` ×${i.qty}` : ''}${i.price ? ` ${yen(i.price)}` : ''}`);
    });
    return lines.join('\n').trim();
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { prompt('Copy this:', t); }
  }
  function toast(msg) {
    const el = document.getElementById('saved');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(saveTimer); saveTimer = setTimeout(() => el.classList.remove('show'), 1500);
  }
  function readFile(input, cb) {
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { cb(JSON.parse(r.result)); } catch (e) { alert('That file could not be read as a planner backup.'); } input.value = ''; };
    r.readAsText(f);
  }

  const ACT = {
    me: (el) => { me = el.dataset.id; localStorage.setItem(ME_KEY, me); },
    toggleDone: (el) => { const s = stepById(el.dataset.id); setStepField(s.id, 'done', el.checked); stepState(s).doneAt = el.checked ? now() : null; },
    openStep: (el) => { ui.modal = { type: 'step', id: el.dataset.id }; },
    close: () => { ui.modal = null; },
    include: (el) => setStepField(el.dataset.id, 'enabled', true),
    skip: (el) => setStepField(el.dataset.id, 'enabled', false),
    setUi: (el) => { ui[el.dataset.key] = el.dataset.id; },
    toggleSkipped: (el) => { ui.showSkipped = el.checked; },
    jumpPhase: (el, e) => { e.preventDefault(); ui.filter = 'all'; location.hash = '#plan'; setTimeout(() => document.getElementById('phase-' + el.dataset.id)?.scrollIntoView({ behavior: 'smooth' }), 50); },
    calDay: (el) => { ui.calDay = ui.calDay === el.dataset.id ? null : el.dataset.id; },
    openProfile: () => { ui.modal = { type: 'profile' }; },
    profile: (el) => { S.settings.profile[el.dataset.id] = el.checked; touchSettings(); },
    finishOnboard: () => { S.settings.onboarded = true; touchSettings(); ui.modal = null; },
    addStep: (el) => {
      const c = touch({ id: 'c-' + uid(), phase: el.dataset.id ? (el.dataset.id <= S.settings.dates.move ? 'setup' : 'after') : 'setup', title: 'New step', ja: '', due: el.dataset.id || S.settings.dates.move, assign: 'both', details: '', noteIds: [] });
      S.custom.push(c);
      ui.modal = { type: 'step', id: c.id };
    },
    delCustom: (el) => { if (!confirm('Delete this step?')) return; setStepField(el.dataset.id, 'deleted', true); ui.modal = null; },
    resetDue: (el) => setStepField(el.dataset.id, 'due', ''),
    createNote: (el) => { const s = stepById(el.dataset.id); const n = newNote(el.dataset.tpl); if (!el.dataset.tpl) { n.title = s.title; n.body = ''; } linkNote(s, n.id); ui.modal = null; location.hash = '#note/' + n.id; },
    unlink: (el) => { const s = stepById(el.dataset.id); const st = stepState(s); st.noteIds = (st.noteIds || []).filter((x) => x !== el.dataset.note); touch(st); },
    newNote: () => { const n = newNote(); location.hash = '#note/' + n.id; },
    delNote: (el) => { if (!confirm('Delete this note?')) return; touch(noteById(el.dataset.id)).deleted = true; location.hash = '#notes'; },
    addItem: (el) => { const n = noteById(el.dataset.id); const last = noteItems(n).slice(-1)[0]; const i = touch({ id: uid(), text: '', tag: last ? last.tag : '', done: false, qty: '', price: '' }); n.items.push(i); touch(n); setTimeout(() => document.querySelector(`[data-fk="it-${i.id}-text"]`)?.focus(), 0); },
    itemDone: (el) => { const n = noteById(el.dataset.id); touch(n.items.find((i) => i.id === el.dataset.item)).done = el.checked; touch(n); },
    delItem: (el) => { const n = noteById(el.dataset.id); touch(n.items.find((i) => i.id === el.dataset.item)).deleted = true; touch(n); },
    clearDone: (el) => { const n = noteById(el.dataset.id); noteItems(n).filter((i) => i.done).forEach((i) => (touch(i).deleted = true)); touch(n); },
    shareNote: (el) => { const t = noteAsText(noteById(el.dataset.id)); if (navigator.share) navigator.share({ text: t }).catch(() => {}); else copyText(t); },
    addExpense: () => { S.expenses.push(touch({ id: uid(), label: '', cat: 'Other', est: '', actual: '', paidBy: me, shared: true })); },
    expShared: (el) => { touch(S.expenses.find((x) => x.id === el.dataset.id)).shared = el.checked; },
    delExpense: (el) => { touch(S.expenses.find((x) => x.id === el.dataset.id)).deleted = true; },
    addContact: () => { S.contacts.push(touch({ id: uid(), role: '', name: '', phone: '', url: '', ref: '', notes: '' })); },
    delContact: (el) => { if (!confirm('Delete this contact?')) return; touch(S.contacts.find((x) => x.id === el.dataset.id)).deleted = true; },
    copy: (el) => { copyText(el.dataset.text || ''); return 'norender'; },
    export: () => { download(`move-planner-${todayISO()}.json`, JSON.stringify(S, null, 1)); return 'norender'; },
    syncIn: () => { window.SYNC?.signIn(); return 'norender'; },
    syncOut: () => { if ((window.SYNC_STATUS || {}).loaded && !confirm('Sign out on this device? Your plan stays saved in your account.')) return 'norender'; window.SYNC?.signOut(); return 'norender'; },
    reload: () => { location.reload(); return 'norender'; },
    reset: () => { if (!confirm('Erase all planner data on this device? Export a backup first if unsure.')) return; S = defaultState(); },
  };

  // Input handlers: update state; re-render only when the change affects other parts of the page.
  const ON = {
    search: (el) => { ui.q = el.value; return true; },
    item: (el, ev) => { const n = noteById(el.dataset.id); const i = n.items.find((x) => x.id === el.dataset.item); i[el.dataset.field] = el.value; touch(i); touch(n); return ev.type === 'change'; },
    noteField: (el) => { const n = noteById(el.dataset.id); n[el.dataset.field] = el.value; touch(n); return false; },
    newFromTpl: (el) => { if (!el.value) return false; const n = newNote(el.value); location.hash = '#note/' + n.id; return true; },
    exp: (el, ev) => { touch(S.expenses.find((x) => x.id === el.dataset.id))[el.dataset.field] = el.value; return ev.type === 'change'; },
    contact: (el, ev) => { touch(S.contacts.find((x) => x.id === el.dataset.id))[el.dataset.field] = el.value; return ev.type === 'change' && ['phone', 'url'].includes(el.dataset.field); },
    addr: (el) => { S.settings.addresses = S.settings.addresses || {}; S.settings.addresses[el.dataset.field] = el.value; touchSettings(); return false; },
    name: (el, ev) => { S.settings.names[Number(el.dataset.field)] = el.value; touchSettings(); return ev.type === 'change'; },
    date: (el, ev) => { if (!el.value) return false; S.settings.dates[el.dataset.field] = el.value; touchSettings(); return ev.type === 'change'; },
    stepDue: (el, ev) => { setStepField(el.dataset.id, 'due', el.value); return ev.type === 'change'; },
    stepAssign: (el) => { setStepField(el.dataset.id, 'assign', el.value); return true; },
    stepMemo: (el) => { setStepField(el.dataset.id, 'memo', el.value); return false; },
    customField: (el, ev) => { setStepField(el.dataset.id, el.dataset.field, el.value); return ev.type === 'change'; },
    linkExisting: (el) => { if (!el.value) return false; linkNote(stepById(el.dataset.id), el.value); return true; },
    import: (el) => { readFile(el, (data) => { S = mergeState(S, data); save(); ui.flash = 'Merged your partner’s changes.'; render(); }); return false; },
    importReplace: (el) => { readFile(el, (data) => { if (!confirm('Replace everything on this device with the file?')) return; S = Object.assign(defaultState(), data); save(); ui.flash = 'Replaced with the backup.'; render(); }); return false; },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'SELECT') return;
    const fn = ACT[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'BUTTON') e.preventDefault();
    if (el.tagName === 'A' && el.dataset.act === 'close') { ui.modal = null; return render(); }
    const res = fn(el, e);
    if (res === 'norender') return;
    save();
    render();
  });
  const onInput = (e) => {
    const el = e.target.closest('[data-on]');
    if (!el) return;
    const fn = ON[el.dataset.on];
    if (!fn) return;
    if (e.type === 'input' && (el.tagName === 'SELECT' || el.type === 'file' || el.type === 'date')) return;
    const rerender = fn(el, e);
    save();
    if (rerender) render();
  };
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.modal) { ui.modal = null; render(); } });
  window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
  window.addEventListener('storage', (e) => { if (e.key === KEY) { S = load(); render(); } });

  if (!S.settings.onboarded) ui.modal = { type: 'onboard' };
  render();
  window.__planner = {
    get state() { return S; },
    mergeState, sameState, render,
    clearLocal() { localStorage.removeItem(KEY); S = defaultState(); ui.modal = { type: 'onboard' }; },
    // Merge a copy from the cloud into this device. Returns true if this device has changes the cloud lacks.
    applyRemote(remote) {
      const merged = mergeState(S, remote);
      if (!sameState(merged, S)) { S = merged; localStorage.setItem(KEY, JSON.stringify(S)); if (S.settings.onboarded && ui.modal?.type === 'onboard') ui.modal = null; render(); }
      return !sameState(S, remote);
    },
  };
})();
