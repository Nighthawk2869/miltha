/* ============================================
   MILTHA — Accounts
   Email sign-up and sign-in through Netlify Identity (/.netlify/identity).
   Adds SIGN IN / ACCOUNT to the menu bar, the sign-in window, and handles the
   links in Netlify's emails (#confirmation_token=…, #recovery_token=…).
   Other scripts use window.MilthaAccount:
     .user()               → {email, name} or null
     .api(path, body?)     → call /api/... as the signed-in member (GET, or POST with body)
     .onChange(fn)         → fn(user) after signing in or out
     .open(mode)           → open the window: 'signin' | 'join' | 'forgot'
   ============================================ */
(function () {
  const ID = '/.netlify/identity';
  const KEY = 'miltha.session';

  // ---------- session ----------
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  let session = read();
  const listeners = [];
  function save(s) {
    session = s;
    try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {}
    changed();
  }
  function changed() { listeners.forEach(f => { try { f(user()); } catch (e) { console.error(e); } }); }
  window.addEventListener('storage', e => { if (e.key === KEY) { session = read(); changed(); } });
  const user = () => session ? session.user : null;

  function friendly(d, status) {
    const m = String(d.error_description || d.msg || d.error || '').toLowerCase();
    // Identity answers 404 "User not found" for a used or replaced email link; a 404 with no message means Identity is off.
    if (status === 404 && (m.includes('not found') || m.includes('user'))) return 'That link has expired or was replaced by a newer email. Please use the most recent email from MILTHA, or sign in.';
    if (status === 404) return 'Accounts are being switched on and will open very soon.';
    if (status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
    if (m.includes('not confirmed')) return 'Please confirm your email first: open the message we sent you and click the link.';
    if (m.includes('invalid') && (m.includes('password') || m.includes('grant') || m.includes('login'))) return 'That email and password do not match.';
    if (m.includes('already') && (m.includes('registered') || m.includes('exists'))) return 'That email already has an account. Please sign in — or, if you were invited, open the invitation email and use its link.';
    if (m.includes('signup') && m.includes('disabled')) return 'New sign-ups are closed at the moment.';
    if (m.includes('expired') || (m.includes('invalid') && m.includes('token'))) return 'That link has expired or was already used. Please request a new one.';
    if (m.includes('password')) return d.error_description || d.msg || 'Please choose a longer password.';
    return d.error_description || d.msg || 'Something went wrong. Please try again.';
  }
  async function id(path, opt) {
    let r;
    try { r = await fetch(ID + path, opt); } catch (e) { throw new Error('Could not connect. Please check that you are online.'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(friendly(d, r.status));
    return d;
  }
  const form = body => ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
  const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  async function start(tok) {
    const u = await id('/user', { headers: { Authorization: 'Bearer ' + tok.access_token } });
    const name = (u.user_metadata && u.user_metadata.full_name) || String(u.email).split('@')[0];
    save({ access_token: tok.access_token, refresh_token: tok.refresh_token,
           expires_at: Date.now() + (tok.expires_in || 3600) * 1000, user: { email: u.email, name } });
    return user();
  }
  let refreshing = null;
  async function token() {
    if (!session) return null;
    if (Date.now() < session.expires_at - 60000) return session.access_token;
    if (!refreshing) refreshing = id('/token', form({ grant_type: 'refresh_token', refresh_token: session.refresh_token }))
      .then(t => { save({ ...session, access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + (t.expires_in || 3600) * 1000 }); return session.access_token; })
      .catch(() => { save(null); return null; })
      .finally(() => { refreshing = null; });
    return refreshing;
  }

  const Account = {
    user,
    onChange(f) { listeners.push(f); },
    signIn: (email, password) => id('/token', form({ grant_type: 'password', username: email, password })).then(start),
    signUp: (name, email, password) => id('/signup', post({ email, password, data: { full_name: name } })),
    recover: email => id('/recover', post({ email })),
    verify: (type, tok) => id('/verify', post({ type, token: tok })).then(start),
    async update(fields) {
      const t = await token(); if (!t) throw new Error('Please sign in again.');
      const u = await id('/user', { method: 'PUT', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      if (session) save({ ...session, user: { email: u.email, name: (u.user_metadata && u.user_metadata.full_name) || session.user.name } });
    },
    signOut() {
      const t = session && session.access_token;
      if (t) fetch(ID + '/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + t } }).catch(() => {});
      save(null);
    },
    async api(path, body) {
      const t = await token();
      const headers = {};
      if (t) headers.Authorization = 'Bearer ' + t;
      if (body) headers['Content-Type'] = 'application/json';
      let r;
      try { r = await fetch(path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined }); }
      catch (e) { throw new Error('Could not connect. Please check that you are online.'); }
      const d = await r.json().catch(() => ({}));
      if (r.status === 401 && t) save(null);
      if (!r.ok) { const e = new Error(d.error || 'Something went wrong. Please try again.'); e.status = r.status; throw e; }
      return d;
    },
    open: (mode, message) => openWindow(mode, message),
  };
  window.MilthaAccount = Account;

  // ---------- styles (self-contained, so every page can use this file) ----------
  const css = `
.ma-overlay{position:fixed;inset:0;z-index:1000;background:rgba(5,5,8,.82);display:none;align-items:center;justify-content:center;padding:16px}
.ma-overlay.open{display:flex}
.ma-box{position:relative;width:100%;max-width:440px;max-height:calc(100vh - 32px);overflow:auto;background:#12110E;border:1px solid #3A3836;border-top:1px solid rgba(201,169,110,.45);padding:30px 28px 26px;color:#F5F0E8;font-family:'Cormorant Garamond',serif}
.ma-close{position:absolute;top:10px;right:12px;background:none;border:none;color:#EDE4D0;font-size:26px;cursor:pointer;opacity:.7;line-height:1}
.ma-close:hover{opacity:1;color:#C9A96E}
.ma-title{font-family:'Cinzel',serif;font-size:20px;letter-spacing:.18em;color:#FFFFFF;margin-bottom:6px}
.ma-sub{font-size:18px;font-style:italic;color:#EDE4D0;opacity:.8;margin-bottom:18px;line-height:1.5}
.ma-box label{display:block;font-family:'Cinzel',serif;font-size:12px;letter-spacing:.2em;color:#C9A96E;margin:12px 0 5px}
.ma-box input{width:100%;box-sizing:border-box;background:#1E1C1A;border:1px solid #2E2C2A;padding:11px 12px;font-family:'Cormorant Garamond',serif;font-size:19px;color:#F5F0E8;outline:none}
.ma-box input:focus{border-color:#C9A96E}
.ma-go{width:100%;margin-top:20px;font-family:'Cinzel',serif;font-size:14px;letter-spacing:.22em;padding:13px;background:#C9A96E;border:1px solid #C9A96E;color:#0A0A0F;font-weight:600;cursor:pointer}
.ma-go:hover{background:#FFFFFF;border-color:#FFFFFF}
.ma-go:disabled{opacity:.6;cursor:wait}
.ma-msg{min-height:0;margin-top:14px;font-size:18px;line-height:1.5;color:#EDE4D0}
.ma-msg.err{color:#E8813A}
.ma-msg.ok{color:#C9A96E}
.ma-links{margin-top:16px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.ma-link{background:none;border:none;padding:0;font-family:'Cinzel',serif;font-size:12px;letter-spacing:.14em;color:#C9A96E;cursor:pointer;opacity:.85;text-decoration:none}
.ma-link:hover{opacity:1;text-decoration:underline}
.ma-small{margin-top:16px;font-size:15px;color:#EDE4D0;opacity:.65;line-height:1.5}
.ma-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(140px);z-index:1100;background:#12110E;border:1px solid #C9A96E;padding:12px 20px;font-family:'Cinzel',serif;font-size:13px;letter-spacing:.14em;color:#C9A96E;transition:transform .3s ease;max-width:calc(100vw - 32px);text-align:center}
.ma-toast.show{transform:translateX(-50%) translateY(0)}
.nav-account{white-space:nowrap}
.vt-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.vt-save,.vt-keep{font-family:'Cinzel',serif;font-size:14px;letter-spacing:.16em;padding:9px 16px;background:none;border:1px solid rgba(201,169,110,.55);color:#C9A96E;cursor:pointer;transition:all .2s}
.vt-save:hover,.vt-keep:hover{background:rgba(201,169,110,.1);border-color:#C9A96E}
.vt-save.on{background:#C9A96E;color:#0A0A0F;border-color:#C9A96E;font-weight:600}
.vt-save:disabled,.vt-keep:disabled{opacity:.6;cursor:wait}
.vt-hint{margin-top:8px;font-size:16px;font-style:italic;color:#EDE4D0;opacity:.7;line-height:1.5}
.vt-link{font-family:'Cinzel',serif;font-size:12px;letter-spacing:.14em;color:#C9A96E;text-decoration:none;opacity:.85}
.vt-link:hover{opacity:1;text-decoration:underline}
.vt-label{display:block;margin:14px 0 6px;font-family:'Cinzel',serif;font-size:12px;letter-spacing:.2em;color:#C9A96E;opacity:.85}
.vt-note{width:100%;box-sizing:border-box;min-height:96px;resize:vertical;background:#1E1C1A;border:1px solid #2E2C2A;padding:10px 12px;font-family:'Cormorant Garamond',serif;font-size:18px;line-height:1.55;color:#F5F0E8;outline:none;margin-bottom:8px}
.vt-note:focus{border-color:#C9A96E}
.vt-status{font-family:'Cinzel',serif;font-size:12px;letter-spacing:.14em;color:#EDE4D0;opacity:.7}
.nav-btn.nav-account{color:#EDE4D0;text-decoration:none;border:1px solid #3A3836}
.nav-btn.nav-account:hover{color:#C9A96E;border-color:#C9A96E}
@media(max-width:480px){.nav-right .nav-contribute,.nav-right .nav-enter:not(.nav-account){display:none}}`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function toast(msg) {
    let t = document.getElementById('ma-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ma-toast'; t.className = 'ma-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 4500);
  }
  Account.toast = toast;

  // ---------- the sign-in window ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const VIEWS = {
    signin: { title: 'SIGN IN', sub: 'Welcome back.', fields: [['email', 'EMAIL', 'email', 'email'], ['password', 'PASSWORD', 'password', 'current-password']], go: 'SIGN IN',
              links: [['join', 'NEW HERE? JOIN FREE'], ['forgot', 'FORGOT PASSWORD?']] },
    join: { title: 'JOIN MILTHA', sub: 'Free. Save verses and notes, keep your Daily Word reading, and share reflections with the community.',
            fields: [['name', 'YOUR NAME (SHOWN ON YOUR POSTS)', 'text', 'name'], ['email', 'EMAIL', 'email', 'email'], ['password', 'PASSWORD (AT LEAST 8 CHARACTERS)', 'password', 'new-password']],
            go: 'JOIN FREE', links: [['signin', 'ALREADY A MEMBER? SIGN IN']],
            small: 'We will email you a link to confirm your address. Your email is never shown to others; your notes are private to you.', privacy: true },
    forgot: { title: 'RESET PASSWORD', sub: 'Enter your email and we will send you a link to choose a new password.', fields: [['email', 'EMAIL', 'email', 'email']],
              go: 'SEND LINK', links: [['signin', 'BACK TO SIGN IN']] },
    invite: { title: 'ACCEPT YOUR INVITATION', sub: 'Welcome to MILTHA. Choose your name and a password to finish setting up your account.',
              fields: [['name', 'YOUR NAME (SHOWN ON YOUR POSTS)', 'text', 'name'], ['password', 'PASSWORD (AT LEAST 8 CHARACTERS)', 'password', 'new-password']],
              go: 'CREATE MY ACCOUNT', links: [] },
    newpw: { title: 'NEW PASSWORD', sub: 'Choose a new password for your account.', fields: [['password', 'NEW PASSWORD (AT LEAST 8 CHARACTERS)', 'password', 'new-password']],
             go: 'SAVE PASSWORD', links: [] },
  };
  let overlay, lastFocus, inviteToken = null;
  function openWindow(mode, message, kind) {
    const v = VIEWS[mode] || VIEWS.signin;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ma-overlay';
      overlay.addEventListener('click', e => { if (e.target === overlay) closeWindow(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeWindow(); });
      document.body.appendChild(overlay);
    }
    if (!overlay.classList.contains('open')) lastFocus = document.activeElement;
    overlay.innerHTML = `<form class="ma-box" role="dialog" aria-modal="true" aria-labelledby="ma-title" novalidate>
      <button type="button" class="ma-close" aria-label="Close">×</button>
      <div class="ma-title" id="ma-title">${v.title}</div><div class="ma-sub">${esc(v.sub)}</div>
      ${v.fields.map(([n, l, t, ac]) => `<label for="ma-${n}">${l}</label><input id="ma-${n}" name="${n}" type="${t}" autocomplete="${ac}" required ${n === 'password' ? 'minlength="8"' : ''} ${n === 'name' ? 'maxlength="40"' : ''}>`).join('')}
      <button type="submit" class="ma-go">${v.go}</button>
      <div class="ma-msg ${kind || ''}" role="alert">${message ? esc(message) : ''}</div>
      <div class="ma-links">${v.links.map(([m, l]) => `<button type="button" class="ma-link" data-mode="${m}">${l}</button>`).join('')}</div>
      ${v.small ? `<div class="ma-small">${esc(v.small)}${v.privacy ? ' <a href="privacy.html" style="color:#C9A96E">Privacy</a>' : ''}</div>` : ''}
    </form>`;
    overlay.classList.add('open');
    const f = overlay.querySelector('form');
    f.querySelector('.ma-close').onclick = closeWindow;
    f.querySelectorAll('.ma-link').forEach(b => b.onclick = () => openWindow(b.dataset.mode));
    f.onsubmit = e => { e.preventDefault(); submit(mode, f); };
    const first = f.querySelector('input'); if (first) setTimeout(() => first.focus(), 30);
  }
  function closeWindow() { if (!overlay) return; overlay.classList.remove('open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  async function submit(mode, f) {
    const val = n => (f.elements[n] ? f.elements[n].value.trim() : '');
    const msg = f.querySelector('.ma-msg'), go = f.querySelector('.ma-go');
    const say = (t, k) => { msg.textContent = t; msg.className = 'ma-msg ' + (k || ''); };
    const email = val('email'), password = f.elements.password ? f.elements.password.value : '';
    if (f.elements.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say('Please enter your email address.', 'err');
    if (f.elements.password && password.length < 8) return say('Please use a password of at least 8 characters.', 'err');
    if ((mode === 'join' || mode === 'invite') && !val('name')) return say('Please enter your name.', 'err');
    go.disabled = true; say('');
    try {
      if (mode === 'signin') { const u = await Account.signIn(email, password); closeWindow(); toast('WELCOME BACK, ' + u.name.toUpperCase()); }
      else if (mode === 'join') { await Account.signUp(val('name'), email, password); f.querySelectorAll('input').forEach(i => i.disabled = true); go.style.display = 'none';
        say('Thank you! We have sent a confirmation link to ' + email + '. Open it to finish joining (check your spam folder if it does not arrive in a few minutes).', 'ok'); return; }
      else if (mode === 'forgot') { await Account.recover(email); say('If that email has an account, a link to choose a new password is on its way.', 'ok'); go.style.display = 'none'; return; }
      else if (mode === 'newpw') { await Account.update({ password }); closeWindow(); toast('YOUR NEW PASSWORD IS SAVED'); }
      else if (mode === 'invite') {
        // Netlify Identity accepts an invitation by verifying its token together with the new password.
        await id('/verify', post({ type: 'signup', token: inviteToken, password })).then(start);
        await Account.update({ data: { full_name: val('name').slice(0, 40) } });
        inviteToken = null; closeWindow(); toast('WELCOME TO MILTHA, ' + user().name.toUpperCase());
      }
    } catch (e) { say(e.message, 'err'); }
    go.disabled = false;
  }

  // ---------- links from Netlify's emails ----------
  async function handleEmailLink() {
    const h = location.hash.slice(1);
    if (!/(^|&)(confirmation_token|recovery_token|invite_token|email_change_token|error)=/.test(h)) return;
    const p = new URLSearchParams(h);
    history.replaceState(null, '', location.pathname + location.search);
    try {
      if (p.get('confirmation_token')) { const u = await Account.verify('signup', p.get('confirmation_token')); toast('WELCOME TO MILTHA, ' + u.name.toUpperCase()); }
      else if (p.get('invite_token')) { inviteToken = p.get('invite_token'); openWindow('invite'); }
      else if (p.get('recovery_token')) { await Account.verify('recovery', p.get('recovery_token')); openWindow('newpw'); }
      else if (p.get('email_change_token')) { await Account.update({ email_change_token: p.get('email_change_token') }); toast('YOUR EMAIL ADDRESS IS UPDATED'); }
      else if (p.get('error')) openWindow('signin', friendly({ error_description: p.get('error_description') || p.get('error') }, 400), 'err');
    } catch (e) { openWindow(p.get('recovery_token') ? 'forgot' : 'signin', e.message, 'err'); }
  }

  // ---------- SIGN IN / ACCOUNT in the menu bar ----------
  function navButton() {
    const right = document.querySelector('.nav-right');
    if (!right) return;
    let b = right.querySelector('.nav-account');
    if (!b) {
      const sib = right.querySelector('a[href="contribute.html"]');
      b = document.createElement('a');
      b.className = (sib ? sib.className.replace('nav-contribute', '') : 'nav-btn') + ' nav-account';
      right.insertBefore(b, sib || right.firstChild);
    }
    const u = user();
    b.textContent = u ? 'MY ACCOUNT' : 'SIGN IN';
    b.href = u ? 'account.html' : '#sign-in';
    b.onclick = u ? null : e => { e.preventDefault(); openWindow('signin'); };
  }
  Account.onChange(navButton);

  // ---------- members' study data (shared by the reader, Word by Word, Daily Word, My Account) ----------
  let memberPromise = null;
  Account.onChange(() => { memberPromise = null; });
  Account.member = force => {
    if (!user()) return Promise.resolve(null);
    if (force || !memberPromise) memberPromise = Account.api('/api/member').catch(e => { memberPromise = null; throw e; });
    return memberPromise;
  };
  async function change(body) {
    const d = await Account.api('/api/member', body);
    memberPromise = Promise.resolve(d);
    return d;
  }
  Account.saveVerse = (ref, saved, note) => change({ op: 'verse', ref, saved, ...(note === undefined ? {} : { note }) });
  Account.markDaily = (date, done) => change({ op: 'daily', date, done });
  Account.erase = () => change({ op: 'erase' });

  // Days read in a row, counting back from `today` (or from yesterday, if today is not read yet).
  Account.streak = (days, today) => {
    const set = new Set(days || []); const d = new Date(today + 'T12:00:00');
    if (!set.has(today)) d.setDate(d.getDate() - 1);
    let n = 0;
    while (set.has(Account.localDate(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };
  Account.localDate = (dt = new Date()) => new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  // A "save this verse" box with a private note. ref is "book/chapter/verse" in KJV numbering.
  Account.verseTools = (el, ref) => {
    if (!el) return;
    el.dataset.ref = ref;
    const draw = async () => {
      if (!el.isConnected || el.dataset.ref !== ref) return;
      if (!user()) {
        el.innerHTML = `<button type="button" class="vt-save">☆ SAVE THIS VERSE</button><div class="vt-hint">Sign in or join free to save verses and keep private notes.</div>`;
        el.querySelector('.vt-save').onclick = () => openWindow('signin', 'Sign in or join free to save verses and notes.');
        return;
      }
      el.innerHTML = `<div class="vt-hint">…</div>`;
      let d;
      try { d = await Account.member(); } catch (e) { el.innerHTML = `<div class="vt-hint">${esc(e.message)}</div>`; return; }
      if (!el.isConnected || el.dataset.ref !== ref) return;
      const v = d && d.verses[ref];
      if (!v) {
        el.innerHTML = `<button type="button" class="vt-save">☆ SAVE THIS VERSE</button>`;
        el.querySelector('.vt-save').onclick = async e => {
          e.target.disabled = true;
          try { await Account.saveVerse(ref, true); toast('VERSE SAVED TO MY ACCOUNT'); } catch (err) { toast(err.message.toUpperCase()); }
          draw();
        };
        return;
      }
      el.innerHTML = `<div class="vt-row"><button type="button" class="vt-save on" title="Remove from saved verses">★ SAVED</button>
        <a class="vt-link" href="account.html#saved">MY SAVED VERSES →</a></div>
        <label class="vt-label" for="vt-note">MY NOTE (PRIVATE)</label>
        <textarea class="vt-note" id="vt-note" maxlength="4000" placeholder="Write what this verse means to you, a question, a cross-reference…">${esc(v.note || '')}</textarea>
        <div class="vt-row"><button type="button" class="vt-keep">SAVE NOTE</button><span class="vt-status" aria-live="polite"></span></div>`;
      const status = el.querySelector('.vt-status'), note = el.querySelector('.vt-note');
      note.oninput = () => { status.textContent = 'NOT SAVED YET'; };
      el.querySelector('.vt-keep').onclick = async e => {
        e.target.disabled = true; status.textContent = 'SAVING…';
        try { await Account.saveVerse(ref, true, note.value); status.textContent = 'NOTE SAVED'; } catch (err) { status.textContent = err.message.toUpperCase(); }
        e.target.disabled = false;
      };
      el.querySelector('.vt-save').onclick = async () => {
        if (note.value.trim() && !confirm('Remove this verse and its note from your saved verses?')) return;
        try { await Account.saveVerse(ref, false); toast('REMOVED FROM SAVED VERSES'); } catch (err) { toast(err.message.toUpperCase()); }
        draw();
      };
    };
    if (!el._vt) { el._vt = true; Account.onChange(draw); }
    draw();
  };

  // "Mark as read" for a Daily Word day ("YYYY-MM-DD"), with the reader's streak.
  Account.dailyTools = (el, date) => {
    if (!el) return;
    el.dataset.date = date;
    const draw = async () => {
      if (!el.isConnected || el.dataset.date !== date) return;
      if (!user()) {
        el.innerHTML = `<button type="button" class="vt-save">✓ MARK AS READ</button><div class="vt-hint">Sign in or join free to keep track of your daily reading.</div>`;
        el.querySelector('.vt-save').onclick = () => openWindow('signin', 'Sign in or join free to keep track of your daily reading.');
        return;
      }
      let d;
      try { d = await Account.member(); } catch (e) { el.innerHTML = `<div class="vt-hint">${esc(e.message)}</div>`; return; }
      if (!el.isConnected || el.dataset.date !== date) return;
      const done = d.daily.includes(date), today = Account.localDate();
      const streak = Account.streak(d.daily, today), year = d.daily.filter(x => x.startsWith(today.slice(0, 4))).length;
      el.innerHTML = `<div class="vt-row"><button type="button" class="vt-save${done ? ' on' : ''}">${done ? '✓ READ' : '✓ MARK AS READ'}</button>
        <span class="vt-status">${streak ? `${streak}-DAY STREAK · ` : ''}${year} DAY${year === 1 ? '' : 'S'} READ IN ${today.slice(0, 4)}</span></div>`;
      el.querySelector('.vt-save').onclick = async e => {
        e.target.disabled = true;
        try { await Account.markDaily(date, !done); if (!done) toast('WELL DONE — READING MARKED'); } catch (err) { toast(err.message.toUpperCase()); }
        draw();
      };
    };
    if (!el._dt) { el._dt = true; Account.onChange(draw); }
    draw();
  };

  function init() { navButton(); handleEmailLink(); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
