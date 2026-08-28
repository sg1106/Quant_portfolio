/**
 * particles.js — Canvas particle network on hero background
 */

class ParticleSystem {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
  
      this.ctx   = this.canvas.getContext('2d');
      this.pts   = [];
      this.mouse = { x: -999, y: -999 };
      this.raf   = null;
  
      this._resize     = this.resize.bind(this);
      this._mousemove  = this.onMouse.bind(this);
  
      window.addEventListener('resize',    this._resize,    { passive: true });
      document.addEventListener('mousemove', this._mousemove, { passive: true });
  
      this.resize();
      this.seed();
      this.run();
    }
  
    resize() {
      this.W = this.canvas.width  = window.innerWidth;
      this.H = this.canvas.height = window.innerHeight;
      this.seed();
    }
  
    onMouse(e) {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    }
  
    seed() {
      const count = Math.min(Math.floor((this.W * this.H) / 16000), 80);
      this.pts = Array.from({ length: count }, () => ({
        x  : Math.random() * this.W,
        y  : Math.random() * this.H,
        vx : (Math.random() - 0.5) * 0.25,
        vy : (Math.random() - 0.5) * 0.25,
        r  : Math.random() * 1.4 + 0.3,
        a  : Math.random() * 0.35 + 0.08,
        teal: Math.random() > 0.65,
      }));
    }
  
    draw() {
      const { ctx, W, H, pts, mouse } = this;
      ctx.clearRect(0, 0, W, H);
  
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
  
        // Mouse repulsion
        const dx   = p.x - mouse.x;
        const dy   = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 90 && dist > 0) {
          p.x += (dx / dist) * 1.4;
          p.y += (dy / dist) * 1.4;
        }
  
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
  
        // Dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.teal
          ? `rgba(126,200,200,${p.a})`
          : `rgba(200,169,126,${p.a})`;
        ctx.fill();
  
        // Lines to neighbours
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(200,169,126,${(1 - d / 110) * 0.1})`;
            ctx.lineWidth   = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
    }
  
    run() {
      this.draw();
      this.raf = requestAnimationFrame(() => this.run());
    }
  
    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      window.removeEventListener('resize',      this._resize);
      document.removeEventListener('mousemove', this._mousemove);
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    window._particles = new ParticleSystem('canvas-particles');
  });
  