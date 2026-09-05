// ---------- Mundo: mapas temáticos, obstáculos, chão, sangue e iluminação ----------

const THEMES = {
  suburb: {
    name: 'Subúrbio',
    ambient: 'rgba(12,14,30,0.58)',
    lampGlow: '255,190,90',
    lampBulb: '#ffd98a',
  },
  cemetery: {
    name: 'Cemitério',
    ambient: 'rgba(10,14,26,0.64)',
    lampGlow: '150,220,180',
    lampBulb: '#a8e8c0',
  },
  industrial: {
    name: 'Zona Industrial',
    ambient: 'rgba(12,14,20,0.58)',
    lampGlow: '170,205,255',
    lampBulb: '#cfe4ff',
  },
};

const World = {
  W: 2600,
  H: 1900,
  key: 'suburb',
  theme: THEMES.suburb,
  rects: [],      // obstáculos retangulares {x,y,w,h,type,...}
  circles: [],    // obstáculos circulares {x,y,r,type,...}
  lamps: [],      // postes de luz {x,y}
  glowSpots: [],  // luzes ambiente extras {x,y,r,color}
  decals: [],     // decoração não-sólida no chão {type,x,y,...}
  roofs: [],      // telhados de construções que somem ao entrar
  interiors: [],  // pisos internos {x,y,w,h,floor}
  groundCanvas: null,
  bloodCanvas: null,
  bloodCtx: null,

  generate(key = 'suburb') {
    this.key = key;
    this.theme = THEMES[key] || THEMES.suburb;
    this.rects = [];
    this.circles = [];
    this.lamps = [];
    this.glowSpots = [];
    this.decals = [];
    this.roofs = [];
    this.interiors = [];

    if (key === 'cemetery') this.populateCemetery();
    else if (key === 'industrial') this.populateIndustrial();
    else this.populateSuburb();

    this.scatterDecals();
    this.renderGround();

    this.bloodCanvas = document.createElement('canvas');
    this.bloodCanvas.width = this.W;
    this.bloodCanvas.height = this.H;
    this.bloodCtx = this.bloodCanvas.getContext('2d');
  },

  // ---------- construção com interior (telhado some ao entrar) ----------
  makeBuilding(cfg) {
    const { x, y, w, h } = cfg;
    const T = cfg.wall || 14;
    const doorSide = cfg.door || 'bottom';
    const dw = cfg.doorW || 58;
    const wallCol = cfg.wallCol || '#5a6070';
    // segmentos de parede (com vão para a porta)
    const push = (rx, ry, rw, rh) => { if (rw > 0 && rh > 0) this.rects.push({ x: rx, y: ry, w: rw, h: rh, type: 'wall', hue: wallCol }); };
    const segWall = (side) => {
      const dpos = side === 'top' || side === 'bottom'
        ? x + (cfg.doorPos != null ? cfg.doorPos : w / 2)
        : y + (cfg.doorPos != null ? cfg.doorPos : h / 2);
      if (side === 'top') { push(x, y, dpos - dw / 2 - x, T); push(dpos + dw / 2, y, x + w - (dpos + dw / 2), T); }
      else if (side === 'bottom') { push(x, y + h - T, dpos - dw / 2 - x, T); push(dpos + dw / 2, y + h - T, x + w - (dpos + dw / 2), T); }
      else if (side === 'left') { push(x, y, T, dpos - dw / 2 - y); push(x, dpos + dw / 2, T, y + h - (dpos + dw / 2)); }
      else { push(x + w - T, y, T, dpos - dw / 2 - y); push(x + w - T, dpos + dw / 2, T, y + h - (dpos + dw / 2)); }
    };
    for (const side of ['top', 'bottom', 'left', 'right']) {
      if (side === doorSide) segWall(side);
      else if (side === 'top') push(x, y, w, T);
      else if (side === 'bottom') push(x, y + h - T, w, T);
      else if (side === 'left') push(x, y, T, h);
      else push(x + w - T, y, T, h);
    }
    // piso interno
    this.interiors.push({ x: x + T, y: y + T, w: w - 2 * T, h: h - 2 * T, floor: cfg.floor || 'wood' });
    // móveis (sólidos)
    if (cfg.furniture) for (const f of cfg.furniture) {
      this.rects.push({ x: x + f[0], y: y + f[1], w: f[2], h: f[3], type: 'furniture', kind: f[4] || 'box', hue: f[5] || '#6e5233' });
    }
    // decalques internos (tapete, manchas) não-sólidos
    if (cfg.rug) this.decals.push({ type: 'rug', x: x + w / 2, y: y + h / 2, w: w * 0.5, h: h * 0.4, color: cfg.rug });

    // centro da porta (para trancas e detecção)
    const dpos = (doorSide === 'top' || doorSide === 'bottom')
      ? x + (cfg.doorPos != null ? cfg.doorPos : w / 2)
      : y + (cfg.doorPos != null ? cfg.doorPos : h / 2);
    let doorX, doorY;
    if (doorSide === 'top') { doorX = dpos; doorY = y + T / 2; }
    else if (doorSide === 'bottom') { doorX = dpos; doorY = y + h - T / 2; }
    else if (doorSide === 'left') { doorX = x + T / 2; doorY = dpos; }
    else { doorX = x + w - T / 2; doorY = dpos; }

    const roof = { x, y, w, h, alpha: 1, color: cfg.roofCol || '#3a3230', flat: !!cfg.flat, abandoned: !!cfg.abandoned, doorX, doorY, doorSide };

    // COFRE TRANCADO: portão bloqueando a porta até destravar com chave
    if (cfg.locked) {
      let gate;
      if (doorSide === 'top') gate = { x: dpos - dw / 2, y: y, w: dw, h: T, type: 'gate', hue: '#6a5a2a' };
      else if (doorSide === 'bottom') gate = { x: dpos - dw / 2, y: y + h - T, w: dw, h: T, type: 'gate', hue: '#6a5a2a' };
      else if (doorSide === 'left') gate = { x: x, y: dpos - dw / 2, w: T, h: dw, type: 'gate', hue: '#6a5a2a' };
      else gate = { x: x + w - T, y: dpos - dw / 2, w: T, h: dw, type: 'gate', hue: '#6a5a2a' };
      this.rects.push(gate);
      roof.locked = true;
      roof.vault = true;
      roof.gate = gate;
      roof.interior = this.interiors[this.interiors.length - 1];
      roof.interior.locked = true;   // objetivos normais não nascem aqui dentro
    }
    this.roofs.push(roof);
  },

  // destranca o cofre: remove o portão da colisão
  unlockVault(roof) {
    if (!roof.gate) return;
    const i = this.rects.indexOf(roof.gate);
    if (i >= 0) this.rects.splice(i, 1);
    roof.locked = false;
    roof.gate = null;
  },

  // ---------- população por tema ----------
  populateSuburb() {
    const cx = this.W / 2, cy = this.H / 2;

    // casas em que se pode ENTRAR (telhado some) — com móveis
    this.makeBuilding({
      x: 250, y: 210, w: 300, h: 240, door: 'bottom', wallCol: '#6e5a50', roofCol: '#3a2c26', floor: 'wood', rug: '#7a3838',
      furniture: [[24, 30, 60, 34, 'bed', '#4a6a9a'], [230, 30, 40, 40, 'table', '#6e5233'], [26, 150, 34, 34, 'box', '#6e5233'], [230, 160, 40, 30, 'sofa', '#5a7a4a']],
    });
    // COFRE trancado (precisa de chave) — recompensa grande
    this.makeBuilding({
      x: 1900, y: 1360, w: 320, h: 260, door: 'top', locked: true, wallCol: '#5a6478', roofCol: '#33383f', floor: 'tile', rug: '#4a3a1a',
      furniture: [[30, 40, 46, 46, 'shelf', '#5a4632'], [240, 40, 46, 40, 'shelf', '#5a4632'], [30, 170, 46, 40, 'shelf', '#5a4632'], [240, 170, 46, 40, 'shelf', '#5a4632']],
    });
    // casa ABANDONADA (sem telhado, ruína) — dá pra atravessar
    this.makeBuilding({
      x: 1120, y: 1420, w: 300, h: 220, door: 'left', wallCol: '#4a4038', roofCol: '#000', floor: 'ruin', abandoned: true,
      furniture: [[40, 40, 40, 40, 'box', '#5a4632'], [200, 130, 44, 34, 'table', '#4a3a2a']],
    });

    // casas sólidas (não entra) para volume visual
    const housePos = [[1120, 200], [2000, 280], [280, 1360], [2160, 830], [160, 830]];
    for (const [hx, hy] of housePos) {
      const w = randInt(220, 300), h = randInt(170, 230);
      this.rects.push({ x: hx, y: hy, w, h, type: 'house', win: 'warm', hue: pick(['#5a6478', '#6e5a64', '#5a7064', '#71685a']) });
    }

    for (let i = 0; i < 6; i++) {
      const s = this.findFreeSpot(90, 300);
      if (s) this.rects.push({ x: s.x - 55, y: s.y - 27, w: 110, h: 54, type: 'car', hue: pick(['#7a3030', '#30567a', '#6b6b70', '#7a6a30']) });
    }
    for (let i = 0; i < 7; i++) {
      const s = this.findFreeSpot(50, 250);
      if (s) this.rects.push({ x: s.x - 22, y: s.y - 22, w: 44, h: 44, type: 'crate' });
    }
    // árvores e arbustos (hedges densos como no ZAMN)
    for (let i = 0; i < 22; i++) {
      const s = this.findFreeSpot(60, 200);
      if (s) this.circles.push({ x: s.x, y: s.y, r: 16, type: 'tree', canopy: rand(38, 58), phase: rand(TAU) });
    }
    for (let i = 0; i < 16; i++) {
      const s = this.findFreeSpot(34, 180);
      if (s) this.circles.push({ x: s.x, y: s.y, r: 20, type: 'bush', canopy: rand(22, 32), phase: rand(TAU) });
    }
    // props pequenos sólidos: hidrantes e latas de lixo
    for (let i = 0; i < 5; i++) {
      const s = this.findFreeSpot(30, 220);
      if (s) this.circles.push({ x: s.x, y: s.y, r: 10, type: Math.random() < 0.5 ? 'hydrant' : 'trashcan', canopy: 12, phase: rand(TAU) });
    }
    // botijões de gás explosivos (perto dos carros / quintais)
    for (let i = 0; i < 6; i++) {
      const s = this.findFreeSpot(36, 200);
      if (s) this.circles.push({ x: s.x, y: s.y, r: 13, type: 'barrel', explosive: true, canopy: 15, phase: rand(TAU) });
    }
    this.lamps = [
      { x: cx - 420, y: cy - 320 }, { x: cx + 420, y: cy - 320 },
      { x: cx - 420, y: cy + 320 }, { x: cx + 420, y: cy + 320 },
      { x: 420, y: 420 }, { x: this.W - 420, y: 420 },
      { x: 420, y: this.H - 420 }, { x: this.W - 420, y: this.H - 420 },
      { x: cx, y: cy - 40 },
    ];
  },

  populateCemetery() {
    const cx = this.W / 2, cy = this.H / 2;
    // cripta em que se entra (interior de pedra com sarcófagos)
    this.makeBuilding({
      x: 250, y: 250, w: 300, h: 240, door: 'bottom', wallCol: '#525866', roofCol: '#2c313c', floor: 'ruin', rug: '#2a3a44',
      furniture: [[40, 40, 70, 40, 'table', '#5a5e6a'], [200, 40, 70, 40, 'table', '#5a5e6a'], [120, 150, 60, 40, 'box', '#4a4e58']],
    });
    // mausoléu abandonado (aberto)
    this.makeBuilding({
      x: 1900, y: 1380, w: 280, h: 220, door: 'left', wallCol: '#4a5058', roofCol: '#000', floor: 'ruin', abandoned: true,
      furniture: [[180, 50, 60, 40, 'table', '#4a4e58'], [50, 140, 40, 40, 'box', '#42464e']],
    });
    // CRIPTA SELADA (cofre trancado) — precisa de chave
    this.makeBuilding({
      x: 1500, y: 250, w: 300, h: 240, door: 'bottom', locked: true, wallCol: '#5a5060', roofCol: '#2a2632', floor: 'ruin', rug: '#3a2a44',
      furniture: [[40, 40, 70, 44, 'table', '#5a5060'], [190, 40, 70, 44, 'table', '#5a5060'], [110, 150, 70, 44, 'box', '#4a4452']],
    });
    // mausoléus sólidos de pedra
    const mausPos = [[1200, 220], [2000, 320], [420, 1420]];
    for (const [mx, my] of mausPos) {
      const w = randInt(180, 240), h = randInt(140, 180);
      this.rects.push({ x: mx, y: my, w, h, type: 'house', win: 'cold', hue: pick(['#565c6c', '#4e5462', '#5c5866']) });
    }
    // lápides
    for (let i = 0; i < 34; i++) {
      const s = this.findFreeSpot(40, 260);
      if (s) this.rects.push({ x: s.x - 13, y: s.y - 18, w: 26, h: 36, type: 'grave', cross: Math.random() < 0.3 });
    }
    // árvores mortas
    for (let i = 0; i < 18; i++) {
      const s = this.findFreeSpot(50, 220);
      if (s) this.circles.push({ x: s.x, y: s.y, r: 13, type: 'deadtree', canopy: 30, phase: rand(TAU) });
    }
    // caixotes velhos
    for (let i = 0; i < 5; i++) {
      const s = this.findFreeSpot(50, 250);
      if (s) this.rects.push({ x: s.x - 20, y: s.y - 20, w: 40, h: 40, type: 'crate' });
    }
    // barris de pólvora explosivos
    for (let i = 0; i < 5; i++) {
      const s = this.findFreeSpot(36, 220);
      if (s) this.circles.push({ x: s.x, y: s.y, r: 13, type: 'barrel', explosive: true, canopy: 15, phase: rand(TAU) });
    }
    this.lamps = [
      { x: cx - 380, y: cy - 300 }, { x: cx + 380, y: cy - 300 },
      { x: cx - 380, y: cy + 300 }, { x: cx + 380, y: cy + 300 },
      { x: cx, y: cy - 30 }, { x: 380, y: 380 }, { x: this.W - 380, y: this.H - 380 },
    ];
    // fogos-fátuos sobre algumas covas
    for (let i = 0; i < 6; i++) {
      const g = pick(this.rects.filter(r => r.type === 'grave'));
      if (g) this.glowSpots.push({ x: g.x + 13, y: g.y, r: 70, color: '150,255,190' });
    }
  },

  populateIndustrial() {
    const cx = this.W / 2, cy = this.H / 2;
    // MERCADINHO em que se entra — corredores de prateleiras com produtos
    this.makeBuilding({
      x: 240, y: 240, w: 380, h: 300, door: 'bottom', wallCol: '#5a6470', roofCol: '#3a414c', flat: true, floor: 'tile',
      furniture: [
        [40, 50, 300, 26, 'shelf', '#5a4632'], [40, 130, 300, 26, 'shelf', '#5a4632'], [40, 210, 300, 26, 'shelf', '#5a4632'],
      ],
    });
    // galpão em que se entra
    this.makeBuilding({
      x: 1860, y: 1340, w: 340, h: 280, door: 'top', wallCol: '#4e5a68', roofCol: '#333a44', flat: true, floor: 'tile',
      furniture: [[40, 60, 50, 50, 'box', '#6e5233'], [230, 50, 60, 44, 'shelf', '#5a4632'], [40, 180, 60, 50, 'box', '#6e5233'], [240, 180, 50, 50, 'box', '#6e5233']],
    });
    // DEPÓSITO TRANCADO (cofre) — precisa de chave
    this.makeBuilding({
      x: 780, y: 240, w: 320, h: 260, door: 'bottom', locked: true, wallCol: '#566070', roofCol: '#333a44', flat: true, floor: 'tile',
      furniture: [[36, 44, 56, 44, 'box', '#6e5233'], [228, 44, 56, 44, 'shelf', '#5a4632'], [36, 168, 56, 44, 'shelf', '#5a4632'], [228, 168, 56, 44, 'box', '#6e5233']],
    });
    // galpões sólidos
    const warePos = [[1300, 200], [2050, 300], [360, 1360]];
    for (const [wx, wy] of warePos) {
      const w = randInt(300, 380), h = randInt(200, 240);
      this.rects.push({ x: wx, y: wy, w, h, type: 'house', win: 'cyan', flat: true, hue: pick(['#4e5a68', '#565e6a', '#4a545e']) });
    }
    // contêineres
    for (let i = 0; i < 7; i++) {
      const s = this.findFreeSpot(110, 320);
      if (s) {
        const horiz = Math.random() < 0.5;
        this.rects.push({
          x: s.x - (horiz ? 75 : 31), y: s.y - (horiz ? 31 : 75),
          w: horiz ? 150 : 62, h: horiz ? 62 : 150,
          type: 'container', hue: pick(['#7a3030', '#2e6e7a', '#7a6a30', '#3a7a4a']),
        });
      }
    }
    // caixotes
    for (let i = 0; i < 10; i++) {
      const s = this.findFreeSpot(50, 250);
      if (s) this.rects.push({ x: s.x - 22, y: s.y - 22, w: 44, h: 44, type: 'crate' });
    }
    // barris explosivos (alguns tóxicos e brilhantes)
    for (let i = 0; i < 16; i++) {
      const s = this.findFreeSpot(40, 220);
      if (s) {
        const toxic = i < 5;
        this.circles.push({ x: s.x, y: s.y, r: 13, type: 'barrel', toxic, explosive: true, canopy: 15, phase: rand(TAU) });
        if (toxic) this.glowSpots.push({ x: s.x, y: s.y, r: 80, color: '120,255,140' });
      }
    }
    this.lamps = [
      { x: cx - 460, y: cy - 340 }, { x: cx + 460, y: cy - 340 },
      { x: cx - 460, y: cy + 340 }, { x: cx + 460, y: cy + 340 },
      { x: 380, y: 380 }, { x: this.W - 380, y: 380 },
      { x: 380, y: this.H - 380 }, { x: this.W - 380, y: this.H - 380 },
    ];
  },

  // ---------- utilidades de espaço ----------
  findFreeSpot(radius, minCenterDist = 0, tries = 60) {
    for (let i = 0; i < tries; i++) {
      const x = rand(120, this.W - 120);
      const y = rand(120, this.H - 120);
      if (minCenterDist && dist(x, y, this.W / 2, this.H / 2) < minCenterDist) continue;
      if (!this.collides(x, y, radius)) return { x, y };
    }
    return null;
  },

  // ponto livre DENTRO de um interior aberto (objetivos normais; ignora cofres)
  spotInside(radius = 14, tries = 24) {
    const open = this.interiors.filter(it => !it.locked && it.w >= 60 && it.h >= 60);
    if (!open.length) return null;
    for (let i = 0; i < tries; i++) {
      const it = pick(open);
      const x = rand(it.x + 22, it.x + it.w - 22);
      const y = rand(it.y + 22, it.y + it.h - 22);
      if (!this.collides(x, y, radius)) return { x, y };
    }
    return null;
  },

  // ponto livre em ÁREA ABERTA (fora de qualquer interior) — para chaves
  spotOutside(minCenterDist = 0, tries = 60) {
    for (let i = 0; i < tries; i++) {
      const s = this.findFreeSpot(24, minCenterDist);
      if (!s) continue;
      const inside = this.interiors.some(it => s.x > it.x && s.x < it.x + it.w && s.y > it.y && s.y < it.y + it.h);
      if (!inside) return s;
    }
    return this.findFreeSpot(24, minCenterDist);
  },

  // ponto livre dentro do cofre (para a recompensa grande ao destravar)
  spotInVault(roof, radius = 14, tries = 20) {
    const it = roof.interior;
    if (!it) return { x: roof.x + roof.w / 2, y: roof.y + roof.h / 2 };
    for (let i = 0; i < tries; i++) {
      const x = rand(it.x + 20, it.x + it.w - 20);
      const y = rand(it.y + 20, it.y + it.h - 20);
      if (!this.collides(x, y, radius)) return { x, y };
    }
    return { x: it.x + it.w / 2, y: it.y + it.h / 2 };
  },

  collides(x, y, r) {
    for (const o of this.rects) {
      if (circleRectPush(x, y, r, o.x, o.y, o.w, o.h)) return true;
    }
    for (const c of this.circles) {
      if (circleCirclePush(x, y, r, c.x, c.y, c.r)) return true;
    }
    return false;
  },

  // barril explosivo (não detonado) num ponto/raio — para balas e explosões
  hitBarrel(x, y, r = 0) {
    for (const c of this.circles) {
      if (c.type !== 'barrel' || c.exploded) continue;
      const dx = x - c.x, dy = y - c.y, rr = c.r + r;
      if (dx * dx + dy * dy < rr * rr) return c;
    }
    return null;
  },

  removeBarrel(b) {
    b.exploded = true;
    const i = this.circles.indexOf(b);
    if (i >= 0) this.circles.splice(i, 1);
  },

  resolve(ent) {
    ent.x = clamp(ent.x, ent.r + 8, this.W - ent.r - 8);
    ent.y = clamp(ent.y, ent.r + 8, this.H - ent.r - 8);
    for (const o of this.rects) {
      const p = circleRectPush(ent.x, ent.y, ent.r, o.x, o.y, o.w, o.h);
      if (p) { ent.x += p.px; ent.y += p.py; }
    }
    for (const c of this.circles) {
      const p = circleCirclePush(ent.x, ent.y, ent.r, c.x, c.y, c.r);
      if (p) { ent.x += p.px; ent.y += p.py; }
    }
  },

  pointBlocked(x, y) {
    if (x < 4 || y < 4 || x > this.W - 4 || y > this.H - 4) return true;
    for (const o of this.rects) {
      if (x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h) return true;
    }
    for (const c of this.circles) {
      const dx = x - c.x, dy = y - c.y;
      if (dx * dx + dy * dy < c.r * c.r) return true;
    }
    return false;
  },

  // decoração não-sólida espalhada (flores, poças, folhas) — por tema
  scatterDecals() {
    const add = (o) => this.decals.push(o);
    if (this.key === 'suburb') {
      for (let i = 0; i < 40; i++) { const s = this.freeGround(24); if (s) add({ type: 'flowers', x: s.x, y: s.y, c: pick(['#ffd83a', '#ff6a9a', '#ffffff', '#c86aff']) }); }
      for (let i = 0; i < 10; i++) { const s = this.freeGround(30); if (s) add({ type: 'puddle', x: s.x, y: s.y, r: rand(20, 40) }); }
      for (let i = 0; i < 6; i++) { const s = this.freeGround(30); if (s) add({ type: 'manhole', x: s.x, y: s.y }); }
    } else if (this.key === 'cemetery') {
      for (let i = 0; i < 22; i++) { const s = this.freeGround(24); if (s) add({ type: 'bones', x: s.x, y: s.y }); }
      for (let i = 0; i < 30; i++) { const s = this.freeGround(20); if (s) add({ type: 'weeds', x: s.x, y: s.y }); }
      for (let i = 0; i < 8; i++) { const s = this.freeGround(30); if (s) add({ type: 'dirtmound', x: s.x, y: s.y, r: rand(24, 40) }); }
    } else {
      for (let i = 0; i < 16; i++) { const s = this.freeGround(30); if (s) add({ type: 'oil', x: s.x, y: s.y, r: rand(18, 44) }); }
      for (let i = 0; i < 12; i++) { const s = this.freeGround(24); if (s) add({ type: 'hazard', x: s.x, y: s.y }); }
      for (let i = 0; i < 10; i++) { const s = this.freeGround(20); if (s) add({ type: 'bolts', x: s.x, y: s.y }); }
    }
  },

  freeGround(r, tries = 30) {
    for (let i = 0; i < tries; i++) {
      const x = rand(80, this.W - 80), y = rand(80, this.H - 80);
      if (!this.collides(x, y, r)) return { x, y };
    }
    return null;
  },

  // ---------- chão pré-renderizado ----------
  renderGround() {
    const c = document.createElement('canvas');
    c.width = this.W; c.height = this.H;
    const g = c.getContext('2d');
    if (this.key === 'cemetery') this.groundCemetery(g);
    else if (this.key === 'industrial') this.groundIndustrial(g);
    else this.groundSuburb(g);
    this.bakeInteriors(g);
    this.bakeDecals(g);
    this.groundCanvas = c;
  },

  // pisos internos das construções
  bakeInteriors(g) {
    for (const it of this.interiors) {
      if (it.floor === 'wood') {
        g.fillStyle = '#6a4a2e'; g.fillRect(it.x, it.y, it.w, it.h);
        g.strokeStyle = 'rgba(40,26,14,.5)'; g.lineWidth = 2;
        for (let yy = it.y; yy < it.y + it.h; yy += 16) { g.beginPath(); g.moveTo(it.x, yy); g.lineTo(it.x + it.w, yy); g.stroke(); }
      } else if (it.floor === 'tile') {
        g.fillStyle = '#8a8f98'; g.fillRect(it.x, it.y, it.w, it.h);
        g.strokeStyle = 'rgba(40,44,52,.5)'; g.lineWidth = 2;
        for (let xx = it.x; xx < it.x + it.w; xx += 26) { g.beginPath(); g.moveTo(xx, it.y); g.lineTo(xx, it.y + it.h); g.stroke(); }
        for (let yy = it.y; yy < it.y + it.h; yy += 26) { g.beginPath(); g.moveTo(it.x, yy); g.lineTo(it.x + it.w, yy); g.stroke(); }
      } else { // ruin
        g.fillStyle = '#3f3a34'; g.fillRect(it.x, it.y, it.w, it.h);
        g.fillStyle = 'rgba(20,18,14,.4)';
        for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(it.x + rand(it.w), it.y + rand(it.h), rand(3, 9), 0, TAU); g.fill(); }
        // grama invadindo
        g.fillStyle = 'rgba(60,90,45,.5)';
        for (let k = 0; k < 24; k++) { g.beginPath(); g.arc(it.x + rand(it.w), it.y + rand(it.h), rand(3, 7), 0, TAU); g.fill(); }
      }
      // sombra interna nas bordas
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 6;
      g.strokeRect(it.x + 3, it.y + 3, it.w - 6, it.h - 6);
    }
  },

  bakeDecals(g) {
    for (const d of this.decals) {
      if (d.type === 'flowers') {
        for (let k = 0; k < 5; k++) {
          const fx = d.x + rand(-8, 8), fy = d.y + rand(-8, 8);
          g.fillStyle = d.c;
          g.beginPath(); g.arc(fx, fy, 2.2, 0, TAU); g.fill();
        }
        g.fillStyle = '#ffe680'; g.beginPath(); g.arc(d.x, d.y, 1.4, 0, TAU); g.fill();
      } else if (d.type === 'puddle') {
        g.fillStyle = 'rgba(60,90,110,.4)';
        g.beginPath(); g.ellipse(d.x, d.y, d.r, d.r * 0.6, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(150,190,220,.15)';
        g.beginPath(); g.ellipse(d.x - d.r * 0.2, d.y - d.r * 0.15, d.r * 0.4, d.r * 0.24, 0, 0, TAU); g.fill();
      } else if (d.type === 'manhole') {
        g.fillStyle = '#3a3d42'; g.beginPath(); g.arc(d.x, d.y, 15, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(20,22,26,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(d.x, d.y, 12, 0, TAU); g.stroke();
      } else if (d.type === 'rug') {
        g.fillStyle = d.color; g.globalAlpha = 0.5;
        roundRect(g, d.x - d.w / 2, d.y - d.h / 2, d.w, d.h, 6); g.fill();
        g.globalAlpha = 0.7; g.strokeStyle = shade(d.color, 40); g.lineWidth = 3;
        roundRect(g, d.x - d.w / 2 + 5, d.y - d.h / 2 + 5, d.w - 10, d.h - 10, 4); g.stroke();
        g.globalAlpha = 1;
      } else if (d.type === 'bones') {
        g.strokeStyle = 'rgba(200,195,180,.5)'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(d.x - 6, d.y - 4); g.lineTo(d.x + 6, d.y + 4); g.stroke();
        g.beginPath(); g.moveTo(d.x + 5, d.y - 5); g.lineTo(d.x - 5, d.y + 5); g.stroke();
      } else if (d.type === 'weeds') {
        g.strokeStyle = 'rgba(90,120,70,.5)'; g.lineWidth = 1.5;
        for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(d.x + k * 2, d.y); g.lineTo(d.x + k * 2.5, d.y - rand(6, 12)); g.stroke(); }
      } else if (d.type === 'dirtmound') {
        g.fillStyle = 'rgba(40,30,20,.55)';
        g.beginPath(); g.ellipse(d.x, d.y, d.r, d.r * 0.6, 0, 0, TAU); g.fill();
      } else if (d.type === 'oil') {
        g.fillStyle = 'rgba(8,8,12,.5)';
        g.beginPath(); g.ellipse(d.x, d.y, d.r, d.r * 0.6, rand(TAU), 0, TAU); g.fill();
      } else if (d.type === 'hazard') {
        g.save(); g.translate(d.x, d.y); g.rotate(rand(TAU));
        g.fillStyle = 'rgba(200,170,40,.35)'; g.fillRect(-14, -4, 28, 8);
        g.fillStyle = 'rgba(20,20,20,.35)'; g.fillRect(-14, -4, 7, 8); g.fillRect(0, -4, 7, 8);
        g.restore();
      } else if (d.type === 'bolts') {
        g.fillStyle = 'rgba(120,125,135,.4)';
        for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(d.x + rand(-6, 6), d.y + rand(-6, 6), 1.6, 0, TAU); g.fill(); }
      }
    }
  },

  groundSuburb(g) {
    g.fillStyle = '#232e1d';
    g.fillRect(0, 0, this.W, this.H);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = pick(['#28351f', '#1e2818', '#2c3a22', '#253020']);
      g.beginPath();
      g.arc(rand(this.W), rand(this.H), rand(12, 55), 0, TAU);
      g.fill();
    }
    g.strokeStyle = 'rgba(70,95,50,.35)';
    g.lineWidth = 1;
    for (let i = 0; i < 1200; i++) {
      const x = rand(this.W), y = rand(this.H);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + rand(-3, 3), y - rand(3, 7));
      g.stroke();
    }
    const cx = this.W / 2, cy = this.H / 2, roadW = 150;
    g.fillStyle = '#2a2c31';
    g.fillRect(0, cy - roadW / 2, this.W, roadW);
    g.fillRect(cx - roadW / 2, 0, roadW, this.H);
    g.strokeStyle = 'rgba(0,0,0,.25)';
    for (let i = 0; i < 130; i++) {
      const onH = Math.random() < 0.5;
      const x = onH ? rand(this.W) : cx + rand(-roadW / 2, roadW / 2);
      const y = onH ? cy + rand(-roadW / 2, roadW / 2) : rand(this.H);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + rand(-18, 18), y + rand(-18, 18));
      g.stroke();
    }
    g.strokeStyle = 'rgba(190,170,60,.5)';
    g.lineWidth = 5;
    g.setLineDash([34, 26]);
    g.beginPath(); g.moveTo(0, cy); g.lineTo(this.W, cy); g.stroke();
    g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, this.H); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#3a3d42';
    g.fillRect(0, cy - roadW / 2 - 26, this.W, 26);
    g.fillRect(0, cy + roadW / 2, this.W, 26);
    g.fillRect(cx - roadW / 2 - 26, 0, 26, this.H);
    g.fillRect(cx + roadW / 2, 0, 26, this.H);
    g.strokeStyle = '#4a3a28';
    g.lineWidth = 10;
    g.strokeRect(5, 5, this.W - 10, this.H - 10);
  },

  groundCemetery(g) {
    g.fillStyle = '#1c202a';
    g.fillRect(0, 0, this.W, this.H);
    for (let i = 0; i < 800; i++) {
      g.fillStyle = pick(['#202634', '#181c26', '#232a38', '#1a1f2c']);
      g.beginPath();
      g.arc(rand(this.W), rand(this.H), rand(14, 60), 0, TAU);
      g.fill();
    }
    // grama alta e morta
    g.strokeStyle = 'rgba(90,110,140,.22)';
    g.lineWidth = 1;
    for (let i = 0; i < 1000; i++) {
      const x = rand(this.W), y = rand(this.H);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + rand(-3, 3), y - rand(4, 9));
      g.stroke();
    }
    // trilhas de terra em cruz
    const cx = this.W / 2, cy = this.H / 2, pathW = 110;
    g.fillStyle = '#33291f';
    g.fillRect(0, cy - pathW / 2, this.W, pathW);
    g.fillRect(cx - pathW / 2, 0, pathW, this.H);
    g.fillStyle = 'rgba(0,0,0,.2)';
    for (let i = 0; i < 200; i++) {
      const onH = Math.random() < 0.5;
      const x = onH ? rand(this.W) : cx + rand(-pathW / 2, pathW / 2);
      const y = onH ? cy + rand(-pathW / 2, pathW / 2) : rand(this.H);
      g.beginPath();
      g.arc(x, y, rand(2, 8), 0, TAU);
      g.fill();
    }
    // pedrinhas
    g.fillStyle = 'rgba(140,150,170,.25)';
    for (let i = 0; i < 300; i++) {
      g.beginPath();
      g.arc(rand(this.W), rand(this.H), rand(1, 3), 0, TAU);
      g.fill();
    }
    // névoa baixa
    for (let i = 0; i < 60; i++) {
      const x = rand(this.W), y = rand(this.H), r = rand(60, 160);
      const fog = g.createRadialGradient(x, y, 4, x, y, r);
      fog.addColorStop(0, 'rgba(150,170,200,.05)');
      fog.addColorStop(1, 'rgba(150,170,200,0)');
      g.fillStyle = fog;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
    // muro do cemitério
    g.strokeStyle = '#39424f';
    g.lineWidth = 12;
    g.strokeRect(6, 6, this.W - 12, this.H - 12);
  },

  groundIndustrial(g) {
    g.fillStyle = '#26272b';
    g.fillRect(0, 0, this.W, this.H);
    // manchas de concreto
    for (let i = 0; i < 700; i++) {
      g.fillStyle = pick(['#2a2b30', '#232427', '#2d2e33', '#28292d']);
      g.beginPath();
      g.arc(rand(this.W), rand(this.H), rand(16, 70), 0, TAU);
      g.fill();
    }
    // manchas de óleo
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(10,10,14,.45)';
      g.beginPath();
      g.ellipse(rand(this.W), rand(this.H), rand(14, 46), rand(8, 26), rand(TAU), 0, TAU);
      g.fill();
    }
    // rachaduras
    g.strokeStyle = 'rgba(0,0,0,.3)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 180; i++) {
      let x = rand(this.W), y = rand(this.H);
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += rand(-22, 22); y += rand(-22, 22);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // via de asfalto em cruz
    const cx = this.W / 2, cy = this.H / 2, roadW = 190;
    g.fillStyle = '#1f2023';
    g.fillRect(0, cy - roadW / 2, this.W, roadW);
    g.fillRect(cx - roadW / 2, 0, roadW, this.H);
    // faixas de segurança amarelas nas bordas da via
    g.strokeStyle = 'rgba(200,170,40,.5)';
    g.lineWidth = 6;
    g.setLineDash([26, 20]);
    for (const off of [-roadW / 2 + 6, roadW / 2 - 6]) {
      g.beginPath(); g.moveTo(0, cy + off); g.lineTo(this.W, cy + off); g.stroke();
      g.beginPath(); g.moveTo(cx + off, 0); g.lineTo(cx + off, this.H); g.stroke();
    }
    g.setLineDash([]);
    // cerca industrial
    g.strokeStyle = '#3a3f45';
    g.lineWidth = 12;
    g.strokeRect(6, 6, this.W - 12, this.H - 12);
  },

  bloodDecal(x, y, size = 1) {
    const g = this.bloodCtx;
    if (!g) return;
    g.globalAlpha = rand(0.25, 0.5);
    g.fillStyle = pick(['#5e0c0c', '#701010', '#4a0808']);
    for (let i = 0; i < 4 + size * 3; i++) {
      g.beginPath();
      g.arc(x + rand(-14, 14) * size, y + rand(-14, 14) * size, rand(2, 7) * size, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  },

  // ---------- desenho dos obstáculos ----------
  drawRect(ctx, o) {
    if (o.type === 'house') this.drawHouse(ctx, o);
    else if (o.type === 'car') this.drawCar(ctx, o);
    else if (o.type === 'container') this.drawContainer(ctx, o);
    else if (o.type === 'grave') this.drawGrave(ctx, o);
    else if (o.type === 'wall') this.drawWall(ctx, o);
    else if (o.type === 'furniture') this.drawFurniture(ctx, o);
    else if (o.type === 'gate') this.drawGate(ctx, o);
    else this.drawCrate(ctx, o);
  },

  drawGate(ctx, o) {
    const { x, y, w, h } = o;
    const horiz = w > h;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(x + 2, y + 2, w, h);
    // portão de barras metálicas
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#8a7a3a'); g.addColorStop(1, '#5a4e22');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    // grades
    ctx.strokeStyle = 'rgba(30,24,10,.6)'; ctx.lineWidth = 3;
    if (horiz) { for (let bx = x + 8; bx < x + w - 4; bx += 12) { ctx.beginPath(); ctx.moveTo(bx, y + 2); ctx.lineTo(bx, y + h - 2); ctx.stroke(); } }
    else { for (let by = y + 8; by < y + h - 4; by += 12) { ctx.beginPath(); ctx.moveTo(x + 2, by); ctx.lineTo(x + w - 2, by); ctx.stroke(); } }
    // brilho
    ctx.strokeStyle = 'rgba(255,240,160,.25)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, y + 2, w - 4, 2);
  },

  drawCircle(ctx, c, time) {
    if (c.type === 'tree') this.drawTree(ctx, c, time);
    else if (c.type === 'deadtree') this.drawDeadTree(ctx, c, time);
    else if (c.type === 'bush') this.drawBush(ctx, c, time);
    else if (c.type === 'hydrant') this.drawHydrant(ctx, c);
    else if (c.type === 'trashcan') this.drawTrashcan(ctx, c);
    else this.drawBarrel(ctx, c, time);
  },

  drawWall(ctx, o) {
    const { x, y, w, h } = o;
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, shade(o.hue, 18));
    g.addColorStop(1, shade(o.hue, -22));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    // topo iluminado
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(x, y, w, 3);
  },

  drawFurniture(ctx, o) {
    const { x, y, w, h, kind } = o;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(x + 3, y + 4, w, h);
    if (kind === 'bed') {
      ctx.fillStyle = '#c8c8d0'; roundRect(ctx, x, y, w, h, 4); ctx.fill();
      ctx.fillStyle = o.hue; ctx.fillRect(x, y, w, h * 0.5);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y + h - 12, w - 8, 8);
    } else if (kind === 'sofa') {
      ctx.fillStyle = o.hue; roundRect(ctx, x, y, w, h, 6); ctx.fill();
      ctx.fillStyle = shade(o.hue, 25); roundRect(ctx, x + 4, y + 4, w - 8, h - 10, 4); ctx.fill();
    } else if (kind === 'shelf') {
      ctx.fillStyle = shade(o.hue, -10); ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      for (let yy = y + 8; yy < y + h; yy += 12) ctx.fillRect(x, yy, w, 3);
      // produtos coloridos
      for (let k = 0; k < 6; k++) { ctx.fillStyle = pick(['#d04040', '#40a0d0', '#d0b040', '#50b050']); ctx.fillRect(x + 3 + (k % 3) * (w / 3), y + 4 + Math.floor(k / 3) * 12, w / 3 - 4, 8); }
    } else if (kind === 'table') {
      ctx.fillStyle = o.hue; roundRect(ctx, x, y, w, h, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    } else {
      this.drawCrate(ctx, { x, y, w, h });
    }
  },

  drawBush(ctx, b, time) {
    const sway = Math.sin(time * 1.1 + b.phase) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(b.x + 4, b.y + 6, b.canopy, b.canopy * 0.6, 0, 0, TAU); ctx.fill();
    // aglomerado de folhas
    const g = ctx.createRadialGradient(b.x - b.canopy * 0.3, b.y - b.canopy * 0.3, 3, b.x, b.y, b.canopy);
    g.addColorStop(0, '#4a7a34');
    g.addColorStop(1, '#25451c');
    ctx.fillStyle = g;
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * TAU + b.phase;
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * b.canopy * 0.4 + sway, b.y + Math.sin(a) * b.canopy * 0.35, b.canopy * 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath(); ctx.arc(b.x + sway, b.y, b.canopy * 0.7, 0, TAU); ctx.fill();
  },

  // atualiza a transparência dos telhados conforme jogadores entram
  updateRoofs(players, dt) {
    for (const rf of this.roofs) {
      let inside = false;
      for (const p of players) {
        if (p.alive && p.x > rf.x + 6 && p.x < rf.x + rf.w - 6 && p.y > rf.y + 6 && p.y < rf.y + rf.h - 6) { inside = true; break; }
      }
      const target = rf.abandoned ? 0 : (inside ? 0.12 : 1);
      rf.alpha = lerp(rf.alpha, target, 1 - Math.pow(0.0005, dt));
      rf._inside = inside;
    }
  },

  drawRoof(ctx, rf) {
    if (rf.abandoned || rf.alpha < 0.02) return;
    ctx.globalAlpha = rf.alpha;
    const { x, y, w, h } = rf;
    const g = ctx.createLinearGradient(x, y, x, y + h);
    if (rf.flat) { g.addColorStop(0, '#454c56'); g.addColorStop(1, '#2c313a'); }
    else { g.addColorStop(0, shade(rf.color, 18)); g.addColorStop(1, shade(rf.color, -20)); }
    ctx.fillStyle = g;
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
    // telhas / textura
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 2;
    if (rf.flat) {
      ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
      ctx.fillStyle = '#565e6a';
      ctx.fillRect(x + w * 0.3, y + 10, 26, 18);
    } else {
      for (let yy = y; yy < y + h; yy += 14) {
        ctx.beginPath(); ctx.moveTo(x - 6, yy); ctx.lineTo(x + w + 6, yy); ctx.stroke();
      }
      // cumeeira
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 6, y + 4); ctx.lineTo(x + w + 6, y + 4); ctx.stroke();
    }
    // borda
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 3;
    ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);
    // cadeado no cofre trancado (sinaliza que precisa de chave)
    if (rf.locked) {
      const px = x + w / 2, py = y + h / 2;
      const pulse = 0.7 + Math.sin(Date.now() / 300) * 0.3;
      ctx.fillStyle = `rgba(255,210,74,${0.25 * pulse})`;
      ctx.beginPath(); ctx.arc(px, py, 34, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c8a028';
      roundRect(ctx, px - 11, py - 4, 22, 18, 4); ctx.fill();
      ctx.strokeStyle = '#e8c860'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(px, py - 4, 7, Math.PI, TAU); ctx.stroke();
      ctx.fillStyle = '#5a4410';
      ctx.beginPath(); ctx.arc(px, py + 3, 2.5, 0, TAU); ctx.fill();
      ctx.fillRect(px - 1.5, py + 4, 3, 6);
    }
    ctx.globalAlpha = 1;
  },

  drawHydrant(ctx, o) {
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(o.x + 2, o.y + 6, 9, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c83028';
    roundRect(ctx, o.x - 6, o.y - 12, 12, 20, 4); ctx.fill();
    ctx.fillStyle = '#e85850';
    ctx.beginPath(); ctx.arc(o.x, o.y - 12, 6, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#902018';
    ctx.fillRect(o.x - 10, o.y - 6, 4, 6); ctx.fillRect(o.x + 6, o.y - 6, 4, 6);
    ctx.beginPath(); ctx.arc(o.x, o.y - 12, 2.5, 0, TAU); ctx.fill();
  },

  drawTrashcan(ctx, o) {
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(o.x + 2, o.y + 6, 10, 5, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(o.x - 9, 0, o.x + 9, 0);
    g.addColorStop(0, '#4a5058'); g.addColorStop(0.5, '#6a7078'); g.addColorStop(1, '#3a4048');
    ctx.fillStyle = g;
    roundRect(ctx, o.x - 9, o.y - 12, 18, 22, 3); ctx.fill();
    ctx.fillStyle = '#2a3038';
    roundRect(ctx, o.x - 11, o.y - 15, 22, 6, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5;
    for (let yy = o.y - 8; yy < o.y + 8; yy += 5) { ctx.beginPath(); ctx.moveTo(o.x - 8, yy); ctx.lineTo(o.x + 8, yy); ctx.stroke(); }
  },

  drawHouse(ctx, o) {
    const { x, y, w, h } = o;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(x + 10, y + 12, w, h);
    const wall = ctx.createLinearGradient(x, y, x, y + h);
    wall.addColorStop(0, o.hue);
    wall.addColorStop(1, shade(o.hue, -35));
    ctx.fillStyle = wall;
    ctx.fillRect(x, y, w, h);
    // telhado
    const roof = ctx.createLinearGradient(x, y, x, y + h * 0.55);
    if (o.flat) {
      roof.addColorStop(0, '#3f4650');
      roof.addColorStop(1, '#2c3138');
    } else {
      roof.addColorStop(0, '#3a3230');
      roof.addColorStop(1, '#241f1e');
    }
    ctx.fillStyle = roof;
    ctx.fillRect(x - 8, y - 8, w + 16, h * 0.55);
    if (o.flat) {
      // dutos de ventilação
      ctx.fillStyle = '#565e6a';
      ctx.fillRect(x + w * 0.2, y + 8, 30, 20);
      ctx.fillRect(x + w * 0.65, y + 14, 24, 24);
      ctx.strokeStyle = 'rgba(0,0,0,.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + w * 0.2, y + 8, 30, 20);
      ctx.strokeRect(x + w * 0.65, y + 14, 24, 24);
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 8, y - 8 + (h * 0.55 + 8) * i / 5);
        ctx.lineTo(x + w + 8, y - 8 + (h * 0.55 + 8) * i / 5);
        ctx.stroke();
      }
    }
    // porta
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(x + w / 2 - 14, y + h - 34, 28, 34);
    // janelas
    const winFill = o.win === 'cold' ? 'rgba(140,190,255,.5)' : o.win === 'cyan' ? 'rgba(90,230,255,.65)' : 'rgba(255,196,90,.85)';
    const winGlow = o.win === 'cold' ? 'rgba(120,170,255,.7)' : o.win === 'cyan' ? 'rgba(60,220,255,.8)' : 'rgba(255,180,60,.9)';
    ctx.fillStyle = winFill;
    ctx.shadowColor = winGlow;
    ctx.shadowBlur = 14;
    ctx.fillRect(x + 22, y + h - 44, 26, 20);
    ctx.fillRect(x + w - 48, y + h - 44, 26, 20);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(40,30,20,.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 22, y + h - 44, 26, 20);
    ctx.strokeRect(x + w - 48, y + h - 44, 26, 20);
  },

  drawCar(ctx, o) {
    const { x, y, w, h } = o;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    roundRect(ctx, x + 5, y + 6, w, h, 14); ctx.fill();
    const body = ctx.createLinearGradient(x, y, x, y + h);
    body.addColorStop(0, shade(o.hue, 20));
    body.addColorStop(1, shade(o.hue, -25));
    ctx.fillStyle = body;
    roundRect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.fillStyle = 'rgba(140,180,210,.35)';
    roundRect(ctx, x + w * 0.24, y + 6, w * 0.5, h - 12, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 14); ctx.stroke();
  },

  drawContainer(ctx, o) {
    const { x, y, w, h } = o;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(x + 6, y + 7, w, h);
    const body = ctx.createLinearGradient(x, y, x, y + h);
    body.addColorStop(0, shade(o.hue, 15));
    body.addColorStop(1, shade(o.hue, -30));
    ctx.fillStyle = body;
    ctx.fillRect(x, y, w, h);
    // nervuras
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 3;
    const horiz = w > h;
    const n = horiz ? Math.floor(w / 18) : Math.floor(h / 18);
    for (let i = 1; i < n; i++) {
      ctx.beginPath();
      if (horiz) { ctx.moveTo(x + i * 18, y + 2); ctx.lineTo(x + i * 18, y + h - 2); }
      else { ctx.moveTo(x + 2, y + i * 18); ctx.lineTo(x + w - 2, y + i * 18); }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  },

  drawGrave(ctx, o) {
    const { x, y, w, h } = o;
    // cova de terra
    ctx.fillStyle = 'rgba(30,24,18,.7)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.65, w * 0.75, h * 0.45, 0, 0, TAU);
    ctx.fill();
    // sombra da lápide
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(x + 3, y + 3, w, 16);
    if (o.cross) {
      ctx.strokeStyle = '#6a7180';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y - 8);
      ctx.lineTo(x + w / 2, y + 20);
      ctx.moveTo(x + w / 2 - 9, y);
      ctx.lineTo(x + w / 2 + 9, y);
      ctx.stroke();
    } else {
      const st = ctx.createLinearGradient(x, y - 10, x, y + 18);
      st.addColorStop(0, '#7a8294');
      st.addColorStop(1, '#4e5462');
      ctx.fillStyle = st;
      roundRect(ctx, x, y - 10, w, 28, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y - 10, w, 28, 8);
      ctx.stroke();
      // inscrição
      ctx.strokeStyle = 'rgba(20,22,30,.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 2); ctx.lineTo(x + w - 6, y + 2);
      ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + w - 8, y + 8);
      ctx.stroke();
    }
  },

  drawCrate(ctx, o) {
    const { x, y, w, h } = o;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(x + 4, y + 5, w, h);
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#6e5233');
    g.addColorStop(1, '#4a3620');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(30,20,10,.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  drawTree(ctx, t, time) {
    const sway = Math.sin(time * 0.8 + t.phase) * 2.5;
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.ellipse(t.x + 8, t.y + 8, t.canopy * 0.95, t.canopy * 0.75, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#3d2c1c';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.6, 0, TAU);
    ctx.fill();
    const g = ctx.createRadialGradient(t.x + sway - t.canopy * 0.3, t.y - t.canopy * 0.3, 4, t.x + sway, t.y, t.canopy);
    g.addColorStop(0, '#3f5c2b');
    g.addColorStop(0.7, '#2b4220');
    g.addColorStop(1, '#1d2e16');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(t.x + sway, t.y, t.canopy, 0, TAU);
    ctx.fill();
  },

  drawDeadTree(ctx, t, time) {
    const sway = Math.sin(time * 0.6 + t.phase) * 2;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(t.x + 5, t.y + 6, 16, 8, 0, 0, TAU);
    ctx.fill();
    // tronco retorcido
    ctx.strokeStyle = '#3a3430';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y + 4);
    ctx.quadraticCurveTo(t.x + 4 + sway, t.y - 18, t.x + sway, t.y - 34);
    ctx.stroke();
    // galhos secos
    ctx.lineWidth = 3.5;
    const branches = [[-1, -20, -18, -34], [1, -24, 16, -40], [-1, -30, -12, -46], [1, -14, 14, -22]];
    for (const [sgn, y1, bx, by] of branches) {
      ctx.beginPath();
      ctx.moveTo(t.x + sway * 0.5, t.y + y1);
      ctx.lineTo(t.x + bx + sway, t.y + by);
      ctx.stroke();
    }
  },

  drawBarrel(ctx, b, time) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(b.x + 3, b.y + 5, b.r, b.r * 0.6, 0, 0, TAU);
    ctx.fill();
    // barril explosivo não-tóxico = tambor de combustível vermelho
    const col = b.toxic ? '#3a6e34' : (b.explosive ? '#a83226' : '#6e4a2a');
    const body = ctx.createLinearGradient(b.x - b.r, b.y, b.x + b.r, b.y);
    body.addColorStop(0, shade(col, -25));
    body.addColorStop(0.5, shade(col, 20));
    body.addColorStop(1, shade(col, -30));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fill();
    // tampa
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r - 3, 0, TAU);
    ctx.stroke();
    if (b.toxic) {
      // gosma vazando pulsante
      const pulse = 0.5 + Math.sin(time * 3 + b.phase) * 0.3;
      ctx.fillStyle = `rgba(120,255,140,${pulse})`;
      ctx.shadowColor = 'rgba(120,255,140,.9)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4.5, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (b.explosive) {
      // símbolo de inflamável (chama amarela)
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - 5);
      ctx.quadraticCurveTo(b.x + 4, b.y, b.x + 1.5, b.y + 4);
      ctx.quadraticCurveTo(b.x + 5, b.y + 2, b.x, b.y + 5);
      ctx.quadraticCurveTo(b.x - 5, b.y + 2, b.x - 1.5, b.y + 4);
      ctx.quadraticCurveTo(b.x - 4, b.y, b.x, b.y - 5);
      ctx.fill();
      // faixa de alerta
      ctx.strokeStyle = 'rgba(255,220,60,.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 1, -0.5, 0.5); ctx.stroke();
    }
  },

  drawLampPost(ctx, l) {
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(l.x + 4, l.y + 5, 8, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a3f4a';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x, l.y - 52); ctx.stroke();
    ctx.fillStyle = this.theme.lampBulb;
    ctx.shadowColor = this.theme.lampBulb;
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(l.x, l.y - 56, 7, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
  },
};

// utilidades de desenho
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255);
  const g = clamp(((n >> 8) & 0xff) + amt, 0, 255);
  const b = clamp((n & 0xff) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}
