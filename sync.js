// Live sync between devices via Firebase (Google sign-in + one Firestore document).
const cfg = window.FIREBASE_CONFIG;
const P = window.__planner;
const Z = (window.SYNC_STATUS = { configured: !!(cfg && cfg.apiKey), user: null, state: 'off', last: 0, error: '' });
const V = '10.14.1';
const DOC = ['plans', 'shared'];

function refresh() { P.render(); }

if (Z.configured) start().catch(() => { Z.state = 'error'; Z.error = P.L('Could not connect. Check your internet connection.', '接続できませんでした。インターネット接続を確認してください。'); refresh(); });
refresh();

async function start() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  const app = initializeApp(cfg);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const ref = F.doc(db, ...DOC);
  let unsub = null, timer = null, busy = false, again = false;

  const friendly = (e) => (e && e.code === 'permission-denied'
    ? P.L('This Google account is not allowed to open the plan. Sign in with one of your two accounts.', 'このGoogleアカウントではプランを開けません。2人のどちらかのアカウントでログインしてください。')
    : (e && e.message) || String(e));

  async function pushNow() {
    if (!auth.currentUser) return;
    if (busy) { again = true; return; }
    busy = true; Z.state = 'saving'; refresh();
    try {
      await F.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const remote = snap.exists() ? JSON.parse(snap.data().json) : null;
        if (remote) P.applyRemote(remote);
        const local = P.state;
        if (remote && P.sameState(local, remote)) return;
        tx.set(ref, { json: JSON.stringify(local), by: auth.currentUser.email, at: F.serverTimestamp() });
      });
      Z.state = 'live'; Z.last = Date.now(); Z.error = '';
    } catch (e) {
      Z.state = navigator.onLine ? 'error' : 'offline';
      Z.error = navigator.onLine ? friendly(e) : '';
      clearTimeout(timer); timer = setTimeout(pushNow, 8000);
    } finally {
      busy = false; refresh();
      if (again) { again = false; pushNow(); }
    }
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(pushNow, 800); };

  window.SYNC = {
    push() { if (auth.currentUser) { Z.state = 'saving'; schedule(); } },
    async signIn() {
      Z.error = '';
      try { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); }
      catch (e) { if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') { Z.error = friendly(e); refresh(); } }
    },
    async signOut() { await A.signOut(auth); P.clearLocal(); refresh(); },
  };

  A.onAuthStateChanged(auth, (u) => {
    if (unsub) { unsub(); unsub = null; }
    Z.ready = true; Z.error = '';
    Z.user = u ? u.email : null;
    Z.state = u ? 'connecting' : 'off';
    Z.loaded = false; Z.denied = false;
    refresh();
    if (!u) return;
    // Don't keep the user waiting forever if the first load is slow (e.g. offline).
    setTimeout(() => { if (Z.user === u.email && !Z.loaded && !Z.denied) { Z.loaded = true; refresh(); } }, 8000);
    unsub = F.onSnapshot(ref, (snap) => {
      Z.error = ''; Z.last = Date.now(); Z.loaded = true;
      if (!snap.exists()) { pushNow(); return; }
      const localNewer = P.applyRemote(JSON.parse(snap.data().json));
      if (localNewer) schedule(); else if (!busy) Z.state = 'live';
      refresh();
    }, (e) => { Z.state = 'error'; Z.error = friendly(e); if (e.code === 'permission-denied') Z.denied = true; refresh(); });
  });

  window.addEventListener('online', () => { if (auth.currentUser) pushNow(); });
  window.addEventListener('offline', () => { if (auth.currentUser) { Z.state = 'offline'; refresh(); } });
}
