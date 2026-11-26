(function () {
  const D_EN = window.MOVE_DATA;
  const D_JA = window.MOVE_DATA_JA || {};
  const LANG_KEY = 'moveplanner.lang';
  let lang = localStorage.getItem(LANG_KEY) || 'ja';
  const L = (en, ja) => (lang === 'ja' ? ja : en);
  // Step library in the current language (Japanese text overlays the English data).
  function localData() {
    if (lang !== 'ja') return D_EN;
    const J = D_JA;
    const step = (s) => {
      const j = (J.STEPS || {})[s.id];
      if (!j) return s;
      const o = Object.assign({}, s, j, { ja: '' });
      if (s.links) o.links = s.links.map(([l, u], i) => [(j.links || [])[i] || l, u]);
      return o;
    };
    return Object.assign({}, D_EN, {
      PHASES: D_EN.PHASES.map((p) => Object.assign({}, p, (J.PHASES || {})[p.id], { ja: '' })),
      PROFILE: D_EN.PROFILE.map((p) => Object.assign({}, p, { q: (J.PROFILE || {})[p.key] || p.q })),
      STEPS: D_EN.STEPS.map(step),
      NOTE_TEMPLATES: Object.assign({}, D_EN.NOTE_TEMPLATES, J.NOTE_TEMPLATES || {}),
    });
  }
  let D = localData();
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
  const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WD_JA = ['日', '月', '火', '水', '木', '金', '土'];
  const WD = new Proxy([], { get: (t, k) => (lang === 'ja' ? WD_JA : WD_EN)[k] });
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthTitle = (y, m) => L(`${MONTHS[m]} ${y}`, `${y}年${m + 1}月`);
  const fmt = (s) => { if (!s) return ''; const d = toD(s); const md = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; return L(`${md} ${WD_EN[d.getUTCDay()]}`, `${md}（${WD_JA[d.getUTCDay()]}）`); };
  const yen = (n) => '¥' + Math.round(Number(n) || 0).toLocaleString('en-US');
  const isYearEnd = (s) => { const d = toD(s); const m = d.getUTCMonth() + 1, day = d.getUTCDate(); return (m === 12 && day >= 29) || (m === 1 && day <= 3); };
  const officeClosed = (s) => { const w = toD(s).getUTCDay(); return w === 0 || w === 6 || !!D.HOLIDAYS[s] || isYearEnd(s); };
  const officeAdjust = (s, dir) => { let x = s, g = 0; while (officeClosed(x) && g++ < 30) x = add(x, dir === 'after' ? 1 : -1); return x; };
  const relDays = (s) => {
    const n = diff(todayISO(), s);
    if (n === 0) return L('today', '今日');
    if (n === 1) return L('tomorrow', '明日');
    if (n === -1) return L('yesterday', '昨日');
    return n > 0 ? L(`in ${n} days`, `${n}日後`) : L(`${-n} days ago`, `${-n}日前`);
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
    if (el) { el.textContent = L('Saved', '保存しました'); el.classList.add('show'); clearTimeout(saveTimer); saveTimer = setTimeout(() => el.classList.remove('show'), 1200); }
    window.SYNC?.push();
  }
  const touch = (o) => { o.updatedAt = now(); return o; };
  const touchSettings = () => touch(S.settings);
  const names = () => S.settings.names;
  const nameOf = (k) => (k === 'a' ? names()[0] : k === 'b' ? names()[1] : k === 'both' ? L('Both', '2人') : L('Anyone', '誰でも'));
  // Seeded rows keep their English text in the data; show them translated until edited.
  const SEED_JA = {
    'New home move-in costs (初期費用)': '新居の初期費用', 'Overlap rent – old home': '二重家賃（旧居）', 'Fire insurance (火災保険)': '火災保険',
    'Moving company': '引越し業者', '粗大ごみ / recycling fees': '粗大ごみ・リサイクル料金', 'Internet installation': 'ネット開通工事', 'Neighbor gifts': 'ご近所への挨拶品',
    'Current management company (管理会社)': '旧居の管理会社', 'New home agent / management': '新居の不動産会社・管理会社', 'Internet provider': 'プロバイダ',
    'Gas – opening appointment': 'ガス開栓の立会い', 'Tokyo Gas': '東京ガス', 'Minato City Office': '港区役所', 'Shibuya City Office': '渋谷区役所',
  };
  const tr = (v) => (lang === 'ja' && SEED_JA[v]) || v || '';
  const CAT_JA = { Housing: '住まい', Moving: '引越し', Furniture: '家具', Utilities: '光熱・通信', Other: 'その他' };
  const catLabel = (c) => L(c, CAT_JA[c] || c);
  const initial = (k) => (k === 'both' ? '2' : (nameOf(k) || '?').trim().charAt(0).toUpperCase() || '?');

  // ---------- steps ----------
  let STEP_BY_ID = Object.fromEntries(D.STEPS.map((s) => [s.id, s]));
  let PHASE_BY_ID = Object.fromEntries(D.PHASES.map((p) => [p.id, p]));
  function setLang(l) {
    lang = l;
    localStorage.setItem(LANG_KEY, l);
    D = localData();
    STEP_BY_ID = Object.fromEntries(D.STEPS.map((s) => [s.id, s]));
    PHASE_BY_ID = Object.fromEntries(D.PHASES.map((p) => [p.id, p]));
  }
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
  const NAV = [['home', 'Home', 'ホーム'], ['plan', 'Steps', 'やること'], ['calendar', 'Calendar', 'カレンダー'], ['notes', 'Notes', 'メモ'], ['budget', 'Budget', '予算'], ['contacts', 'Info', '情報'], ['settings', 'Settings', '設定']];

  function route() {
    const h = location.hash.replace(/^#\/?/, '') || 'home';
    const [view, id] = h.split('/');
    return { view: NAV.some((n) => n[0] === view) || view === 'note' ? view : 'home', id };
  }

  function gate() {
    const z = window.SYNC_STATUS || { configured: !!window.FIREBASE_CONFIG?.apiKey };
    if (!z.configured) return '';
    const card = (inner) => `<section class="gate card"><img src="icon.svg" alt="" width="56" height="56"><h1>${L('Our Move', '引越しプランナー')}</h1>${inner}</section>`;
    if (!z.ready) return card(`<p class="muted">${z.error ? esc(z.error) : L('Loading…', '読み込み中…')}</p>${z.error ? `<button class="btn" data-act="reload">${L('Try again', '再読み込み')}</button>` : ''}`);
    if (!z.user) return card(`<p>${L('Sign in to open your shared moving plan.', 'ログインして2人の引越しプランを開きましょう。')}</p><button class="btn primary" data-act="syncIn">${L('Sign in with Google', 'Googleでログイン')}</button>${z.error ? `<p class="small bad-text">${esc(z.error)}</p>` : ''}`);
    if (z.denied) return card(`<p>${L(`<strong>${esc(z.user)}</strong> doesn’t have access to this plan.`, `<strong>${esc(z.user)}</strong> はこのプランを開けません。`)}</p><button class="btn primary" data-act="syncOut">${L('Use a different account', '別のアカウントを使う')}</button>`);
    if (!z.loaded) return card(`<p class="muted">${L('Loading your plan…', 'プランを読み込み中…')}</p>`);
    return '';
  }

  function renderChrome() {
    document.documentElement.lang = lang;
    document.title = L('Our Move · Minato → Shibuya', '引越しプランナー · 港区 → 渋谷区');
    const lb = document.getElementById('lang');
    if (lb) { lb.textContent = L('日本語', 'EN'); lb.title = L('日本語に切り替え', 'Switch to English'); }
    const iam = document.getElementById('iam');
    if (iam) iam.textContent = L('I am', '自分');
  }

  function render() {
    renderChrome();
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
    document.getElementById('nav').innerHTML = NAV.map(([k, en, ja]) => `<a href="#${k}" class="${navView === k ? 'on' : ''}">${icon(k)}<span>${L(en, ja)}</span></a>`).join('');
    renderSyncBadge();
    document.getElementById('me').innerHTML = ['a', 'b'].map((k) => `<button class="${me === k ? 'on' : ''}" data-act="me" data-id="${k}" title="${esc(L('I am ' + nameOf(k), nameOf(k) + 'として使う'))}">${esc(nameOf(k))}</button>`).join('');
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
    if (!z.configured) return { cls: 'off', label: L('This device only', 'この端末のみ') };
    if (!z.user) return { cls: 'off', label: L('Not signed in', '未ログイン') };
    if (z.state === 'error') return { cls: 'bad', label: L('Sync problem', '同期エラー') };
    if (z.state === 'offline') return { cls: 'warn', label: L('Offline – will sync later', 'オフライン（後で同期します）') };
    if (z.state === 'saving' || z.state === 'connecting') return { cls: 'warn', label: L('Syncing…', '同期中…') };
    return { cls: 'ok', label: L('Synced', '同期済み') };
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
    if (!z.configured) return `<p class="small muted">${L('Live sync is not set up yet, so data is saved in this browser only.', 'リアルタイム同期が未設定のため、データはこのブラウザだけに保存されます。')}</p>`;
    const i = syncInfo();
    if (!z.user) return `<p class="small">${L('Sign in with Google so both of your phones show the same plan, updated live.', 'Googleでログインすると、2人のスマホに同じプランがリアルタイムで表示されます。')}</p>
      <div class="row gap wrap"><button class="btn primary" data-act="syncIn">${L('Sign in with Google', 'Googleでログイン')}</button></div>
      ${z.error ? `<p class="small bad-text">${esc(z.error)}</p>` : ''}`;
    return `<p class="small"><span class="sync inline ${i.cls}"><i></i><span>${esc(i.label)}</span></span> ${L('Signed in as', 'ログイン中：')} <strong>${esc(z.user)}</strong>${z.last ? ` · ${L('last synced', '最終同期')} ${new Date(z.last).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
      ${z.error ? `<p class="small bad-text">${esc(z.error)}</p>` : ''}
      <div class="row gap wrap"><button class="btn ghost" data-act="syncOut">${L('Sign out', 'ログアウト')}</button></div>`;
  }

  const progress = (done, total) => `<div class="bar" role="progressbar" aria-valuenow="${done}" aria-valuemax="${total}"><i style="width:${total ? Math.round((done / total) * 100) : 0}%"></i></div>`;

  function stepRow(s, opts = {}) {
    const notes = s.noteIds.map(noteById).filter(Boolean);
    return `<div class="step ${s.done ? 'done' : ''} ${s.enabled ? '' : 'skipped'}">
      <label class="check"><input type="checkbox" data-act="toggleDone" data-id="${s.id}" ${s.done ? 'checked' : ''} ${s.enabled ? '' : 'disabled'} aria-label="${L('Mark done', '完了にする')}"></label>
      <button class="step-main" data-act="openStep" data-id="${s.id}">
        <span class="step-title">${esc(s.title)}</span>
        ${s.ja ? `<span class="ja">${esc(s.ja)}</span>` : ''}
        <span class="meta">
          ${s.due ? `<span class="chip due ${dueClass(s)}">${fmt(s.due)}${!s.done && dueClass(s) === 'overdue' ? L(' · overdue', '・期限切れ') : ''}</span>` : ''}
          ${opts.phase ? `<span class="chip">${esc(PHASE_BY_ID[s.phase]?.title || '')}</span>` : ''}
          ${s.hardDate ? `<span class="chip warn">${L('Deadline', '期限')} ${fmt(s.hardDate)}</span>` : ''}
          ${notes.map((n) => { const it = noteItems(n); return `<span class="chip note">${esc(n.title)}${it.length ? ` ${it.filter((i) => i.done).length}/${it.length}` : ''}</span>`; }).join('')}
          ${s.custom ? `<span class="chip">${L('Your step', '追加したステップ')}</span>` : ''}
        </span>
      </button>
      ${s.enabled ? `<span class="avatar ${s.assign}" title="${esc(nameOf(s.assign))}">${esc(initial(s.assign))}</span>` : `<button class="btn small" data-act="include" data-id="${s.id}">${L('Include', '戻す')}</button>`}
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
      [L('Keys to the new home', '新居の鍵'), d.keys, L('New lease starts', '新居の契約開始')],
      [L('Moving day', '引越し日'), d.move, isYearEnd(d.move) ? L('Offices closed that day', 'この日は区役所休み') : ''],
      [L('City offices closed', '区役所の休み'), '2026-12-29', L('Usually 12/29 – 1/3', '例年 12/29〜1/3')],
      [L('Old lease ends', '旧居の契約終了'), d.oldEnd, L('Move-out inspection before this', 'この日までに退去立会い')],
    ];
    const myOpen = pending.filter((s) => s.assign === me || s.assign === 'both').length;
    return `
      <section class="hero">
        <div>
          <p class="eyebrow">${esc(S.settings.names.join(' & '))} · ${L('Minato-ku → Shibuya-ku', '港区 → 渋谷区')}</p>
          <h1>${moveIn > 0 ? L(`${moveIn} days until moving day`, `引越しまであと${moveIn}日`) : moveIn === 0 ? L('Moving day is today!', '今日は引越し日！') : L('Welcome home!', '新居へようこそ！')}</h1>
          <p class="muted">${L(`Moving day: ${fmt(d.move)}. ${done} of ${act.length} steps done. ${myOpen} open steps for ${esc(nameOf(me))}.`, `引越し日：${fmt(d.move)}。${act.length}件中${done}件完了。${esc(nameOf(me))}の残り：${myOpen}件。`)}</p>
          ${progress(done, act.length)}
        </div>
      </section>
      ${moveDayPicker()}
      <section class="keydates">
        ${keyCards.map(([l, date, sub]) => `<div class="card kd ${date === d.move ? 'accent' : ''}"><span class="muted small">${l}</span><strong>${fmt(date)}</strong><span class="small">${relDays(date)}</span>${sub ? `<span class="muted small">${esc(sub)}</span>` : ''}</div>`).join('')}
      </section>
      <div class="cols">
        <section class="card">
          <h2>${L('Next up', '次にやること')}</h2>
          ${overdue.length ? `<p class="small warn-text">${L(`${overdue.length} overdue`, `期限切れ ${overdue.length}件`)}</p>${overdue.map((s) => stepRow(s, { phase: true })).join('')}` : ''}
          ${upcoming.map((s) => stepRow(s, { phase: true })).join('') || `<p class="muted">${L('Nothing left. Enjoy the new home!', 'すべて完了！新居を楽しんでください。')}</p>`}
          <a class="btn ghost" href="#plan">${L('See all steps', 'すべて見る')}</a>
        </section>
        <section class="card">
          <h2>${L('Progress by phase', 'フェーズ別の進み具合')}</h2>
          ${D.PHASES.map((p) => { const ps = act.filter((s) => s.phase === p.id); const pd = ps.filter((s) => s.done).length; return `<a class="phase-row" href="#plan" data-act="jumpPhase" data-id="${p.id}"><span><strong>${esc(p.title)}</strong> <span class="muted small">${esc(p.when)}</span></span><span class="small">${pd}/${ps.length}</span>${progress(pd, ps.length)}</a>`; }).join('')}
        </section>
      </div>
      <section class="card tip">
        <h2>${L('Year-end checklist', '年末年始の注意')}</h2>
        <ul>${L(`
          <li>Ward offices are usually closed <strong>12/29 – 1/3</strong>. File the 転出届 (Minato) before then and the 転入届 (Shibuya) from 1/4.</li>
          <li>Movers, gas opening appointments, internet installation and 粗大ごみ pickups are fully booked late in December. Book these first.</li>
          <li>Garbage collection stops over New Year in both wards. Plan your cardboard and trash.</li>`, `
          <li>区役所は例年 <strong>12/29〜1/3</strong> が休みです。港区の転出届はそれまでに、渋谷区の転入届は1/4以降に。</li>
          <li>12月下旬は引越し業者・ガス開栓・ネット工事・粗大ごみの予約が埋まります。最初に予約しましょう。</li>
          <li>年末年始は両区ともごみ収集が休みになります。段ボールやごみの出し方を計画しましょう。</li>`)}
        </ul>
      </section>`;
  }

  function moveDayPicker() {
    const d = S.settings.dates;
    const field = (k, l) => `<label><span>${l}</span><input type="date" value="${d[k]}" data-on="date" data-field="${k}"></label>`;
    const warn = [];
    if (d.move < d.keys) warn.push(L('Moving day is before you get the keys.', '引越し日が鍵の受け取りより前です。'));
    if (d.move > d.oldEnd) warn.push(L('Moving day is after the old lease ends.', '引越し日が旧居の契約終了より後です。'));
    if (isYearEnd(d.move)) warn.push(L('City offices are closed that day (12/29 – 1/3). That is fine for moving, and the paperwork steps are scheduled around it.', 'この日は区役所が休みです（12/29〜1/3）。引越し自体は問題なく、手続きの日程は休みを避けて組まれます。'));
    const overlap = diff(d.keys, d.oldEnd);
    return `<section class="card form">
      <h2>${L('Key dates', '大事な日付')}</h2>
      <div class="datefields">${field('move', L('Moving day', '引越し日'))}${field('keys', L('New lease starts', '新居の契約開始'))}${field('oldEnd', L('Old lease ends', '旧居の契約終了'))}</div>
      ${warn.map((w) => `<p class="small warn-text">${esc(w)}</p>`).join('')}
      <p class="muted small">${overlap > 0 ? L(`You have both homes for ${overlap} days. `, `2つの家がある期間：${overlap}日。`) : ''}${L('Change a date and every step’s suggested date moves with it. Dates you set by hand on a step stay as they are.', '日付を変えると、各ステップの目安日も自動で変わります。手動で設定した日付はそのままです。')}</p>
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
        <div><h1>${L('Moving steps', '引越しのやること')}</h1><p class="muted">${L(`${act.filter((s) => s.done).length} of ${act.length} done · ${skipped} skipped. Tap a step to see what it involves.`, `${act.length}件中${act.filter((s) => s.done).length}件完了・${skipped}件スキップ。タップすると詳しい内容が見られます。`)}</p></div>
        <div class="row gap"><button class="btn" data-act="openProfile">${L('Tailor plan', 'プランを調整')}</button><button class="btn primary" data-act="addStep">${L('+ Add step', '＋ 追加')}</button></div>
      </div>
      <div class="toolbar">
        ${seg('filter', [['all', L('All', 'すべて')], ['todo', L('To do', '未完了')], ['done', L('Done', '完了')]])}
        ${seg('who', [['all', L('Everyone', '全員')], ['a', names()[0]], ['b', names()[1]]])}
        <input type="search" placeholder="${L('Search steps…', 'ステップを検索…')}" value="${esc(ui.q)}" data-on="search" data-fk="search">
        <label class="switch"><input type="checkbox" data-act="toggleSkipped" ${ui.showSkipped ? 'checked' : ''}> ${L('Show skipped steps', 'スキップしたものも表示')}</label>
      </div>
      ${D.PHASES.map((p) => {
        const ps = list.filter((s) => s.phase === p.id).sort(sortByDue);
        const all = act.filter((s) => s.phase === p.id);
        if (!ps.length && !all.length) return '';
        return `<section class="phase" id="phase-${p.id}">
          <header><div><h2>${esc(p.title)}${p.ja ? ` <span class="ja">${esc(p.ja)}</span>` : ''}</h2><span class="muted small">${esc(p.when)}</span></div><span class="small">${all.filter((s) => s.done).length}/${all.length}</span></header>
          ${progress(all.filter((s) => s.done).length, all.length)}
          ${ps.map((s) => stepRow(s)).join('') || `<p class="muted small empty">${L('Nothing here for this filter.', '該当するステップはありません。')}</p>`}
        </section>`;
      }).join('')}`;
  }

  // ----- Calendar -----
  function vCalendar() {
    const d = S.settings.dates;
    const steps = activeSteps();
    const byDay = {};
    steps.forEach((s) => { if (s.due) (byDay[s.due] = byDay[s.due] || []).push(s); });
    const keyLabel = { [d.keys]: L('Keys', '鍵'), [d.move]: L('Move', '引越し'), [d.oldEnd]: L('Lease ends', '契約終了') };
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
      return `<section class="month"><h2>${monthTitle(y, m)}</h2><div class="grid">${(lang === 'ja' ? WD_JA : WD_EN).map((w) => `<div class="wh">${w}</div>`).join('')}${cells}</div></section>`;
    }).join('');
    const selList = sel ? (byDay[sel] || []) : [];
    return `
      <div class="page-head"><div><h1>${L('Calendar', 'カレンダー')}</h1><p class="muted">${L('Tap a day to see its steps or add an appointment.', '日付をタップすると、その日のステップの確認や予定の追加ができます。')}</p></div></div>
      <div class="legend small"><span><i class="lg key"></i>${L('Key date', '大事な日')}</span><span><i class="lg overlap"></i>${L('Overlap (both homes)', '2つの家がある期間')}</span><span><i class="lg closed"></i>${L('Offices closed', '区役所休み')}</span></div>
      ${sel ? `<section class="card dayview"><header class="row between"><h2>${fmt(sel)}</h2><button class="btn small primary" data-act="addStep" data-id="${sel}">${L('+ Add on this day', '＋ この日に追加')}</button></header>
        ${isYearEnd(sel) ? `<p class="small warn-text">${L('Ward offices are usually closed on this day.', 'この日は区役所が休みのことが多いです。')}</p>` : ''}
        ${selList.map((s) => stepRow(s, { phase: true })).join('') || `<p class="muted small">${L('No steps on this day.', 'この日のステップはありません。')}</p>`}</section>` : ''}
      <div class="months">${cal}</div>`;
  }

  // ----- Notes -----
  function vNotes() {
    const notes = live(S.notes).sort((a, b) => b.updatedAt - a.updatedAt);
    return `
      <div class="page-head">
        <div><h1>${L('Notes &amp; lists', 'メモ・リスト')}</h1><p class="muted">${L('Shopping lists, measurements, quotes… Link them to steps so they are one tap away.', '買い物リスト、採寸、見積もり…。ステップにリンクすればワンタップで開けます。')}</p></div>
        <div class="row gap">
          <select data-on="newFromTpl" aria-label="${L('New from template', 'テンプレートから作成')}"><option value="">${L('New from template…', 'テンプレートから作成…')}</option>${Object.entries(D.NOTE_TEMPLATES).map(([k, t]) => `<option value="${k}">${esc(t.title)}</option>`).join('')}</select>
          <button class="btn primary" data-act="newNote">${L('+ New note', '＋ 新しいメモ')}</button>
        </div>
      </div>
      <div class="note-grid">
        ${notes.map((n) => {
          const it = noteItems(n);
          const linked = linkedSteps(n.id);
          const total = notePrice(n);
          return `<a class="card note-card" href="#note/${n.id}">
            <strong>${esc(n.title || L('Untitled', '無題'))}</strong>
            ${it.length ? `<span class="small">${it.filter((i) => i.done).length}/${it.length} ${L('checked', 'チェック済み')}</span>${progress(it.filter((i) => i.done).length, it.length)}` : `<span class="muted small">${esc((n.body || '').slice(0, 80))}</span>`}
            ${total ? `<span class="small">${L(`${yen(total)} planned`, `予定 ${yen(total)}`)}</span>` : ''}
            ${linked.length ? `<span class="small muted">${L('Linked:', 'リンク：')} ${linked.map((s) => esc(s.title)).join(', ')}</span>` : ''}
          </a>`;
        }).join('') || `<p class="muted">${L('No notes yet. Open a step and tap “Create linked note”, or start from a template.', 'まだメモがありません。ステップを開いて「リンクしたメモを作成」をタップするか、テンプレートから作りましょう。')}</p>`}
      </div>`;
  }

  function vNote(id) {
    const n = noteById(id);
    if (!n) return `<p>${L('Note not found.', 'メモが見つかりません。')} <a href="#notes">${L('Back to notes', 'メモ一覧へ')}</a></p>`;
    const it = noteItems(n);
    const tags = Array.from(new Set(it.map((i) => i.tag || '')));
    const grouped = tags.map((tag) => [tag, it.filter((i) => (i.tag || '') === tag)]);
    const linked = linkedSteps(n.id);
    const total = notePrice(n), bought = notePrice(n, true);
    const row = (i) => `<div class="item ${i.done ? 'done' : ''}">
        <input type="checkbox" data-act="itemDone" data-id="${n.id}" data-item="${i.id}" ${i.done ? 'checked' : ''} aria-label="${L('Done', '完了')}">
        <input class="grow" value="${esc(i.text)}" placeholder="${L('Item', '項目')}" data-on="item" data-field="text" data-id="${n.id}" data-item="${i.id}" data-fk="it-${i.id}-text">
        <input class="tag" value="${esc(i.tag)}" placeholder="${L('Group', 'グループ')}" data-on="item" data-field="tag" data-id="${n.id}" data-item="${i.id}" data-fk="it-${i.id}-tag" list="taglist">
        <input class="qty" type="number" min="0" inputmode="numeric" value="${esc(i.qty)}" placeholder="${L('Qty', '数')}" data-on="item" data-field="qty" data-id="${n.id}" data-item="${i.id}" data-fk="it-${i.id}-qty">
        <input class="price" type="number" min="0" inputmode="numeric" value="${esc(i.price)}" placeholder="¥" data-on="item" data-field="price" data-id="${n.id}" data-item="${i.id}" data-fk="it-${i.id}-price">
        <button class="icon-btn" data-act="delItem" data-id="${n.id}" data-item="${i.id}" aria-label="${L('Delete item', '項目を削除')}">×</button>
      </div>`;
    return `
      <div class="page-head"><a href="#notes" class="btn ghost small">${L('← Notes', '← メモ')}</a>
        <div class="row gap"><button class="btn" data-act="shareNote" data-id="${n.id}">${L('Share / copy', '共有・コピー')}</button><button class="btn danger" data-act="delNote" data-id="${n.id}">${L('Delete', '削除')}</button></div></div>
      <section class="card note-edit">
        <input class="title-input" value="${esc(n.title)}" placeholder="${L('Title', 'タイトル')}" data-on="noteField" data-field="title" data-id="${n.id}" data-fk="note-title">
        <textarea rows="3" placeholder="${L('Write anything…', '自由にメモ…')}" data-on="noteField" data-field="body" data-id="${n.id}" data-fk="note-body">${esc(n.body)}</textarea>
        ${linked.length ? `<p class="small">${L('Linked to:', 'リンク先：')} ${linked.map((s) => `<button class="chip note" data-act="openStep" data-id="${s.id}">${esc(s.title)}</button>`).join(' ')}</p>` : `<p class="small muted">${L('Not linked to a step yet. Open a step and choose this note to link it.', 'まだステップにリンクされていません。ステップを開いてこのメモを選ぶとリンクできます。')}</p>`}
        <div class="items">
          ${grouped.map(([tag, rows]) => `${tag ? `<h3>${esc(tag)} <span class="muted small">${rows.filter((i) => i.done).length}/${rows.length}</span></h3>` : ''}${rows.map(row).join('')}`).join('')}
        </div>
        <datalist id="taglist">${tags.filter(Boolean).map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
        <div class="row gap"><button class="btn" data-act="addItem" data-id="${n.id}">${L('+ Add item', '＋ 項目を追加')}</button>${it.some((i) => i.done) ? `<button class="btn ghost small" data-act="clearDone" data-id="${n.id}">${L('Remove checked', 'チェック済みを削除')}</button>` : ''}</div>
        ${total ? `<p class="totals">${L('Planned', '予定')} ${yen(total)} · ${L('Checked', 'チェック済み')} ${yen(bought)}</p>` : ''}
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
      <div class="page-head"><div><h1>${L('Budget', '予算')}</h1><p class="muted">${L('Track estimates against actual spending, and who paid for what.', '見積もりと実際の支出、誰が何を払ったかを記録します。')}</p></div><button class="btn primary" data-act="addExpense">${L('+ Add cost', '＋ 費用を追加')}</button></div>
      <section class="keydates">
        <div class="card kd"><span class="muted small">${L('Estimated total', '見積もり合計')}</span><strong>${yen(est)}</strong><span class="muted small">${L('includes shopping lists', '買い物リストを含む')}</span></div>
        <div class="card kd"><span class="muted small">${L('Spent so far', 'これまでの支出')}</span><strong>${yen(actual)}</strong></div>
        <div class="card kd"><span class="muted small">${L('Shopping lists', '買い物リスト')}</span><strong>${yen(shopBought)}</strong><span class="muted small">${L(`bought of ${yen(shopPlanned)}`, `購入済み（予定 ${yen(shopPlanned)}）`)}</span></div>
        <div class="card kd accent"><span class="muted small">${L('Settle up (shared costs, 50/50)', '精算（共通費用を折半）')}</span><strong>${Math.abs(owe) < 1 ? L('All even', '精算なし') : L(`${esc(owe > 0 ? names()[1] : names()[0])} owes ${yen(Math.abs(owe))}`, `${esc(owe > 0 ? names()[1] : names()[0])}が ${yen(Math.abs(owe))} 払う`)}</strong><span class="muted small">${L(`${esc(names()[0])} paid ${yen(paid.a)} · ${esc(names()[1])} paid ${yen(paid.b)}`, `${esc(names()[0])} ${yen(paid.a)} 支払い · ${esc(names()[1])} ${yen(paid.b)} 支払い`)}</span></div>
      </section>
      <section class="card">
        <div class="table-wrap"><table class="exp">
          <thead><tr><th>${L('Item', '項目')}</th><th>${L('Category', 'カテゴリ')}</th><th class="num">${L('Estimate', '見積もり')}</th><th class="num">${L('Actual', '実費')}</th><th>${L('Paid by', '支払った人')}</th><th>${L('Shared', '折半')}</th><th></th></tr></thead>
          <tbody>${ex.map((e) => `<tr>
            <td><input value="${esc(tr(e.label))}" data-on="exp" data-field="label" data-id="${e.id}" data-fk="ex-${e.id}-label" placeholder="${L('What', '内容')}"></td>
            <td><select data-on="exp" data-field="cat" data-id="${e.id}">${catNames.map((c) => `<option value="${c}" ${e.cat === c ? 'selected' : ''}>${catLabel(c)}</option>`).join('')}</select></td>
            <td class="num"><input type="number" inputmode="numeric" value="${esc(e.est)}" data-on="exp" data-field="est" data-id="${e.id}" data-fk="ex-${e.id}-est" placeholder="¥"></td>
            <td class="num"><input type="number" inputmode="numeric" value="${esc(e.actual)}" data-on="exp" data-field="actual" data-id="${e.id}" data-fk="ex-${e.id}-actual" placeholder="¥"></td>
            <td><select data-on="exp" data-field="paidBy" data-id="${e.id}"><option value="a" ${e.paidBy === 'a' ? 'selected' : ''}>${esc(names()[0])}</option><option value="b" ${e.paidBy === 'b' ? 'selected' : ''}>${esc(names()[1])}</option></select></td>
            <td><input type="checkbox" data-act="expShared" data-id="${e.id}" ${e.shared ? 'checked' : ''} aria-label="${L('Shared 50/50', '折半')}"></td>
            <td><button class="icon-btn" data-act="delExpense" data-id="${e.id}" aria-label="${L('Delete', '削除')}">×</button></td>
          </tr>`).join('')}</tbody>
        </table></div>
        <p class="small muted">${L('By category:', 'カテゴリ別：')} ${Object.entries(cats).map(([c, v]) => `${esc(catLabel(c))} ${yen(v)}`).join(' · ')}</p>
      </section>`;
  }

  // ----- Contacts / info -----
  function vContacts() {
    const a = S.settings.addresses || {};
    const cs = live(S.contacts);
    const f = (c, k, ph, type = 'text') => `<input type="${type}" value="${esc(k === 'role' || k === 'name' ? tr(c[k]) : c[k])}" placeholder="${ph}" data-on="contact" data-field="${k}" data-id="${c.id}" data-fk="c-${c.id}-${k}">`;
    return `
      <div class="page-head"><div><h1>${L('Info &amp; contacts', '情報・連絡先')}</h1><p class="muted">${L('Addresses, phone numbers and confirmation numbers in one place. Handy when filling in forms or calling.', '住所・電話番号・予約番号をまとめて管理。書類の記入や電話のときに便利です。')}</p></div><button class="btn primary" data-act="addContact">${L('+ Add contact', '＋ 連絡先を追加')}</button></div>
      <section class="card">
        <h2>${L('Our addresses', '住所')}</h2>
        <div class="addr">
          ${[['old', L('Old home (Minato-ku)', '旧居（港区）')], ['new', L('New home (Shibuya-ku)', '新居（渋谷区）')]].map(([k, l]) => `<label><span class="small muted">${l}</span><textarea rows="2" placeholder="${L('〒… 東京都…区… / building / room', '〒… 東京都…区… 建物名・部屋番号')}" data-on="addr" data-field="${k}" data-fk="addr-${k}">${esc(a[k])}</textarea><button class="btn small" data-act="copy" data-text="${esc(a[k])}">${L('Copy', 'コピー')}</button></label>`).join('')}
        </div>
      </section>
      <div class="contact-grid">
        ${cs.map((c) => `<section class="card contact">
          <div class="row between">${f(c, 'role', L('Role (e.g. Moving company)', '種類（例：引越し業者）'))}<button class="icon-btn" data-act="delContact" data-id="${c.id}" aria-label="${L('Delete', '削除')}">×</button></div>
          ${f(c, 'name', L('Name / company', '名前・会社名'))}
          <div class="row gap">${f(c, 'phone', L('Phone', '電話番号'), 'tel')}${c.phone ? `<a class="btn small" href="tel:${esc(c.phone)}">${L('Call', '電話')}</a>` : ''}</div>
          ${f(c, 'ref', L('Confirmation / contract no.', '予約番号・契約番号'))}
          <div class="row gap">${f(c, 'url', L('Website', 'Webサイト'), 'url')}${c.url ? `<a class="btn small" href="${esc(c.url)}" target="_blank" rel="noopener">${L('Open', '開く')}</a>` : ''}</div>
          <textarea rows="2" placeholder="${L('Notes (appointment time, who to ask for…)', 'メモ（予約時間、担当者など）')}" data-on="contact" data-field="notes" data-id="${c.id}" data-fk="c-${c.id}-notes">${esc(c.notes)}</textarea>
        </section>`).join('')}
      </div>`;
  }

  // ----- Settings -----
  function vSettings() {
    const st = S.settings;
    const dateField = (k, l) => `<label><span>${l}</span><input type="date" value="${st.dates[k]}" data-on="date" data-field="${k}"></label>`;
    return `
      <div class="page-head"><div><h1>${L('Settings', '設定')}</h1></div></div>
      <section class="card form">
        <h2>${L('Language', '言語')}</h2>
        <div class="seg"><button class="${lang === 'ja' ? 'on' : ''}" data-act="lang" data-id="ja">日本語</button><button class="${lang === 'en' ? 'on' : ''}" data-act="lang" data-id="en">English</button></div>
        <p class="small muted">${L('Saved on this device only.', 'この端末だけに保存されます。')}</p>
      </section>
      <section class="card form">
        <h2>${L('The two of you', '2人について')}</h2>
        <label><span>${L('Name 1', '名前1')}</span><input value="${esc(st.names[0])}" data-on="name" data-field="0" data-fk="name0"></label>
        <label><span>${L('Name 2', '名前2')}</span><input value="${esc(st.names[1])}" data-on="name" data-field="1" data-fk="name1"></label>
        <p class="small muted">${L('“I am” (top right) is saved on this device only. It filters “my” steps.', '右上の「自分」はこの端末だけに保存され、自分のステップの絞り込みに使われます。')}</p>
      </section>
      <section class="card form">
        <h2>${L('Key dates', '大事な日付')}</h2>
        ${dateField('keys', L('New lease starts / keys', '新居の契約開始・鍵'))}${dateField('move', L('Moving day', '引越し日'))}${dateField('oldEnd', L('Old lease ends', '旧居の契約終了'))}${dateField('start', L('Plan start (for “book now” steps)', 'プラン開始日（「今すぐ予約」系の基準）'))}
        <p class="small muted">${L('Step dates follow these. Dates you set by hand on a step stay as they are.', 'ステップの日付はこれに連動します。手動で設定した日付はそのままです。')}</p>
      </section>
      <section class="card form">
        <h2>${L('Tailor the plan', 'プランを調整')}</h2>
        ${profileForm()}
      </section>
      <section class="card form">
        <h2>${L('Live sync', 'リアルタイム同期')}</h2>
        ${syncCard()}
      </section>
      <section class="card form">
        <h2>${L('Backup', 'バックアップ')}</h2>
        <p class="small">${L('Save a copy of everything as a file, or merge in a file from the other phone. For each item, the most recent change wins.', 'すべてのデータをファイルに保存したり、もう1台のファイルを取り込んだりできます。項目ごとに新しい変更が優先されます。')}</p>
        <div class="row gap wrap">
          <button class="btn primary" data-act="export">${L('Export / share backup', 'バックアップを書き出す')}</button>
          <label class="btn">${L('Import &amp; merge', '取り込んで統合')}<input type="file" accept="application/json,.json" data-on="import" hidden></label>
          <label class="btn ghost">${L('Replace with file', 'ファイルで置き換え')}<input type="file" accept="application/json,.json" data-on="importReplace" hidden></label>
        </div>
        ${ui.flash ? `<p class="small ok-text">${esc(ui.flash)}</p>` : ''}
      </section>
      <section class="card form">
        <h2>${L('Reset', 'リセット')}</h2>
        <button class="btn danger" data-act="reset">${L('Erase everything on this device', 'この端末のデータをすべて消去')}</button>
      </section>
      <p class="small muted center">${L('Need a change?', '変更したいことがあれば')} <a href="${SESSION_URL}" target="_blank" rel="noopener">${L('Request changes', '変更をリクエスト')}</a></p>`;
  }
  function profileForm() {
    return D.PROFILE.map((p) => `<label class="switch line"><input type="checkbox" data-act="profile" data-id="${p.key}" ${S.settings.profile[p.key] ? 'checked' : ''}> ${esc(p.q)}</label>`).join('') +
      `<p class="small muted">${L('Answers switch related steps on or off. You can still include or skip any step by hand.', '回答に合わせて関連するステップが自動でオン・オフされます。各ステップは手動でも戻す・スキップできます。')}</p>`;
  }

  // ----- Modals -----
  function renderModal() {
    const m = ui.modal;
    if (!m) return '';
    let body = '';
    if (m.type === 'step') body = modalStep(m.id);
    if (m.type === 'profile') body = `<h2>${L('Tailor your plan', 'プランを調整')}</h2>${profileForm()}<div class="row end"><button class="btn primary" data-act="close">${L('Done', '完了')}</button></div>`;
    if (m.type === 'onboard') body = modalOnboard();
    return `<div class="backdrop" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true">${body}</div>`;
  }

  function modalStep(id) {
    const s = stepById(id);
    if (!s) return `<p>${L('Step not found.', 'ステップが見つかりません。')}</p>`;
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
        <button class="icon-btn" data-act="close" aria-label="${L('Close', '閉じる')}">×</button>
      </header>
      <div class="sheet-controls">
        <label class="switch"><input type="checkbox" data-act="toggleDone" data-id="${s.id}" ${s.done ? 'checked' : ''} ${s.enabled ? '' : 'disabled'}> ${L('Done', '完了')}</label>
        <label><span class="small muted">${L('Due', '期日')}</span><input type="date" value="${s.due || ''}" data-on="stepDue" data-id="${s.id}">${!s.custom && st.due ? `<button class="link small" data-act="resetDue" data-id="${s.id}">${L(`reset to ${fmt(s.suggested)}`, `${fmt(s.suggested)} に戻す`)}</button>` : ''}</label>
        <label><span class="small muted">${L('Who', '担当')}</span><select data-on="stepAssign" data-id="${s.id}">${['both', 'a', 'b', ''].map((k) => `<option value="${k}" ${s.assign === k ? 'selected' : ''}>${esc(nameOf(k))}</option>`).join('')}</select></label>
        <button class="btn small ${s.enabled ? 'ghost' : 'primary'}" data-act="${s.enabled ? 'skip' : 'include'}" data-id="${s.id}">${s.enabled ? L('Skip this step', 'このステップをスキップ') : L('Include this step', 'このステップを戻す')}</button>
      </div>
      ${s.deadline || s.winFrom || s.hardDate ? `<p class="callout">${s.winFrom ? L(`Can be done from <strong>${fmt(s.winFrom)}</strong>. `, `<strong>${fmt(s.winFrom)}</strong>から手続きできます。`) : ''}${s.hardDate ? L(`Legal deadline: <strong>${fmt(s.hardDate)}</strong>. `, `法定期限：<strong>${fmt(s.hardDate)}</strong>。`) : ''}${esc(s.deadline || '')}</p>` : ''}
      ${s.why ? `<h3>${L('Why', 'なぜ必要？')}</h3><p>${esc(s.why)}</p>` : ''}
      ${s.how && s.how.length ? `<h3>${L('How', 'やり方')}</h3>${list(s.how)}` : ''}
      ${s.custom ? `<textarea rows="3" placeholder="${L('Details (one per line)', '詳細（1行に1つ）')}" data-on="customField" data-field="details" data-id="${s.id}" data-fk="cs-details">${esc(s.details || '')}</textarea>` : ''}
      ${s.where ? `<h3>${L('Where', '場所')}</h3><p>${esc(s.where)}</p>` : ''}
      ${s.bring ? `<h3>${L('What to bring', '持ち物')}</h3>${list(s.bring)}` : ''}
      ${s.cost ? `<h3>${L('Typical cost', '費用の目安')}</h3><p>${esc(s.cost)}</p>` : ''}
      ${s.tip ? `<p class="tipline"><strong>${L('Tip:', 'ポイント：')}</strong> ${esc(s.tip)}</p>` : ''}
      ${s.links ? `<h3>${L('Links', 'リンク')}</h3><p class="links">${s.links.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('')}</p>` : ''}
      <h3>${L('Linked notes', 'リンクしたメモ')}</h3>
      ${notes.map((n) => { const it = noteItems(n); return `<div class="row between linked"><a href="#note/${n.id}" data-act="close">${esc(n.title)}${it.length ? ` <span class="muted small">${it.filter((i) => i.done).length}/${it.length}</span>` : ''}</a><button class="link small" data-act="unlink" data-id="${s.id}" data-note="${n.id}">${L('unlink', 'リンク解除')}</button></div>`; }).join('')}
      <div class="row gap wrap">
        ${tpl ? `<button class="btn primary small" data-act="createNote" data-id="${s.id}" data-tpl="${tpl}">${L(`Create “${esc(D.NOTE_TEMPLATES[tpl].title)}”`, `「${esc(D.NOTE_TEMPLATES[tpl].title)}」を作成`)}</button>` : ''}
        <button class="btn small" data-act="createNote" data-id="${s.id}">${L('+ Create linked note', '＋ リンクしたメモを作成')}</button>
        ${others.length ? `<select data-on="linkExisting" data-id="${s.id}"><option value="">${L('Link existing note…', '既存のメモをリンク…')}</option>${others.map((n) => `<option value="${n.id}">${esc(n.title)}</option>`).join('')}</select>` : ''}
      </div>
      <h3>${L('Our memo', 'メモ')}</h3>
      <textarea rows="3" placeholder="${L('Quick notes: reservation number, time, who said what…', 'ひとことメモ：予約番号、時間、言われたことなど…')}" data-on="stepMemo" data-id="${s.id}" data-fk="memo-${s.id}">${esc(s.memo || '')}</textarea>
      ${s.custom ? `<div class="row end"><button class="btn danger small" data-act="delCustom" data-id="${s.id}">${L('Delete step', 'ステップを削除')}</button></div>` : ''}`;
  }

  function modalOnboard() {
    const st = S.settings;
    return `<div class="row between"><h2>${L('Welcome to your moving planner', '引越しプランナーへようこそ')}</h2><button class="btn small" data-act="lang" data-id="${lang === 'ja' ? 'en' : 'ja'}">${L('日本語', 'English')}</button></div>
      <p>${L('This plan covers every step of a move in Japan, from Minato-ku to Shibuya-ku: paperwork, utilities, customs and setting up the new home. A few questions tailor it to you.', '港区から渋谷区への引越しに必要なステップ（役所の手続き、電気・ガス・水道、日本の習慣、新居の準備）をすべてまとめています。いくつかの質問に答えると、2人に合わせたプランになります。')}</p>
      <div class="form">
        <label><span>${L('Your name', 'あなたの名前')}</span><input value="${esc(st.names[0])}" data-on="name" data-field="0" data-fk="on-name0"></label>
        <label><span>${L('Partner’s name', 'パートナーの名前')}</span><input value="${esc(st.names[1])}" data-on="name" data-field="1" data-fk="on-name1"></label>
        <label><span>${L('New lease starts', '新居の契約開始')}</span><input type="date" value="${st.dates.keys}" data-on="date" data-field="keys"></label>
        <label><span>${L('Moving day (you can change it later)', '引越し日（後で変更できます）')}</span><input type="date" value="${st.dates.move}" data-on="date" data-field="move"></label>
        <label><span>${L('Old lease ends', '旧居の契約終了')}</span><input type="date" value="${st.dates.oldEnd}" data-on="date" data-field="oldEnd"></label>
      </div>
      <h3>${L('About you', 'あなたについて')}</h3>
      ${profileForm()}
      <div class="row end"><button class="btn primary" data-act="finishOnboard">${L('Start planning', 'はじめる')}</button></div>`;
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
      navigator.share({ files: [file], title: L('Move planner backup', '引越しプランナーのバックアップ') }).catch(() => {});
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
    try { await navigator.clipboard.writeText(t); toast(L('Copied', 'コピーしました')); } catch (e) { prompt(L('Copy this:', 'これをコピー：'), t); }
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
    r.onload = () => { try { cb(JSON.parse(r.result)); } catch (e) { alert(L('That file could not be read as a planner backup.', 'このファイルはバックアップとして読み込めませんでした。')); } input.value = ''; };
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
    delCustom: (el) => { if (!confirm(L('Delete this step?', 'このステップを削除しますか？'))) return; setStepField(el.dataset.id, 'deleted', true); ui.modal = null; },
    resetDue: (el) => setStepField(el.dataset.id, 'due', ''),
    createNote: (el) => { const s = stepById(el.dataset.id); const n = newNote(el.dataset.tpl); if (!el.dataset.tpl) { n.title = s.title; n.body = ''; } linkNote(s, n.id); ui.modal = null; location.hash = '#note/' + n.id; },
    unlink: (el) => { const s = stepById(el.dataset.id); const st = stepState(s); st.noteIds = (st.noteIds || []).filter((x) => x !== el.dataset.note); touch(st); },
    newNote: () => { const n = newNote(); location.hash = '#note/' + n.id; },
    delNote: (el) => { if (!confirm(L('Delete this note?', 'このメモを削除しますか？'))) return; touch(noteById(el.dataset.id)).deleted = true; location.hash = '#notes'; },
    addItem: (el) => { const n = noteById(el.dataset.id); const last = noteItems(n).slice(-1)[0]; const i = touch({ id: uid(), text: '', tag: last ? last.tag : '', done: false, qty: '', price: '' }); n.items.push(i); touch(n); setTimeout(() => document.querySelector(`[data-fk="it-${i.id}-text"]`)?.focus(), 0); },
    itemDone: (el) => { const n = noteById(el.dataset.id); touch(n.items.find((i) => i.id === el.dataset.item)).done = el.checked; touch(n); },
    delItem: (el) => { const n = noteById(el.dataset.id); touch(n.items.find((i) => i.id === el.dataset.item)).deleted = true; touch(n); },
    clearDone: (el) => { const n = noteById(el.dataset.id); noteItems(n).filter((i) => i.done).forEach((i) => (touch(i).deleted = true)); touch(n); },
    shareNote: (el) => { const t = noteAsText(noteById(el.dataset.id)); if (navigator.share) navigator.share({ text: t }).catch(() => {}); else copyText(t); },
    addExpense: () => { S.expenses.push(touch({ id: uid(), label: '', cat: 'Other', est: '', actual: '', paidBy: me, shared: true })); },
    expShared: (el) => { touch(S.expenses.find((x) => x.id === el.dataset.id)).shared = el.checked; },
    delExpense: (el) => { touch(S.expenses.find((x) => x.id === el.dataset.id)).deleted = true; },
    addContact: () => { S.contacts.push(touch({ id: uid(), role: '', name: '', phone: '', url: '', ref: '', notes: '' })); },
    delContact: (el) => { if (!confirm(L('Delete this contact?', 'この連絡先を削除しますか？'))) return; touch(S.contacts.find((x) => x.id === el.dataset.id)).deleted = true; },
    copy: (el) => { copyText(el.dataset.text || ''); return 'norender'; },
    export: () => { download(`move-planner-${todayISO()}.json`, JSON.stringify(S, null, 1)); return 'norender'; },
    syncIn: () => { window.SYNC?.signIn(); return 'norender'; },
    syncOut: () => { if ((window.SYNC_STATUS || {}).loaded && !confirm(L('Sign out on this device? Your plan stays saved in your account.', 'この端末でログアウトしますか？プランはアカウントに保存されたままです。'))) return 'norender'; window.SYNC?.signOut(); return 'norender'; },
    reload: () => { location.reload(); return 'norender'; },
    lang: (el) => { setLang(el.dataset.id || (lang === 'ja' ? 'en' : 'ja')); },
    reset: () => { if (!confirm(L('Erase all planner data on this device? Export a backup first if unsure.', 'この端末のデータをすべて消去しますか？不安ならバックアップを書き出してから行いましょう。'))) return; S = defaultState(); },
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
    import: (el) => { readFile(el, (data) => { S = mergeState(S, data); save(); ui.flash = L('Merged your partner’s changes.', 'パートナーの変更を統合しました。'); render(); }); return false; },
    importReplace: (el) => { readFile(el, (data) => { if (!confirm(L('Replace everything on this device with the file?', 'この端末のデータをファイルの内容で置き換えますか？'))) return; S = Object.assign(defaultState(), data); save(); ui.flash = L('Replaced with the backup.', 'バックアップで置き換えました。'); render(); }); return false; },
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
    L: (en, ja) => L(en, ja),
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
