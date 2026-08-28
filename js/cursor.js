/**
 * cursor.js — Custom cursor with lag ring and hover morphing
 */
(function () {
    const cursor    = document.getElementById('cursor');
    const ring      = document.getElementById('cursor-ring');
    if (!cursor || !ring) return;
  
    let mouseX = window.innerWidth  / 2;
    let mouseY = window.innerHeight / 2;
    let ringX  = mouseX;
    let ringY  = mouseY;
  
    // Move dot immediately
    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.left = mouseX + 'px';
      cursor.style.top  = mouseY + 'px';
    }, { passive: true });
  
    // Lag the ring with lerp
    function lerpRing() {
      ringX += (mouseX - ringX) * 0.13;
      ringY += (mouseY - ringY) * 0.13;
      ring.style.left = ringX + 'px';
      ring.style.top  = ringY + 'px';
      requestAnimationFrame(lerpRing);
    }
    lerpRing();
  
    // Hover classes
    const TARGETS = 'a, button, .skill-card, .domain-card, .project-card, '
                  + '.evidence-card, .cert-item, .contact-link, .skill-pill, '
                  + '.nav-logo, .pub-card, .timeline-item, .back-btn, .btn';
  
    document.addEventListener('mouseover', e => {
      if (e.target.closest(TARGETS)) {
        cursor.classList.add('hovering');
        ring.classList.add('hovering');
      }
    });
  
    document.addEventListener('mouseout', e => {
      if (e.target.closest(TARGETS)) {
        cursor.classList.remove('hovering');
        ring.classList.remove('hovering');
      }
    });
  
    // Click burst
    document.addEventListener('mousedown', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(0.6)';
    });
    document.addEventListener('mouseup', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  })();
  