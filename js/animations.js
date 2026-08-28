/**
 * animations.js — IntersectionObserver scroll reveals
 */

let revealObserver = null;

function initReveal() {
  if (revealObserver) revealObserver.disconnect();

  const activePage = document.querySelector('.page.active');
  if (!activePage) return;

  const els = activePage.querySelectorAll('.reveal, .reveal-left, .reveal-scale');

  // Reset state so animation replays on each page visit
  els.forEach(el => el.classList.remove('visible'));

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  els.forEach(el => revealObserver.observe(el));
}

// Boot on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initReveal, 120);
});

window.initReveal = initReveal;
