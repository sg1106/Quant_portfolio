/**
 * navigation.js — Page switching with fade transitions
 */

let currentPage = 'home';

function showPage(id, updateHistory = true) {
  if (id === currentPage) return;

  const from = document.getElementById(currentPage);
  const to   = document.getElementById(id);
  if (!to) return;

  // Fade out
  from.style.transition = 'opacity 0.28s ease';
  from.style.opacity = '0';

  setTimeout(() => {
    from.classList.remove('active');
    from.style.opacity = '';
    from.style.transition = '';

    to.classList.add('active');
    to.classList.add('page-enter');
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Reset + re-trigger scroll animations for new page
    setTimeout(() => {
      to.classList.remove('page-enter');
      if (typeof initReveal === 'function') initReveal();
    }, 600);

    currentPage = id;
    updateNav(id);

    if (updateHistory) {
      history.pushState(null, null, '#' + id);
    }
  }, 280);
}

function scrollToSection(sectionId) {
  // If not on home, switch first then scroll
  if (currentPage !== 'home') {
    showPage('home');
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 450);
  } else {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updateNav(pageId) {
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(a => a.classList.remove('active'));

  const map = {
    home:               0,
    'skills-overview':  2,
    'detail-finance':   2,
    'detail-tech':      2,
    'detail-product':   2,
    'detail-management':2,
  };
  const idx = map[pageId];
  if (idx !== undefined && links[idx]) links[idx].classList.add('active');
}

// Scrolled nav style
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// Page loading from URL hash on refresh
function initPageFromHash() {
  const hash = window.location.hash.substring(1);
  const validPages = ['home', 'skills-overview', 'detail-finance', 'detail-tech', 'detail-product', 'detail-management'];
  if (hash && validPages.includes(hash) && hash !== 'home') {
    const homeEl = document.getElementById('home');
    const targetEl = document.getElementById(hash);
    if (homeEl && targetEl) {
      homeEl.classList.remove('active');
      targetEl.classList.add('active');
      currentPage = hash;
      updateNav(hash);
      window.scrollTo({ top: 0, behavior: 'instant' });
      
      setTimeout(() => {
        if (typeof initReveal === 'function') initReveal();
      }, 100);
    }
  }
}

// Manage browser back/forward buttons
window.addEventListener('popstate', () => {
  const hash = window.location.hash.substring(1) || 'home';
  const validPages = ['home', 'skills-overview', 'detail-finance', 'detail-tech', 'detail-product', 'detail-management'];
  if (validPages.includes(hash)) {
    showPage(hash, false);
  }
});

window.addEventListener('DOMContentLoaded', initPageFromHash);

// Expose globally
window.showPage        = showPage;
window.scrollToSection = scrollToSection;
