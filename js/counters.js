/**
 * counters.js — Animated number counters for stats strip
 */

function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
  
  function animateCounter(el, rawTarget, duration) {
    // Separate leading non-numeric, numeric part, and trailing suffix
    const match    = rawTarget.match(/^([^0-9]*)(\d+\.?\d*)([^0-9.]*)$/);
    if (!match) { el.textContent = rawTarget; return; }
  
    const prefix  = match[1] || '';
    const numStr  = match[2];
    const suffix  = match[3] || '';
    const isFloat = numStr.includes('.');
    const endVal  = parseFloat(numStr);
  
    const start = performance.now();
  
    function frame(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutExpo(progress);
      const current  = endVal * eased;
  
      if (progress < 1) {
        el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.floor(current)) + suffix;
        requestAnimationFrame(frame);
      } else {
        el.textContent = rawTarget; // always restore original exactly
      }
    }
  
    requestAnimationFrame(frame);
  }
  
  function initCounters() {
    const nums = document.querySelectorAll('.stat-num[data-val]');
  
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el  = entry.target;
          const val = el.dataset.val;
          el.textContent = '0';
          animateCounter(el, val, 1800);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
  
    nums.forEach(el => observer.observe(el));
  }
  
  document.addEventListener('DOMContentLoaded', initCounters);
  