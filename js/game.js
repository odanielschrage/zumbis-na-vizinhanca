// ---------- Núcleo do jogo: loop, ondas, câmera, iluminação e HUD ----------
// Modo história: as fases ciclam por estes cenários (5 ondas cada, chefe no fim).
const MAP_CYCLE = ['suburb', 'cemetery', 'industrial'];

// Dificuldades: vida/dano dos inimigos, quantidade por onda e multiplicador de pontos
const DIFFS = {
  easy:   { name: 'Fácil',   icon: '😌', zhp: 0.75, zdmg: 0.70, count: 0.80, scoreMult: 0.8 },
  normal: { name: 'Normal',  icon: '🙂', zhp: 1.00, zdmg: 1.00, count: 1.00, scoreMult: 1.0 },
  hard:   { name: 'Difícil', icon: '💀', zhp: 1.35, zdmg: 1.30, count: 1.20, scoreMult: 1.3 },
};

// arma → ícone desenhado (cartão do jogador na HUD)
const WEAP_ICON = { pistol: 'gun', smg: 'gun', shotgun: 'gun', flamethrower: 'fire', rocket: 'rocket', freeze: 'snow' };

const Game = {
  canvas: null, ctx: null,
  lightCanvas: null, lightCtx: null,
  W: 0, H: 0,

  state: 'menu',        // menu | playing | gameover
  paused: false,
  numPlayers: 1,

  players: [],
  zombies: [],
  neighbors: [],
  bullets: [],
  enemyShots: [],       // projéteis inimigos (ácido/magia)
  pickups: [],
  flashes: [],          // luzes de tiro {x,y,t}
  boss: null,           // chefe atual (também vive em zombies[])

  mapKey: 'suburb',
  diff: 'normal',       // dificuldade selecionada (easy | normal | hard)
  get diffDef() { return DIFFS[this.diff] || DIFFS.normal; },
  wave: 0,
  spawnQueue: 0,
  spawnT: 0,
  intermissionT: 0,
  score: 0,
  neighborsLost: 0,
  bossesKilled: 0,
  gameoverT: 0,
  combo: 0,             // sequência de abates
  comboT: 0,            // tempo restante do combo
  keys: 0,              // chaves coletadas (destravam cofres)
  objective: null,      // objetivo especial da onda (ninhos/escolta/defesa)
  floaters: [],         // números de dano flutuantes
  corpses: [],          // corpos de zumbis (animação de morte: tombar+achatar+fade)
  transT: 0,            // transição de fade ao entrar em nova fase (cobre a troca de cenário)
  transDur: 0.65,
  cbMode: false,        // modo daltônico (cores acessíveis)
  hitStopT: 0,          // congelamento breve em golpes fortes
  lowBeatT: 0,          // temporizador do batimento cardíaco (vida baixa)

  cam: { x: 0, y: 0, zoom: 1 },
  shakeAmt: 0,
  time: 0,
  last: 0,

  // ---------- setup ----------
  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    Input.init(this.canvas);

    // sprites gerados por IA: carrega em segundo plano; até ficar pronto, os draw()
    // caem no motor cartoon (AIART.ready === false)
    AIART.load();

    // aba oculta: suspende o áudio (congela o currentTime, evita rajada de notas
    // ao voltar) e retoma ao refocar. O loop de rAF já pausa sozinho quando oculto.
    document.addEventListener('visibilitychange', () => {
      const actx = Sound.getCtx && Sound.getCtx();
      if (!actx) return;
      if (document.hidden) {
        if (actx.state === 'running') { actx.suspend(); this._audioHidden = true; }
      } else if (this._audioHidden) {
        this._audioHidden = false;
        if (actx.state === 'suspended') actx.resume();
      }
    });

    document.getElementById('btn1p').onclick = () => { Sound.init(); Sound.click(); this.openCharSelect(1); };
    document.getElementById('btn2p').onclick = () => { Sound.init(); Sound.click(); this.openCharSelect(2); };
    document.getElementById('csBack').onclick = () => { Sound.click(); this.toMenu(); };
    document.getElementById('shopGo').onclick = () => { Sound.click(); this.closeShop(); };
    document.getElementById('btnResume').onclick = () => { Sound.click(); this.setPaused(false); };
    document.getElementById('btnQuit').onclick = () => { Sound.click(); this.toMenu(); };
    document.getElementById('btnRetry').onclick = () => { Sound.click(); this.openCharSelect(this.numPlayers); };
    document.getElementById('btnMenu').onclick = () => { Sound.click(); this.toMenu(); };
    this.buildCharCards();
    this.initAudioControls();
    this.initHudIcons();

    // controles remapeáveis (persistidos em zv_keys)
    Controls.load();
    this.updateControlHints();
    document.getElementById('btnOptions').onclick = () => { Sound.init(); Sound.click(); this.openOptions(); };
    document.getElementById('optBack').onclick = () => { Sound.click(); this.closeOptions(); };
    document.getElementById('btnControls').onclick = () => { Sound.init(); Sound.click(); this.openControls('options'); };
    document.getElementById('btnPauseControls').onclick = () => { Sound.click(); this.openControls('pause'); };
    document.getElementById('ctrlBack').onclick = () => { Sound.click(); this.closeControls(); };
    document.getElementById('ctrlReset').onclick = () => {
      Sound.click();
      Controls.reset();
      this.renderBinds();
      this.updateControlHints();
      this.setBindMsg('Controles restaurados para o padrão.');
    };

    // dificuldade (persistida) + recorde
    try { const d = localStorage.getItem('zv_diff'); if (DIFFS[d]) this.diff = d; } catch (e) {}
    document.querySelectorAll('.diffbtn').forEach(btn => {
      btn.classList.toggle('sel', btn.dataset.diff === this.diff);
      btn.onclick = () => {
        Sound.init(); Sound.click();
        this.diff = btn.dataset.diff;
        try { localStorage.setItem('zv_diff', this.diff); } catch (e) {}
        document.querySelectorAll('.diffbtn').forEach(b => b.classList.toggle('sel', b === btn));
        this.updateHighline();
      };
    });
    this.updateHighline();

    // modo daltônico (persistido)
    try { this.cbMode = localStorage.getItem('zv_cb') === '1'; } catch (e) {}
    this.applyCbMode();
    const cbEl = document.getElementById('cbMode');
    if (cbEl) {
      cbEl.checked = this.cbMode;
      cbEl.onchange = () => {
        this.cbMode = cbEl.checked;
        try { localStorage.setItem('zv_cb', this.cbMode ? '1' : '0'); } catch (e) {}
        this.applyCbMode();
      };
    }

    World.generate(this.mapKey);
    this.cam.x = World.W / 2;
    this.cam.y = World.H / 2;

    requestAnimationFrame(t => this.frame(t));
  },

  initAudioControls() {
    // carrega preferências (0..1); música default 0.7, efeitos 0.67 (→ ~0.4 no master)
    let mv = 0.7, sv = 0.67;
    try {
      const saved = JSON.parse(localStorage.getItem('zv_audio') || '{}');
      if (saved.music != null) mv = saved.music;
      if (saved.sfx != null) sv = saved.sfx;
    } catch (e) { /* ignora */ }
    Music.setVolume(mv);
    Sound.setVolume(sv * 0.6);
    const save = () => { try { localStorage.setItem('zv_audio', JSON.stringify({ music: mv, sfx: sv })); } catch (e) {} };
    const syncUI = () => {
      document.querySelectorAll('.vol-music').forEach(el => el.value = Math.round(mv * 100));
      document.querySelectorAll('.vol-sfx').forEach(el => el.value = Math.round(sv * 100));
    };
    syncUI();
    document.querySelectorAll('.vol-music').forEach(el => el.addEventListener('input', e => {
      mv = e.target.value / 100; Music.setVolume(mv); syncUI(); save();
    }));
    document.querySelectorAll('.vol-sfx').forEach(el => el.addEventListener('input', e => {
      sv = e.target.value / 100; Sound.setVolume(sv * 0.6); syncUI(); save();
      Sound.init(); Sound.click();   // feedback audível ao ajustar
    }));
  },

  resize() {
    // nunca deixa 0 (um canvas 0x0 faz drawImage lançar InvalidStateError)
    const w = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const h = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    this.W = this.canvas.width = this.lightCanvas.width = w;
    this.H = this.canvas.height = this.lightCanvas.height = h;
  },

  // ---------- seleção de personagem ----------
  buildCharCards() {
    const row = document.getElementById('charrow');
    row.innerHTML = '';
    this.charCanvases = [];
    CHARACTERS.forEach((ch, i) => {
      const card = document.createElement('button');
      card.className = 'charcard';
      card.dataset.idx = i;
      const cv = document.createElement('canvas');
      cv.width = 150; cv.height = 170;
      const nm = document.createElement('div'); nm.className = 'cname'; nm.textContent = ch.name; nm.style.color = ch.tint;
      const tr = document.createElement('div'); tr.className = 'ctrait'; tr.textContent = ch.perkName || ch.trait;
      const tag = document.createElement('div'); tag.dataset.tag = i; // rótulo P1/P2
      card.append(cv, nm, tr, tag);
      card.onclick = () => this.pickChar(i);
      row.appendChild(card);
      this.charCanvases.push(cv.getContext('2d'));
    });
  },

  openCharSelect(n) {
    this.numPlayers = n;
    this.charPick = [];
    this.picker = 0;
    this.state = 'charselect';
    this.paused = false;
    hide('menu'); hide('hud'); hide('gameover'); hide('pause');
    show('charselect');
    // limpa marcações
    document.querySelectorAll('.charcard').forEach(c => {
      c.classList.remove('p1', 'p2', 'taken');
      c.querySelector('[data-tag]').textContent = '';
      c.querySelector('[data-tag]').className = '';
    });
    this.updateCsPrompt();
  },

  updateCsPrompt() {
    const promptEl = document.getElementById('csPrompt');
    const picksEl = document.getElementById('csPicks');
    if (this.numPlayers === 1) {
      promptEl.innerHTML = 'ESCOLHA SEU <span style="color:#9dff5e">HERÓI</span>';
      picksEl.textContent = '';
    } else if (this.picker === 0) {
      promptEl.innerHTML = '<span style="color:#5ec8ff">JOGADOR 1</span>, escolha!';
      picksEl.textContent = 'Player Left · pressione para escolher';
    } else {
      promptEl.innerHTML = '<span style="color:#ffb84d">JOGADOR 2</span>, escolha!';
      const p1 = CHARACTERS[this.charPick[0]];
      picksEl.innerHTML = `J1: <b style="color:#5ec8ff">${p1.name}</b> · agora o Player Right`;
    }
  },

  pickChar(idx) {
    if (this.state !== 'charselect') return;
    // no 2P o segundo não pode repetir o primeiro
    if (this.numPlayers === 2 && this.picker === 1 && this.charPick[0] === idx) { Sound.empty(); return; }
    Sound.pickup();
    this.charPick[this.picker] = idx;
    const card = document.querySelector(`.charcard[data-idx="${idx}"]`);
    const tag = card.querySelector('[data-tag]');
    if (this.numPlayers === 1) { this.startWithChars(); return; }
    if (this.picker === 0) {
      card.classList.add('p1');
      tag.className = 'tag1'; tag.textContent = 'JOGADOR 1';
      this.picker = 1;
      this.updateCsPrompt();
    } else {
      card.classList.add('p2');
      tag.className = 'tag2'; tag.textContent = 'JOGADOR 2';
      setTimeout(() => this.startWithChars(), 260);
    }
  },

  startWithChars() {
    this.chosenChars = this.charPick.map(i => CHARACTERS[i]);
    this.start(this.numPlayers);
  },

  // ---------- fluxo de estados ----------
  start(n) {
    this.numPlayers = n;
    this.fase = 1;
    this.mapKey = MAP_CYCLE[0];          // história sempre começa no Subúrbio
    World.generate(this.mapKey);
    Particles.clear();
    this.players = [];
    const cx = World.W / 2, cy = World.H / 2;
    const chars = this.chosenChars || [];
    this.players.push(new Player(0, cx - (n === 2 ? 40 : 0), cy, chars[0]));
    if (n === 2) this.players.push(new Player(1, cx + 40, cy, chars[1]));
    this.zombies = [];
    this.neighbors = [];
    this.corpses = [];
    this.transT = 0;
    this.bullets = [];
    this.enemyShots = [];
    this.pickups = [];
    this.flashes = [];
    this.boss = null;
    this.wave = 0;
    this.score = 0;    // pontuação total (recorde) — nunca cai ao comprar
    this.money = 0;    // carteira gasta na loja
    this.neighborsLost = 0;
    this.bossesKilled = 0;
    this.combo = 0;
    this.comboT = 0;
    this.keys = 0;
    this.objective = null;
    this.floaters = [];
    this.hitStopT = 0;
    this.lowBeatT = 0;
    this.spawnQueue = 0;
    this.state = 'playing';
    this.paused = false;
    this.startIntermission(3);

    show('hud');
    hide('menu'); hide('gameover'); hide('pause'); hide('charselect'); hide('shop');
    document.getElementById('combo').classList.add('hidden');
    document.getElementById('bossbar').classList.add('hidden');
    document.getElementById('p2card').classList.toggle('hidden', n < 2);
    // nome do personagem no card do HUD
    this.players.forEach(p => {
      const el = document.querySelector(`#p${p.id + 1}card .pname`);
      if (el) el.textContent = p.char.name;
    });
    Music.start('game');
  },

  toMenu() {
    this.state = 'menu';
    this.paused = false;
    hide('hud'); hide('gameover'); hide('pause'); hide('charselect'); hide('shop');
    show('menu');
    this.updateHighline();
    Music.start('menu');
  },

  setPaused(p) {
    this.paused = p;
    document.getElementById('pause').classList.toggle('hidden', !p);
  },

  // ---------- recordes (por dificuldade, salvos no navegador) ----------
  loadHigh() {
    try { return JSON.parse(localStorage.getItem('zv_high') || '{}'); } catch (e) { return {}; }
  },

  updateHighline() {
    const el = document.getElementById('highline');
    if (!el) return;
    const rec = this.loadHigh()[this.diff];
    el.textContent = rec
      ? `🏆 Recorde (${DIFFS[this.diff].name}): ${rec.score} pts · Fase ${rec.fase}, Onda ${rec.wave}`
      : `🏆 Sem recorde no ${DIFFS[this.diff].name} ainda — faça história!`;
  },

  // ---------- LOJA entre fases ----------
  shopCatalog() {
    const ps = this.players;
    const AMMO = { smg: 60, shotgun: 12, flamethrower: 100, rocket: 5, freeze: 16 };
    const giveAll = (w) => ps.forEach(p => p.giveWeapon(w, AMMO[w]));
    const items = [
      { icon: '❤️', name: 'Kit Médico', desc: 'Cura 50 (todos)', cost: 150, buy: () => ps.forEach(p => { if (p.alive) p.hp = Math.min(p.maxHp, p.hp + 50); }) },
      { icon: '📦', name: 'Munição', desc: 'Reabastece suas armas', cost: 250, buy: () => ps.forEach(p => { for (const w of p.weapons) if (w !== 'pistol') p.ammo[w] += Math.round(AMMO[w] * p.ammoMult); }) },
      { icon: '💪', name: 'Vida Máx +25', desc: 'Permanente (todos)', cost: 550, buy: () => ps.forEach(p => { p.maxHp += 25; p.hp += 25; }) },
      { icon: '👟', name: 'Velocidade +8%', desc: 'Permanente (todos)', cost: 500, buy: () => ps.forEach(p => { p.speed *= 1.08; }) },
      { icon: '💥', name: 'Metralhadora', desc: 'Cadência alta', cost: 350, buy: () => giveAll('smg') },
      { icon: '🎯', name: 'Escopeta', desc: 'Tiro em leque', cost: 400, buy: () => giveAll('shotgun') },
      { icon: '❄️', name: 'Congelador', desc: 'Congela zumbis 3s', cost: 650, buy: () => giveAll('freeze') },
      { icon: '🔥', name: 'Lança-chamas', desc: 'Cone de fogo', cost: 850, buy: () => giveAll('flamethrower') },
      { icon: '🚀', name: 'Bazuca', desc: 'Explosão em área', cost: 950, buy: () => giveAll('rocket') },
    ];
    // reviver parceiro caído (co-op)
    if (this.numPlayers === 2 && ps.some(p => !p.alive)) {
      items.push({ icon: '✚', name: 'Reviver Parceiro', desc: 'Traz o caído de volta', cost: 400, buy: () => {
        const down = ps.find(p => !p.alive);
        if (down) { down.alive = true; down.hp = Math.round(down.maxHp * 0.6); down.reviveT = 0; Particles.sparkle(down.x, down.y, '#7dff9e'); }
      } });
    }
    return items;
  },

  openShop() {
    this.state = 'shop';
    Music.setMode('menu');
    Sound.vault();
    this.shopItems = this.shopCatalog();
    document.getElementById('shopTitle').textContent = `FASE ${this.fase} VENCIDA! · LOJA`;
    this.renderShop();
    show('shop');
  },

  renderShop() {
    document.getElementById('shopMoney').textContent = `💰 ${this.money}`;
    const box = document.getElementById('shopItems');
    box.innerHTML = '';
    this.shopItems.forEach((it, i) => {
      const el = document.createElement('button');
      el.className = 'shopitem' + (this.money < it.cost ? ' disabled' : '');
      el.innerHTML = `<span class="sico">${it.icon}</span><span class="sname">${it.name}</span><span class="sdesc">${it.desc}</span><span class="scost">💰 ${it.cost}</span>`;
      el.onclick = () => this.buyItem(i, el);
      box.appendChild(el);
    });
  },

  buyItem(i, el) {
    const it = this.shopItems[i];
    if (!it || this.money < it.cost) { Sound.empty(); return; }
    this.money -= it.cost;   // gasta dinheiro, não abaixa o recorde (score)
    it.buy();
    Sound.pickup();
    el.classList.add('flash');
    setTimeout(() => this.renderShop(), 120);   // atualiza preços/saldo
  },

  closeShop() {
    hide('shop');
    this.state = 'playing';
    Music.setMode('game');
    this.startIntermission(2.2);   // dá um respiro e dispara a próxima fase (banner FASE N)
  },

  gameOver() {
    this.state = 'gameover';
    const kills = this.players.reduce((s, p) => s + p.kills, 0);
    const rescued = this.players.reduce((s, p) => s + p.rescued, 0);

    // recorde por dificuldade
    const high = this.loadHigh();
    const prev = high[this.diff];
    const isRecord = this.score > 0 && (!prev || this.score > prev.score);
    if (isRecord) {
      high[this.diff] = { score: this.score, fase: this.fase || 1, wave: this.wave };
      try { localStorage.setItem('zv_high', JSON.stringify(high)); } catch (e) {}
    }

    document.getElementById('stats').innerHTML =
      (isRecord ? `<div style="color:#ffd75e;font-size:20px;font-weight:900;letter-spacing:2px;text-shadow:0 0 16px rgba(255,215,94,.6)">🏆 NOVO RECORDE!</div>` : '') +
      `Chegou à <b>FASE ${this.fase || 1}</b> · Onda ${this.wave} · ${DIFFS[this.diff].icon} ${DIFFS[this.diff].name}<br>` +
      `🧟 Zumbis eliminados: <b>${kills}</b><br>` +
      (this.bossesKilled ? `👹 Chefes derrotados: <b>${this.bossesKilled}</b><br>` : '') +
      `🙋 Vizinhos resgatados: <b>${rescued}</b>` +
      (this.neighborsLost ? ` <span style="opacity:.6">(${this.neighborsLost} perdidos)</span>` : '') +
      `<br>⭐ Pontuação: <b>${this.score}</b>` +
      (!isRecord && prev ? `<br><span style="opacity:.6;font-size:13px">🏆 Recorde: ${prev.score}</span>` : '');
    document.getElementById('bossbar').classList.add('hidden');
    document.getElementById('combo').classList.add('hidden');
    Music.setMode('menu');
    show('gameover');
  },

  // ---------- ondas ----------
  startIntermission(secs) {
    this.intermissionT = secs;
  },

  nextWave() {
    this.wave++;
    const w = this.wave;
    this.waveScale = 1 + (w - 1) * 0.07;
    this.isBossWave = (w % 5 === 0);
    this.fase = Math.ceil(w / 5);

    // início de fase: troca de cenário (exceto a fase 1, já gerada no start)
    const wantMap = MAP_CYCLE[(this.fase - 1) % MAP_CYCLE.length];
    const faseStart = (w % 5 === 1);
    if (faseStart && this.mapKey !== wantMap) {
      this.mapKey = wantMap;
      World.generate(wantMap);
      // limpa a arena e reposiciona os jogadores no novo cenário
      this.zombies = []; this.bullets = []; this.enemyShots = []; this.pickups = []; this.neighbors = []; this.boss = null; this.objective = null;
      Particles.clear();
      const cx = World.W / 2, cy = World.H / 2;
      this.players.forEach((p, i) => {
        p.x = cx + (this.numPlayers === 2 ? (i === 0 ? -40 : 40) : 0);
        p.y = cy;
        if (!p.alive && this.players.some(o => o.alive)) { p.alive = true; p.hp = Math.max(p.hp, 60); }
        World.resolve(p);
      });
    }
    if (faseStart) {
      this.transT = this.transDur;   // entrada com fade (revela o novo cenário)
      this.banner(`FASE ${this.fase}`, THEMES[this.mapKey].name.toUpperCase(), 2.6, 'gold');
      // baús de tesouro escondidos dentro das construções (recompensa por explorar)
      const nLoot = 1 + (Math.random() < 0.6 ? 1 : 0);
      for (let i = 0; i < nLoot; i++) {
        const s = World.spotInside();
        if (s) this.pickups.push(new Pickup(s.x, s.y, 'loot'));
      }
      // 1 chave em área aberta para cada cofre trancado da fase
      const vaults = World.roofs.filter(r => r.locked);
      for (let i = 0; i < vaults.length; i++) {
        const s = World.spotOutside(220);
        if (s) this.pickups.push(new Pickup(s.x, s.y, 'key'));
      }
    }

    // revive parceiro caído no início da onda (co-op)
    for (const p of this.players) {
      if (!p.alive) {
        const buddy = this.players.find(o => o.alive);
        if (buddy) {
          p.alive = true;
          p.hp = 60;
          p.x = buddy.x + rand(-30, 30);
          p.y = buddy.y + rand(-30, 30);
          World.resolve(p);
          Particles.sparkle(p.x, p.y, '#7dcfff');
          this.banner(`JOGADOR ${p.id + 1} VOLTOU!`, '', 1.6);
        }
      }
    }

    if (this.isBossWave) {
      // onda de chefe: alguns lacaios + o chefe
      this.spawnQueue = Math.min(Math.round((6 + w) * this.diffDef.count), 24);
      this.spawnT = 0;
      this.spawnBoss();
    } else {
      this.spawnQueue = Math.min(Math.round((8 + w * 5) * this.diffDef.count), 80);
      this.spawnT = 0;
      // vizinhos para resgatar (alguns escondidos dentro de construções)
      const nCount = Math.min(2 + Math.floor(w / 2), 5);
      for (let i = 0; i < nCount; i++) {
        let spot = null;
        if (World.interiors.length && Math.random() < 0.45) spot = World.spotInside();
        if (!spot) spot = World.findFreeSpot(30, 350);
        if (spot) this.neighbors.push(new Neighbor(spot.x, spot.y));
      }
      Sound.wave();
      // no início da fase o banner "FASE N" já apareceu; senão mostra a onda
      if (!faseStart) this.banner(`ONDA ${w}`, `${nCount} vizinhos precisam de você`, 2.2);
      // 3ª onda de cada fase = objetivo especial (rotaciona por fase)
      this.objective = null;
      if (w % 5 === 3) this.startObjective();
    }
  },

  // ---------- objetivos especiais (ninhos / escolta / defesa) ----------
  startObjective() {
    const type = ['nests', 'escort', 'defend'][(this.fase - 1) % 3];
    if (type === 'nests') {
      const n = this.fase > 3 ? 3 : 2;
      let placed = 0;
      for (let i = 0; i < n; i++) {
        const s = World.spotOutside(500) || World.findFreeSpot(40);
        if (s) { this.zombies.push(new Nest(s.x, s.y, this.waveScale)); placed++; }
      }
      if (!placed) return;
      this.objective = { type, total: placed };
      this.banner('☣ DESTRUA OS NINHOS!', 'eles geram zumbis sem parar · +800', 2.8, 'boss');
    } else if (type === 'escort') {
      const p = this.players.find(pl => pl.alive);
      if (!p) return;
      const vip = new Neighbor(p.x + rand(-70, 70), p.y + rand(-70, 70), true);
      World.resolve(vip);
      this.neighbors.push(vip);
      // ponto de extração bem longe
      let s = null;
      for (let i = 0; i < 40; i++) {
        const c = World.spotOutside(300);
        if (c && dist(c.x, c.y, p.x, p.y) > 750) { s = c; break; }
      }
      if (!s) s = { x: p.x < World.W / 2 ? World.W - 180 : 180, y: p.y < World.H / 2 ? World.H - 180 : 180 };
      this.objective = { type, vip, ex: s.x, ey: s.y };
      this.banner('⭐ ESCOLTE O VIZINHO!', 'leve-o ao sinalizador verde · +900', 2.8, 'gold');
    } else {
      const s = World.spotOutside(350) || { x: World.W / 2, y: World.H / 2 };
      this.objective = { type, x: s.x, y: s.y, r: 130, need: 18, t: 0 };
      this.banner('🚩 DEFENDA A ZONA!', 'fique dentro dela por 18s · +800', 2.8, 'gold');
    }
  },

  objectiveDone(msg, reward, dropAt) {
    this.addScore(reward);
    this.objective = null;
    Sound.rescue();
    this.banner(msg, `+${reward} pontos`, 2.2, 'gold');
    if (dropAt) {
      this.pickups.push(new Pickup(dropAt.x + rand(-20, 20), dropAt.y + rand(-20, 20), 'medkit'));
      this.pickups.push(new Pickup(dropAt.x + rand(-20, 20), dropAt.y + rand(-20, 20), pick(['smg', 'shotgun', 'freeze'])));
      Particles.sparkle(dropAt.x, dropAt.y, '#7dff9e');
    }
  },

  updateObjective(dt, alive) {
    const o = this.objective;
    if (!o) return;
    if (o.type === 'escort') {
      if (o.vip.alive && dist(o.vip.x, o.vip.y, o.ex, o.ey) < 64) {
        const i = this.neighbors.indexOf(o.vip);
        if (i >= 0) this.neighbors.splice(i, 1);
        Particles.sparkle(o.ex, o.ey, '#ffe066');
        this.objectiveDone('⭐ EXTRAÇÃO COMPLETA!', 900, { x: o.ex, y: o.ey });
      }
    } else if (o.type === 'defend') {
      const inside = alive.some(p => dist(p.x, p.y, o.x, o.y) < o.r);
      if (inside) {
        o.t += dt;
        if (Math.random() < dt * 5) Particles.sparkle(o.x + rand(-o.r * 0.6, o.r * 0.6), o.y + rand(-o.r * 0.5, o.r * 0.5), '#7dff9e');
      }
      if (o.t >= o.need) this.objectiveDone('🚩 ZONA DEFENDIDA!', 800, { x: o.x, y: o.y });
    } else if (o.type === 'nests') {
      o.left = this.zombies.filter(z => z.isNest).length;
      if (o.left === 0) this.objectiveDone('☣ NINHOS DESTRUÍDOS!', 800, null);
    }
  },

  spawnBoss() {
    const type = BOSS_ORDER[(Math.floor(this.wave / 5) - 1) % BOSS_ORDER.length];
    const def = BOSSES[type];
    // reforça a cada ciclo completo de chefes
    const cycle = Math.floor((this.wave - 1) / (5 * BOSS_ORDER.length));
    const hpScale = 1 + this.wave * 0.03 + cycle * 0.5;
    // nasce numa borda longe dos jogadores
    let x = World.W / 2, y = 80;
    for (let i = 0; i < 30; i++) {
      const side = randInt(0, 3);
      x = side === 2 ? 80 : side === 3 ? World.W - 80 : rand(120, World.W - 120);
      y = side === 0 ? 80 : side === 1 ? World.H - 80 : rand(120, World.H - 120);
      let ok = !World.collides(x, y, def.r + 4);
      for (const p of this.players) if (p.alive && dist(x, y, p.x, p.y) < 420) ok = false;
      if (ok) break;
    }
    this.boss = new Boss(type, x, y, hpScale);
    this.zombies.push(this.boss);
    Sound.wave();
    Sound.bossRoar();
    Music.setMode('boss');
    this.shake(12);
    this.banner(def.name, `CHEFE · ONDA ${this.wave}`, 2.8, 'boss');
    const bb = document.getElementById('bossbar');
    document.getElementById('bossname').textContent = `${def.emoji} ${def.name}`;
    bb.classList.remove('hidden');
  },

  spawnZombie() {
    // nasce na borda do mapa, longe dos jogadores
    let x, y;
    for (let i = 0; i < 20; i++) {
      const side = randInt(0, 3);
      x = side === 0 ? rand(60, World.W - 60) : side === 1 ? rand(60, World.W - 60) : side === 2 ? 50 : World.W - 50;
      y = side === 0 ? 50 : side === 1 ? World.H - 50 : rand(60, World.H - 60);
      let ok = !World.collides(x, y, 26);
      for (const p of this.players) if (p.alive && dist(x, y, p.x, p.y) < 500) ok = false;
      if (ok) break;
    }
    const w = this.wave;
    let type = 'walker';
    const r = Math.random();
    if (w >= 5 && r < 0.05 + w * 0.008) type = 'brute';
    else if (w >= 4 && r < 0.14) type = 'mummy';
    else if (w >= 3 && r < 0.26) type = 'spitter';
    else if (w >= 2 && r < 0.38) type = 'maniac';
    else if (w >= 2 && r < 0.50) type = 'doll';
    else if (w >= 2 && r < 0.66) type = 'runner';
    this.zombies.push(new Zombie(type, x, y, this.waveScale));
  },

  banner(text, sub, secs = 2, cls = '') {
    const b = document.getElementById('banner');
    b.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
    b.className = cls;
    b.classList.remove('hidden');
    clearTimeout(this._bannerTo);
    this._bannerTo = setTimeout(() => b.classList.add('hidden'), secs * 1000);
  },

  shake(amt) { this.shakeAmt = Math.min(16, this.shakeAmt + amt); },

  // multiplicador de pontos por sequência de abates (x1 → x5)
  comboMult() { return Math.min(5, 1 + Math.floor(this.combo / 5)); },

  // ganho de pontos = recorde (score) + dinheiro gastável (money)
  addScore(pts) { pts = Math.round(pts); this.score += pts; this.money += pts; return pts; },
  penalize(pts) { this.score = Math.max(0, this.score - pts); this.money = Math.max(0, this.money - pts); },

  dropItem(x, y) {
    const r = Math.random();
    let kind;
    if (r < 0.26) kind = 'medkit';
    else if (r < 0.44) kind = 'smg';
    else if (r < 0.60) kind = 'shotgun';
    else if (r < 0.74) kind = 'speed';
    else if (r < 0.86) kind = 'damage';
    else if (r < 0.92) kind = 'freeze';
    else if (r < 0.97) kind = 'flamethrower';
    else kind = 'rocket';
    this.pickups.push(new Pickup(x, y, kind));
  },

  // ---------- feedback de combate ----------
  spawnFloater(x, y, text, color) {
    this.floaters.push({ x: x + rand(-6, 6), y, text: '' + text, color, t: 0, life: 0.7, vy: -46 });
  },
  hitStop(secs) { this.hitStopT = Math.max(this.hitStopT, secs); },

  // ---------- explosão genérica (barril, foguete) ----------
  explode(x, y, opts = {}) {
    const R = opts.radius || 108, dmg = opts.dmg != null ? opts.dmg : 72;
    const col = opts.color || '#ffb03a';
    const pDmg = opts.playerDmg != null ? opts.playerDmg : 26;
    Sound.explosion();
    this.shake(opts.shake || 13);
    this.hitStop(0.05);
    this.flashes.push({ x, y, t: 0.14 });
    Particles.spawn(x, y, { count: 30, color: col, minSpeed: 90, maxSpeed: 360, minLife: 0.25, maxLife: 0.7, glow: true, minSize: 2, maxSize: 6, drag: 3 });
    Particles.spawn(x, y, { count: 14, color: '#3a3236', minSpeed: 30, maxSpeed: 150, minLife: 0.4, maxLife: 1, gravity: -28 });
    World.bloodDecal(x, y, 1.4);   // marca de queimado
    for (const z of this.zombies) {
      if (dist(x, y, z.x, z.y) < R + z.r) {
        if (z.takeDamage) z.takeDamage(dmg);
        else { z.hp -= dmg; z.hitFlash = 0.1; }
        if (!z.static) {
          const a = angTo(x, y, z.x, z.y);
          z.x += Math.cos(a) * 12; z.y += Math.sin(a) * 12;
        }
        this.spawnFloater(z.x, z.y - z.r, dmg, '#ffcf5e');
      }
    }
    for (const p of this.players) {
      if (p.alive && dist(x, y, p.x, p.y) < R) p.hurt(pDmg, angTo(x, y, p.x, p.y));
    }
    // reação em cadeia com barris próximos
    for (const c of World.circles) {
      if (c.type === 'barrel' && !c.exploded && dist(x, y, c.x, c.y) < R + 24) {
        setTimeout(() => this.explodeBarrel(c), 70 + rand(60));
      }
    }
  },

  explodeBarrel(b) {
    if (!b || b.exploded) return;
    World.removeBarrel(b);
    this.explode(b.x, b.y, { color: b.toxic ? '#8aff5e' : '#ffb03a' });
  },

  // destrava cofres quando um jogador com chave encosta na porta
  checkVaults(alive) {
    if (this.keys <= 0) return;
    for (const rf of World.roofs) {
      if (!rf.locked) continue;
      for (const p of alive) {
        if (dist(p.x, p.y, rf.doorX, rf.doorY) < 46) { this.openVault(rf); this.keys--; break; }
      }
      if (this.keys <= 0) break;
    }
  },

  openVault(rf) {
    World.unlockVault(rf);
    this.addScore(500);
    this.shake(9);
    Sound.vault();
    Particles.spawn(rf.doorX, rf.doorY, { count: 26, color: '#ffe066', minSpeed: 80, maxSpeed: 280, glow: true, gravity: -30 });
    // recompensa grande dentro do cofre
    for (const kind of ['loot', 'loot', 'medkit', 'damage']) {
      const s = World.spotInVault(rf);
      this.pickups.push(new Pickup(s.x, s.y, kind));
    }
    this.banner('🔓 COFRE ABERTO!', '+500 · saqueie o tesouro', 2, 'gold');
  },

  onBossDeath(z, alive) {
    this.bossesKilled++;
    this.boss = null;
    this.hitStop(0.12);
    document.getElementById('bossbar').classList.add('hidden');
    Music.setMode('game');
    const reward = Math.round(z.score * this.diffDef.scoreMult);
    this.addScore(reward);
    for (const p of alive) p.kills++;
    // explosão dramática
    for (let k = 0; k < 5; k++) {
      setTimeout(() => {
        Particles.gib(z.x + rand(-40, 40), z.y + rand(-40, 40));
        this.shake(10);
      }, k * 120);
    }
    World.bloodDecal(z.x, z.y, 3);
    Sound.bossDie();
    this.shake(16);
    // recompensa: chove itens bons
    for (let k = 0; k < 4; k++) {
      const a = rand(TAU), d = rand(30, 80);
      const kind = pick(['medkit', 'medkit', 'smg', 'shotgun', 'damage']);
      this.pickups.push(new Pickup(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, kind));
    }
    this.banner(`${z.emoji} CHEFE DERROTADO!`, `+${reward} pontos`, 2.6, 'gold');
  },

  // ---------- loop principal ----------
  frame(now) {
    const dt = Math.min(0.033, (now - this.last) / 1000 || 0.016);
    this.last = now;

    // auto-corrige o canvas se ele saiu de sincronia com a janela (ex.: página
    // carregada antes do layout, quando innerWidth ainda era 0, sem evento resize)
    const ww = window.innerWidth, wh = window.innerHeight;
    if (ww > 0 && wh > 0 && (this.W !== ww || this.H !== wh)) this.resize();

    if (this.state === 'playing' && !this.paused) {
      this.time += dt;
      // hit-stop: congela brevemente o jogo em golpes fortes (mantém render)
      if (this.hitStopT > 0) this.hitStopT -= dt;
      else this.update(dt);
    }
    // Esc fecha a tela aberta (sem despausar o jogo por baixo dos overlays)
    if (this.controlsOpen) {
      if (Input.justPressed('Escape')) this.closeControls();
    } else if (this.optionsOpen) {
      if (Input.justPressed('Escape')) this.closeOptions();
    } else if (this.state === 'playing' && Input.justPressed('Escape')) {
      this.setPaused(!this.paused);
    }
    if (this.state === 'charselect') {
      this.time += dt;
      this.renderPortraits();
    } else {
      this.render();
    }
    Input.endFrame();
    requestAnimationFrame(t => this.frame(t));
  },

  renderPortraits() {
    if (!this.charCanvases) return;
    for (let i = 0; i < this.charCanvases.length; i++) {
      const g = this.charCanvases[i];
      g.clearRect(0, 0, 150, 170);
      const bg = g.createRadialGradient(75, 66, 8, 75, 95, 120);
      bg.addColorStop(0, '#3c4458');
      bg.addColorStop(1, '#1e222c');
      g.fillStyle = bg;
      g.fillRect(0, 0, 150, 170);
      // retrato: sprite de IA (vista frontal da pose de mira) ou o cartoon enquanto carrega
      const pc = AIART.ready && AIART.view(AIART.HERO[CHARACTERS[i].id], 'down');
      if (pc) { const ph = 148, ps = ph / pc.height, pw = pc.width * ps; g.drawImage(pc, 75 - pw / 2, 162 - ph, pw, ph); }
      else CARTOON.hero(g, CHARACTERS[i].id, 75, 160, 1.28, this.time + i * 0.7, { moving: false });
    }
  },

  // ---------- atualização ----------
  update(dt) {
    const alive = this.players.filter(p => p.alive);

    if (this.transT > 0) this.transT -= dt;

    // ondas
    if (this.intermissionT > 0) {
      this.intermissionT -= dt;
      if (this.intermissionT <= 0) this.nextWave();
    } else if (this.spawnQueue > 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.zombies.length < 55) {
        this.spawnT = Math.max(0.18, 1.1 - this.wave * 0.06);
        this.spawnQueue--;
        this.spawnZombie();
      }
    } else if (this.zombies.length === 0 && alive.length > 0) {
      // onda completa
      const bonus = Math.round((250 + this.wave * 100) * this.diffDef.scoreMult);
      this.addScore(bonus);
      Sound.rescue();
      // vizinhos não resgatados fogem em segurança (metade dos pontos)
      for (const n of this.neighbors) {
        if (n.alive && !n.vip) { this.addScore(100); }
      }
      this.neighbors = [];
      this.objective = null;   // objetivo pendente expira com a onda
      // fim de fase (onda de chefe limpa) → abre a LOJA; senão, próxima onda
      if (this.isBossWave) {
        this.intermissionT = 999;   // trava a onda até a loja abrir (evita re-disparo)
        this.banner('FASE VENCIDA!', `+${bonus} de bônus`, 1.6, 'gold');
        setTimeout(() => this.openShop(), 900);
      } else {
        this.banner('ONDA COMPLETA!', `+${bonus} de bônus`, 2);
        this.startIntermission(5);
      }
    }

    // jogadores
    for (const p of this.players) this.updatePlayer(p, dt);

    // revive de parceiro caído por proximidade (co-op)
    if (this.numPlayers === 2) {
      for (const p of this.players) {
        if (p.alive) continue;
        const helper = this.players.find(o => o.alive && dist(o.x, o.y, p.x, p.y) < 46);
        if (helper) {
          p.reviveT += dt;
          if (p.reviveT >= 2.4) {
            p.alive = true; p.hp = Math.round(p.maxHp * 0.5); p.reviveT = 0;
            Particles.sparkle(p.x, p.y, '#7dff9e');
            Sound.rescue();
            this.banner(`JOGADOR ${p.id + 1} REVIVIDO!`, '', 1.4);
          }
        } else {
          p.reviveT = Math.max(0, p.reviveT - dt * 1.5);
        }
      }
    }

    // zumbis
    const targets = [...alive, ...this.neighbors.filter(n => n.alive)];
    for (const z of this.zombies) z.update(dt, targets);

    // separação entre zumbis (evita empilhar; chefe/ninho não são empurrados)
    for (let i = 0; i < this.zombies.length; i++) {
      const a = this.zombies[i];
      if (a.isBoss || a.static) continue;
      for (let j = i + 1; j < this.zombies.length; j++) {
        const b = this.zombies[j];
        if (b.isBoss || b.static) continue;
        const push = circleCirclePush(a.x, a.y, a.r * 0.85, b.x, b.y, b.r * 0.85);
        if (push) {
          a.x += push.px / 2; a.y += push.py / 2;
          b.x -= push.px / 2; b.y -= push.py / 2;
        }
      }
    }

    // decaimento do combo
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }

    // mortes de zumbis
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.hp <= 0) {
        this.zombies.splice(i, 1);

        if (z.isBoss) {
          this.onBossDeath(z, alive);
          continue;
        }

        // combo: cada abate encadeado aumenta o multiplicador
        this.combo++;
        this.comboT = 3;
        const mult = this.comboMult();
        this.addScore(z.score * mult * this.diffDef.scoreMult);
        Particles.gib(z.x, z.y);
        World.bloodDecal(z.x, z.y, z.type === 'brute' ? 2 : 1.2);
        if (!z.isNest) {  // corpo que tomba e some (ninho é estrutura, não tem corpo)
          const fc = CARTOON.facing(z.dir);
          this.corpses.push({
            x: z.x, y: z.y, r: z.r, sprite: z.sprite, sscale: z.sscale,
            view: fc.view, flip: fc.flip, anim: z.anim + z.animOff,
            rot: (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.3),
            t: 0, life: 1.1,
          });
        }
        Sound.zombieDie();
        this.shake(z.type === 'brute' ? 6 : 2);
        if (z.type === 'brute' || z.type === 'mummy') this.hitStop(0.04);
        const killer = pick(alive.length ? alive : this.players);
        if (killer) killer.kills++;
        // chance de drop (ninho sempre solta algo)
        const dropChance = z.isNest ? 1 : z.type === 'brute' ? 0.65 : z.type === 'spitter' ? 0.3 : 0.2;
        if (Math.random() < dropChance) this.dropItem(z.x, z.y);
      }
    }

    // vizinhos
    for (let i = this.neighbors.length - 1; i >= 0; i--) {
      const n = this.neighbors[i];
      if (!n.alive) {
        this.neighbors.splice(i, 1);
        if (n.vip) {
          // VIP da escolta morreu → objetivo falhou
          this.objective = null;
          this.penalize(300);
          this.banner('⭐ OBJETIVO FALHOU…', 'o VIP foi devorado (-300)', 2, 'boss');
          Sound.neighborLost();
        } else {
          this.neighborsLost++;
          this.penalize(200);
          this.banner('VIZINHO PERDIDO…', '-200 pontos', 1.4);
        }
        continue;
      }
      n.update(dt, this.zombies);
      // resgate (VIP não é resgatado por toque — precisa chegar à extração)
      if (n.vip) continue;
      for (const p of alive) {
        if (dist(p.x, p.y, n.x, n.y) < p.r + n.r + 4) {
          this.neighbors.splice(i, 1);
          this.addScore(500);
          p.rescued++;
          p.hp = Math.min(p.maxHp, p.hp + 10);
          Particles.sparkle(n.x, n.y, '#ffe066');
          Sound.rescue();
          this.banner('VIZINHO RESGATADO!', '+500 pontos', 1.4);
          break;
        }
      }
    }

    // progresso do objetivo especial
    this.updateObjective(dt, alive);

    // balas
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt, this.zombies);
      if (b.dead) this.bullets.splice(i, 1);
    }

    // projéteis inimigos (ácido/magia)
    for (let i = this.enemyShots.length - 1; i >= 0; i--) {
      const s = this.enemyShots[i];
      s.update(dt, this.players);
      if (s.dead) this.enemyShots.splice(i, 1);
    }

    // itens
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.update(dt);
      if (pk.life <= 0) { this.pickups.splice(i, 1); continue; }
      for (const p of alive) {
        if (dist(p.x, p.y, pk.x, pk.y) < p.r + pk.r) {
          pk.apply(p);
          this.pickups.splice(i, 1);
          break;
        }
      }
    }

    Particles.update(dt);

    // números de dano flutuantes
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.t += dt; f.y += f.vy * dt; f.vy *= Math.max(0, 1 - 3 * dt);
      if (f.t >= f.life) this.floaters.splice(i, 1);
    }

    // corpos (tombam, achatam e somem)
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      c.t += dt;
      if (c.t >= c.life) this.corpses.splice(i, 1);
    }

    // batimento cardíaco quando algum jogador está com vida baixa
    const lowHp = alive.some(p => p.hp / p.maxHp < 0.28);
    if (lowHp) {
      this.lowBeatT -= dt;
      if (this.lowBeatT <= 0) { Sound.heartbeat(); this.lowBeatT = 0.9; }
    } else this.lowBeatT = 0;

    // luzes de tiro
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].t -= dt;
      if (this.flashes[i].t <= 0) this.flashes.splice(i, 1);
    }

    World.updateRoofs(this.players, dt);
    this.checkVaults(alive);

    this.shakeAmt *= Math.max(0, 1 - 8 * dt);
    this.updateCamera(dt);
    this.updateHud();

    // fim de jogo
    if (alive.length === 0) {
      this.gameoverT = (this.gameoverT || 0) + dt;
      if (this.gameoverT > 1.4) { this.gameoverT = 0; this.gameOver(); }
    } else {
      this.gameoverT = 0;
    }
  },

  updatePlayer(p, dt) {
    if (!p.alive) return;
    p.fireCd -= dt;
    p.hurtCd -= dt;
    if (p.buffs.speed > 0) p.buffs.speed -= dt;
    if (p.buffs.damage > 0) p.buffs.damage -= dt;

    // movimento
    let mx = 0, my = 0;
    if (Controls.down(p.id, 'up')) my--;
    if (Controls.down(p.id, 'down')) my++;
    if (Controls.down(p.id, 'left')) mx--;
    if (Controls.down(p.id, 'right')) mx++;
    const m = Math.hypot(mx, my);
    p.moving = m > 0;
    if (m > 0) {
      mx /= m; my /= m;
      p.anim += dt;
      const nx = p.x + mx * p.effSpeed * dt;
      const ny = p.y + my * p.effSpeed * dt;
      if (!World.collides(nx, ny, p.r)) { p.x = nx; p.y = ny; }
      else if (!World.collides(nx, p.y, p.r)) { p.x = nx; }
      else if (!World.collides(p.x, ny, p.r)) { p.y = ny; }
      World.resolve(p);
    }

    // mira: P1 usa o mouse (se já mexeu); P2 mira na direção do movimento
    if (p.id === 0 && Input.mouse.moved) {
      const wx = this.cam.x + (Input.mouse.x - this.W / 2) / this.cam.zoom;
      const wy = this.cam.y + (Input.mouse.y - this.H / 2) / this.cam.zoom;
      p.dir = angTo(p.x, p.y, wx, wy);
    } else if (m > 0) {
      p.dir = Math.atan2(my, mx);
    }

    // troca de arma
    if (Controls.justPressed(p.id, 'swap')) p.switchWeapon();

    // tiro (P1 também atira com o botão do mouse)
    const firing = Controls.down(p.id, 'shoot') || (p.id === 0 && Input.mouse.down);
    if (firing) {
      if (p.wdef.type === 'flame') this.fireFlame(p, dt);
      else if (p.fireCd <= 0) this.shoot(p);
    }
  },

  shoot(p) {
    const w = p.wdef;
    // sem munição → volta pra pistola
    if (p.ammo[p.weapon] <= 0) {
      p.weaponIdx = 0;
      Sound.empty();
      return;
    }
    p.fireCd = w.rate * p.rateMult;   // perk 'ammo' = cadência maior
    if (p.ammo[p.weapon] !== Infinity) p.ammo[p.weapon] -= 1;

    const mx = p.x + Math.cos(p.dir) * 22;
    const my = p.y + Math.sin(p.dir) * 22;
    for (let i = 0; i < w.pellets; i++) {
      const a = p.dir + rand(-w.spread, w.spread);
      const b = new Bullet(mx, my, a, w, p);
      b.dmg *= p.dmgMult;   // power-up de dano dobrado
      if (p.critChance > 0 && Math.random() < p.critChance) { b.dmg *= 2; b.crit = true; }
      this.bullets.push(b);
    }
    Particles.muzzle(mx, my, p.dir);
    this.flashes.push({ x: mx, y: my, t: 0.07 });
    Sound.shoot(p.weapon);
    this.shake(w.kick * 0.4);
    // recuo
    p.x -= Math.cos(p.dir) * w.kick * 0.5;
    p.y -= Math.sin(p.dir) * w.kick * 0.5;
  },

  // lança-chamas: cone contínuo de fogo à frente (consome combustível por tempo)
  fireFlame(p, dt) {
    if (p.ammo.flamethrower <= 0) { p.weaponIdx = 0; Sound.empty(); return; }
    p.ammo.flamethrower = Math.max(0, p.ammo.flamethrower - dt * 22);   // ~fôlego
    const dmg = 46 * dt * p.dmgMult;   // dano contínuo por segundo
    const range = 130, cone = 0.44;
    const dx = Math.cos(p.dir), dy = Math.sin(p.dir);
    // partículas de fogo
    for (let i = 0; i < 3; i++) {
      const a = p.dir + rand(-cone, cone);
      Particles.spawn(p.x + dx * 20, p.y + dy * 20, { angle: a, spread: 0.1, count: 1, color: pick(['#ffd24a', '#ff8a2a', '#ff5a1a']), minSpeed: 180, maxSpeed: 340, minLife: 0.15, maxLife: 0.35, glow: true, minSize: 3, maxSize: 6, drag: 3 });
    }
    if (p.fireCd <= 0) { Sound.shoot('smg'); p.fireCd = 0.09; }   // som intermitente
    // dano no cone
    for (const z of this.zombies) {
      const d = dist(p.x, p.y, z.x, z.y);
      if (d > range + z.r) continue;
      const ang = angTo(p.x, p.y, z.x, z.y);
      let diff = Math.abs(((ang - p.dir + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff < cone) {
        if (z.takeDamage) z.takeDamage(dmg); else { z.hp -= dmg; z.hitFlash = 0.05; }
        // fogo queimando: faísca na vítima (sem número, o fogo já comunica)
        if (Math.random() < dt * 6) Particles.spawn(z.x, z.y - z.r * 0.3, { count: 1, color: '#ffb03a', minSpeed: 20, maxSpeed: 70, minLife: 0.15, maxLife: 0.35, glow: true, gravity: -40 });
      }
    }
    this.flashes.push({ x: p.x + dx * 30, y: p.y + dy * 30, t: 0.05 });
  },

  // ---------- câmera ----------
  updateCamera(dt) {
    const alive = this.players.filter(p => p.alive);
    if (alive.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of alive) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const tx = (minX + maxX) / 2;
    const ty = (minY + maxY) / 2;
    // afasta o zoom se os jogadores se separarem
    const needZoom = Math.min(
      1,
      this.W / (maxX - minX + 640),
      this.H / (maxY - minY + 520),
    );
    const tz = clamp(needZoom, 0.5, 1);

    this.cam.x = lerp(this.cam.x, tx, 1 - Math.pow(0.001, dt));
    this.cam.y = lerp(this.cam.y, ty, 1 - Math.pow(0.001, dt));
    this.cam.zoom = lerp(this.cam.zoom, tz, 1 - Math.pow(0.01, dt));

    // trava nas bordas do mapa
    const vw = this.W / this.cam.zoom / 2, vh = this.H / this.cam.zoom / 2;
    this.cam.x = clamp(this.cam.x, Math.min(vw, World.W / 2), Math.max(World.W - vw, World.W / 2));
    this.cam.y = clamp(this.cam.y, Math.min(vh, World.H / 2), Math.max(World.H - vh, World.H / 2));
  },

  // ---------- HUD ----------
  // ---------- opções ----------
  openOptions() {
    this.optionsOpen = true;
    hide('menu');
    show('options');
  },

  closeOptions() {
    this.optionsOpen = false;
    hide('options');
    show('menu');
    this.updateControlHints();
  },

  // ---------- controles remapeáveis ----------
  openControls(from) {
    this.ctrlReturn = from;              // 'menu' ou 'pause'
    this.controlsOpen = true;
    this.renderBinds();
    this.setBindMsg('');
    hide(from);
    show('controls');
  },

  closeControls() {
    Input.capture = null;                // cancela captura pendente
    if (this._bindBtn) { this._bindBtn.classList.remove('listening'); this._bindBtn = null; }
    this.controlsOpen = false;
    hide('controls');
    show(this.ctrlReturn || 'menu');
    this.updateControlHints();
  },

  setBindMsg(txt, bad) {
    const el = document.getElementById('bindMsg');
    el.textContent = txt || '';
    el.classList.toggle('bad', !!bad);
  },

  // monta a grade: uma coluna por jogador, uma linha por ação
  renderBinds() {
    const grid = document.getElementById('bindsGrid');
    grid.innerHTML = '';
    const names = ['JOGADOR 1', 'JOGADOR 2'];
    const cols = ['#5ec8ff', '#ffb84d'];
    for (let pi = 0; pi < 2; pi++) {
      const col = document.createElement('div');
      col.className = 'bindcol';
      const h = document.createElement('h3');
      h.textContent = names[pi];
      h.style.color = cols[pi];
      col.appendChild(h);
      for (const a of CONTROL_ACTIONS) {
        const row = document.createElement('div');
        row.className = 'bindrow';
        const lab = document.createElement('span');
        lab.className = 'bindname';
        lab.textContent = a.name;
        const btn = document.createElement('button');
        btn.className = 'bindkey';
        btn.textContent = Controls.label(Controls.get(pi, a.id));
        btn.onclick = () => this.startRebind(pi, a, btn);
        row.appendChild(lab);
        row.appendChild(btn);
        col.appendChild(row);
      }
      grid.appendChild(col);
    }
  },

  // captura a próxima tecla e grava (recusa reservadas e já usadas)
  startRebind(player, action, btn) {
    Sound.init(); Sound.click();
    // cancela uma captura anterior, se houver
    if (this._bindBtn) this._bindBtn.classList.remove('listening');
    if (this._bindBtn) this._bindBtn.textContent = Controls.label(Controls.get(this._bindP, this._bindA));
    this._bindBtn = btn; this._bindP = player; this._bindA = action.id;
    btn.classList.add('listening');
    btn.textContent = 'aperte…';
    this.setBindMsg(`Nova tecla para "${action.name}" do Jogador ${player + 1}…`);

    Input.capture = (code) => {
      btn.classList.remove('listening');
      this._bindBtn = null;
      const restore = () => { btn.textContent = Controls.label(Controls.get(player, action.id)); };

      if (code === 'Escape') { restore(); this.setBindMsg('Captura cancelada.'); return; }
      if (Controls.isReserved(code)) {
        restore();
        this.setBindMsg(`${Controls.label(code)} é reservada para pausar o jogo.`, true);
        Sound.empty();
        return;
      }
      const taken = Controls.usedBy(code, player, action.id);
      if (taken) {
        restore();
        this.setBindMsg(`${Controls.label(code)} já é "${taken.action.name}" do Jogador ${taken.player + 1}.`, true);
        Sound.empty();
        return;
      }
      Controls.set(player, action.id, code);
      restore();
      this.setBindMsg(`"${action.name}" do Jogador ${player + 1} agora é ${Controls.label(code)}.`);
      Sound.pickup();
      this.updateControlHints();
    };
  },

  // dicas do menu refletem os bindings atuais
  updateControlHints() {
    const p1 = document.getElementById('p1hint');
    const p2 = document.getElementById('p2hint');
    if (p1) {
      p1.innerHTML = `<b>${Controls.moveLabel(0)}</b> mover · <b>Mouse</b> mirar<br>` +
        `<b>Clique / ${Controls.label(Controls.get(0, 'shoot'))}</b> atirar · ` +
        `<b>${Controls.label(Controls.get(0, 'swap'))}</b> trocar arma`;
    }
    if (p2) {
      p2.innerHTML = `<b>${Controls.moveLabel(1)}</b> mover<br>` +
        `<b>${Controls.label(Controls.get(1, 'shoot'))}</b> atirar · ` +
        `<b>${Controls.label(Controls.get(1, 'swap'))}</b> trocar arma`;
    }
  },

  // aplica/remove o atributo que ativa as cores acessíveis no CSS
  applyCbMode() {
    const root = document.documentElement;
    if (this.cbMode) root.setAttribute('data-cb', ''); else root.removeAttribute('data-cb');
  },

  // data URL de ícone com cache (evita re-renderizar toda frame)
  iconURL(name, col) {
    this._iconCache = this._iconCache || {};
    const k = name + '|' + (col || '');
    if (!this._iconCache[k]) this._iconCache[k] = ICON.dataURL(name, 26, col);
    return this._iconCache[k];
  },

  // pinta os ícones fixos da topbar uma vez (dinheiro/zumbis/chaves)
  initHudIcons() {
    const set = (id, name, col) => {
      const el = document.querySelector(`#${id} .hicon`);
      if (el) el.style.backgroundImage = `url(${this.iconURL(name, col)})`;
    };
    set('money', 'coin', '#ffd75e');
    set('zleft', 'skull', '#ff8a8a');
    set('keys', 'key', '#ffe066');
    set('shopHint', 'cart', '#ffd75e');
  },

  updateHud() {
    const fase = this.fase || 1;
    document.getElementById('waveLabel').textContent =
      this.intermissionT > 0 ? `PRÓXIMA ONDA EM ${Math.ceil(this.intermissionT)}…`
      : this.isBossWave ? `FASE ${fase} · ⚠ CHEFE` : `FASE ${fase} · ONDA ${this.wave}`;
    document.getElementById('score').textContent = this.score;
    document.querySelector('#money .hval').textContent = this.money;
    document.querySelector('#zleft .hval').textContent = this.zombies.length + this.spawnQueue;
    const keysEl = document.getElementById('keys');
    keysEl.classList.toggle('hidden', this.keys <= 0);
    if (this.keys > 0) keysEl.querySelector('.hval').textContent = this.keys;

    // aviso da Loja: ela abre sozinha ao vencer o chefe (5ª onda de cada fase)
    const shopEl = document.getElementById('shopHint');
    const playing = this.state === 'playing';
    shopEl.classList.toggle('hidden', !playing);
    if (playing) {
      const left = (5 - this.wave % 5) % 5;   // ondas até o chefe
      shopEl.querySelector('.hval').textContent =
        this.isBossWave ? 'LOJA ABRE AO VENCER O CHEFE'
        : left === 1 ? 'LOJA APÓS O CHEFE — PRÓXIMA ONDA'
        : `LOJA APÓS O CHEFE — EM ${left} ONDAS`;
    }

    // combo
    const comboEl = document.getElementById('combo');
    const mult = this.comboMult();
    if (this.combo >= 5 && this.comboT > 0) {
      comboEl.classList.remove('hidden');
      document.getElementById('comboMult').textContent = `COMBO x${mult}`;
      document.getElementById('comboFill').style.width = (this.comboT / 3 * 100) + '%';
    } else {
      comboEl.classList.add('hidden');
    }

    // barra do chefe
    if (this.boss && this.boss.hp > 0) {
      document.getElementById('bossHpFill').style.width = Math.max(0, this.boss.hp / this.boss.maxHp * 100) + '%';
    }

    // objetivo especial da onda
    const objEl = document.getElementById('objective');
    if (this.objective) {
      const o = this.objective;
      let txt = '';
      if (o.type === 'nests') txt = `☣ DESTRUA OS NINHOS — ${o.left != null ? o.left : o.total} restante(s)`;
      else if (o.type === 'escort') txt = '⭐ ESCOLTE O VIZINHO ATÉ O SINALIZADOR 🎯';
      else if (o.type === 'defend') txt = `🚩 DEFENDA A ZONA — ${Math.ceil(o.need - o.t)}s`;
      objEl.textContent = txt;
      objEl.classList.remove('hidden');
    } else {
      objEl.classList.add('hidden');
    }

    for (const p of this.players) {
      const card = document.getElementById(`p${p.id + 1}card`);
      if (!card) continue;
      card.classList.toggle('dead', !p.alive);
      const fill = document.getElementById(`p${p.id + 1}hp`);
      const pct = (p.hp / p.maxHp) * 100;
      fill.style.width = pct + '%';
      fill.classList.toggle('low', pct < 35);
      const w = p.wdef;
      const ammo = p.ammo[p.weapon] === Infinity ? '∞' : p.ammo[p.weapon];
      let buffTxt = '';
      if (p.buffs.speed > 0) buffTxt += ' ⚡';
      if (p.buffs.damage > 0) buffTxt += ' 🔥';
      const weapEl = document.getElementById(`p${p.id + 1}weap`);
      const wicon = weapEl.querySelector('.wicon');
      const iname = WEAP_ICON[p.weapon] || 'gun';
      if (wicon._icon !== iname) { wicon.style.backgroundImage = `url(${this.iconURL(iname)})`; wicon._icon = iname; }
      weapEl.querySelector('.wtext').textContent = `${w.name} · ${ammo}${buffTxt}`;
    }
  },

  // corpo de zumbi: tomba (rotaciona), achata (squash) e some (fade)
  drawCorpse(ctx, c) {
    const k = c.t / c.life;                        // 0 → 1
    const fall = Math.min(1, k * 3);               // tomba rápido no início
    const rot = c.rot * (fall * fall * (3 - 2 * fall));  // smoothstep até deitar
    const sy = 1 - 0.5 * fall;                      // achata para ~50%
    const alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4; // fade só no fim
    CARTOON.blit(ctx, (g, gx, gy) => {
      if (!(AIART.ready && AIART.monster(g, AIART.MONSTER[c.sprite], gx, gy, c.view, c.anim, AIART.MH)))
        CARTOON.monster(g, c.sprite, gx, gy, 1, c.anim, { view: c.view });
    }, c.x, c.y + c.r * 0.9, { scale: c.sscale, flip: c.flip, sy, rot, alpha: Math.max(0, alpha) });
  },

  // ---------- renderização ----------
  render() {
    const ctx = this.ctx;
    const { x: cx, y: cy, zoom } = this.cam;

    ctx.fillStyle = '#06070d';
    ctx.fillRect(0, 0, this.W, this.H);

    const shx = rand(-this.shakeAmt, this.shakeAmt);
    const shy = rand(-this.shakeAmt, this.shakeAmt);

    ctx.save();
    ctx.translate(this.W / 2 + shx, this.H / 2 + shy);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);

    // limites visíveis (culling) — pula tudo que está fora da câmera
    const vw = this.W / zoom, vh = this.H / zoom;
    const vL = cx - vw / 2, vR = cx + vw / 2, vT = cy - vh / 2, vB = cy + vh / 2;
    const inView = (x, y, pad = 90) => x > vL - pad && x < vR + pad && y > vT - pad && y < vB + pad;
    const rectView = (o, pad = 40) => o.x - pad < vR && o.x + (o.w || o.r * 2 || 0) + pad > vL && o.y - pad < vB && o.y + (o.h || o.r * 2 || 0) + pad > vT;

    // chão + sangue
    if (World.groundCanvas) ctx.drawImage(World.groundCanvas, 0, 0);
    if (World.bloodCanvas) ctx.drawImage(World.bloodCanvas, 0, 0);

    // brilho dos postes (cor por tema)
    const lg = World.theme.lampGlow;
    for (const l of World.lamps) {
      if (!inView(l.x, l.y, 180)) continue;
      const g = ctx.createRadialGradient(l.x, l.y, 5, l.x, l.y, 170);
      g.addColorStop(0, `rgba(${lg},.14)`);
      g.addColorStop(1, `rgba(${lg},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 170, 0, TAU);
      ctx.fill();
    }
    // luzes ambiente do tema (fogos-fátuos, barris tóxicos)
    for (const s of World.glowSpots) {
      if (!inView(s.x, s.y, s.r)) continue;
      const pulse = 0.10 + Math.sin(this.time * 2 + s.x) * 0.05;
      const g = ctx.createRadialGradient(s.x, s.y, 3, s.x, s.y, s.r);
      g.addColorStop(0, `rgba(${s.color},${pulse})`);
      g.addColorStop(1, `rgba(${s.color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }

    // marcadores de objetivo no chão (extração / zona de defesa)
    this.renderObjective(ctx);

    // itens (abaixo das entidades)
    for (const pk of this.pickups) if (inView(pk.x, pk.y)) pk.draw(ctx);

    // entidades ordenadas por profundidade (y da base) — só as visíveis
    const drawList = [];
    for (const c of this.corpses) if (inView(c.x, c.y)) drawList.push({ y: c.y + c.r - 6, draw: g => this.drawCorpse(g, c) });
    for (const o of World.rects) if (rectView(o)) drawList.push({ y: o.y + o.h, draw: c => World.drawRect(c, o) });
    for (const l of World.lamps) if (inView(l.x, l.y, 60)) drawList.push({ y: l.y, draw: c => World.drawLampPost(c, l) });
    for (const z of this.zombies) if (inView(z.x, z.y)) drawList.push({ y: z.y + z.r, draw: c => z.draw(c) });
    for (const n of this.neighbors) if (inView(n.x, n.y)) drawList.push({ y: n.y + n.r, draw: c => n.draw(c, this.time) });
    for (const p of this.players) drawList.push({ y: p.y + p.r, draw: c => p.draw(c, this.time) });
    for (const cir of World.circles) if (rectView({ x: cir.x - cir.r, y: cir.y - cir.r, w: cir.r * 2, h: (cir.canopy || cir.r) + cir.r })) drawList.push({ y: cir.y + (cir.canopy || cir.r), draw: c => World.drawCircle(c, cir, this.time) });
    drawList.sort((a, b) => a.y - b.y);
    for (const d of drawList) d.draw(ctx);

    // balas, projéteis inimigos e partículas por cima
    for (const b of this.bullets) if (inView(b.x, b.y)) b.draw(ctx);
    for (const s of this.enemyShots) if (inView(s.x, s.y)) s.draw(ctx);
    Particles.draw(ctx);

    // telhados (somem quando um jogador entra)
    for (const rf of World.roofs) World.drawRoof(ctx, rf);

    // números de dano flutuantes (por cima de tudo, no mundo)
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px Segoe UI, sans-serif';
    for (const f of this.floaters) {
      if (!inView(f.x, f.y)) continue;
      const a = 1 - f.t / f.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // iluminação + vinheta
    this.renderLighting(shx, shy);
    this.renderVignette();
    this.renderLowHealth();

    // indicadores de vizinhos fora da tela
    if (this.state === 'playing') this.renderIndicators();

    // transição de fase: fade que revela o novo cenário
    if (this.transT > 0) {
      const a = Math.min(1, this.transT / this.transDur);
      ctx.fillStyle = `rgba(4,5,10,${a})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  },

  // vinheta vermelha pulsante quando um jogador está com vida baixa
  renderLowHealth() {
    if (this.state !== 'playing') return;
    let worst = 1;
    for (const p of this.players) if (p.alive) worst = Math.min(worst, p.hp / p.maxHp);
    if (worst >= 0.32) return;
    const ctx = this.ctx;
    const intensity = (1 - worst / 0.32) * (0.28 + Math.sin(this.time * 6) * 0.12);
    const g = ctx.createRadialGradient(
      this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.3,
      this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.62,
    );
    g.addColorStop(0, 'rgba(180,0,0,0)');
    g.addColorStop(1, `rgba(150,0,0,${Math.max(0, intensity)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);
  },

  // marcadores de objetivo desenhados no mundo
  renderObjective(ctx) {
    const o = this.objective;
    if (!o) return;
    const t = this.time;
    const rgb = this.cbMode ? '78,163,255' : '125,255,158';   // verde → azul acessível
    const hex = this.cbMode ? '#4ea3ff' : '#7dff9e';
    if (o.type === 'escort') {
      // sinalizador de extração: anéis pulsantes + estrela
      const pulse = 1 + Math.sin(t * 3) * 0.12;
      for (const [r, a] of [[54 * pulse, 0.5], [34, 0.75]]) {
        ctx.strokeStyle = `rgba(${rgb},${a})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(o.ex, o.ey, r, 0, TAU); ctx.stroke();
      }
      const g = ctx.createRadialGradient(o.ex, o.ey, 4, o.ex, o.ey, 60);
      g.addColorStop(0, `rgba(${rgb},.30)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(o.ex, o.ey, 60, 0, TAU); ctx.fill();
      ICON.draw(ctx, 'star', o.ex, o.ey + Math.sin(t * 4) * 3, 1.7, '#ffe680');
    } else if (o.type === 'defend') {
      // zona de defesa: círculo tracejado girando + progresso
      ctx.strokeStyle = `rgba(${rgb},.55)`;
      ctx.lineWidth = 5;
      ctx.setLineDash([18, 14]);
      ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      // arco de progresso
      if (o.t > 0) {
        ctx.strokeStyle = hex;
        ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 12, -Math.PI / 2, -Math.PI / 2 + (o.t / o.need) * TAU); ctx.stroke();
      }
      // bandeira central
      ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(o.x, o.y + 8); ctx.lineTo(o.x, o.y - 34); ctx.stroke();
      ctx.fillStyle = hex;
      const wav = Math.sin(t * 6) * 3;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - 34);
      ctx.quadraticCurveTo(o.x + 14, o.y - 32 + wav, o.x + 26, o.y - 28);
      ctx.lineTo(o.x, o.y - 20);
      ctx.closePath(); ctx.fill();
    }
  },

  renderLighting(shx, shy) {
    const g = this.lightCtx;
    const { x: cx, y: cy, zoom } = this.cam;
    g.clearRect(0, 0, this.W, this.H);
    g.fillStyle = World.theme.ambient;
    g.fillRect(0, 0, this.W, this.H);

    g.globalCompositeOperation = 'destination-out';
    const toScreen = (wx, wy) => [
      (wx - cx) * zoom + this.W / 2 + shx,
      (wy - cy) * zoom + this.H / 2 + shy,
    ];
    const hole = (wx, wy, r, strength = 1) => {
      const [sx, sy] = toScreen(wx, wy);
      const sr = r * zoom;
      const grad = g.createRadialGradient(sx, sy, sr * 0.1, sx, sy, sr);
      grad.addColorStop(0, `rgba(0,0,0,${strength})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(sx, sy, sr, 0, TAU);
      g.fill();
    };

    for (const p of this.players) if (p.alive) { hole(p.x, p.y, 380, 0.98); hole(p.x, p.y, 620, 0.35); }
    for (const l of World.lamps) hole(l.x, l.y - 40, 250, 0.85);
    for (const n of this.neighbors) hole(n.x, n.y, 90, 0.5);
    for (const f of this.flashes) hole(f.x, f.y, 190, 0.9);
    for (const s of this.enemyShots) hole(s.x, s.y, 55, 0.45);
    for (const s of World.glowSpots) hole(s.x, s.y, s.r * 0.8, 0.4);
    if (this.boss) hole(this.boss.x, this.boss.y, 200, 0.7);
    // objetivos iluminados
    if (this.objective) {
      const o = this.objective;
      if (o.type === 'escort') hole(o.ex, o.ey, 150, 0.7);
      else if (o.type === 'defend') hole(o.x, o.y, o.r + 60, 0.55);
    }
    for (const z of this.zombies) if (z.isNest) hole(z.x, z.y, 110, 0.5);
    // janelas das construções
    for (const o of World.rects) {
      if (o.type === 'house') hole(o.x + o.w / 2, o.y + o.h, 110, 0.35);
    }
    // interiores acesos ao entrar
    for (const rf of World.roofs) {
      if (rf._inside || rf.abandoned) {
        const [sx, sy] = toScreen(rf.x + rf.w / 2, rf.y + rf.h / 2);
        const sr = Math.max(rf.w, rf.h) * 0.7 * zoom;
        const grad = g.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr);
        grad.addColorStop(0, 'rgba(0,0,0,.75)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      }
    }

    g.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this.lightCanvas, 0, 0);
  },

  renderVignette() {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(
      this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.36,
      this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.72,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.46)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);
  },

  renderIndicators() {
    const ctx = this.ctx;
    const { x: cx, y: cy, zoom } = this.cam;
    const margin = 46;
    const arrow = (obj, color, glow, icon, iconCol) => {
      const sx = (obj.x - cx) * zoom + this.W / 2;
      const sy = (obj.y - cy) * zoom + this.H / 2;
      if (sx > 0 && sx < this.W && sy > 0 && sy < this.H) return;
      const ix = clamp(sx, margin, this.W - margin);
      const iy = clamp(sy, margin + 44, this.H - margin);
      const a = Math.atan2(sy - iy, sx - ix);
      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(a);
      ctx.fillStyle = color;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, -9);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.rotate(-a);
      // disco de fundo + ícone vetorial
      ctx.fillStyle = 'rgba(10,12,20,.75)';
      ctx.beginPath(); ctx.arc(0, -20, 12, 0, TAU); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
      ICON.draw(ctx, icon, 0, -20, 1, iconCol);
      ctx.restore();
    };
    for (const n of this.neighbors) arrow(n, 'rgba(255,224,102,.9)', 'rgba(255,224,102,.8)', n.vip ? 'star' : 'person', n.vip ? '#ffd75e' : '#ffe066');
    for (const pk of this.pickups) {
      if (pk.kind === 'loot') arrow(pk, 'rgba(255,210,74,.9)', 'rgba(255,190,40,.8)', 'chest');
      else if (pk.kind === 'key') arrow(pk, 'rgba(255,224,102,.95)', 'rgba(255,210,74,.9)', 'key');
    }
    // cofres trancados: aponta se você tiver chave
    if (this.keys > 0) for (const rf of World.roofs) {
      if (rf.locked) arrow({ x: rf.doorX, y: rf.doorY }, 'rgba(220,180,50,.9)', 'rgba(255,200,60,.8)', 'lock');
    }
    // objetivos especiais
    if (this.objective) {
      const o = this.objective;
      if (o.type === 'escort') arrow({ x: o.ex, y: o.ey }, 'rgba(125,255,158,.95)', 'rgba(80,255,120,.8)', 'target');
      else if (o.type === 'defend') arrow({ x: o.x, y: o.y }, 'rgba(125,255,158,.95)', 'rgba(80,255,120,.8)', 'flag');
    }
    for (const z of this.zombies) if (z.isNest) arrow(z, 'rgba(216,106,255,.9)', 'rgba(200,80,255,.8)', 'biohazard', '#d86aff');
  },
};

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

window.addEventListener('DOMContentLoaded', () => Game.init());
