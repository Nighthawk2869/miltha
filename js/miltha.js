/* ============================================
   MILTHA — Shared JavaScript v5
   Navigation · Toast · Reveal · Auth
   ============================================ */

// ============ NAV ============
function initNav() {
  const nav = document.getElementById('miltha-nav');
  if (!nav) return;
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

// ============ WAITLIST ============
function handleWaitlist(e, successId, formId) {
  e.preventDefault();
  const form = formId ? document.getElementById(formId) : e.target;
  if (form) form.style.display = 'none';
  const success = document.getElementById(successId);
  if (success) success.style.display = 'block';
  showToast('YOU ARE ON THE LIST · ܡܸܠܬ݂ܵܐ');
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
});
