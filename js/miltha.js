/* ============================================
   MILTHA — Shared JavaScript v5
   Navigation · Toast · Reveal · Auth
   ============================================ */

// ============ NAV ============
function initNav() {
  const nav = document.getElementById('miltha-nav');
  if (!nav) return;
  // Phone menu: the links are hidden below 768px, so add a button that opens them.
  const links = nav.querySelector('.nav-links');
  if (links && !nav.querySelector('.nav-menu-btn')) {
    links.id = links.id || 'nav-links';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-menu-btn';
    btn.setAttribute('aria-controls', links.id);
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'MENU';
    const close = () => { nav.classList.remove('nav-open'); btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'MENU'; };
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'CLOSE' : 'MENU';
    });
    links.addEventListener('click', e => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    (nav.querySelector('.nav-right') || nav).appendChild(btn);
  }
  // Set active link based on current page
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

// ============ SCROLL REVEAL ============
function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ============ TOAST ============
function showToast(msg, dur = 3000) {
  let t = document.getElementById('miltha-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'miltha-toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
});
