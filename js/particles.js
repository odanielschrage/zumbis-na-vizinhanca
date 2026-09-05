// ---------- Sistema de partículas ----------
const Particles = {
  list: [],

  spawn(x, y, opts = {}) {
    const n = opts.count || 8;
    for (let i = 0; i < n; i++) {
      const a = opts.angle !== undefined
        ? opts.angle + rand(-(opts.spread || 0.5), opts.spread || 0.5)
        : rand(TAU);
      const sp = rand(opts.minSpeed || 40, opts.maxSpeed || 180);
      this.list.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(opts.minLife || 0.25, opts.maxLife || 0.6),
        t: 0,
        size: rand(opts.minSize || 1.5, opts.maxSize || 4),
        color: opts.color || '#a01818',
        drag: opts.drag !== undefined ? opts.drag : 4,
        glow: opts.glow || false,
        gravity: opts.gravity || 0,
      });
    }
  },

  blood(x, y, angle) {
    this.spawn(x, y, { count: 10, angle, spread: 0.9, color: '#8f1414', minSpeed: 60, maxSpeed: 260, minSize: 1.5, maxSize: 4.5 });
    this.spawn(x, y, { count: 4, angle, spread: 1.2, color: '#5e0c0c', minSpeed: 30, maxSpeed: 120, minSize: 2, maxSize: 5 });
  },

  gib(x, y) {
    this.spawn(x, y, { count: 22, color: '#8f1414', minSpeed: 60, maxSpeed: 320, minSize: 2, maxSize: 6, minLife: 0.3, maxLife: 0.8 });
    this.spawn(x, y, { count: 8, color: '#4a7a2e', minSpeed: 40, maxSpeed: 200, minSize: 2, maxSize: 5 });
  },

  muzzle(x, y, angle) {
    this.spawn(x, y, { count: 6, angle, spread: 0.35, color: '#ffd75e', minSpeed: 150, maxSpeed: 420, minLife: 0.04, maxLife: 0.12, minSize: 1.5, maxSize: 3.5, glow: true, drag: 6 });
  },

  sparkle(x, y, color) {
    this.spawn(x, y, { count: 14, color, minSpeed: 30, maxSpeed: 140, minLife: 0.3, maxLife: 0.7, glow: true, gravity: -60 });
  },

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.t += dt;
      if (p.t >= p.life) { l.splice(i, 1); continue; }
      const damp = Math.max(0, 1 - p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  },

  draw(ctx) {
    for (const p of this.list) {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = a;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  },

  clear() { this.list.length = 0; },
};
