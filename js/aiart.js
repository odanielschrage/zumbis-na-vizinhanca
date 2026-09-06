// ---------- Sprites gerados por IA: carregamento, chroma key, fatiamento e composição ----------
// Substitui o desenho procedural (cartoon.js) por sprites raster de assets/ai/*.jpg.
// Consistência por construção: cada ficha traz frente/costas/perfil numa única imagem;
// a arma é um asset isolado composto no ponto da mão (idêntica em toda vista).
// Caminhada: ciclos de 4 quadros (uma imagem por vista), escalados pelo MESMO fator e
// ancorados nos pés + centro das pernas, para não tremer entre quadros.
const AIART = {
  ready: false,
  sheets: {},              // nome → [frente, costas, perfil] (canvases já recortados)
  walk: {},                // nome → { side|down|up: { frames: [...], maxH } }
  ground: null,

  // fichas com 3 figuras cada
  MANIFEST: ['rex_aim', 'zeca_aim', 'bruna_aim', 'duda_aim',
             'zombie', 'werewolf', 'maniac', 'mummy', 'doll', 'brute', 'alien',
             'boss_abom', 'boss_necro', 'boss_reaper', 'civilian', 'weapons', 'weapons2'],
  // ciclos de caminhada disponíveis: [ficha, vista] → assets/ai/<ficha>_walk_<vista>.jpg
  WALK: ['rex_aim', 'zeca_aim', 'bruna_aim', 'duda_aim',
         'zombie', 'werewolf', 'maniac', 'mummy', 'doll', 'brute', 'alien', 'civilian', 'boss_abom', 'boss_necro']
    .flatMap(s => ['side', 'down', 'up'].map(v => [s, v])),
  WALK_FPS: 9,

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

  // alturas de ORIGEM (antes do scale do blit), MEDIDAS contra as figuras cartoon que substituem
  // (bbox opaco acima da linha dos pés em s=1), para os fatores de escala existentes
  // (0.46 do herói, sscale dos monstros, r*0.024 do chefe) continuarem valendo
  HH: 128,   // herói
  MH: 109,   // monstro (walker)
  CH: 92,    // civil
  BH: 138,   // chefe

  // onde ficam as mãos nas vistas frente/costas (o perfil é detectado)
  HAND_FRAC: { down: { x: 0.50, y: 0.72 }, up: { x: 0.50, y: 0.80 } },

  load(base = 'assets/ai/') {
    const img = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
    const one = async (name) => {
      const i = await img(base + name + '.jpg');
      if (i) { try { this.sheets[name] = this.slice(this.chromaKey(i), 3); } catch (e) {} }
    };
    const walk = async ([sheet, view]) => {
      const i = await img(`${base}${sheet}_walk_${view}.jpg`);
      if (!i) return;
      try {
        const frames = this.slice(this.chromaKey(i), 4);
        if (frames.length < 2) return;
        (this.walk[sheet] = this.walk[sheet] || {})[view] = { frames, maxH: Math.max(...frames.map(c => c.height)) };
      } catch (e) {}
    };
    const g = img(base + 'ground.jpg').then(i => { this.ground = i; });
    return Promise.all([...this.MANIFEST.map(one), ...this.WALK.map(walk), g]).then(() => { this.ready = true; return this; });
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
  // (foice, braços largos), divide a faixa larga nos vales de ocupação perto das divisões iguais
  slice(keyed, expected) {
    const w = keyed.width, h = keyed.height;
    const d = keyed.getContext('2d').getImageData(0, 0, w, h).data;
    const cnt = new Uint16Array(w);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) cnt[x]++;
    // faixas de colunas ocupadas; o vão mínimo é RELATIVO à largura (as fichas são reduzidas à
    // metade pelo otimizador, e um vão fixo em px juntava figuras vizinhas)
    const gapMax = Math.max(4, Math.round(w * 0.006));
    const runs = [];
    let start = -1, gap = 0;
    for (let x = 0; x <= w; x++) {
      const on = x < w && cnt[x] > 0;
      if (on) { if (start < 0) start = x; gap = 0; }
      else if (start >= 0) { if (++gap > gapMax) { runs.push([start, x - gap]); start = -1; gap = 0; } }
    }
    if (start >= 0) runs.push([start, w - 1]);
    // fragmentos (mão solta, ponta de foice) não são figuras: fundem-se à faixa vizinha mais próxima
    if (runs.length > expected) {
      const maxW = Math.max(...runs.map(r => r[1] - r[0]));
      for (let i = runs.length - 1; i >= 0 && runs.length > expected; i--) {
        const r = runs[i];
        if (r[1] - r[0] >= 0.25 * maxW) continue;
        const prev = runs[i - 1], next = runs[i + 1];
        const gp = prev ? r[0] - prev[1] : Infinity, gn = next ? next[0] - r[1] : Infinity;
        if (prev && gp <= gn) { prev[1] = r[1]; runs.splice(i, 1); }
        else if (next) { next[0] = r[0]; runs.splice(i, 1); }
      }
    }
    runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
    let keep = runs.slice(0, expected).sort((a, b) => a[0] - b[0]);
    // menos faixas que figuras esperadas → figuras encostadas
    if (keep.length < expected && keep.length > 0) {
      const widths = keep.map(k => k[1] - k[0]);
      const maxW = Math.max(...widths), minW = Math.min(...widths);
      if (maxW >= 1.5 * minW) {
        // uma faixa claramente mais larga = várias figuras coladas: divide ela nos vales
        const wide = keep[widths.indexOf(maxW)];
        keep = keep.filter(k => k !== wide).concat(this._splitRun(cnt, wide, expected - keep.length + 1)).sort((a, b) => a[0] - b[0]);
      } else if (expected % keep.length === 0 && expected / keep.length > 1) {
        // faixas parecidas em número que divide o esperado (ex.: 2 pares para 4 quadros): cada uma é um grupo
        const per = expected / keep.length;
        keep = keep.flatMap(k => this._splitRun(cnt, k, per));
      }
      // senão (ex.: 3 figuras parecidas para 4) a ficha veio com menos quadros — melhor manter do que partir uma
    }
    return keep.map(([x0, x1]) => this._crop(keyed, d, x0, x1));
  },

  // divide a faixa [x0,x1] em `need` pedaços, cortando nos vales de ocupação perto das divisões iguais
  _splitRun(cnt, [x0, x1], need) {
    const span = x1 - x0 + 1, r = Math.round(span * 0.10), cuts = [];
    for (let i = 1; i < need; i++) {
      const target = x0 + Math.round(span * i / need);
      let best = target, bv = Infinity;
      for (let x = Math.max(x0, target - r); x <= Math.min(x1, target + r); x++) if (cnt[x] < bv) { bv = cnt[x]; best = x; }
      cuts.push(best);
    }
    const pieces = []; let s = x0;
    for (const c of cuts) { pieces.push([s, c]); s = c + 1; }
    pieces.push([s, x1]);
    return pieces;
  },

  // recorta a faixa [x0,x1] pelo bbox opaco, com margem
  _crop(keyed, d, x0, x1) {
    const w = keyed.width, h = keyed.height;
    let y0 = h, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = x0; x <= x1; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (y < y0) y0 = y; if (y > y1) y1 = y; break; }
    const pad = 4, c = document.createElement('canvas');
    c.width = (x1 - x0 + 1) + pad * 2; c.height = (y1 - y0 + 1) + pad * 2;
    c.getContext('2d').drawImage(keyed, x0, y0, x1 - x0 + 1, y1 - y0 + 1, pad, pad, x1 - x0 + 1, y1 - y0 + 1);
    return c;
  },

  // ---- análise por sprite (cache por canvas) ----
  _px: new WeakMap(),
  _data(c) {
    if (!this._px.has(c)) this._px.set(c, c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
    return this._px.get(c);
  },

  // mão no perfil em pose de mira: região opaca mais à direita (braços estendidos), em fração
  _hand: new WeakMap(),
  handPoint(c) {
    if (this._hand.has(c)) return this._hand.get(c);
    const w = c.width, h = c.height, d = this._data(c);
    let maxX = 0;
    for (let x = w - 1; x >= 0 && !maxX; x--) for (let y = 0; y < h; y++) if (d[(y * w + x) * 4 + 3] > 60) { maxX = x; break; }
    let sy = 0, n = 0;
    for (let x = Math.max(0, maxX - Math.round(w * 0.07)); x <= maxX; x++)
      for (let y = 0; y < h; y++) if (d[(y * w + x) * 4 + 3] > 60) { sy += y; n++; }
    const p = { x: (maxX - w * 0.02) / w, y: (n ? sy / n : h * 0.25) / h };
    this._hand.set(c, p);
    return p;
  },

  // centro horizontal da REGIÃO DAS PERNAS (25% inferior), em fração da largura. Ancorar por aqui
  // (e não pelo centro do bbox) evita que braços estendidos e ciclos de caminhada façam o corpo pular.
  _ax: new WeakMap(),
  anchorX(c) {
    if (this._ax.has(c)) return this._ax.get(c);
    const w = c.width, h = c.height, d = this._data(c);
    let sx = 0, n = 0;
    for (let y = Math.round(h * 0.75); y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 60) { sx += x; n++; }
    const ax = n ? sx / n / w : 0.5;
    this._ax.set(c, ax);
    return ax;
  },

  view(sheet, view) {
    const s = this.sheets[sheet];
    return s ? (s[this.VIEW[view] || 0] || s[0]) : null;
  },

  // quadro de caminhada para (ficha, vista) no tempo t, ou null se não houver ciclo
  frame(sheet, view, t) {
    const ws = this.walk[sheet] && this.walk[sheet][view];
    if (!ws) return null;
    const i = Math.floor(t * this.WALK_FPS) % ws.frames.length;
    return { c: ws.frames[i], maxH: ws.maxH };
  },

  // desenha uma figura: `height` é a altura de referência; num ciclo de caminhada todos os quadros
  // usam o mesmo fator (height / maxH do ciclo) e ancoram nos pés, preservando o bob natural.
  figure(g, c, cx, footY, height, maxH) {
    if (!c) return null;
    const s = height / (maxH || c.height), w = c.width * s, h = c.height * s;
    g.drawImage(c, cx - this.anchorX(c) * w, footY - h, w, h);
    return { s, w, h };
  },

  // herói com a arma composta na mão. Chamado dentro de CARTOON.blit (flip/flash por conta dele).
  hero(g, look, cx, footY, view, weapon, t, moving) {
    const sheet = this.HERO[look] || 'rex_aim';
    const fr = moving ? this.frame(sheet, view, t) : null;
    const c = fr ? fr.c : this.view(sheet, view);
    if (!c) return false;
    const H = this.HH;
    const s = H / (fr ? fr.maxH : c.height), w = c.width * s, h = c.height * s;
    const wd = this.WEAPON[weapon], wc = wd && this.sheets[wd.sheet] && this.sheets[wd.sheet][wd.i];
    // com quadros, o movimento vem deles; sem quadros, caminhada por deslocamento (bob + inclinação)
    const bob = fr ? 0 : (moving ? Math.abs(Math.sin(t * 9)) * 2.2 : Math.sin(t * 2) * 0.6);
    const lean = fr ? Math.sin(t * 9) * 0.015 : (moving ? Math.sin(t * 9) * 0.045 : 0);
    const ax = this.anchorX(c);
    g.save();
    g.translate(cx, footY - bob);
    g.rotate(lean);
    const drawWeapon = () => {
      if (!wc) return;
      const wh = H * wd.h, ws = wh / wc.height, ww = wc.width * ws;
      let hx, hy, rot = 0, k = 1;
      if (view === 'side') { const hp = this.handPoint(c); hx = -ax * w + hp.x * w; hy = -h + hp.y * h; }
      else if (view === 'down') { hx = (this.HAND_FRAC.down.x - ax) * w; hy = -h + this.HAND_FRAC.down.y * h; rot = Math.PI / 2; k = 0.62; }
      else { hx = (this.HAND_FRAC.up.x - ax) * w; hy = -h + this.HAND_FRAC.up.y * h; rot = -Math.PI / 2; k = 0.75; }
      g.save();
      g.translate(hx, hy); g.rotate(rot); g.scale(k, k);
      g.drawImage(wc, -ww * wd.ax, -wh * wd.ay, ww, wh);
      g.restore();
    };
    // perfil e costas: arma por baixo (as mãos/corpo envolvem); frente: por cima (à frente do corpo)
    if (view !== 'down') drawWeapon();
    g.drawImage(c, -ax * w, -h, w, h);
    if (view === 'down') drawWeapon();
    g.restore();
    return true;
  },

  // monstro/chefe/civil: quadros de caminhada quando existem; senão, bob de "arrasto"
  monster(g, sheet, cx, footY, view, t, height = this.MH, moving = true) {
    const fr = moving ? this.frame(sheet, view, t) : null;
    const c = fr ? fr.c : this.view(sheet, view);
    if (!c) return false;
    const bob = fr ? 0 : Math.abs(Math.sin(t * 4)) * 2.5;
    const lean = fr ? Math.sin(t * 4) * 0.012 : Math.sin(t * 4) * 0.03;
    g.save();
    g.translate(cx, footY - bob);
    g.rotate(lean);
    this.figure(g, c, 0, 0, height, fr ? fr.maxH : null);
    g.restore();
    return true;
  },
};
