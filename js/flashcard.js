/**
 * flashcard.js — Achievement flashcard carousel
 * Auto-plays with 4s interval, supports swipe, keyboard, dots
 */

let fcIndex = 0;
let fcTotal = 0;
let fcAutoPlay = null;
let fcIsAnimating = false;

function initFlashcards() {
  const cards = document.querySelectorAll('.flash-card');
  const dotsContainer = document.getElementById('fc-dots');
  if (!cards.length || !dotsContainer) return;

  fcTotal = cards.length;
  dotsContainer.innerHTML = '';

  cards.forEach((card, i) => {
    // Build dots
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'fc-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Go to card ' + (i + 1));
    dot.addEventListener('click', () => flashGoTo(i));
    dotsContainer.appendChild(dot);

    // Set initial state
    card.classList.remove('fc-active', 'fc-prev', 'fc-next');
    if (i === 0) card.classList.add('fc-active');
    else if (i === 1) card.classList.add('fc-next');
  });

  startAutoPlay();
  setupSwipe();
  setupKeyboard();
  setupWheel();
}

function flashGoTo(index, direction) {
  if (fcIsAnimating || index === fcIndex) return;
  fcIsAnimating = true;

  const cards = document.querySelectorAll('.flash-card');
  const dots  = document.querySelectorAll('.fc-dot');

  const fromCard = cards[fcIndex];
  const toCard   = cards[index];

  const dir = direction ?? (index > fcIndex ? 'forward' : 'back');
  const outClass = dir === 'forward' ? 'fc-exit-left'  : 'fc-exit-right';
  const inClass  = dir === 'forward' ? 'fc-enter-right': 'fc-enter-left';

  // Clear all state
  cards.forEach(c => c.classList.remove('fc-active', 'fc-prev', 'fc-next', 'fc-exit-left', 'fc-exit-right', 'fc-enter-left', 'fc-enter-right'));

  fromCard.classList.add(outClass);
  toCard.classList.add(inClass);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toCard.classList.remove(inClass);
      toCard.classList.add('fc-active');
    });
  });

  setTimeout(() => {
    fromCard.classList.remove(outClass);
    fcIndex = index;
    fcIsAnimating = false;

    // Update dots
    dots.forEach((d, i) => d.classList.toggle('active', i === fcIndex));
  }, 480);
}

function flashNext() {
  const next = (fcIndex + 1) % fcTotal;
  flashGoTo(next, 'forward');
  resetAutoPlay();
}

function flashPrev() {
  const prev = (fcIndex - 1 + fcTotal) % fcTotal;
  flashGoTo(prev, 'back');
  resetAutoPlay();
}

function startAutoPlay() {
  clearInterval(fcAutoPlay);
  fcAutoPlay = setInterval(() => {
    const next = (fcIndex + 1) % fcTotal;
    flashGoTo(next, 'forward');
  }, 4000);
}

function resetAutoPlay() {
  clearInterval(fcAutoPlay);
  startAutoPlay();
}

function setupSwipe() {
  const container = document.getElementById('flashcard-container');
  if (!container) return;

  let startX = 0;
  let isDragging = false;

  container.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  container.addEventListener('touchend', e => {
    if (!isDragging) return;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) flashNext();
      else flashPrev();
    }
    isDragging = false;
  }, { passive: true });

  // Mouse drag
  container.addEventListener('mousedown', e => {
    startX = e.clientX;
    isDragging = true;
  });

  container.addEventListener('mouseup', e => {
    if (!isDragging) return;
    const diff = startX - e.clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) flashNext();
      else flashPrev();
    }
    isDragging = false;
  });
}

function setupKeyboard() {
  document.addEventListener('keydown', e => {
    const container = document.getElementById('flashcard-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;
    if (e.key === 'ArrowRight') flashNext();
    if (e.key === 'ArrowLeft')  flashPrev();
  });
}

function setupWheel() {
  const container = document.getElementById('flashcard-container');
  if (!container) return;

  let lastWheelTime = 0;
  container.addEventListener('wheel', e => {
    // Only intercept if we're scrolling vertically or horizontally with enough force
    if (Math.abs(e.deltaY) > 20 || Math.abs(e.deltaX) > 20) {
      e.preventDefault();
      
      const now = Date.now();
      if (now - lastWheelTime > 800) { // 800ms debounce
        if (e.deltaY > 0 || e.deltaX > 0) {
          flashNext();
        } else {
          flashPrev();
        }
        lastWheelTime = now;
      }
    }
  }, { passive: false });
}

let lastScrollCardIndex = 0;

function handleScrollAnimation() {
  if (window.innerWidth <= 900) return;
  const home = document.getElementById('home');
  if (!home || !home.classList.contains('active')) return;

  const wrapper = document.getElementById('hero-wrapper');
  if (!wrapper) return;

  const rect = wrapper.getBoundingClientRect();
  const wrapperHeight = rect.height;
  
  // Calculate relative scroll within the wrapper (wrapper top relative to viewport)
  // When wrapper is at top of viewport, wrapper.getBoundingClientRect().top is 0
  const scrollTop = -rect.top;
  const maxScroll = wrapperHeight - window.innerHeight;

  if (maxScroll <= 0 || scrollTop < 0) return;

  // Calculate percentage of scroll within the wrapper (0 to 1)
  const percentage = Math.max(0, Math.min(1, scrollTop / maxScroll));

  // Determine which card should be active (0 to fcTotal - 1)
  const cardIndex = Math.min(Math.floor(percentage * fcTotal), fcTotal - 1);

  if (cardIndex !== lastScrollCardIndex) {
    const direction = cardIndex > lastScrollCardIndex ? 'forward' : 'back';
    // Disable auto-play when user is actively scrolling
    clearInterval(fcAutoPlay);
    flashGoTo(cardIndex, direction);
    lastScrollCardIndex = cardIndex;
  }
}

// Bind scroll event to page scrolling
window.addEventListener('scroll', () => {
  if (window.scrollY > 30) {
    clearInterval(fcAutoPlay);
  }
  handleScrollAnimation();
}, { passive: true });

// Init on DOM ready and re-init when home page becomes visible
window.addEventListener('DOMContentLoaded', initFlashcards);

// Also expose globally so showPage can re-init
window.initFlashcards = initFlashcards;
window.flashNext = flashNext;
window.flashPrev = flashPrev;
