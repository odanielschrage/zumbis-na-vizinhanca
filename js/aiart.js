// ---------- Sprites gerados por IA: carregamento, chroma key, fatiamento e composição ----------
// Substitui o desenho procedural (cartoon.js) por sprites raster de assets/ai/*.jpg.
// Consistência por construção: cada ficha traz frente/costas/perfil numa única imagem;
// a arma é um asset isolado composto no ponto da mão (idêntica em toda vista).
const AIART = {
  ready: false,
  sheets: {},              // nome → [frente, costas, perfil] (canvases já recortados)
  ground: null,

  // fichas com 3 figuras cada
  MANIFEST: ['rex_aim', 'zeca_aim', 'bruna_aim', 'duda_aim',
             'zombie', 'werewolf', 'maniac', 'mummy', 'doll', 'brute', 'alien',
             'boss_abom', 'boss_necro', 'boss_reaper', 'civilian', 'weapons', 'weapons2'],

  // arma do jogo → ficha:índice + empunhadura (fração da largura/altura) + altura relativa ao herói
  WEAPON: {
    pistol:       { sheet: 'weapons',  i: 0, ax: 0.24, ay: 0.62, h: 0.12 },
    shotgun:      { sheet: 'weapons',  i: 1, ax: 0.46, ay: 0.50, h: 0.16 },
    flamethrower: { sheet: 'weapons',  i: 2, ax: 0.34, ay: 0.46, h: 0.19 },
    smg:          { sheet: 'weapons2', i: 0, ax: 0.40, ay: 0.55, h: 0.14 },
    rocket:       { sheet: 'weapons2', i: 1, ax: 0.44, ay: 0.50, h: 0.16 },
    freeze:       { sheet: 'weapons2', i: 2, ax: 0.28, ay: 0.56, h: 0.15 },
  },

  // herói (id de CHARACTERS) → ficha em pose de mira
  HERO: { zeca: 'zeca_aim', bruna: 'bruna_aim', duda: 'duda_aim', rex: 'rex_aim' },
  // sprite de monstro (ZTYPES.sprite) → ficha
  MONSTER: { zombie: 'zombie', werewolf: 'werewolf', maniac: 'maniac', mummy: 'mummy', doll: 'doll', brute: 'brute', alien: 'alien' },
  BOSS: { abomination: 'boss_abom', necromancer: 'boss_necro', reaper: 'boss_reaper' },

  // vista → índice na ficha
  VIEW: { down: 0, up: 1, side: 2 },

  // onde ficam as mãos nas vistas frente/costas (o perfil é detectado)
  HAND_FRAC: { down: { x: 0.50, y: 0.72 }, up: { x: 0.50, y: 0.80 } },

  load(base = 'assets/ai/') {
    const one = (name) => new Promise((ok) => {
      const img = new Image();
      img.onload = () => { try { this.sheets[name] = this.slice(this.chromaKey(img), 3); } catch (e) {} ok(); };
      img.onerror = () => ok();
      img.src = base + name + '.jpg';
    });
    const g = new Promise((ok) => { const i = new Image(); i.onload = () => { this.ground = i; ok(); }; i.onerror = ok; i.src = base + 'ground.jpg'; });
    return Promise.all(this.MANIFEST.map(one).concat(g)).then(() => { this.ready = true; return this; });
  },

  // remove o verde puro (tolerante a JPEG) e tira a franja verde das bordas
  chromaKey(img) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const dom = gg - Math.max(r, b);
      if (dom > 90) { d[i + 3] = 0; continue; }
      if (dom > 34) { d[i + 3] = Math.round(255 * (1 - (dom - 34) / 56)); d[i + 1] = Math.max(r, b); }
    }
    g.putImageData(id, 0, 0);
    return c;
  },

  // separa as figuras de uma ficha por faixas de colunas ocupadas; se figuras encostam
  // (foice, braços largos), divide a faixa larga nos vales de ocupação perto dos terços
  slice(keyed, expected) {
    const w = keyed.width, h = keyed.height;
    const d = keyed.getContext('2d').getImageData(0, 0, w, h).data;
    const cnt = new Uint16Array(w);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) cnt[x]++;
    const runs = [];
    let start = -1, gap = 0;
    for (let x = 0; x <= w; x++) {
      const on = x < w && cnt[x] > 0;
      if (on) { if (start < 0) start = x; gap = 0; }
      else if (start >= 0) { if (++gap > 14) { runs.push([start, x - gap]); start = -1; gap = 0; } }
    }
    if (start >= 0) runs.push([start, w - 1]);
    runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
    let keep = runs.slice(0, expected).sort((a, b) => a[0] - b[0]);
    if (keep.length < expected && keep.length > 0) {
      const wide = keep.reduce((a, b) => (b[1] - b[0]) > (a[1] - a[0]) ? b : a);
      const need = expected - keep.length + 1;
      const [x0, x1] = wide, span = x1 - x0 + 1, r = Math.round(span * 0.10);
      const cuts = [];
      for (let i = 1; i < need; i++) {
        const target = x0 + Math.round(span * i / need);
        let best = target, bv = Infinity;
        for (let x = Math.max(x0, target - r); x <= Math.min(x1, target + r); x++) if (cnt[x] < bv) { bv = cnt[x]; best = x; }
        cuts.push(best);
      }
      const pieces = []; let s = x0;
      for (const c of cuts) { pieces.push([s, c]); s = c + 1; }
      pieces.push([s, x1]);
      keep = keep.filter(k => k !== wide).concat(pieces).sort((a, b) => a[0] - b[0]);
    }
    return keep.map(([x0, x1]) => {
      let y0 = h, y1 = 0;
      for (let y = 0; y < h; y++) for (let x = x0; x <= x1; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (y < y0) y0 = y; if (y > y1) y1 = y; break; }
      const pad = 4, c = document.createElement('canvas');
      c.width = (x1 - x0 + 1) + pad * 2; c.height = (y1 - y0 + 1) + pad * 2;
      c.getContext('2d').drawImage(keyed, x0, y0, x1 - x0 + 1, y1 - y0 + 1, pad, pad, x1 - x0 + 1, y1 - y0 + 1);
      return c;
    });
  },

  // mão no perfil em pose de mira: região opaca mais à direita (braços estendidos)
  _hand: new WeakMap(),
  handPoint(c) {
    if (this._hand.has(c)) return this._hand.get(c);
    const w = c.width, h = c.height;
    const d = c.getContext('2d').getImageData(0, 0, w, h).data;
    let maxX = 0;
    for (let x = w - 1; x >= 0 && !maxX; x--) for (let y = 0; y < h; y++) if (d[(y * w + x) * 4 + 3] > 60) { maxX = x; break; }
    let sy = 0, n = 0;
    for (let x = Math.max(0, maxX - Math.round(w * 0.07)); x <= maxX; x++)
      for (let y = 0; y < h; y++) if (d[(y * w + x) * 4 + 3] > 60) { sy += y; n++; }
    const p = { x: (maxX - w * 0.02) / w, y: (n ? sy / n : h * 0.25) / h };   // em fração
    this._hand.set(c, p);
    return p;
  },

  view(sheet, view) {
    const s = this.sheets[sheet];
    return s ? (s[this.VIEW[view] || 0] || s[0]) : null;
  },

  // desenha uma figura com altura `height`, pés em (cx, footY)
  figure(g, c, cx, footY, height) {
    if (!c) return null;
    const s = height / c.height, w = c.width * s;
    g.drawImage(c, cx - w / 2, footY - height, w, height);
    return { s, w };
  },

  // herói com a arma composta na mão. Chamado dentro de CARTOON.blit (flip/flash por conta dele).
  // Altura fixa 104 = mesma do herói cartoon, para os fatores de escala existentes continuarem valendo.
  hero(g, look, cx, footY, view, weapon, t, moving) {
    const c = this.view(this.HERO[look] || 'rex_aim', view);
    if (!c) return false;
    const H = 104, s = H / c.height, w = c.width * s;
    const wd = this.WEAPON[weapon], wc = wd && this.sheets[wd.sheet] && this.sheets[wd.sheet][wd.i];
    // animação de caminhada por deslocamento: bob + leve inclinação (sem quadros extras)
    const bob = moving ? Math.abs(Math.sin(t * 9)) * 2.2 : Math.sin(t * 2) * 0.6;
    const lean = moving ? Math.sin(t * 9) * 0.045 : 0;
    g.save();
    g.translate(cx, footY - bob);
    g.rotate(lean);
    const drawWeapon = () => {
      if (!wc) return;
      const wh = H * wd.h, ws = wh / wc.height, ww = wc.width * ws;
      let hx, hy, rot = 0, k = 1;
      if (view === 'side') { const hp = this.handPoint(c); hx = -w / 2 + hp.x * w; hy = -H + hp.y * H; }
      else if (view === 'down') { hx = this.HAND_FRAC.down.x * w - w / 2; hy = -H + this.HAND_FRAC.down.y * H; rot = Math.PI / 2; k = 0.62; }
      else { hx = this.HAND_FRAC.up.x * w - w / 2; hy = -H + this.HAND_FRAC.up.y * H; rot = -Math.PI / 2; k = 0.75; }
      g.save();
      g.translate(hx, hy); g.rotate(rot); g.scale(k, k);
      g.drawImage(wc, -ww * wd.ax, -wh * wd.ay, ww, wh);
      g.restore();
    };
    // perfil e costas: arma por baixo (as mãos/corpo envolvem); frente: por cima (à frente do corpo)
    if (view !== 'down') drawWeapon();
    g.drawImage(c, -w / 2, -H, w, H);
    if (view === 'down') drawWeapon();
    g.restore();
    return true;
  },

  // monstro/chefe/civil: figura com bob de "arrasto". Altura 200 = altura do monstro cartoon em s=1,
  // para o `sscale` de cada ZTYPE continuar valendo.
  monster(g, sheet, cx, footY, view, t, height = 200) {
    const c = this.view(sheet, view);
    if (!c) return false;
    const bob = Math.sin(t * 4) * 2.5;
    const lean = Math.sin(t * 4) * 0.03;
    g.save();
    g.translate(cx, footY - Math.abs(bob));
    g.rotate(lean);
    this.figure(g, c, 0, 0, height);
    g.restore();
    return true;
  },
};
