// ---------- Entidades: jogadores, zumbis, vizinhos, balas e itens ----------

const WEAPONS = {
  pistol:      { name: 'Pistola',     icon: '🔫', dmg: 26, rate: 0.30, speed: 950, spread: 0.045, pellets: 1, life: 0.9, auto: false, kick: 2 },
  smg:         { name: 'Metralhadora', icon: '💥', dmg: 13, rate: 0.085, speed: 1000, spread: 0.13, pellets: 1, life: 0.8, auto: true, kick: 1.5 },
  shotgun:     { name: 'Escopeta',    icon: '🎯', dmg: 12, rate: 0.85, speed: 850, spread: 0.34, pellets: 7, life: 0.42, auto: false, kick: 6 },
  // armas especiais (munição limitada, de drops/baús)
  flamethrower: { name: 'Lança-chamas', icon: '🔥', dmg: 0, rate: 0.02, speed: 0, spread: 0, pellets: 0, life: 0, auto: true, kick: 0, type: 'flame' },
  rocket:      { name: 'Bazuca',      icon: '🚀', dmg: 0, rate: 1.05, speed: 560, spread: 0.02, pellets: 1, life: 1.5, auto: false, kick: 9, type: 'rocket' },
  freeze:      { name: 'Congelador',  icon: '❄️', dmg: 9, rate: 0.28, speed: 820, spread: 0.05, pellets: 1, life: 0.85, auto: true, kick: 1, type: 'freeze' },
};

const ZTYPES = {
  walker:  { hp: 34,  speed: 62,  r: 15, dmg: 10, score: 100, color: '#5f9a3c', sprite: 'zombie',   sscale: 0.50 },
  runner:  { hp: 24,  speed: 150, r: 13, dmg: 8,  score: 150, color: '#6b4a2a', sprite: 'werewolf', sscale: 0.50 },
  maniac:  { hp: 44,  speed: 122, r: 15, dmg: 14, score: 210, color: '#a01818', sprite: 'maniac',   sscale: 0.52 },
  mummy:   { hp: 95,  speed: 46,  r: 16, dmg: 16, score: 260, color: '#c2b78c', sprite: 'mummy',    sscale: 0.55 },
  doll:    { hp: 14,  speed: 118, r: 10, dmg: 6,  score: 120, color: '#c83a6a', sprite: 'doll',     sscale: 0.60 },
  brute:   { hp: 175, speed: 45,  r: 25, dmg: 24, score: 400, color: '#3a5a3e', sprite: 'brute',    sscale: 0.72 },
  spitter: { hp: 40,  speed: 74,  r: 15, dmg: 8,  score: 220, color: '#6a8a2e', sprite: 'alien',    ranged: true, range: 340, spitCd: 2.4, spitDmg: 12, sscale: 0.55 },
};

// ---------- Personagens jogáveis (cada um com um perk passivo) ----------
const CHARACTERS = [
  {
    id: 'zeca', name: 'ZECA', trait: 'Óculos 3D', perk: 'crit', perkName: '💥 Crítico: 25% de dano dobrado',
    skin: '#f0c088', hair: '#ffd23a', hairStyle: 'spiky', accessory: 'glasses3d',
    shirt: '#20242c', shirtDetail: '#e03838', pants: '#3a5ad0', shoes: '#e03030',
    tint: '#5ec8ff',
  },
  {
    id: 'bruna', name: 'BRUNA', trait: 'Boné & atitude', perk: 'speed', perkName: '⚡ Ágil: +18% de velocidade',
    skin: '#c8895a', hair: '#3a2416', hairStyle: 'ponytail', accessory: 'cap',
    shirt: '#a848c8', shirtDetail: '#ffffff', pants: '#2a2f3a', shoes: '#ffffff',
    tint: '#ff5ea8',
  },
  {
    id: 'duda', name: 'DUDA', trait: 'Nerd corajoso', perk: 'ammo', perkName: '🎒 Municiado: +50% munição, +cadência',
    skin: '#e8b884', hair: '#5a3a1a', hairStyle: 'short', accessory: 'nerd',
    shirt: '#3aa0d0', shirtDetail: '#ffe066', pants: '#6a4a2a', shoes: '#4a3020',
    tint: '#5eff9e',
  },
  {
    id: 'rex', name: 'REX', trait: 'Punk durão', perk: 'tank', perkName: '🛡️ Tanque: +30% vida, -15% dano recebido',
    skin: '#d0a06a', hair: '#e03030', hairStyle: 'mohawk', accessory: 'none',
    shirt: '#161616', shirtDetail: '#c0c0c0', pants: '#26262a', shoes: '#802020',
    tint: '#ffaa3a',
  },
];

// ---------- Jogador ----------
class Player {
  constructor(id, x, y, char) {
    this.id = id;               // 0 = P1, 1 = P2
    this.char = char || CHARACTERS[id === 0 ? 0 : 1];
    this.perk = this.char.perk;
    this.x = x; this.y = y;
    this.r = 15;
    // perks passivos por personagem
    this.maxHp = this.perk === 'tank' ? 130 : 100;
    this.hp = this.maxHp;
    this.speed = 235 * (this.perk === 'speed' ? 1.18 : 1);
    this.critChance = this.perk === 'crit' ? 0.25 : 0;
    this.dmgTakenMult = this.perk === 'tank' ? 0.85 : 1;
    this.ammoMult = this.perk === 'ammo' ? 1.5 : 1;
    this.rateMult = this.perk === 'ammo' ? 0.88 : 1;
    this.dir = id === 0 ? 0 : Math.PI;
    this.alive = true;
    this.fireCd = 0;
    this.hurtCd = 0;
    this.kills = 0;
    this.rescued = 0;
    this.anim = 0;
    this.moving = false;
    this.inside = null;         // construção em que está (para telhado sumir)
    this.reviveT = 0;           // progresso de reviver (co-op por proximidade)
    // arsenal: pistola infinita; outras têm munição
    this.weapons = ['pistol'];
    this.ammo = { pistol: Infinity, smg: 0, shotgun: 0, flamethrower: 0, rocket: 0, freeze: 0 };
    this.weaponIdx = 0;
    // power-ups temporários (segundos restantes)
    this.buffs = { speed: 0, damage: 0 };
    // paleta do personagem
    const c = this.char;
    this.skin = c.skin;
    this.hair = c.hair;
    this.hairStyle = c.hairStyle;
    this.accessory = c.accessory;
    this.shirt = c.shirt;
    this.shirtDetail = c.shirtDetail;
    this.pants = c.pants;
    this.shoes = c.shoes;
    this.tint = c.tint;
    this.look = c.id || (id === 0 ? 'zeca' : 'bruna');   // chave do sprite cartoon
  }

  get weapon() { return this.weapons[this.weaponIdx]; }
  get wdef() { return WEAPONS[this.weapon]; }
  get effSpeed() { return this.speed * (this.buffs.speed > 0 ? 1.55 : 1); }
  get dmgMult() { return this.buffs.damage > 0 ? 2 : 1; }

  giveWeapon(w, ammo) {
    if (!this.weapons.includes(w)) {
      this.weapons.push(w);
      this.weaponIdx = this.weapons.length - 1;
    }
    this.ammo[w] += Math.round(ammo * this.ammoMult);   // perk 'ammo' rende mais munição
  }

  switchWeapon() {
    if (this.weapons.length < 2) return;
    this.weaponIdx = (this.weaponIdx + 1) % this.weapons.length;
    Sound.click();
  }

  hurt(dmg, fromAngle) {
    if (this.hurtCd > 0 || !this.alive) return;
    this.hp -= dmg * this.dmgTakenMult;   // perk 'tank' recebe menos dano
    this.hurtCd = 0.7;
    this.x += Math.cos(fromAngle) * 14;
    this.y += Math.sin(fromAngle) * 14;
    Sound.playerHurt();
    Game.shake(7);
    Particles.blood(this.x, this.y, fromAngle);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      Particles.gib(this.x, this.y);
      World.bloodDecal(this.x, this.y, 2);
    }
  }

  draw(ctx, time) {
    if (!this.alive) { this.drawDowned(ctx, time); return; }
    const f = CARTOON.facing(this.dir);
    const blink = this.hurtCd > 0 && Math.floor(time * 18) % 2 === 0;
    // anel identificador no chão (P1 azul / P2 laranja)
    ctx.strokeStyle = this.id === 0 ? 'rgba(94,200,255,.6)' : 'rgba(255,184,77,.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 13, 15, 7, 0, 0, TAU);
    ctx.stroke();
    // sprite cartoon virado conforme a direção (frente / costas / perfil), com a arma equipada
    const ht = this.moving ? this.anim : time;
    CARTOON.blit(ctx, (g, gx, gy) => {
      // sprite gerado por IA (arma composta na mão); cai no cartoon até os assets carregarem
      if (!(AIART.ready && AIART.hero(g, this.look, gx, gy, f.view, this.weapon, ht, this.moving)))
        CARTOON.hero(g, this.look, gx, gy, 1, ht, { moving: this.moving, view: f.view, weapon: this.weapon });
    }, this.x, this.y + 14, { scale: 0.46, flip: f.flip, alpha: blink ? 0.45 : 1 });
    return;

    // (render vetorial antigo — substituído pelo cartoon acima)
    const bob = 0;
    const dx = Math.cos(this.dir), dy = Math.sin(this.dir);
    const px = -dy, py = dx;                 // perpendicular (lado direito)
    const cx = this.x, cy = this.y + bob * 0.3;

    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 11, 13, 6, 0, 0, TAU);
    ctx.fill();

    // anel identificador (sutil, no chão)
    ctx.strokeStyle = this.id === 0 ? 'rgba(94,200,255,.5)' : 'rgba(255,184,77,.5)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y + 11, 14, 0.15, Math.PI - 0.15);
    ctx.stroke();

    // ---- pernas com tênis (passada alternada) ----
    const step = this.moving ? Math.sin(this.anim * 11) * 6 : 0;
    for (const side of [-1, 1]) {
      const hipX = cx + px * side * 4.5;
      const hipY = cy + py * side * 4.5 + 3;
      const footX = hipX + dx * (side === 1 ? step : -step);
      const footY = hipY + dy * (side === 1 ? step : -step) + 7;
      ctx.strokeStyle = this.pants;
      ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
      // tênis
      ctx.strokeStyle = this.shoes;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(footX, footY);
      ctx.lineTo(footX + dx * 4, footY + dy * 4);
      ctx.stroke();
    }

    // ---- torso ----
    const body = ctx.createRadialGradient(cx - dx * 2 + px * 3, cy - 5, 2, cx, cy, 14);
    body.addColorStop(0, shade(this.shirt, 42));
    body.addColorStop(1, this.shirt);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 11.5, 12.5, this.dir, 0, TAU);
    ctx.fill();
    // detalhe da camisa (faixa/estampa)
    ctx.fillStyle = this.shirtDetail;
    ctx.globalAlpha *= 0.9;
    ctx.beginPath();
    ctx.arc(cx - dx * 2, cy - dy * 2, 3.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = blink ? 0.4 : 1;

    // ---- braços segurando a arma ----
    ctx.strokeStyle = this.skin;
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + px * side * 8, cy + py * side * 8);
      ctx.lineTo(cx + dx * 15 + px * side * 3.5, cy + dy * 15 + py * side * 3.5);
      ctx.stroke();
    }

    // ---- arma (por tipo) ----
    this.drawWeapon(ctx, cx, cy, dx, dy, px, py);

    // ---- cabeça ----
    const hx = cx + dx * 2, hy = cy + dy * 2 - 3;
    ctx.fillStyle = this.skin;
    ctx.beginPath();
    ctx.arc(hx, hy, 7.5, 0, TAU);
    ctx.fill();
    // sombreado do rosto
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.beginPath();
    ctx.arc(hx + dx * 2, hy + dy * 2, 6, 0, TAU);
    ctx.fill();

    this.drawHair(ctx, hx, hy, dx, dy, px, py);
    this.drawAccessory(ctx, hx, hy, dx, dy, px, py);

    ctx.globalAlpha = 1;
  }

  // jogador caído (co-op): marcador no chão + anel de progresso do revive
  drawDowned(ctx, time) {
    const col = this.id === 0 ? '#5ec8ff' : '#ffb84d';
    // corpo caído
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y + 8, 16, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,60,60,.85)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y + 4, 14, 8, 0.3, 0, TAU); ctx.fill();
    // caveira/SOS piscando
    ctx.globalAlpha = 0.6 + Math.sin(time * 5) * 0.4;
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = col;
    ctx.fillText('✚', this.x, this.y - 14);
    ctx.globalAlpha = 1;
    // anel de progresso do revive
    if (this.reviveT > 0) {
      const p = Math.min(1, this.reviveT / 2.4);
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#7dff9e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(this.x, this.y, 20, -Math.PI / 2, -Math.PI / 2 + p * TAU); ctx.stroke();
    }
    // nome + "ABATIDO"
    ctx.font = 'bold 10px Segoe UI, sans-serif'; ctx.fillStyle = col;
    ctx.fillText('ABATIDO', this.x, this.y + 26);
  }

  drawWeapon(ctx, cx, cy, dx, dy, px, py) {
    const gx = cx + dx * 13, gy = cy + dy * 13;   // base do cano
    if (this.weapon === 'shotgun') {
      ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(gx - dx * 4, gy - dy * 4); ctx.lineTo(gx + dx * 4, gy + dy * 4); ctx.stroke();
      ctx.strokeStyle = '#2a2e34'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + dx * 16, gy + dy * 16); ctx.stroke();
    } else if (this.weapon === 'smg') {
      ctx.strokeStyle = '#26292f'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + dx * 13, gy + dy * 13); ctx.stroke();
      // carregador
      ctx.strokeStyle = '#3a3f47'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(gx + dx * 4, gy + dy * 4); ctx.lineTo(gx + dx * 4 - dy * 6, gy + dy * 4 + dx * 6); ctx.stroke();
    } else {
      // pistola com o tint do personagem (arma d'água estilo ZAMN)
      ctx.strokeStyle = this.tint; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + dx * 10, gy + dy * 10); ctx.stroke();
      ctx.strokeStyle = shade2(this.tint, -40); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(gx - dx * 2, gy - dy * 2); ctx.lineTo(gx - dx * 2 - dy * 5, gy - dy * 2 + dx * 5); ctx.stroke();
    }
  }

  drawHair(ctx, hx, hy, dx, dy, px, py) {
    ctx.fillStyle = this.hair;
    const back = 3.2;   // desloca o cabelo para trás da cabeça
    const bx = hx - dx * back, by = hy - dy * back;
    if (this.hairStyle === 'spiky') {
      // espetado (loiro estilo Zeke)
      for (let i = -2; i <= 2; i++) {
        const sx = bx + px * i * 2.4, sy = by + py * i * 2.4;
        ctx.beginPath();
        ctx.moveTo(sx - px * 1.6, sy - py * 1.6);
        ctx.lineTo(sx - dx * 5, sy - dy * 5);
        ctx.lineTo(sx + px * 1.6, sy + py * 1.6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(bx, by, 5.5, 0, TAU); ctx.fill();
    } else if (this.hairStyle === 'ponytail') {
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, TAU); ctx.fill();
      // rabo de cavalo para trás
      ctx.lineWidth = 5; ctx.strokeStyle = this.hair; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - dx * 8, by - dy * 8);
      ctx.stroke();
    } else if (this.hairStyle === 'mohawk') {
      // crista central
      ctx.fillStyle = this.hair;
      for (let i = -1; i <= 3; i++) {
        const sx = hx - dx * i * 2.2, sy = hy - dy * i * 2.2;
        ctx.beginPath();
        ctx.moveTo(sx - px * 2, sy - py * 2);
        ctx.lineTo(sx + px * (3 - Math.abs(i)) , sy + py * (3 - Math.abs(i)));
        ctx.lineTo(sx + px * 2, sy + py * 2);
        ctx.closePath();
      }
      // crista simples: linha grossa
      ctx.strokeStyle = this.hair; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + dx * 3, hy + dy * 3);
      ctx.lineTo(hx - dx * 5, hy - dy * 5);
      ctx.stroke();
    } else {
      // curto
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, TAU); ctx.fill();
    }
  }

  drawAccessory(ctx, hx, hy, dx, dy, px, py) {
    const fx = hx + dx * 4, fy = hy + dy * 4;   // frente do rosto
    if (this.accessory === 'glasses3d') {
      // óculos 3D (lente vermelha + azul)
      ctx.fillStyle = '#e03030';
      ctx.beginPath(); ctx.arc(fx + px * 2.5, fy + py * 2.5, 2.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3050e0';
      ctx.beginPath(); ctx.arc(fx - px * 2.5, fy - py * 2.5, 2.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(fx + px * 2.5, fy + py * 2.5); ctx.lineTo(fx - px * 2.5, fy - py * 2.5); ctx.stroke();
    } else if (this.accessory === 'cap') {
      // boné vermelho (aba para a frente)
      ctx.fillStyle = '#d02828';
      ctx.beginPath();
      ctx.arc(hx - dx * 1, hy - dy * 1, 7, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx - px * 4, fy - py * 4);
      ctx.lineTo(fx + dx * 5, fy + dy * 5);
      ctx.lineTo(fx + px * 4, fy + py * 4);
      ctx.closePath();
      ctx.fill();
    } else if (this.accessory === 'nerd') {
      // óculos de aro grosso
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(fx + px * 2.6, fy + py * 2.6, 2.4, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(fx - px * 2.6, fy - py * 2.6, 2.4, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx + px, fy + py); ctx.lineTo(fx - px, fy - py); ctx.stroke();
    }
  }
}

// clareia/escurece uma cor hex OU rgb() — versão tolerante
function shade2(col, amt) {
  if (col[0] === '#') return shade(col, amt);
  const m = col.match(/\d+/g);
  if (!m) return col;
  return `rgb(${clamp(+m[0] + amt, 0, 255)},${clamp(+m[1] + amt, 0, 255)},${clamp(+m[2] + amt, 0, 255)})`;
}

// ---------- Retrato frontal do personagem (tela de seleção) ----------
function drawPortrait(ctx, char, W, H, t = 0) {
  const cx = W / 2;
  const headR = W * 0.20;
  const headY = H * 0.34;
  const bob = Math.sin(t * 2) * 2;

  // fundo tipo cartaz
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#241a12');
  bg.addColorStop(1, '#120c08');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // vinheta
  const vg = ctx.createRadialGradient(cx, H * 0.4, W * 0.2, cx, H * 0.5, W * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(0, bob);

  // ombros / torso
  const shoulderY = headY + headR + H * 0.10;
  const sBody = ctx.createLinearGradient(0, shoulderY, 0, H);
  sBody.addColorStop(0, shade(char.shirt, 30));
  sBody.addColorStop(1, char.shirt);
  ctx.fillStyle = sBody;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.34, H + 8);
  ctx.quadraticCurveTo(cx - W * 0.30, shoulderY, cx - W * 0.12, shoulderY - 4);
  ctx.lineTo(cx + W * 0.12, shoulderY - 4);
  ctx.quadraticCurveTo(cx + W * 0.30, shoulderY, cx + W * 0.34, H + 8);
  ctx.closePath();
  ctx.fill();
  // detalhe da camisa (colarinho/estampa)
  ctx.fillStyle = char.shirtDetail;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.10, shoulderY - 2);
  ctx.lineTo(cx, shoulderY + H * 0.12);
  ctx.lineTo(cx + W * 0.10, shoulderY - 2);
  ctx.closePath();
  ctx.fill();

  // pescoço
  ctx.fillStyle = shade(char.skin, -25);
  ctx.fillRect(cx - headR * 0.4, headY, headR * 0.8, headR * 1.1);

  // cabeça
  const face = ctx.createRadialGradient(cx - headR * 0.3, headY - headR * 0.3, 2, cx, headY, headR * 1.2);
  face.addColorStop(0, shade(char.skin, 30));
  face.addColorStop(1, char.skin);
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, TAU);
  ctx.fill();
  // orelhas
  ctx.fillStyle = char.skin;
  ctx.beginPath();
  ctx.arc(cx - headR, headY, headR * 0.22, 0, TAU);
  ctx.arc(cx + headR, headY, headR * 0.22, 0, TAU);
  ctx.fill();

  // cabelo por estilo
  ctx.fillStyle = char.hair;
  if (char.hairStyle === 'spiky') {
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      const bx = cx + i * headR * 0.30;
      ctx.moveTo(bx - headR * 0.16, headY - headR * 0.55);
      ctx.lineTo(bx, headY - headR * 1.5);
      ctx.lineTo(bx + headR * 0.16, headY - headR * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.5, headR * 1.02, Math.PI, TAU);
    ctx.fill();
  } else if (char.hairStyle === 'ponytail') {
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.25, headR * 1.06, Math.PI * 0.95, TAU * 1.02);
    ctx.fill();
    // rabo de cavalo lateral
    ctx.beginPath();
    ctx.ellipse(cx + headR * 1.1, headY + headR * 0.2, headR * 0.35, headR * 0.9, 0.3, 0, TAU);
    ctx.fill();
  } else if (char.hairStyle === 'mohawk') {
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.22, headY - headR * 0.6);
    ctx.lineTo(cx, headY - headR * 1.7);
    ctx.lineTo(cx + headR * 0.22, headY - headR * 0.6);
    ctx.closePath();
    ctx.fill();
    // laterais raspadas (sombra)
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.4, headR * 1.02, Math.PI, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.35, headR * 1.05, Math.PI * 1.05, TAU * 0.98);
    ctx.fill();
  }

  // olhos + acessórios
  const eyeY = headY + headR * 0.05;
  const eyeDX = headR * 0.4;
  if (char.accessory === 'glasses3d') {
    ctx.fillStyle = '#e83030';
    ctx.beginPath(); ctx.arc(cx - eyeDX, eyeY, headR * 0.26, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3050e8';
    ctx.beginPath(); ctx.arc(cx + eyeDX, eyeY, headR * 0.26, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = W * 0.02;
    ctx.beginPath(); ctx.moveTo(cx - eyeDX, eyeY); ctx.lineTo(cx + eyeDX, eyeY); ctx.stroke();
  } else if (char.accessory === 'nerd') {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - eyeDX, eyeY, headR * 0.14, 0, TAU); ctx.arc(cx + eyeDX, eyeY, headR * 0.14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(cx - eyeDX, eyeY, headR * 0.06, 0, TAU); ctx.arc(cx + eyeDX, eyeY, headR * 0.06, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = W * 0.025;
    ctx.beginPath(); ctx.arc(cx - eyeDX, eyeY, headR * 0.22, 0, TAU); ctx.arc(cx + eyeDX, eyeY, headR * 0.22, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - eyeDX + headR * 0.2, eyeY); ctx.lineTo(cx + eyeDX - headR * 0.2, eyeY); ctx.stroke();
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - eyeDX, eyeY, headR * 0.15, 0, TAU); ctx.arc(cx + eyeDX, eyeY, headR * 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(cx - eyeDX, eyeY, headR * 0.07, 0, TAU); ctx.arc(cx + eyeDX, eyeY, headR * 0.07, 0, TAU); ctx.fill();
  }
  if (char.accessory === 'cap') {
    ctx.fillStyle = '#d02828';
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.35, headR * 1.05, Math.PI, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, headY - headR * 0.35, headR * 1.5, headR * 0.28, 0, 0, Math.PI);
    ctx.fill();
  }

  // sorriso confiante
  ctx.strokeStyle = 'rgba(60,30,20,.7)';
  ctx.lineWidth = W * 0.02; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, headY + headR * 0.45, headR * 0.35, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // arminha d'água na cor do personagem (canto inferior)
  const gx = cx + W * 0.24, gy = H * 0.82;
  ctx.fillStyle = char.tint;
  roundRect(ctx, gx - W * 0.02, gy - H * 0.14, W * 0.10, H * 0.07, 4); ctx.fill();
  ctx.fillStyle = shade2(char.tint, -50);
  roundRect(ctx, gx + W * 0.04, gy - H * 0.11, W * 0.05, H * 0.11, 3); ctx.fill();
  ctx.fillStyle = char.tint;
  ctx.beginPath(); ctx.arc(gx + W * 0.065, gy - H * 0.16, W * 0.03, 0, TAU); ctx.fill();

  ctx.restore();
}

// ---------- Zumbi ----------
class Zombie {
  constructor(type, x, y, waveScale) {
    const def = ZTYPES[type];
    const D = (typeof Game !== 'undefined' && Game.diffDef) || { zhp: 1, zdmg: 1 };
    this.type = type;
    this.x = x; this.y = y;
    this.r = def.r;
    this.hp = def.hp * waveScale * D.zhp;
    this.maxHp = this.hp;
    this.speed = def.speed * rand(0.85, 1.15) * (1 + (waveScale - 1) * 0.35);
    this.dmg = def.dmg * D.zdmg;
    this.score = def.score;
    this.color = def.color;
    this.dir = rand(TAU);
    this.atkCd = rand(0, 0.4);
    this.anim = rand(100);
    this.wanderT = 0;
    this.wx = 0; this.wy = 0;
    this.hitFlash = 0;
    this.ranged = !!def.ranged;
    this.range = def.range || 0;
    this.spitCd = rand(0.6, def.spitCd || 2);
    this.spitDmg = (def.spitDmg || 0) * D.zdmg;
    this.sprite = def.sprite || 'zombie';
    this.sscale = def.sscale || 0.5;
    this.animOff = rand(100);
    this.frozen = 0;
    this.turnBias = Math.random() < 0.5 ? 1 : -1;  // lado preferido p/ contornar paredes
    this.steer = this.dir;                          // heading suavizado
  }

  // Desvio de obstáculo por sondagem: se o caminho direto ao alvo está bloqueado,
  // abre um leque de ângulos (sempre começando pelo lado preferido) e escolhe o
  // primeiro rumo livre. Contorna prédios/quinas sem grade de pathfinding.
  seekDir(desired) {
    const look = this.r + 26;
    const clear = (a) => !World.collides(this.x + Math.cos(a) * look, this.y + Math.sin(a) * look, this.r);
    if (clear(desired)) return desired;
    const b = this.turnBias;
    for (const s of [0.6, 1.15, 1.7, 2.25, 2.8]) {
      if (clear(desired + s * b)) return desired + s * b;
      if (clear(desired - s * b)) return desired - s * b;
    }
    return desired;  // encurralado: deixa o deslize resolver
  }

  update(dt, targets) {
    this.hitFlash -= dt;
    // congelado: não anda nem ataca
    if (this.frozen > 0) { this.frozen -= dt; return; }
    this.anim += dt;
    this.atkCd -= dt;

    // alvo mais próximo (jogador vivo ou vizinho)
    let best = null, bd = Infinity;
    for (const t of targets) {
      const d = dist(this.x, this.y, t.x, t.y);
      if (d < bd) { bd = d; best = t; }
    }

    // ruído de perambulação para não formarem uma linha reta
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = rand(0.4, 1.2);
      const a = rand(TAU);
      this.wx = Math.cos(a); this.wy = Math.sin(a);
    }

    let mx = 0, my = 0;
    if (best) {
      const a = angTo(this.x, this.y, best.x, best.y);
      if (this.ranged) {
        // cuspidor mantém distância: recua se perto, aproxima se longe
        this.dir = a;
        if (bd < this.range * 0.55) { mx = -Math.cos(a); my = -Math.sin(a); }
        else if (bd > this.range * 0.9) { mx = Math.cos(a); my = Math.sin(a); }
        else { mx = this.wx * 0.5; my = this.wy * 0.5; }  // circula
      } else {
        // contorna obstáculos e suaviza a virada para não tremer nas quinas
        let want = this.seekDir(a);
        let d = want - this.steer;
        while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        this.steer += d * Math.min(1, dt * 10);
        mx = Math.cos(this.steer) + this.wx * 0.28;
        my = Math.sin(this.steer) + this.wy * 0.28;
        this.dir = Math.atan2(my, mx);
      }
      const m = Math.hypot(mx, my) || 1;
      mx /= m; my /= m;
    }

    // move com deslize em obstáculos
    const nx = this.x + mx * this.speed * dt;
    const ny = this.y + my * this.speed * dt;
    if (!World.collides(nx, ny, this.r)) { this.x = nx; this.y = ny; }
    else if (!World.collides(nx, this.y, this.r)) { this.x = nx; }
    else if (!World.collides(this.x, ny, this.r)) { this.y = ny; }
    else {
      // preso: desliza perpendicular
      const px = this.x - my * this.speed * dt;
      const py = this.y + mx * this.speed * dt;
      if (!World.collides(px, py, this.r)) { this.x = px; this.y = py; }
    }
    World.resolve(this);

    // ataque à distância (cuspidor)
    if (this.ranged && best) {
      this.spitCd -= dt;
      if (this.spitCd <= 0 && bd < this.range && bd > this.r + best.r + 4) {
        this.spitCd = ZTYPES.spitter.spitCd;
        const a = angTo(this.x, this.y, best.x, best.y);
        Game.enemyShots.push(new EnemyShot(this.x + Math.cos(a) * this.r, this.y + Math.sin(a) * this.r, a, 460, this.spitDmg, 'acid'));
        Sound.spit();
      }
    }

    // ataque corpo a corpo
    if (best && this.atkCd <= 0 && dist(this.x, this.y, best.x, best.y) < this.r + best.r + 3) {
      this.atkCd = 0.9;
      const a = angTo(this.x, this.y, best.x, best.y);
      if (best instanceof Player) best.hurt(this.dmg, a);
      else if (best.isNeighbor) best.kill();
    }

    if (Math.random() < dt * 0.06) Sound.groan();
  }

  draw(ctx) {
    const f = CARTOON.facing(this.dir);
    const anim = this.anim + this.animOff;
    const frozen = this.frozen > 0;
    CARTOON.blit(ctx, (g, cx, cy) => {
      if (!(AIART.ready && AIART.monster(g, AIART.MONSTER[this.sprite], cx, cy, f.view, anim, AIART.MH)))
        CARTOON.monster(g, this.sprite, cx, cy, 1, anim, { view: f.view });
    }, this.x, this.y + this.r * 0.9, {
      scale: this.sscale,
      flip: f.flip,
      flash: this.hitFlash > 0 ? 0.85 : (frozen ? 0.5 : 0),
      flashCol: this.hitFlash > 0 ? '#ffffff' : '#7ec8ff',
    });
    // cristais de gelo quando congelado
    if (frozen) {
      ctx.strokeStyle = 'rgba(200,240,255,.8)'; ctx.lineWidth = 1.5;
      const s = this.r;
      ctx.beginPath();
      ctx.moveTo(this.x - s * 0.5, this.y - s); ctx.lineTo(this.x - s * 0.3, this.y - s * 0.6);
      ctx.moveTo(this.x + s * 0.5, this.y - s * 0.8); ctx.lineTo(this.x + s * 0.3, this.y - s * 0.4);
      ctx.stroke();
    }

    // barra de vida (só se ferido)
    if (this.hp < this.maxHp) {
      const w = 28 * (this.r / 15);
      const by = this.y - this.r * 2.5;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(this.x - w / 2, by, w, 4);
      ctx.fillStyle = (typeof Game !== 'undefined' && Game.cbMode) ? '#4ec3ff' : '#7dff5e';
      ctx.fillRect(this.x - w / 2, by, w * Math.max(0, this.hp / this.maxHp), 4);
    }
  }
}

// ---------- Vizinho (resgatável; vip = objetivo de escolta) ----------
class Neighbor {
  constructor(x, y, vip = false) {
    this.x = x; this.y = y;
    this.r = 13;
    this.isNeighbor = true;
    this.vip = vip;
    this.alive = true;
    this.rescued = false;
    this.anim = rand(100);
    this.panicT = 0;
    this.vx = 0; this.vy = 0;
    this.shirt = vip ? '#ffd23a' : pick(['#c9c92e', '#c92ec9', '#2ec9b0', '#e86a6a']);
  }

  update(dt, zombies) {
    this.anim += dt;
    // VIP da escolta: segue o jogador vivo mais próximo (proteja-o!)
    if (this.vip) {
      let np = null, pd = Infinity;
      for (const p of Game.players) {
        if (!p.alive) continue;
        const d = dist(this.x, this.y, p.x, p.y);
        if (d < pd) { pd = d; np = p; }
      }
      if (np && pd > 64) {
        const a = angTo(this.x, this.y, np.x, np.y);
        this.vx = Math.cos(a) * 150; this.vy = Math.sin(a) * 150;
      } else { this.vx = 0; this.vy = 0; }
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      if (!World.collides(nx, ny, this.r)) { this.x = nx; this.y = ny; }
      else if (!World.collides(nx, this.y, this.r)) { this.x = nx; }
      else if (!World.collides(this.x, ny, this.r)) { this.y = ny; }
      World.resolve(this);
      return;
    }
    // zumbi mais próximo
    let nz = null, nd = Infinity;
    for (const z of zombies) {
      const d = dist(this.x, this.y, z.x, z.y);
      if (d < nd) { nd = d; nz = z; }
    }
    // jogador vivo mais próximo (corre até ele buscando proteção)
    let np = null, pd = Infinity;
    for (const p of Game.players) {
      if (!p.alive) continue;
      const d = dist(this.x, this.y, p.x, p.y);
      if (d < pd) { pd = d; np = p; }
    }
    this.panicT -= dt;
    this.fleeing = false;

    if (nz && nd < 230) {
      // AMEAÇADO: foge do zumbi e, se houver um jogador por perto, corre até ele
      this.fleeing = true;
      let vx = 0, vy = 0;
      const af = angTo(nz.x, nz.y, this.x, this.y);     // vetor "para longe do zumbi"
      vx += Math.cos(af); vy += Math.sin(af);
      if (np && pd < 480 && pd > 46) {
        const ap = angTo(this.x, this.y, np.x, np.y);   // vetor "em direção ao jogador"
        vx += Math.cos(ap) * 1.4; vy += Math.sin(ap) * 1.4;
      }
      const m = Math.hypot(vx, vy) || 1;
      const sp = 150;
      this.vx = vx / m * sp; this.vy = vy / m * sp;
    } else if (np && pd > 120 && pd < 520 && nd > 300) {
      // seguro: caminha calmamente na direção do jogador (agrupa perto do herói)
      const ap = angTo(this.x, this.y, np.x, np.y);
      this.vx = Math.cos(ap) * 55; this.vy = Math.sin(ap) * 55;
    } else if (this.panicT <= 0) {
      // ocioso: vagueia um pouco
      this.panicT = rand(0.8, 2);
      if (Math.random() < 0.5) {
        const a = rand(TAU);
        this.vx = Math.cos(a) * 40; this.vy = Math.sin(a) * 40;
      } else { this.vx = 0; this.vy = 0; }
    }

    // move com deslize em obstáculos (contorna paredes ao fugir)
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (!World.collides(nx, ny, this.r)) { this.x = nx; this.y = ny; }
    else if (!World.collides(nx, this.y, this.r)) { this.x = nx; }
    else if (!World.collides(this.x, ny, this.r)) { this.y = ny; }
    World.resolve(this);
  }

  kill() {
    if (!this.alive) return;
    this.alive = false;
    Particles.gib(this.x, this.y);
    World.bloodDecal(this.x, this.y, 1.6);
    Sound.neighborLost();
  }

  draw(ctx, time) {
    CARTOON.blit(ctx, (g, gx, gy) => {
      if (!(AIART.ready && AIART.monster(g, 'civilian', gx, gy, 'down', this.anim, AIART.CH)))
        CARTOON.civilian(g, gx, gy, 1, this.anim, this.shirt);
    }, this.x, this.y + 12, { scale: 0.42 });
    // balão de socorro (VIP da escolta usa estrela)
    const by = this.y - 32 + Math.sin(time * 5) * 3;
    ctx.fillStyle = 'rgba(10,12,20,.7)';
    ctx.beginPath(); ctx.arc(this.x, by, 10, 0, TAU); ctx.fill();
    if (this.vip) {
      ICON.draw(ctx, 'star', this.x, by, 1.05, '#ffe680');
    } else {
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); roundRect(ctx, this.x - 1.6, by - 6, 3.2, 8, 1.4); ctx.fill();
      ctx.beginPath(); ctx.arc(this.x, by + 6, 1.8, 0, TAU); ctx.fill();
    }
  }
}

// ---------- Ninho de zumbis (objetivo: destruir) ----------
class Nest {
  constructor(x, y, waveScale) {
    this.x = x; this.y = y;
    this.r = 26;
    this.hp = this.maxHp = 150 * (waveScale || 1);
    this.isNest = true;
    this.static = true;        // não sofre empurrão/separação
    this.type = 'nest';
    this.dir = 0;
    this.anim = rand(100);
    this.hitFlash = 0;
    this.frozen = 0;
    this.spawnT = rand(1.5, 3);
    this.score = 350;
    this.speed = 0; this.dmg = 0;
  }

  update(dt) {
    this.anim += dt;
    this.hitFlash -= dt;
    this.spawnT -= dt;
    // gera zumbis continuamente enquanto viver
    if (this.spawnT <= 0 && Game.zombies.length < 50) {
      this.spawnT = rand(3.2, 4.8);
      const a = rand(TAU);
      const z = new Zombie(Math.random() < 0.6 ? 'walker' : 'runner', this.x + Math.cos(a) * 34, this.y + Math.sin(a) * 34, Game.waveScale || 1);
      World.resolve(z);
      Game.zombies.push(z);
      Particles.spawn(this.x, this.y, { count: 10, color: '#b06ab8', minSpeed: 40, maxSpeed: 160, minLife: 0.2, maxLife: 0.5, glow: true });
      Sound.groan();
    }
  }

  draw(ctx) {
    const pulse = 1 + Math.sin(this.anim * 2.6) * 0.06;
    const flash = this.hitFlash > 0;
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y + 8, this.r * 1.05, this.r * 0.55, 0, 0, TAU); ctx.fill();
    // monte de carne pulsante
    const g = ctx.createRadialGradient(this.x - 6, this.y - 8, 4, this.x, this.y, this.r * pulse);
    g.addColorStop(0, flash ? '#ffffff' : '#9a4aa0');
    g.addColorStop(1, flash ? '#e8d8ea' : '#4a2050');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * pulse, this.r * 0.78 * pulse, 0, 0, TAU); ctx.fill();
    // "ovos" na superfície
    ctx.fillStyle = flash ? '#fff' : '#c88ad0';
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * TAU + 0.6;
      ctx.beginPath();
      ctx.arc(this.x + Math.cos(a) * this.r * 0.45, this.y + Math.sin(a) * this.r * 0.32, 5.5, 0, TAU);
      ctx.fill();
    }
    // núcleo brilhante pulsando
    const glow = 0.55 + Math.sin(this.anim * 4) * 0.35;
    ctx.fillStyle = `rgba(220,110,255,${glow})`;
    ctx.shadowColor = 'rgba(200,80,255,.9)';
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(this.x, this.y - 4, 7, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // barra de vida
    if (this.hp < this.maxHp) {
      const w = 44;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(this.x - w / 2, this.y - this.r - 16, w, 4);
      ctx.fillStyle = '#d86aff';
      ctx.fillRect(this.x - w / 2, this.y - this.r - 16, w * Math.max(0, this.hp / this.maxHp), 4);
    }
  }
}

// ---------- Bala ----------
class Bullet {
  constructor(x, y, angle, wdef, owner) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * wdef.speed;
    this.vy = Math.sin(angle) * wdef.speed;
    this.dmg = wdef.dmg;
    this.life = wdef.life;
    this.owner = owner;
    this.type = wdef.type || 'normal';   // 'normal' | 'rocket' | 'freeze'
    this.crit = false;
    this.dead = false;
    this.trailT = 0;
  }

  detonate() {
    Game.explode(this.x, this.y, { dmg: 100, radius: 96, playerDmg: 18, color: '#ff9a3a', shake: 11 });
  }

  hitZombie(z, a) {
    if (this.type === 'rocket') { this.detonate(); return; }
    if (this.type === 'freeze') {
      z.frozen = 3;   // congela por 3s
      if (z.takeDamage) z.takeDamage(this.dmg); else { z.hp -= this.dmg; z.hitFlash = 0.08; }
      Particles.spawn(this.x, this.y, { count: 10, color: '#bfeaff', minSpeed: 30, maxSpeed: 150, minLife: 0.2, maxLife: 0.6, glow: true });
      Sound.zombieHit();
      return;
    }
    // normal
    if (z.takeDamage) z.takeDamage(this.dmg);
    else { z.hp -= this.dmg; z.hitFlash = 0.08; if (!z.static) { z.x += Math.cos(a) * 4; z.y += Math.sin(a) * 4; } }
    Particles.blood(this.x, this.y, a);
    if (Math.random() < 0.4) World.bloodDecal(z.x, z.y, 0.6);
    Sound.zombieHit();
    Game.spawnFloater(this.x, this.y - z.r * 0.6, (this.crit ? Math.round(this.dmg) + '!' : Math.round(this.dmg)), this.crit ? '#ffe066' : (z.isBoss ? '#ff8a5e' : '#fff'));
  }

  update(dt, zombies) {
    this.life -= dt;
    this.trailT += dt;
    if (this.life <= 0) { this.dead = true; if (this.type === 'rocket') this.detonate(); return; }
    // rastro de fumaça do foguete
    if (this.type === 'rocket' && this.trailT > 0.02) {
      this.trailT = 0;
      Particles.spawn(this.x, this.y, { count: 1, color: '#8a8078', minSpeed: 5, maxSpeed: 25, minLife: 0.3, maxLife: 0.6, minSize: 2, maxSize: 4 });
    }
    const steps = 3;
    for (let s = 0; s < steps; s++) {
      this.x += this.vx * dt / steps;
      this.y += this.vy * dt / steps;
      if (World.pointBlocked(this.x, this.y)) {
        this.dead = true;
        const bar = World.hitBarrel(this.x, this.y);
        if (bar) Game.explodeBarrel(bar);
        else if (this.type === 'rocket') this.detonate();
        else Particles.spawn(this.x, this.y, { count: 5, color: '#c9b96e', minSpeed: 40, maxSpeed: 160, minLife: 0.1, maxLife: 0.3, glow: true });
        return;
      }
      for (const z of zombies) {
        const dx = this.x - z.x, dy = this.y - z.y;
        if (dx * dx + dy * dy < z.r * z.r) {
          this.hitZombie(z, Math.atan2(this.vy, this.vx));
          this.dead = true;
          return;
        }
      }
    }
  }

  draw(ctx) {
    const a = Math.atan2(this.vy, this.vx);
    if (this.type === 'rocket') {
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(a);
      ctx.fillStyle = '#d84a2a'; roundRect(ctx, -10, -4, 16, 8, 3); ctx.fill();
      ctx.fillStyle = '#9a9aa2'; ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(12, 0); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd24a'; ctx.shadowColor = '#ff8a2a'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(-11, 0, 3.5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      ctx.restore();
      return;
    }
    const col = this.type === 'freeze' ? '#8fe0ff' : '#ffd75e';
    ctx.strokeStyle = col;
    ctx.shadowColor = this.type === 'freeze' ? '#4ab8ff' : '#ffaa33';
    ctx.shadowBlur = 8;
    ctx.lineWidth = this.type === 'freeze' ? 4 : 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - Math.cos(a) * 14, this.y - Math.sin(a) * 14);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// ---------- Item colecionável ----------
class Pickup {
  constructor(x, y, kind) {
    this.x = x; this.y = y;
    this.r = kind === 'loot' ? 16 : 14;
    this.kind = kind;   // 'medkit'|'smg'|'shotgun'|'speed'|'damage'|'loot'|'key'
    this.t = rand(100);
    this.life = (kind === 'loot' || kind === 'key') ? 9999 : 20;   // objetivos ficam a fase toda
  }

  update(dt) {
    this.t += dt;
    this.life -= dt;
  }

  apply(player) {
    const AMMO = { smg: 60, shotgun: 12, flamethrower: 100, rocket: 5, freeze: 16 };
    if (this.kind === 'medkit') {
      player.hp = Math.min(player.maxHp, player.hp + 35);
      Particles.sparkle(this.x, this.y, '#7dff9e');
    } else if (AMMO[this.kind]) {
      // qualquer arma coletável
      player.giveWeapon(this.kind, AMMO[this.kind]);
      Particles.sparkle(this.x, this.y, '#ffd75e');
      const wname = WEAPONS[this.kind].name;
      if (this.kind === 'flamethrower' || this.kind === 'rocket' || this.kind === 'freeze')
        Game.banner(`${WEAPONS[this.kind].icon} ${wname.toUpperCase()}!`, '', 1.2, 'gold');
    } else if (this.kind === 'speed') {
      player.buffs.speed = 8;
      Particles.sparkle(this.x, this.y, '#5ec8ff');
      Game.banner('VELOCIDADE!', 'x1.5 por 8s', 1.2);
    } else if (this.kind === 'damage') {
      player.buffs.damage = 8;
      Particles.sparkle(this.x, this.y, '#ff5e8a');
      Game.banner('DANO DOBRADO!', 'x2 por 8s', 1.2);
    } else if (this.kind === 'loot') {
      // baú: arma boa (às vezes especial) + munição + cura + pontos
      const w = pick(['smg', 'shotgun', 'shotgun', 'freeze', 'flamethrower', 'rocket']);
      player.giveWeapon(w, AMMO[w] * 1.4 | 0);
      player.hp = Math.min(player.maxHp, player.hp + 25);
      Game.score += 300;
      Particles.sparkle(this.x, this.y, '#ffd75e');
      Particles.spawn(this.x, this.y, { count: 20, color: '#ffe066', minSpeed: 60, maxSpeed: 220, glow: true, gravity: -40 });
      Game.banner('BAÚ SAQUEADO!', '+arma · +300', 1.6, 'gold');
      Sound.rescue();
      return;
    } else if (this.kind === 'key') {
      Game.keys++;
      Particles.sparkle(this.x, this.y, '#ffe066');
      Game.banner('🔑 CHAVE!', 'destranque um cofre', 1.4, 'gold');
      Sound.key();
      return;
    }
    Sound.pickup();
  }

  draw(ctx) {
    const bob = Math.sin(this.t * 4) * 3;
    const fade = this.life < 4 ? (Math.floor(this.t * 8) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.globalAlpha = fade;

    const colors = {
      medkit: '125,255,158', smg: '255,215,94', shotgun: '255,158,94',
      speed: '94,200,255', damage: '255,94,138', loot: '255,210,74', key: '255,224,102',
      flamethrower: '255,140,40', rocket: '255,120,60', freeze: '120,220,255',
    };
    const c = colors[this.kind] || '255,255,255';
    const glow = ctx.createRadialGradient(this.x, this.y + 6, 2, this.x, this.y + 6, 22);
    glow.addColorStop(0, `rgba(${c},.4)`);
    glow.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y + 6, 22, 0, TAU);
    ctx.fill();

    const y = this.y + bob - 4;
    if (this.kind === 'medkit') {
      ctx.fillStyle = '#f0f0f0';
      roundRect(ctx, this.x - 10, y - 8, 20, 16, 4); ctx.fill();
      ctx.fillStyle = '#e03838';
      ctx.fillRect(this.x - 2.5, y - 5, 5, 10);
      ctx.fillRect(this.x - 7, y - 2.5, 14, 5);
    } else if (this.kind === 'smg') {
      ctx.fillStyle = '#2a2e38';
      roundRect(ctx, this.x - 12, y - 5, 24, 8, 3); ctx.fill();
      ctx.fillRect(this.x - 2, y + 2, 5, 7);
      ctx.fillStyle = '#ffd75e';
      ctx.fillRect(this.x + 6, y - 3, 4, 4);
    } else if (this.kind === 'flamethrower' || this.kind === 'rocket' || this.kind === 'freeze') {
      // arma especial: ícone vetorial (coeso com o resto)
      const icon = this.kind === 'flamethrower' ? 'fire' : this.kind === 'rocket' ? 'rocket' : 'snow';
      ICON.draw(ctx, icon, this.x, y, 1.15);
    } else if (this.kind === 'shotgun') {
      ctx.strokeStyle = '#6e4a2a';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x - 12, y + 3);
      ctx.lineTo(this.x + 6, y - 3);
      ctx.stroke();
      ctx.strokeStyle = '#2a2e38';
      ctx.beginPath();
      ctx.moveTo(this.x + 2, y - 2);
      ctx.lineTo(this.x + 13, y - 6);
      ctx.stroke();
    } else if (this.kind === 'speed') {
      // raio dentro de cristal
      ctx.fillStyle = `rgba(${c},.9)`;
      ctx.shadowColor = `rgb(${c})`;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(this.x + 3, y - 9);
      ctx.lineTo(this.x - 5, y + 1);
      ctx.lineTo(this.x, y + 1);
      ctx.lineTo(this.x - 3, y + 9);
      ctx.lineTo(this.x + 6, y - 2);
      ctx.lineTo(this.x, y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.kind === 'damage') {
      // estrela de dano
      ctx.fillStyle = `rgba(${c},.9)`;
      ctx.shadowColor = `rgb(${c})`;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + i * Math.PI / 5;
        const rad = i % 2 === 0 ? 9 : 4;
        const px = this.x + Math.cos(ang) * rad;
        const py = y + Math.sin(ang) * rad;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.kind === 'loot') {
      // baú do tesouro
      ctx.fillStyle = '#7a4a24';
      roundRect(ctx, this.x - 13, y - 3, 26, 13, 3); ctx.fill();
      ctx.fillStyle = '#6a3f1e';
      ctx.beginPath();
      ctx.moveTo(this.x - 13, y - 3);
      ctx.quadraticCurveTo(this.x, y - 16, this.x + 13, y - 3);
      ctx.closePath(); ctx.fill();
      // ferragens douradas
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(this.x - 13, y - 1, 26, 3);
      ctx.fillRect(this.x - 2, y - 9, 4, 14);
      ctx.strokeStyle = '#c89a2a'; ctx.lineWidth = 2;
      roundRect(ctx, this.x - 13, y - 3, 26, 13, 3); ctx.stroke();
      // fechadura + brilho
      ctx.fillStyle = '#ffe680';
      ctx.beginPath(); ctx.arc(this.x, y + 2, 2, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); ctx.arc(this.x - 6, y - 6, 1.5, 0, TAU); ctx.fill();
    } else if (this.kind === 'key') {
      // chave dourada
      ctx.save();
      ctx.translate(this.x, y);
      ctx.rotate(Math.sin(this.t * 2) * 0.15 - 0.5);
      ctx.fillStyle = '#f0c024'; ctx.strokeStyle = '#a87e10'; ctx.lineWidth = 1.5;
      // argola
      ctx.beginPath(); ctx.arc(-7, 0, 5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a2210'; ctx.beginPath(); ctx.arc(-7, 0, 2, 0, TAU); ctx.fill();
      // haste
      ctx.fillStyle = '#f0c024';
      roundRect(ctx, -2, -2, 14, 4, 1.5); ctx.fill();
      // dentes
      ctx.fillRect(8, 2, 3, 4); ctx.fillRect(4, 2, 3, 3);
      ctx.strokeStyle = '#a87e10'; ctx.lineWidth = 1;
      ctx.strokeRect(-2, -2, 14, 4);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.arc(-9, -2, 1.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- Projétil inimigo (ácido de cuspidor / cuspe de chefe) ----------
class EnemyShot {
  constructor(x, y, angle, speed, dmg, kind = 'acid') {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.dmg = dmg;
    this.kind = kind;
    this.r = kind === 'bolt' ? 7 : 6;
    this.life = 2.4;
    this.t = rand(100);
    this.dead = false;
  }

  update(dt, players) {
    this.life -= dt;
    this.t += dt;
    if (this.life <= 0) { this.dead = true; return; }
    const steps = 2;
    for (let s = 0; s < steps; s++) {
      this.x += this.vx * dt / steps;
      this.y += this.vy * dt / steps;
      if (World.pointBlocked(this.x, this.y)) {
        this.dead = true;
        Particles.spawn(this.x, this.y, { count: 6, color: this.kind === 'bolt' ? '#c88aff' : '#8aff6a', minSpeed: 30, maxSpeed: 130, minLife: 0.1, maxLife: 0.35, glow: true });
        return;
      }
      for (const p of players) {
        if (!p.alive) continue;
        const dx = this.x - p.x, dy = this.y - p.y;
        if (dx * dx + dy * dy < (this.r + p.r) * (this.r + p.r)) {
          p.hurt(this.dmg, Math.atan2(this.vy, this.vx));
          this.dead = true;
          Particles.spawn(this.x, this.y, { count: 8, color: this.kind === 'bolt' ? '#c88aff' : '#8aff6a', minSpeed: 40, maxSpeed: 160, glow: true });
          return;
        }
      }
    }
  }

  draw(ctx) {
    const col = this.kind === 'bolt' ? '#c88aff' : '#9dff5e';
    const glowCol = this.kind === 'bolt' ? '#a04aff' : '#5eff3a';
    ctx.fillStyle = col;
    ctx.shadowColor = glowCol;
    ctx.shadowBlur = 12;
    const wob = Math.sin(this.t * 20) * 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r + wob * 0.3, 0, TAU);
    ctx.fill();
    // rastro
    const a = Math.atan2(this.vy, this.vx);
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(this.x - Math.cos(a) * 8, this.y - Math.sin(a) * 8, this.r * 0.6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}

// ---------- Chefes ----------
const BOSSES = {
  abomination: { name: 'A ABOMINAÇÃO', emoji: '👹', hp: 1500, speed: 66, r: 44, dmg: 34, score: 3000, color: '#6a2f2f' },
  necromancer: { name: 'O NECROMANTE', emoji: '💀', hp: 1150, speed: 92, r: 32, dmg: 24, score: 3500, color: '#4a2f6a' },
  reaper:      { name: 'O CEIFADOR',   emoji: '☠️', hp: 1250, speed: 128, r: 30, dmg: 28, score: 4000, color: '#28323f' },
};

// ordem em que os chefes aparecem (ondas 5, 10, 15, 20…)
const BOSS_ORDER = ['abomination', 'necromancer', 'reaper'];

class Boss {
  constructor(type, x, y, hpScale) {
    const def = BOSSES[type];
    const D = (typeof Game !== 'undefined' && Game.diffDef) || { zhp: 1, zdmg: 1 };
    this.type = type;
    this.isBoss = true;
    this.def = def;
    this.name = def.name;
    this.emoji = def.emoji;
    this.x = x; this.y = y;
    this.r = def.r;
    this.hp = def.hp * hpScale * D.zhp;
    this.maxHp = this.hp;
    this.speed = def.speed;
    this.dmg = def.dmg * D.zdmg;
    this.score = def.score;
    this.color = def.color;
    this.dir = rand(TAU);
    this.anim = rand(100);
    this.hitFlash = 0;
    this.atkCd = 1.2;
    this.abilityCd = 3;
    this.state = 'idle';   // idle | charge | slam | teleport | cast | phase
    this.stateT = 0;
    this.chargeVX = 0; this.chargeVY = 0;
    this.phase = 1;        // muda de comportamento com pouca vida
    this.alpha = 1;
    this.slamRing = 0;
  }

  nearestPlayer() {
    let best = null, bd = Infinity;
    for (const p of Game.players) {
      if (!p.alive) continue;
      const d = dist(this.x, this.y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  move(mx, my, dt) {
    const m = Math.hypot(mx, my);
    if (m > 0) { mx /= m; my /= m; this.dir = Math.atan2(my, mx); }
    const nx = this.x + mx * this.speed * dt;
    const ny = this.y + my * this.speed * dt;
    if (!World.collides(nx, ny, this.r)) { this.x = nx; this.y = ny; }
    else if (!World.collides(nx, this.y, this.r)) { this.x = nx; }
    else if (!World.collides(this.x, ny, this.r)) { this.y = ny; }
    World.resolve(this);
  }

  update(dt) {
    this.anim += dt;
    this.hitFlash -= dt;
    this.stateT -= dt;
    this.atkCd -= dt;
    this.abilityCd -= dt;
    if (this.slamRing > 0) this.slamRing += dt * 900;
    if (this.hp < this.maxHp * 0.5 && this.phase === 1) { this.phase = 2; this.abilityCd = 0.5; }

    const target = this.nearestPlayer();

    if (this.type === 'abomination') this.updateAbomination(dt, target);
    else if (this.type === 'necromancer') this.updateNecromancer(dt, target);
    else this.updateReaper(dt, target);

    // contato corpo a corpo
    if (target && this.atkCd <= 0 && dist(this.x, this.y, target.x, target.y) < this.r + target.r + 4) {
      this.atkCd = 0.8;
      target.hurt(this.dmg, angTo(this.x, this.y, target.x, target.y));
    }
  }

  // --- A ABOMINAÇÃO: investe e martela o chão ---
  updateAbomination(dt, target) {
    if (!target) return;
    const spd = this.phase === 2 ? 1.3 : 1;
    if (this.state === 'charge') {
      this.move(this.chargeVX, this.chargeVY, dt * 2.4 * spd);
      if (this.stateT <= 0) { this.state = 'idle'; }
    } else if (this.state === 'slam') {
      if (this.stateT <= 0) {
        // impacto: dano em área
        this.slamRing = 1;
        Game.shake(14);
        Sound.bossSlam();
        Particles.spawn(this.x, this.y, { count: 30, color: '#8a5a3a', minSpeed: 100, maxSpeed: 340, minLife: 0.3, maxLife: 0.7 });
        for (const p of Game.players) {
          if (p.alive && dist(this.x, this.y, p.x, p.y) < 150) {
            p.hurt(this.dmg * 0.9, angTo(this.x, this.y, p.x, p.y));
          }
        }
        this.state = 'idle';
        this.atkCd = 1;
      }
    } else {
      this.move(Math.cos(angTo(this.x, this.y, target.x, target.y)), Math.sin(angTo(this.x, this.y, target.x, target.y)), dt);
      if (this.abilityCd <= 0) {
        const d = dist(this.x, this.y, target.x, target.y);
        if (d < 170) {
          // prepara martelada
          this.state = 'slam'; this.stateT = 0.7;
          this.abilityCd = this.phase === 2 ? 3.5 : 5;
        } else {
          // prepara investida na direção do alvo
          const a = angTo(this.x, this.y, target.x, target.y);
          this.chargeVX = Math.cos(a); this.chargeVY = Math.sin(a);
          this.state = 'charge'; this.stateT = 0.6;
          this.abilityCd = this.phase === 2 ? 3 : 4.5;
          Sound.bossRoar();
        }
      }
    }
  }

  // --- O NECROMANTE: teleporta, invoca e conjura projéteis ---
  updateNecromancer(dt, target) {
    if (!target) return;
    // mantém distância média
    const d = dist(this.x, this.y, target.x, target.y);
    const a = angTo(this.x, this.y, target.x, target.y);
    if (d < 260) this.move(-Math.cos(a), -Math.sin(a), dt);
    else if (d > 460) this.move(Math.cos(a), Math.sin(a), dt);

    if (this.abilityCd <= 0) {
      const roll = Math.random();
      if (roll < 0.4) {
        // teleporta para um novo ponto
        const spot = World.findFreeSpot(this.r + 6, 200);
        if (spot) {
          Particles.spawn(this.x, this.y, { count: 20, color: '#a04aff', minSpeed: 60, maxSpeed: 200, glow: true });
          this.x = spot.x; this.y = spot.y;
          Particles.spawn(this.x, this.y, { count: 20, color: '#a04aff', minSpeed: 60, maxSpeed: 200, glow: true });
          Sound.bossTeleport();
        }
        this.abilityCd = 3;
      } else if (roll < 0.72 && Game.zombies.length < 40) {
        // invoca lacaios
        const n = this.phase === 2 ? 4 : 2;
        for (let i = 0; i < n; i++) {
          const ang = rand(TAU), rr = rand(40, 90);
          const zx = clamp(this.x + Math.cos(ang) * rr, 40, World.W - 40);
          const zy = clamp(this.y + Math.sin(ang) * rr, 40, World.H - 40);
          if (!World.collides(zx, zy, 16)) {
            Game.zombies.push(new Zombie(Math.random() < 0.5 ? 'runner' : 'walker', zx, zy, Game.waveScale));
            Particles.spawn(zx, zy, { count: 10, color: '#7a3aff', minSpeed: 40, maxSpeed: 150, glow: true });
          }
        }
        Sound.bossSummon();
        this.abilityCd = this.phase === 2 ? 4 : 6;
      } else {
        // leque de projéteis mágicos
        const shots = this.phase === 2 ? 5 : 3;
        for (let i = 0; i < shots; i++) {
          const off = (i - (shots - 1) / 2) * 0.22;
          Game.enemyShots.push(new EnemyShot(this.x, this.y, a + off, 380, this.dmg * 0.7, 'bolt'));
        }
        Sound.bossCast();
        this.abilityCd = 2.4;
      }
    }
  }

  // --- O CEIFADOR: entra em modo sombra e dispara em rajada ---
  updateReaper(dt, target) {
    if (!target) return;
    const a = angTo(this.x, this.y, target.x, target.y);
    if (this.state === 'phase') {
      // desliza rápido e semi-invisível
      this.alpha = lerp(this.alpha, 0.35, 0.15);
      this.move(Math.cos(a), Math.sin(a), dt * 1.8);
      if (this.stateT <= 0) { this.state = 'idle'; }
    } else {
      this.alpha = lerp(this.alpha, 1, 0.15);
      this.move(Math.cos(a), Math.sin(a), dt);
      if (this.abilityCd <= 0) {
        if (Math.random() < 0.5) {
          this.state = 'phase'; this.stateT = 1.4;
          this.abilityCd = this.phase === 2 ? 2.5 : 4;
          Sound.bossTeleport();
        } else {
          // rajada em espiral
          const shots = this.phase === 2 ? 8 : 5;
          for (let i = 0; i < shots; i++) {
            const ang = a + (i - (shots - 1) / 2) * 0.16;
            Game.enemyShots.push(new EnemyShot(this.x, this.y, ang, 440, this.dmg * 0.55, 'bolt'));
          }
          Sound.bossCast();
          this.abilityCd = this.phase === 2 ? 2 : 3.2;
        }
      }
    }
  }

  // dano recebido reduzido no modo sombra do ceifador
  takeDamage(dmg) {
    const mult = (this.type === 'reaper' && this.state === 'phase') ? 0.4 : 1;
    this.hp -= dmg * mult;
    this.hitFlash = 0.08;
  }

  draw(ctx) {
    // anel de martelada (efeito)
    if (this.slamRing > 0 && this.slamRing < 300) {
      ctx.strokeStyle = `rgba(255,160,80,${1 - this.slamRing / 300})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.slamRing, 0, TAU);
      ctx.stroke();
    } else if (this.slamRing >= 300) this.slamRing = 0;

    // aura do chefe
    const auraCol = this.type === 'necromancer' ? '160,90,255' : this.type === 'reaper' ? '120,180,255' : '255,90,60';
    const aura = ctx.createRadialGradient(this.x, this.y, this.r * 0.5, this.x, this.y, this.r * 2.4);
    aura.addColorStop(0, `rgba(${auraCol},.30)`);
    aura.addColorStop(1, `rgba(${auraCol},0)`);
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 2.4, 0, TAU);
    ctx.fill();

    // sprite do chefe: IA (frente/costas/perfil) ou cartoon enquanto carrega
    const flip = Math.cos(this.dir) < 0;
    const bview = CARTOON.facing(this.dir).view;
    CARTOON.blit(ctx, (g, gx, gy) => {
      if (!(AIART.ready && AIART.monster(g, AIART.BOSS[this.type], gx, gy, bview, this.anim, AIART.BH)))
        CARTOON.bossSprite(g, this.type, gx, gy, 1, this.anim);
    }, this.x, this.y + this.r * 0.9, {
      scale: this.r * 0.024,
      flip,
      alpha: this.alpha,
      flash: this.hitFlash > 0 ? 0.8 : 0,
    });
  }
}
