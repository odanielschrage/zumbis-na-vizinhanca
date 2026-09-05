// ---------- Motor de personagens estilo cartoon 2D sombreado ----------
// Formas com contorno + gradiente + luz/sombra, renderizadas suaves (sem pixel).
const TAU2 = Math.PI * 2;
const OUT = '#241a26';            // cor de contorno padrão

// ---------- Ícones vetoriais (substituem emojis do sistema; visual coeso) ----------
const ICON = {
  draw(ctx, name, x, y, s = 1, col) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    (this[name] || this.dot).call(this, ctx, col);
    ctx.restore();
  },
  _stroke(ctx, c, w = 2) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; },
  dot(ctx, c) { ctx.fillStyle = c || '#fff'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU2); ctx.fill(); },

  person(ctx, c) {            // vizinho pedindo socorro (braços pra cima)
    c = c || '#ffe066';
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, -5, 4, 0, TAU2); ctx.fill();            // cabeça
    ctx.beginPath(); ctx.moveTo(-4, 8); ctx.quadraticCurveTo(0, -3, 4, 8); ctx.closePath(); ctx.fill();  // corpo
    this._stroke(ctx, c, 2.4);
    ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(-7, -6); ctx.moveTo(3, 1); ctx.lineTo(7, -6); ctx.stroke(); // braços
  },
  star(ctx, c) {
    c = c || '#ffd75e';
    ctx.fillStyle = c; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.4 : 8; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  },
  chest(ctx, c) {
    c = c || '#ffd24a';
    ctx.fillStyle = '#7a4a24'; roundRectC(ctx, -8, -1, 16, 9, 2); ctx.fill();
    ctx.fillStyle = '#6a3f1e'; ctx.beginPath(); ctx.moveTo(-8, -1); ctx.quadraticCurveTo(0, -10, 8, -1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c; ctx.fillRect(-8, 0, 16, 2); ctx.fillRect(-1.5, -5, 3, 9);
  },
  key(ctx, c) {
    c = c || '#f0c024';
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-4, 0, 4, 0, TAU2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(6, 4); ctx.moveTo(3, 0); ctx.lineTo(3, 3); ctx.stroke();
  },
  lock(ctx, c) {
    c = c || '#ffd24a';
    this._stroke(ctx, c, 2.4);
    ctx.beginPath(); ctx.arc(0, -3, 4, Math.PI, TAU2); ctx.stroke();
    ctx.fillStyle = c; roundRectC(ctx, -6, -1, 12, 9, 2); ctx.fill();
    ctx.fillStyle = '#5a4410'; ctx.beginPath(); ctx.arc(0, 3, 1.6, 0, TAU2); ctx.fill();
  },
  target(ctx, c) {
    c = c || '#7dff9e';
    this._stroke(ctx, c, 2.2);
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-5, 0); ctx.moveTo(9, 0); ctx.lineTo(5, 0); ctx.moveTo(0, -9); ctx.lineTo(0, -5); ctx.moveTo(0, 9); ctx.lineTo(0, 5); ctx.stroke();
  },
  flag(ctx, c) {
    c = c || '#7dff9e';
    this._stroke(ctx, '#cfd3d8', 2.2);
    ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(-5, -8); ctx.stroke();
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(7, -4); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
  },
  biohazard(ctx, c) {
    c = c || '#d86aff';
    ctx.fillStyle = c;
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate(i * TAU2 / 3);
      ctx.beginPath(); ctx.arc(0, -6, 3.6, 0, TAU2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#2a1030'; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, TAU2); ctx.fill();
  },
  fire(ctx, c) {
    c = c || '#ff8a2a';
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.quadraticCurveTo(6, -2, 3, 4);
    ctx.quadraticCurveTo(6, 2, 4, 7);
    ctx.quadraticCurveTo(0, 9, -4, 7);
    ctx.quadraticCurveTo(-6, 2, -3, 4);
    ctx.quadraticCurveTo(-6, -2, 0, -8);
    ctx.fill();
    ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.ellipse(0, 3, 2, 3, 0, 0, TAU2); ctx.fill();
  },
  snow(ctx, c) {
    c = c || '#bfeaff';
    this._stroke(ctx, c, 1.8);
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, -2.5); ctx.lineTo(8, 0); ctx.lineTo(5, 2.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, -2.5); ctx.lineTo(-8, 0); ctx.lineTo(-5, 2.5); ctx.stroke();
      ctx.restore();
    }
  },
  rocket(ctx, c) {
    c = c || '#d84a2a';
    ctx.save(); ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#e8e8ea'; roundRectC(ctx, -3, -3, 8, 6, 2); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(9, 0); ctx.lineTo(5, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(-6, -5); ctx.lineTo(-3, 0); ctx.lineTo(-6, 5); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(-5, 0, 2.2, 0, TAU2); ctx.fill();
    ctx.restore();
  },
  coin(ctx, c) {                 // dinheiro (HUD)
    c = c || '#ffd24a';
    ctx.fillStyle = shadeC(c, -30); ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, TAU2); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU2); ctx.fill();
    this._stroke(ctx, shadeC(c, -35), 1.6);            // "$"
    ctx.beginPath(); ctx.moveTo(0, -5.5); ctx.lineTo(0, 5.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2.6, -3.4); ctx.quadraticCurveTo(-3.2, -4.4, -3, -1.4); ctx.quadraticCurveTo(-2.8, 1, 2.8, 1.4); ctx.quadraticCurveTo(3.2, 4.2, -2.6, 3.4); ctx.stroke();
  },
  skull(ctx, c) {                // contador de zumbis (HUD)
    c = c || '#c7f58a';
    ctx.fillStyle = c; roundRectC(ctx, -7, -8, 14, 12, 6); ctx.fill();        // crânio
    ctx.beginPath(); ctx.moveTo(-4, 3); ctx.lineTo(-4, 8); ctx.lineTo(4, 8); ctx.lineTo(4, 3); ctx.closePath(); ctx.fill(); // mandíbula
    ctx.fillStyle = '#1e2a12';
    ctx.beginPath(); ctx.arc(-3.2, -2, 2.4, 0, TAU2); ctx.arc(3.2, -2, 2.4, 0, TAU2); ctx.fill();   // olhos
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-1.6, 3); ctx.lineTo(1.6, 3); ctx.closePath(); ctx.fill(); // nariz
    this._stroke(ctx, '#1e2a12', 1); ctx.beginPath(); ctx.moveTo(-3, 5.4); ctx.lineTo(3, 5.4); ctx.moveTo(0, 4); ctx.lineTo(0, 8); ctx.stroke(); // dentes
  },
  cart(ctx, c) {                 // loja (aviso na HUD)
    c = c || '#ffd75e';
    this._stroke(ctx, c, 2);
    ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-6, -6); ctx.lineTo(-3.5, 3); ctx.lineTo(7, 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(8.5, -2); ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(-2, 6.5, 1.8, 0, TAU2); ctx.arc(6, 6.5, 1.8, 0, TAU2); ctx.fill();
  },
  gun(ctx, c) {                  // arma genérica (cartão do jogador)
    c = c || '#cfd3d8';
    ctx.fillStyle = c; roundRectC(ctx, -8, -3, 15, 5, 1.5); ctx.fill();       // corpo/cano
    ctx.fillStyle = shadeC(c, -30); roundRectC(ctx, -6, 1, 4, 6, 1); ctx.fill(); // punho
  },

  // renderiza um ícone para data URL (usado na HUD em DOM). 2x para nitidez.
  dataURL(name, size = 26, col) {
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    this.draw(g, name, size / 2, size / 2, size / 22, col);
    return c.toDataURL();
  },
};

const CT = {
  // sombra no chão
  shadow(ctx, x, y, rx) {
    ctx.fillStyle = 'rgba(0,0,0,.30)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.38, 0, 0, TAU2);
    ctx.fill();
  },

  // contorno tonal: um tom bem mais escuro da própria cor (mais moderno que preto)
  tone(col, amt = -62) { return shadeC(col, amt); },

  // "blob" sombreado com contorno tonal fino + highlight superior
  blob(ctx, x, y, rx, ry, top, bot, ow = 3, oc = null, rot = 0, hi = 0.18) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (ow > 0) {
      ctx.fillStyle = oc || this.tone(bot);
      ctx.beginPath(); ctx.ellipse(0, 0, rx + ow, ry + ow, 0, 0, TAU2); ctx.fill();
    }
    const g = ctx.createLinearGradient(0, -ry, 0, ry);
    g.addColorStop(0, top);
    g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU2); ctx.fill();
    if (hi > 0) {
      ctx.fillStyle = `rgba(255,255,255,${hi})`;
      ctx.beginPath(); ctx.ellipse(-rx * 0.32, -ry * 0.42, rx * 0.5, ry * 0.34, -0.3, 0, TAU2); ctx.fill();
    }
    ctx.restore();
  },

  // membro (perna/braço) com contorno tonal fino
  limb(ctx, x1, y1, x2, y2, w, col, colD, oc = null, ow = 2.6) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = oc || this.tone(colD || col); ctx.lineWidth = w + ow * 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, col); g.addColorStop(1, colD || col);
    ctx.strokeStyle = g; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  },

  // caminho poligonal preenchido com contorno (cabelo, dentes, etc.)
  poly(ctx, pts, col, oc = null, ow = 2.5) {
    if (oc === null) oc = this.tone(col);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (ow > 0) { ctx.strokeStyle = oc; ctx.lineWidth = ow; ctx.stroke(); }
    ctx.fillStyle = col; ctx.fill();
  },
};

// ============ HERÓIS ============
const HERO_LOOKS = {
  zeca:  { skin: '#ffdca8', skinD: '#e5ab74', hair: '#ffd23a', hairD: '#e0a018', shirt2: '#2b303a', shirtD: '#191c22', logo: '#e63b2e', pants: '#3f6bd6', pantsD: '#264a9e', shoe: '#f0463e', shoeD: '#a81f18', hairStyle: 'spiky', acc: 'glasses3d', gun: '#5ec8ff' },
  bruna: { skin: '#d69a68', skinD: '#b0784a', hair: '#40291a', hairD: '#26160c', shirt2: '#b048c8', shirtD: '#7a2c8e', logo: '#ffffff', pants: '#2c313c', pantsD: '#181c24', shoe: '#f2f2f4', shoeD: '#b8b8c0', hairStyle: 'ponytail', acc: 'cap', gun: '#ff5ea8' },
  duda:  { skin: '#f0c290', skinD: '#d0975e', hair: '#5a3a1c', hairD: '#3a2410', shirt2: '#39a6d6', shirtD: '#236f92', logo: '#ffe066', pants: '#6a4a2a', pantsD: '#43301a', shoe: '#4a3320', shoeD: '#2a1c10', hairStyle: 'short', acc: 'nerd', gun: '#5eff9e' },
  rex:   { skin: '#d8a874', skinD: '#b0824c', hair: '#e63b2e', hairD: '#a01f18', shirt2: '#1c1c22', shirtD: '#0e0e12', logo: '#c0c0c8', pants: '#26262e', pantsD: '#141418', shoe: '#7a2020', shoeD: '#4a1010', hairStyle: 'mohawk', acc: 'none', gun: '#ffaa3a' },
};

const CARTOON = {
  // direção do sprite a partir do ângulo (0=dir, PI/2=baixo, PI=esq, 3PI/2=cima)
  facing(dir) {
    const a = ((dir % TAU2) + TAU2) % TAU2;
    if (a >= Math.PI * 0.25 && a < Math.PI * 0.75) return { view: 'down', flip: false };
    if (a >= Math.PI * 0.75 && a < Math.PI * 1.25) return { view: 'side', flip: true };
    if (a >= Math.PI * 1.25 && a < Math.PI * 1.75) return { view: 'up', flip: false };
    return { view: 'side', flip: false };
  },

  // desenha a arma equipada na mão do herói (varia por tipo)
  _gun(ctx, L, gx, gy, rot, weapon) {
    ctx.save();
    ctx.translate(gx, gy); ctx.rotate(rot);
    if (weapon === 'shotgun') {
      ctx.fillStyle = '#5a3a22'; roundRectC(ctx, -7, -4, 11, 8, 2); ctx.fill();     // coronha
      ctx.fillStyle = '#2a2e34'; roundRectC(ctx, 2, -3.5, 22, 7, 2); ctx.fill();     // cano duplo
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(4, 0, 20, 1);
    } else if (weapon === 'smg') {
      ctx.fillStyle = '#26292f'; roundRectC(ctx, -5, -4, 22, 8, 2); ctx.fill();
      ctx.fillStyle = '#3a3f47'; roundRectC(ctx, 2, 3, 4, 8, 1); ctx.fill();         // carregador
      ctx.fillStyle = '#4a4e55'; ctx.fillRect(14, -2, 6, 1.6);
    } else if (weapon === 'flamethrower') {
      ctx.fillStyle = '#c8402a'; roundRectC(ctx, -9, -6, 13, 12, 3); ctx.fill();     // tanque
      ctx.fillStyle = shadeC('#c8402a', 30); roundRectC(ctx, -7, -4, 3, 9, 1); ctx.fill();
      ctx.fillStyle = '#3a3f47'; roundRectC(ctx, 4, -2.5, 18, 5, 2); ctx.fill();     // bico
      ctx.fillStyle = '#ffd24a'; ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(24, 0, 3, 0, TAU2); ctx.fill(); ctx.shadowBlur = 0;   // chama-piloto
    } else if (weapon === 'rocket') {
      ctx.fillStyle = '#3a5a2e'; roundRectC(ctx, -9, -6, 34, 12, 4); ctx.fill();     // tubo
      ctx.fillStyle = '#2a4020'; roundRectC(ctx, -12, -4, 6, 8, 2); ctx.fill();
      ctx.fillStyle = '#d84a2a'; ctx.beginPath(); ctx.moveTo(23, -5); ctx.lineTo(30, 0); ctx.lineTo(23, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffcf5e'; roundRectC(ctx, 2, -9, 4, 3, 1); ctx.fill();        // mira
    } else if (weapon === 'freeze') {
      ctx.fillStyle = '#2a5a7a'; roundRectC(ctx, -5, -4, 17, 8, 2); ctx.fill();
      ctx.fillStyle = shadeC('#2a5a7a', 25); roundRectC(ctx, -4, 2, 4, 7, 1); ctx.fill();
      ctx.fillStyle = '#8fe0ff'; ctx.shadowColor = '#4ab8ff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(15, 0, 4.5, 0, TAU2); ctx.fill();                     // cristal
      ctx.fillStyle = '#dff6ff'; ctx.beginPath(); ctx.arc(14, -1, 1.6, 0, TAU2); ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // pistola d'água na cor do personagem
      ctx.fillStyle = OUT; roundRectC(ctx, -4, -5, 20, 10, 3); ctx.fill();
      const gg = ctx.createLinearGradient(0, -4, 0, 4);
      gg.addColorStop(0, shadeC(L.gun, 40)); gg.addColorStop(1, L.gun);
      ctx.fillStyle = gg; roundRectC(ctx, -2, -3, 16, 6, 2); ctx.fill();
      ctx.fillStyle = shadeC(L.gun, -30); roundRectC(ctx, -3, 1, 6, 8, 2); ctx.fill();
    }
    ctx.restore();
  },

  hero(ctx, look, x, footY, s, t, opts = {}) {
    const L = typeof look === 'string' ? HERO_LOOKS[look] : look;
    const moving = opts.moving !== false;
    const view = opts.view || 'down';
    const weapon = opts.weapon || 'pistol';
    const bob = Math.sin(t * (moving ? 7 : 3)) * (moving ? 2 : 1.2);
    const step = moving ? Math.sin(t * 11) * 5 : 0;
    ctx.save();
    ctx.translate(x, footY);
    ctx.scale(s, s);
    CT.shadow(ctx, 0, 2, 30);
    ctx.translate(0, bob);

    if (view === 'side') {
      // ---- PERFIL (virado para a direita; blit espelha p/ esquerda) ----
      CT.limb(ctx, -2, -38, -7 - step, -6, 13, L.pants, L.pantsD);   // perna de trás
      CT.blob(ctx, -9 - step, -3, 12, 6.5, shadeC(L.shoe, -25), L.shoeD, 4);
      CT.blob(ctx, 0, -54, 20, 27, L.shirt2 || L.shirt, L.shirtD, 5); // corpo (mais estreito)
      CT.limb(ctx, -4, -64, -12 - step * 0.5, -44, 10, L.skin, L.skinD); // braço de trás
      CT.limb(ctx, 2, -38, 8 + step, -6, 13, L.pants, L.pantsD);     // perna da frente
      CT.blob(ctx, 11 + step, -3, 12, 6.5, L.shoe, L.shoeD, 4);
      CT.limb(ctx, 6, -62, 22, -55, 10, L.skin, L.skinD);            // braço da frente
      this._gun(ctx, L, 24, -55, 0.05, weapon);
      CT.blob(ctx, 22, -55, 5.5, 5.5, L.skin, L.skinD, 3);
      this.headSide(ctx, L, 3, -90, t);

    } else if (view === 'up') {
      // ---- COSTAS (andando para longe) ----
      CT.limb(ctx, -9, -38, -10 - step * 0.4, -6, 14, L.pants, L.pantsD);
      CT.limb(ctx, 9, -38, 10 + step * 0.4, -6, 14, L.pants, L.pantsD);
      CT.blob(ctx, -13 - step * 0.4, -3, 12, 7, L.shoe, L.shoeD, 4);
      CT.blob(ctx, 13 + step * 0.4, -3, 12, 7, L.shoe, L.shoeD, 4);
      CT.blob(ctx, 0, -54, 24, 27, L.shirtD, shadeC(L.shirtD, -18), 5);  // costas da camisa
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -66); ctx.lineTo(0, -44); ctx.stroke();
      // braços erguidos, arma apontando para cima (para longe)
      CT.limb(ctx, -19, -64, -25, -76, 11, L.skin, L.skinD);
      CT.limb(ctx, 19, -64, 25, -76, 11, L.skin, L.skinD);
      this._gun(ctx, L, 27, -78, -1.45, weapon);
      CT.blob(ctx, -25, -77, 6, 6, L.skin, L.skinD, 4);
      CT.blob(ctx, 25, -77, 6, 6, L.skin, L.skinD, 4);
      this.headBack(ctx, L, 0, -90);

    } else {
      // ---- FRENTE (vindo em sua direção) ----
      CT.limb(ctx, -9, -38, -10 - step * 0.4, -6, 14, L.pants, L.pantsD);
      CT.limb(ctx, 9, -38, 10 + step * 0.4, -6, 14, L.pants, L.pantsD);
      CT.blob(ctx, -13 - step * 0.4, -3, 12, 7, L.shoe, L.shoeD, 4);
      CT.blob(ctx, 13 + step * 0.4, -3, 12, 7, L.shoe, L.shoeD, 4);
      CT.blob(ctx, 0, -54, 24, 27, L.shirt2 || L.shirt, L.shirtD, 5);
      ctx.fillStyle = L.logo; ctx.beginPath(); ctx.arc(0, -56, 6.5, 0, TAU2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(-2, -58, 2.4, 0, TAU2); ctx.fill();
      CT.limb(ctx, -19, -64, -28, -42, 11, L.skin, L.skinD);
      CT.limb(ctx, 19, -64, 28, -42, 11, L.skin, L.skinD);
      CT.blob(ctx, -29, -40, 6.5, 6.5, L.skin, L.skinD, 4);
      this._gun(ctx, L, 29, -41, -0.5, weapon);
      CT.blob(ctx, 29, -40, 6.5, 6.5, L.skin, L.skinD, 4);
      CT.blob(ctx, 0, -90, 25, 23, L.skin, L.skinD, 4, null, 0, 0.16);
      CT.blob(ctx, -24, -88, 5, 6, L.skin, L.skinD, 3);
      CT.blob(ctx, 24, -88, 5, 6, L.skin, L.skinD, 3);
      this.hair(ctx, L, 0, -90, 26, 24);
      this.face(ctx, L, 0, -90, 26, 24, t);
    }

    ctx.restore();
  },

  // cabeça vista de COSTAS (só cabelo/nuca)
  headBack(ctx, L, hx, hy) {
    const rx = 26, ry = 24;
    CT.blob(ctx, hx, hy, 24, 22, L.skin, L.skinD, 4, null, 0, 0.05);
    CT.blob(ctx, hx - 23, hy + 2, 5, 6, L.skin, L.skinD, 3);
    CT.blob(ctx, hx + 23, hy + 2, 5, 6, L.skin, L.skinD, 3);
    if (L.hairStyle === 'ponytail') {
      CT.blob(ctx, hx, hy - 2, rx * 0.98, ry * 0.92, L.hair, L.hairD, 3, null, 0, 0.06);
      CT.blob(ctx, hx, hy + 16, 8, 15, L.hair, L.hairD, 3, null, 0, 0.1);
      CT.blob(ctx, hx, hy + 30, 6, 8, L.hair, L.hairD, 3);
    } else if (L.hairStyle === 'mohawk') {
      CT.blob(ctx, hx, hy, rx * 0.96, ry * 0.86, shadeC(L.skin, -22), shadeC(L.skinD, -22), 3, null, 0, 0.04);
      CT.poly(ctx, [[hx - 5, hy - 16], [hx - 4, hy + 16], [hx + 4, hy + 16], [hx + 5, hy - 16]], L.hair, null, 3);
    } else if (L.hairStyle === 'spiky') {
      CT.blob(ctx, hx, hy - 2, rx * 1.0, ry * 0.94, L.hair, L.hairD, 3, null, 0, 0.06);
      const sp = [[-16, -14, -22, -28], [-6, -16, -7, -34], [5, -16, 10, -31], [15, -13, 22, -24]];
      for (const [ax, ay, bx, by] of sp) CT.poly(ctx, [[hx + ax, hy + ay], [hx + bx, hy + by], [hx + ax + 5, hy + ay - 2]], L.hair, null, 3);
    } else {
      CT.blob(ctx, hx, hy - 1, rx * 0.99, ry * 0.92, L.hair, L.hairD, 3);
    }
    if (L.acc === 'cap') {
      ctx.strokeStyle = '#8a1e1e'; ctx.lineWidth = 2; ctx.fillStyle = '#d83232';
      ctx.beginPath(); ctx.arc(hx, hy - 2, rx * 0.9, Math.PI, TAU2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(hx - 4, hy + 4, 8, 5);   // fecho do boné
    }
  },

  // cabeça de PERFIL (virada para a direita)
  headSide(ctx, L, hx, hy, t) {
    const ink = '#3a2836';
    CT.blob(ctx, hx, hy, 22, 22, L.skin, L.skinD, 4, null, 0, 0.14);
    CT.blob(ctx, hx + 19, hy + 3, 5, 5, L.skin, L.skinD, 0, null, 0, 0.1);  // nariz
    CT.blob(ctx, hx - 11, hy + 2, 5, 6, L.skin, L.skinD, 3);                 // orelha atrás
    // cabelo (cobre trás/topo)
    if (L.hairStyle === 'spiky') {
      CT.blob(ctx, hx - 4, hy - 3, 22, 18, L.hair, L.hairD, 3, null, 0, 0.06);
      const sp = [[-14, -12, -22, -24], [-4, -14, -6, -30], [6, -13, 9, -28], [15, -10, 21, -20]];
      for (const [ax, ay, bx, by] of sp) CT.poly(ctx, [[hx + ax, hy + ay], [hx + bx, hy + by], [hx + ax + 5, hy + ay - 2]], L.hair, null, 3);
      CT.poly(ctx, [[hx + 16, hy - 8], [hx + 21, hy - 3], [hx + 15, hy - 14]], L.hair, null, 2);   // franja
    } else if (L.hairStyle === 'ponytail') {
      CT.blob(ctx, hx - 5, hy - 2, 21, 18, L.hair, L.hairD, 3, null, 0, 0.06);
      CT.blob(ctx, hx - 17, hy + 4, 7, 14, L.hair, L.hairD, 3, null, 0.4);
    } else if (L.hairStyle === 'mohawk') {
      CT.blob(ctx, hx - 6, hy, 20, 16, shadeC(L.skin, -20), shadeC(L.skinD, -20), 0, null, 0, 0.04);
      CT.poly(ctx, [[hx - 14, hy - 6], [hx - 6, hy - 30], [hx + 3, hy - 30], [hx + 7, hy - 6]], L.hair, null, 3);
    } else {
      CT.blob(ctx, hx - 4, hy - 2, 21, 18, L.hair, L.hairD, 3, null, 0, 0.06);
      CT.poly(ctx, [[hx + 14, hy - 8], [hx + 19, hy - 3], [hx + 14, hy - 13]], L.hair, null, 2);
    }
    // um olho (à frente)
    const ex = hx + 9, ey = hy;
    if (L.acc === 'glasses3d') {
      ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.fillStyle = '#3a60e0';
      ctx.beginPath(); ctx.ellipse(ex, ey, 5, 5, 0, 0, TAU2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex - 5, ey); ctx.lineTo(hx - 8, ey - 1); ctx.stroke();
    } else if (L.acc === 'nerd') {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, TAU2); ctx.fill();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(ex + 0.6, ey, 1.7, 0, TAU2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, TAU2); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 3.4, 4.4, 0, 0, TAU2); ctx.fill();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(ex + 1, ey, 2, 0, TAU2); ctx.fill();
    }
    // sobrancelha + sorriso lateral
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(hx + 15, hy + 9, 4, -0.15 * Math.PI, 0.55 * Math.PI); ctx.stroke();
    if (L.acc === 'cap') {
      ctx.strokeStyle = '#8a1e1e'; ctx.lineWidth = 2; ctx.fillStyle = '#d83232';
      ctx.beginPath(); ctx.arc(hx - 2, hy - 3, 20, Math.PI, TAU2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ee5252'; ctx.beginPath(); ctx.ellipse(hx + 15, hy - 7, 13, 4, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
    }
  },

  hair(ctx, L, hx, hy, rx, ry) {
    if (L.hairStyle === 'spiky') {
      // volume do cabelo abraçando o topo E as laterais do crânio (não flutua como coroa)
      CT.blob(ctx, hx, hy - 4, rx * 1.06, ry * 0.94, L.hair, L.hairD, 3, null, 0, 0.08);
      // espetos emergindo do volume
      const spikes = [[-17, -13, -22, -28, -9], [-7, -15, -8, -34, 4], [5, -15, 10, -31, 15], [14, -12, 23, -23, 12]];
      for (const [ax, ay, bx, by, cx2] of spikes) {
        CT.poly(ctx, [[hx + ax, hy + ay], [hx + bx, hy + by], [hx + cx2, hy + ay - 2]], L.hair, null, 3);
      }
      // reabre o rosto (pele) por cima, deixando o cabelo só como moldura
      CT.blob(ctx, hx, hy + 5, rx * 0.82, ry * 0.74, L.skin, L.skinD, 0, null, 0, 0.14);
      // franja: pontinhas de cabelo na testa, ACIMA dos óculos (sem sobrepor)
      CT.poly(ctx, [
        [hx - 18, hy - 15], [hx - 13, hy - 10], [hx - 7, hy - 15], [hx - 1, hy - 10],
        [hx + 5, hy - 15], [hx + 11, hy - 10], [hx + 17, hy - 15], [hx + 18, hy - 20], [hx - 18, hy - 20],
      ], L.hair, null, 2);
      // brilho
      ctx.fillStyle = 'rgba(255,255,255,.26)';
      ctx.beginPath(); ctx.ellipse(hx - 9, hy - 15, 6, 3, -0.4, 0, TAU2); ctx.fill();
    } else if (L.hairStyle === 'ponytail') {
      // volume do cabelo emoldurando (atrás da cabeça)
      CT.blob(ctx, hx, hy - 3, rx * 1.12, ry * 0.98, L.hair, L.hairD, 3, null, 0, 0.05);
      // rabo de cavalo saindo por trás
      CT.blob(ctx, hx + rx * 1.02, hy + 3, 9, 16, L.hair, L.hairD, 3, null, 0.5);
      // reabre o rosto (pele) por cima, deixando o cabelo só como moldura
      CT.blob(ctx, hx, hy + 3, rx * 0.8, ry * 0.84, L.skin, L.skinD, 0, null, 0, 0.14);
      // brilho no cabelo
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      ctx.beginPath(); ctx.ellipse(hx - 12, hy - 12, 6, 3, -0.4, 0, TAU2); ctx.fill();
    } else if (L.hairStyle === 'mohawk') {
      // laterais raspadas (leve sombra na cabeça) + crista central
      CT.blob(ctx, hx, hy - 2, rx * 1.02, ry * 0.5, shadeC(L.skin, -30), shadeC(L.skinD, -30), 3, null, 0, 0.05);
      CT.blob(ctx, hx, hy + 6, rx * 0.88, ry * 0.7, L.skin, L.skinD, 0, null, 0, 0.14);
      // crista (leque de espetos no topo-centro)
      const cr = [[-6, -6, -10, -30], [-2, -8, -3, -36], [2, -8, 3, -36], [6, -6, 10, -30]];
      for (const [ax, ay, bx, by] of cr) {
        CT.poly(ctx, [[hx + ax, hy + ay], [hx + (ax + bx) / 2, hy + by], [hx + bx, hy + ay - 4]], L.hair, null, 3);
      }
      CT.poly(ctx, [[hx - 6, hy - 6], [hx, hy - 34], [hx + 6, hy - 6]], L.hair, null, 3);
    } else {
      // curto — cabelo baixo, moldura + reabre rosto
      CT.blob(ctx, hx, hy - 3, rx * 1.02, ry * 0.86, L.hair, L.hairD, 3, null, 0, 0.06);
      CT.blob(ctx, hx, hy + 6, rx * 0.82, ry * 0.72, L.skin, L.skinD, 0, null, 0, 0.14);
      // franjinha
      CT.poly(ctx, [[hx - 17, hy - 9], [hx - 10, hy - 3], [hx - 3, hy - 9], [hx + 4, hy - 3], [hx + 11, hy - 9], [hx + 17, hy - 6], [hx + 17, hy - 16], [hx - 17, hy - 16]], L.hair, null, 2);
    }
  },

  face(ctx, L, hx, hy, rx, ry, t) {
    const ey = hy - 2, edx = 9;
    // boné desenhado primeiro (sobre o cabelo, acima dos olhos)
    const ink = '#3a2836';   // "tinta" tonal (mais suave que preto puro)
    if (L.acc === 'cap') {
      ctx.save();
      ctx.strokeStyle = '#8a1e1e'; ctx.lineWidth = 2;
      ctx.fillStyle = '#d83232';
      // copa do boné
      ctx.beginPath(); ctx.ellipse(hx, hy - 13, rx * 0.9, ry * 0.62, 0, Math.PI, TAU2); ctx.fill(); ctx.stroke();
      // aba
      ctx.fillStyle = '#ee5252';
      ctx.beginPath(); ctx.ellipse(hx - 3, hy - 11, rx * 1.05, 5.5, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
      // brilho na copa
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      ctx.beginPath(); ctx.ellipse(hx - 8, hy - 18, 6, 3, -0.3, 0, TAU2); ctx.fill();
      ctx.restore();
    }
    if (L.acc === 'glasses3d') {
      // óculos 3D — armação fina tonal, lentes menores (não vira "máscara")
      ctx.strokeStyle = ink; ctx.lineWidth = 1.6;
      ctx.fillStyle = '#e63b2e';
      ctx.beginPath(); ctx.ellipse(hx - edx, ey, 5.5, 5, 0, 0, TAU2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a60e0';
      ctx.beginPath(); ctx.ellipse(hx + edx, ey, 5.5, 5, 0, 0, TAU2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx - 3, ey); ctx.lineTo(hx + 3, ey); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.arc(hx - edx - 1.5, ey - 1.5, 1.5, 0, TAU2); ctx.arc(hx + edx - 1.5, ey - 1.5, 1.5, 0, TAU2); ctx.fill();
    } else {
      // olhos simples grandes e expressivos
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(hx - edx, ey, 4.5, 5.5, 0, 0, TAU2); ctx.ellipse(hx + edx, ey, 4.5, 5.5, 0, 0, TAU2); ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(hx - edx + 1, ey + 1, 2.3, 0, TAU2); ctx.arc(hx + edx + 1, ey + 1, 2.3, 0, TAU2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.arc(hx - edx + 0.2, ey - 0.4, 1, 0, TAU2); ctx.arc(hx + edx + 0.2, ey - 0.4, 1, 0, TAU2); ctx.fill();
      // sobrancelhas finas
      ctx.strokeStyle = L.hairD; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx - edx - 4, ey - 7); ctx.lineTo(hx - edx + 3, ey - 8); ctx.moveTo(hx + edx - 3, ey - 8); ctx.lineTo(hx + edx + 4, ey - 7); ctx.stroke();
      // óculos de nerd (aro grosso arredondado) por cima dos olhos
      if (L.acc === 'nerd') {
        ctx.strokeStyle = ink; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(hx - edx, ey, 6, 0, TAU2); ctx.stroke();
        ctx.beginPath(); ctx.arc(hx + edx, ey, 6, 0, TAU2); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - edx + 6, ey); ctx.lineTo(hx + edx - 6, ey); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(hx - edx - 2, ey - 2, 3, -0.9, 0.4); ctx.arc(hx + edx - 2, ey - 2, 3, -0.9, 0.4); ctx.stroke();
      }
    }
    // bochechas
    ctx.fillStyle = 'rgba(230,120,90,.30)';
    ctx.beginPath(); ctx.arc(hx - 15, ey + 8, 4, 0, TAU2); ctx.arc(hx + 15, ey + 8, 4, 0, TAU2); ctx.fill();
    // sorriso
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(hx, ey + 8, 5.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  },

  // ============ MONSTROS ============
  zombie(ctx, x, footY, s, t) {
    const sway = Math.sin(t * 2) * 3;
    ctx.save();
    ctx.translate(x, footY);
    ctx.scale(s, s);
    CT.shadow(ctx, 0, 2, 28);
    ctx.translate(sway * 0.3, Math.sin(t * 4) * 1.2);
    const g = '#5f9a3c', gD = '#3f6b26', skin = '#78ab52';

    // pernas cambaleantes
    CT.limb(ctx, -8, -34, -12, -5, 13, g, gD);
    CT.limb(ctx, 8, -34, 11, -5, 13, g, gD);
    CT.blob(ctx, -12, -3, 10, 6, gD, '#2a4a18', 4);
    CT.blob(ctx, 11, -3, 10, 6, gD, '#2a4a18', 4);

    // corpo com camisa rasgada
    CT.blob(ctx, 0, -50, 23, 25, '#6a3f6e', '#3f2444', 5);
    // rasgos mostrando carne
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(-6, -46, 5, 0, TAU2); ctx.arc(9, -54, 4, 0, TAU2); ctx.fill();
    ctx.fillStyle = 'rgba(20,10,20,.4)';
    ctx.beginPath(); ctx.moveTo(-2, -62); ctx.lineTo(2, -44); ctx.lineTo(6, -62); ctx.fill();

    // braços esticados para a frente (um mais alto)
    CT.limb(ctx, -18, -58, -30, -46 + sway, 11, g, gD);
    CT.limb(ctx, 18, -60, 30, -52 - sway, 11, g, gD);
    CT.blob(ctx, -31, -46 + sway, 6, 6, skin, gD, 4);
    CT.blob(ctx, 31, -52 - sway, 6, 6, skin, gD, 4);

    // cabeça tombada
    ctx.save();
    ctx.translate(-4, -82); ctx.rotate(-0.18);
    CT.blob(ctx, 0, 0, 22, 21, skin, gD, 6, OUT, 0, 0.1);
    // olhos vermelhos brilhantes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-8, -2, 5.5, 5, 0, 0, TAU2); ctx.ellipse(8, -2, 5.5, 5, 0, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#ff2a2a'; ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(-7, -1, 2.6, 0, TAU2); ctx.arc(9, -1, 2.6, 0, TAU2); ctx.fill();
    ctx.shadowBlur = 0;
    // sobrancelha zangada
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-13, -9); ctx.lineTo(-3, -5); ctx.moveTo(13, -9); ctx.lineTo(3, -5); ctx.stroke();
    // boca aberta com dentes
    ctx.fillStyle = '#1a0e14';
    ctx.beginPath(); ctx.ellipse(0, 10, 8, 5, 0, 0, TAU2); ctx.fill();
    CT.poly(ctx, [[-6, 7], [-4, 12], [-2, 7]], '#e8e2d0', OUT, 1.5);
    CT.poly(ctx, [[3, 7], [5, 12], [7, 7]], '#e8e2d0', OUT, 1.5);
    // baba
    ctx.fillStyle = 'rgba(150,230,120,.6)';
    ctx.beginPath(); ctx.ellipse(4, 15 + Math.sin(t * 3) * 1.5, 1.8, 3, 0, 0, TAU2); ctx.fill();
    ctx.restore();
    ctx.restore();
  },

  alien(ctx, x, footY, s, t) {
    const float = Math.sin(t * 2.5) * 2;
    ctx.save();
    ctx.translate(x, footY);
    ctx.scale(s, s);
    CT.shadow(ctx, 0, 2, 24);
    ctx.translate(0, float);
    const g = '#79d69e', gD = '#3f9c68', gDD = '#2a6e48';

    // pernas finas
    CT.limb(ctx, -7, -22, -9, -4, 8, gD, gDD);
    CT.limb(ctx, 7, -22, 9, -4, 8, gD, gDD);
    CT.blob(ctx, -10, -3, 7, 5, gD, gDD, 3.5);
    CT.blob(ctx, 10, -3, 7, 5, gD, gDD, 3.5);

    // corpo pequeno
    CT.blob(ctx, 0, -30, 14, 16, g, gD, 5);

    // braços finos + raio na mão
    CT.limb(ctx, -12, -34, -22, -26, 7, gD, gDD);
    CT.limb(ctx, 12, -34, 24, -30, 7, gD, gDD);
    // pistola de raio
    ctx.save();
    ctx.translate(26, -30); ctx.rotate(-0.3);
    ctx.fillStyle = OUT; roundRectC(ctx, -4, -6, 18, 12, 4); ctx.fill();
    const rg = ctx.createLinearGradient(0, -5, 0, 5);
    rg.addColorStop(0, '#c86af0'); rg.addColorStop(1, '#8a34c0');
    ctx.fillStyle = rg; roundRectC(ctx, -2, -4, 14, 8, 3); ctx.fill();
    ctx.fillStyle = '#63f0d8'; ctx.shadowColor = '#63f0d8'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(13, 0, 3, 0, TAU2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();

    // cabeça enorme
    CT.blob(ctx, 0, -54, 30, 27, g, gD, 6, OUT, 0, 0.18);
    // antenas
    ctx.strokeStyle = gDD; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, -78); ctx.lineTo(-12, -90); ctx.moveTo(8, -78); ctx.lineTo(12, -90); ctx.stroke();
    ctx.fillStyle = '#63f0d8'; ctx.shadowColor = '#63f0d8'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(-12, -91, 3, 0, TAU2); ctx.arc(12, -91, 3, 0, TAU2); ctx.fill();
    ctx.shadowBlur = 0;
    // olhos amendoados enormes
    ctx.save();
    ctx.translate(0, -52);
    for (const sgn of [-1, 1]) {
      ctx.save(); ctx.translate(sgn * 12, 0); ctx.rotate(sgn * 0.35);
      ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 13, 0, 0, TAU2); ctx.fill();
      ctx.fillStyle = '#0a0a12';
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 11, 0, 0, TAU2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.ellipse(-2, -4, 2.4, 4, -0.3, 0, TAU2); ctx.fill();
      ctx.fillStyle = 'rgba(120,240,220,.5)';
      ctx.beginPath(); ctx.ellipse(2, 4, 2, 3, 0, 0, TAU2); ctx.fill();
      ctx.restore();
    }
    // boquinha
    ctx.strokeStyle = gDD; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 14, 3, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.restore();

    ctx.restore();
  },

  // ---- MANÍACO de motosserra (humano rápido, máscara de hóquei) ----
  maniac(ctx, x, footY, s, t) {
    const lean = Math.sin(t * 8) * 2;
    ctx.save(); ctx.translate(x, footY); ctx.scale(s, s);
    CT.shadow(ctx, 0, 2, 26);
    const skin = '#e8b088', mask = '#e6e6ea', maskD = '#b6b8c2', cloth = '#3a3f47', clothD = '#23272e', blood = '#a01818';
    const step = Math.sin(t * 12) * 5;
    CT.limb(ctx, -8, -34, -9 - step * 0.4, -5, 12, clothD, '#15181c');
    CT.limb(ctx, 8, -34, 9 + step * 0.4, -5, 12, clothD, '#15181c');
    CT.blob(ctx, -11, -3, 10, 6, '#2a2e34', '#141618', 3);
    CT.blob(ctx, 11, -3, 10, 6, '#2a2e34', '#141618', 3);
    // avental ensanguentado
    CT.blob(ctx, 0, -50, 22, 25, cloth, clothD, 4);
    ctx.fillStyle = blood;
    ctx.beginPath(); ctx.arc(-5, -46, 4, 0, TAU2); ctx.arc(7, -54, 3, 0, TAU2); ctx.moveTo(2, -40); ctx.arc(2, -40, 5, 0, TAU2); ctx.fill();
    // braços; direito segura a motosserra
    CT.limb(ctx, -18, -58, -26, -44, 10, skin, '#c48a60');
    CT.blob(ctx, -27, -43, 6, 6, skin, '#c48a60', 3);
    CT.limb(ctx, 16, -56, 30, -48 + lean, 10, skin, '#c48a60');
    // motosserra
    ctx.save(); ctx.translate(32, -48 + lean); ctx.rotate(0.1);
    ctx.fillStyle = '#5a3a1a'; roundRectC(ctx, -8, -6, 16, 12, 3); ctx.fill();       // motor
    ctx.fillStyle = '#c86a1a'; roundRectC(ctx, -6, -4, 10, 8, 2); ctx.fill();
    ctx.fillStyle = '#8a9098'; roundRectC(ctx, 6, -3, 26, 6, 2); ctx.fill();          // lâmina
    ctx.strokeStyle = '#4a4e55'; ctx.lineWidth = 1.5;
    for (let i = 8; i < 30; i += 4) { ctx.beginPath(); ctx.moveTo(i, -3); ctx.lineTo(i + 2, -6); ctx.stroke(); }
    ctx.restore();
    CT.blob(ctx, 30, -48 + lean, 5.5, 5.5, skin, '#c48a60', 3);
    // cabeça com máscara de hóquei
    CT.blob(ctx, 0, -84, 20, 20, skin, '#c48a60', 4, null, 0, 0.1);
    CT.blob(ctx, 0, -85, 17, 19, mask, maskD, 3, null, 0, 0.12);
    ctx.fillStyle = '#1a1a1e';
    ctx.beginPath(); ctx.arc(-6, -88, 2.6, 0, TAU2); ctx.arc(6, -88, 2.6, 0, TAU2); ctx.arc(0, -82, 2.2, 0, TAU2); ctx.fill();
    ctx.beginPath(); ctx.arc(-4, -76, 1.6, 0, TAU2); ctx.arc(0, -75, 1.6, 0, TAU2); ctx.arc(4, -76, 1.6, 0, TAU2); ctx.fill();
    ctx.strokeStyle = maskD; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -98); ctx.lineTo(0, -74); ctx.stroke();
    ctx.restore();
  },

  // ---- LOBISOMEM (rápido, peludo, garras) ----
  werewolf(ctx, x, footY, s, t) {
    const br = '#6b4a2a', brD = '#3f2c18', brL = '#8a6238';
    const step = Math.sin(t * 13) * 6;
    ctx.save(); ctx.translate(x, footY); ctx.scale(s, s);
    CT.shadow(ctx, 0, 2, 28);
    CT.limb(ctx, -9, -32, -12 - step * 0.3, -4, 13, brD, '#241407');
    CT.limb(ctx, 9, -32, 12 + step * 0.3, -4, 13, brD, '#241407');
    // pés/garras
    for (const sx of [-12, 12]) { ctx.fillStyle = '#e8e2d0'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(sx + k * 3, -3); ctx.lineTo(sx + k * 3 + 1, -8); ctx.lineTo(sx + k * 3 + 2, -3); ctx.fill(); } }
    // corpo peludo (largo, ombros)
    CT.blob(ctx, 0, -48, 24, 24, br, brD, 4);
    // barriga clara
    CT.blob(ctx, 0, -44, 12, 15, brL, br, 0, null, 0, 0.1);
    // ombros
    CT.blob(ctx, -20, -58, 8, 8, br, brD, 3); CT.blob(ctx, 20, -58, 8, 8, br, brD, 3);
    // braços com garras à frente
    CT.limb(ctx, -19, -58, -30, -42, 11, br, brD);
    CT.limb(ctx, 19, -58, 30, -42, 11, br, brD);
    for (const hx of [-31, 31]) { CT.blob(ctx, hx, -41, 6, 6, brL, br, 3); ctx.fillStyle = '#e8e2d0'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(hx + k * 2.5 - (hx < 0 ? 2 : -2), -45); ctx.lineTo(hx + k * 2.5 - (hx < 0 ? 5 : -5), -50); ctx.lineTo(hx + k * 2.5 + 1 - (hx < 0 ? 2 : -2), -45); ctx.fill(); } }
    // cabeça de lobo com focinho
    CT.blob(ctx, 0, -76, 18, 16, br, brD, 4, null, 0, 0.1);
    // orelhas pontudas
    CT.poly(ctx, [[-16, -84], [-20, -98], [-8, -88]], br, null, 3);
    CT.poly(ctx, [[16, -84], [20, -98], [8, -88]], br, null, 3);
    // focinho
    CT.blob(ctx, 0, -70, 9, 7, brL, br, 3);
    ctx.fillStyle = '#1a1014'; ctx.beginPath(); ctx.arc(0, -73, 2.4, 0, TAU2); ctx.fill();
    // olhos amarelos
    ctx.fillStyle = '#ffd83a'; ctx.shadowColor = '#ffb000'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(-7, -80, 2.4, 0, TAU2); ctx.arc(7, -80, 2.4, 0, TAU2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1014'; ctx.beginPath(); ctx.arc(-7, -80, 1, 0, TAU2); ctx.arc(7, -80, 1, 0, TAU2); ctx.fill();
    // presas
    ctx.fillStyle = '#fff'; CT.poly(ctx, [[-4, -67], [-3, -62], [-1, -67]], '#fff', null, 0); CT.poly(ctx, [[4, -67], [3, -62], [1, -67]], '#fff', null, 0);
    ctx.restore();
  },

  // ---- MÚMIA (lento, tanque, braços à frente) ----
  mummy(ctx, x, footY, s, t) {
    const wrap = '#d8cfa8', wrapD = '#a89a6e', wrapS = '#c2b78c';
    const sway = Math.sin(t * 3) * 2;
    ctx.save(); ctx.translate(x, footY); ctx.scale(s, s);
    CT.shadow(ctx, 0, 2, 26);
    CT.limb(ctx, -8, -34, -9, -4, 13, wrapD, '#7a6e48');
    CT.limb(ctx, 8, -34, 9, -4, 13, wrapD, '#7a6e48');
    CT.blob(ctx, -10, -3, 10, 6, wrap, wrapD, 3); CT.blob(ctx, 10, -3, 10, 6, wrap, wrapD, 3);
    // corpo enfaixado
    CT.blob(ctx, 0, -50, 22, 25, wrap, wrapD, 4);
    // faixas
    ctx.strokeStyle = 'rgba(120,110,72,.55)'; ctx.lineWidth = 2.5;
    for (let yy = -68; yy < -30; yy += 6) { ctx.beginPath(); ctx.moveTo(-20, yy); ctx.lineTo(20, yy + 3); ctx.stroke(); }
    // buraco escuro no peito
    ctx.fillStyle = 'rgba(20,16,10,.5)'; ctx.beginPath(); ctx.ellipse(4, -46, 4, 6, 0.3, 0, TAU2); ctx.fill();
    // braços esticados
    CT.limb(ctx, -18, -58, -30, -48 + sway, 11, wrapS, wrapD);
    CT.limb(ctx, 18, -58, 30, -50 - sway, 11, wrapS, wrapD);
    CT.blob(ctx, -31, -48 + sway, 6, 6, wrap, wrapD, 3); CT.blob(ctx, 31, -50 - sway, 6, 6, wrap, wrapD, 3);
    // faixa solta pendurada
    ctx.strokeStyle = wrap; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-30, -46 + sway); ctx.quadraticCurveTo(-36, -36, -33, -26 + sway); ctx.stroke();
    // cabeça enfaixada
    CT.blob(ctx, 0, -80, 18, 18, wrap, wrapD, 4, null, 0, 0.1);
    ctx.strokeStyle = 'rgba(120,110,72,.5)'; ctx.lineWidth = 2;
    for (let yy = -90; yy < -70; yy += 5) { ctx.beginPath(); ctx.moveTo(-16, yy); ctx.lineTo(16, yy + 2); ctx.stroke(); }
    // olhos vazios brilhando
    ctx.fillStyle = '#0a0e08'; ctx.beginPath(); ctx.ellipse(-6, -82, 4, 5, 0, 0, TAU2); ctx.ellipse(6, -82, 4, 5, 0, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#8affd0'; ctx.shadowColor = '#5affb0'; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(-6, -82, 1.6, 0, TAU2); ctx.arc(6, -82, 1.6, 0, TAU2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
  },

  // ---- BONECO ASSASSINO (minúsculo, enxame) ----
  doll(ctx, x, footY, s, t) {
    const skin = '#f0d0b0', skinD = '#cfa87e', dress = '#c83a6a', dressD = '#8a2448', hair = '#e0a020';
    const hop = Math.abs(Math.sin(t * 9)) * 3;
    ctx.save(); ctx.translate(x, footY - hop); ctx.scale(s, s);
    CT.shadow(ctx, 0, 2 + hop, 14);
    // perninhas
    CT.limb(ctx, -4, -14, -5, -2, 6, skin, skinD); CT.limb(ctx, 4, -14, 5, -2, 6, skin, skinD);
    CT.blob(ctx, -5, -1, 5, 4, '#3a2a4a', '#1e1428', 2.5); CT.blob(ctx, 5, -1, 5, 4, '#3a2a4a', '#1e1428', 2.5);
    // vestidinho
    CT.blob(ctx, 0, -20, 11, 12, dress, dressD, 3);
    CT.poly(ctx, [[-11, -14], [11, -14], [8, -6], [-8, -6]], dress, null, 3);
    // bracinhos
    CT.limb(ctx, -9, -24, -14, -16, 5, skin, skinD); CT.limb(ctx, 9, -24, 14, -16, 5, skin, skinD);
    // faca minúscula
    ctx.fillStyle = '#c0c4cc'; CT.poly(ctx, [[14, -18], [20, -20], [14, -14]], '#c0c4cc', null, 1.5);
    // cabeção
    CT.blob(ctx, 0, -38, 15, 14, skin, skinD, 4, null, 0, 0.14);
    // cabelo
    CT.blob(ctx, 0, -44, 15, 8, hair, '#a87814', 3, null, 0, 0.1);
    CT.blob(ctx, -14, -40, 5, 8, hair, '#a87814', 3); CT.blob(ctx, 14, -40, 5, 8, hair, '#a87814', 3);
    // olhos X (costurados) e boca de linha
    ctx.strokeStyle = '#2a1a24'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(-4, -36); ctx.moveTo(-4, -40); ctx.lineTo(-8, -36); ctx.stroke();
    ctx.fillStyle = '#c83a3a'; ctx.beginPath(); ctx.arc(6, -38, 2.6, 0, TAU2); ctx.fill();
    ctx.strokeStyle = '#c83a3a'; ctx.beginPath(); ctx.arc(6, -38, 2.6, 0, TAU2); ctx.stroke();
    // boca costurada
    ctx.strokeStyle = '#2a1a24'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-5, -30); ctx.lineTo(5, -30); ctx.stroke();
    for (let i = -4; i <= 4; i += 2) { ctx.beginPath(); ctx.moveTo(i, -32); ctx.lineTo(i, -28); ctx.stroke(); }
    ctx.restore();
  },

  // ---- BRUTAMONTES (enorme, tanque) ----
  brute(ctx, x, footY, s, t) {
    const g = '#5a7a3a', gD = '#3a5222', gL = '#7a9a4e';
    const breathe = Math.sin(t * 2) * 1.5;
    ctx.save(); ctx.translate(x, footY); ctx.scale(s, s);
    CT.shadow(ctx, 0, 3, 36);
    CT.limb(ctx, -13, -40, -16, -6, 18, gD, '#243414');
    CT.limb(ctx, 13, -40, 16, -6, 18, gD, '#243414');
    CT.blob(ctx, -16, -4, 13, 8, gD, '#243414', 3); CT.blob(ctx, 16, -4, 13, 8, gD, '#243414', 3);
    // torso gigante
    CT.blob(ctx, 0, -56 + breathe, 34, 34, g, gD, 5);
    CT.blob(ctx, 0, -50, 16, 20, gL, g, 0, null, 0, 0.08);
    // ombros enormes
    CT.blob(ctx, -30, -72, 14, 13, g, gD, 4); CT.blob(ctx, 30, -72, 14, 13, g, gD, 4);
    // braços e punhos gigantes à frente
    CT.limb(ctx, -30, -72, -42, -44, 16, g, gD);
    CT.limb(ctx, 30, -72, 42, -44, 16, g, gD);
    CT.blob(ctx, -44, -42, 12, 12, g, gD, 4); CT.blob(ctx, 44, -42, 12, 12, g, gD, 4);
    // cabecinha entre os ombros
    CT.blob(ctx, 0, -84 + breathe, 13, 11, gL, g, 4, null, 0, 0.1);
    ctx.fillStyle = '#ff3020'; ctx.shadowColor = '#ff2010'; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(-5, -85 + breathe, 2.2, 0, TAU2); ctx.arc(5, -85 + breathe, 2.2, 0, TAU2); ctx.fill(); ctx.shadowBlur = 0;
    // boca com dentes
    ctx.fillStyle = '#1a0e0e'; ctx.beginPath(); ctx.ellipse(0, -78 + breathe, 6, 3, 0, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#fff'; for (let i = -4; i <= 4; i += 2) CT.poly(ctx, [[i - 1, -80 + breathe], [i, -76 + breathe], [i + 1, -80 + breathe]], '#fff', null, 0);
    ctx.restore();
  },

  // ============ CHEFES ============
  bossAbom(ctx, x, footY, s, t) {
    const g = '#7a3538', gD = '#4a1e22', gL = '#9a5052';
    const breathe = Math.sin(t * 2.2) * 2.5;
    ctx.save(); ctx.translate(x, footY); ctx.scale(s, s);
    CT.shadow(ctx, 0, 4, 52);
    CT.limb(ctx, -18, -54, -24, -8, 24, gD, '#2e1214');
    CT.limb(ctx, 18, -54, 24, -8, 24, gD, '#2e1214');
    CT.blob(ctx, -24, -6, 18, 11, gD, '#2e1214', 4); CT.blob(ctx, 24, -6, 18, 11, gD, '#2e1214', 4);
    // torso monstruoso
    CT.blob(ctx, 0, -78 + breathe, 48, 48, g, gD, 6);
    CT.blob(ctx, 0, -70, 22, 28, gL, g, 0, null, 0, 0.08);
    // cicatrizes/costuras
    ctx.strokeStyle = '#2e1214'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, -100); ctx.lineTo(-6, -60); ctx.stroke();
    for (let yy = -96; yy < -64; yy += 8) { ctx.beginPath(); ctx.moveTo(-14, yy); ctx.lineTo(-2, yy + 2); ctx.stroke(); }
    // ombros com espinhos
    for (const sx of [-40, 40]) { CT.blob(ctx, sx, -104, 18, 15, g, gD, 5); CT.poly(ctx, [[sx - 8, -114], [sx, -132], [sx + 8, -114]], gL, null, 4); }
    // braços e punhos colossais
    CT.limb(ctx, -40, -102, -58, -60, 22, g, gD);
    CT.limb(ctx, 40, -102, 58, -60, 22, g, gD);
    CT.blob(ctx, -60, -56, 17, 17, g, gD, 5); CT.blob(ctx, 60, -56, 17, 17, g, gD, 5);
    // cabeça pequena e feroz
    CT.blob(ctx, 0, -118 + breathe, 18, 15, gL, g, 5, null, 0, 0.1);
    ctx.fillStyle = '#ffd020'; ctx.shadowColor = '#ff8000'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(-7, -120 + breathe, 3, 0, TAU2); ctx.arc(7, -120 + breathe, 3, 0, TAU2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a0808'; ctx.beginPath(); ctx.ellipse(0, -110 + breathe, 9, 5, 0, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#fff'; for (let i = -6; i <= 6; i += 3) { CT.poly(ctx, [[i - 1.5, -113 + breathe], [i, -106 + breathe], [i + 1.5, -113 + breathe]], '#fff', null, 0); }
    ctx.restore();
  },

  bossNecro(ctx, x, footY, s, t) {
    const robe = '#3a2c5a', robeD = '#231838', robeL = '#5a4a86', bone = '#e6e0cc';
    const float = Math.sin(t * 2) * 4;
    ctx.save(); ctx.translate(x, footY - 6 - float); ctx.scale(s, s);
    CT.shadow(ctx, 0, 8 + float, 30);
    // manto (base larga, sem pernas — flutua)
    CT.poly(ctx, [[-30, 0], [-24, -70], [-10, -84], [10, -84], [24, -70], [30, 0], [16, -8], [8, 2], [0, -8], [-8, 2], [-16, -8]], robe, null, 5);
    CT.poly(ctx, [[-14, -30], [0, -74], [14, -30], [6, -6], [-6, -6]], robeL, null, 0);
    // símbolo arcano no peito
    ctx.strokeStyle = '#9a7aff'; ctx.lineWidth = 2; ctx.shadowColor = '#7a4aff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, -40, 6, 0, TAU2); ctx.moveTo(0, -46); ctx.lineTo(0, -34); ctx.moveTo(-6, -40); ctx.lineTo(6, -40); ctx.stroke(); ctx.shadowBlur = 0;
    // braços do manto
    CT.limb(ctx, -20, -66, -34, -44, 12, robe, robeD);
    CT.limb(ctx, 20, -66, 34, -46, 12, robe, robeD);
    // mão ossuda + cajado
    CT.blob(ctx, -34, -43, 5, 5, bone, '#b8b096', 2.5);
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(34, -30); ctx.lineTo(34, -84); ctx.stroke();
    ctx.fillStyle = '#9a7aff'; ctx.shadowColor = '#7a4aff'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(34, -88, 6, 0, TAU2); ctx.fill(); ctx.shadowBlur = 0;
    // capuz
    CT.poly(ctx, [[-20, -74], [0, -104], [20, -74], [14, -64], [-14, -64]], robe, null, 5);
    // rosto de caveira nas sombras do capuz
    CT.blob(ctx, 0, -80, 12, 13, bone, '#b8b096', 3, null, 0, 0.12);
    ctx.fillStyle = '#160e24'; ctx.beginPath(); ctx.ellipse(-5, -82, 3.5, 4.5, 0, 0, TAU2); ctx.ellipse(5, -82, 3.5, 4.5, 0, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#b070ff'; ctx.shadowColor = '#8a3aff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(-5, -82, 1.8, 0, TAU2); ctx.arc(5, -82, 1.8, 0, TAU2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#160e24'; ctx.lineWidth = 1.2;
    for (let i = -4; i <= 4; i += 2) { ctx.beginPath(); ctx.moveTo(i, -73); ctx.lineTo(i, -69); ctx.stroke(); }
    ctx.restore();
  },

  bossReaper(ctx, x, footY, s, t) {
    const cloak = '#20232c', cloakD = '#101218', cloakL = '#333844';
    const float = Math.sin(t * 2.4) * 3;
    ctx.save(); ctx.translate(x, footY - 4 - float); ctx.scale(s, s);
    CT.shadow(ctx, 0, 6 + float, 28);
    // cajado da foice
    ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-34, -6); ctx.lineTo(-30, -96); ctx.stroke();
    // lâmina da foice
    ctx.fillStyle = '#c8ccd4';
    ctx.beginPath(); ctx.moveTo(-30, -96); ctx.quadraticCurveTo(-2, -100, 2, -74); ctx.quadraticCurveTo(-14, -86, -30, -88); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a9098'; ctx.lineWidth = 1.5; ctx.stroke();
    // manto esvoaçante
    CT.poly(ctx, [[-28, 0], [-24, -68], [-8, -88], [8, -88], [24, -68], [28, 0], [14, -10], [4, 2], [-4, 2], [-14, -10]], cloak, null, 5);
    CT.poly(ctx, [[-12, -40], [0, -78], [12, -40], [4, -6], [-4, -6]], cloakL, null, 0);
    // braços do manto
    CT.limb(ctx, -18, -62, -32, -44, 11, cloak, cloakD);
    CT.limb(ctx, 18, -62, 30, -50, 11, cloak, cloakD);
    // mão esquelética no cajado
    CT.blob(ctx, -32, -44, 5, 5, '#e6e0cc', '#b8b096', 2.5);
    // capuz fundo e escuro
    CT.poly(ctx, [[-20, -72], [0, -102], [20, -72], [12, -60], [-12, -60]], cloak, null, 5);
    CT.blob(ctx, 0, -80, 13, 14, cloakD, '#0a0c10', 0);
    // dois olhos brilhando no vazio
    ctx.fillStyle = '#4affd0'; ctx.shadowColor = '#2affc0'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(-5, -82, 2.4, 3.4, 0.2, 0, TAU2); ctx.ellipse(5, -82, 2.4, 3.4, -0.2, 0, TAU2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
  },

  // ============ DISPATCH + BUFFER (flip / flash / blink) ============
  // cabeça de cada monstro (para redesenhar em costas/perfil)
  _mhead: {
    zombie:  { y: -82, r: 21, col: '#78ab52', eye: '#ff3a2a', ear: false },
    maniac:  { y: -84, r: 19, col: '#e8b088', eye: '#1a1a1e', mask: true },
    werewolf:{ y: -76, r: 17, col: '#6b4a2a', eye: '#ffd83a', ear: true, snout: true },
    mummy:   { y: -80, r: 18, col: '#d8cfa8', eye: '#8affd0' },
    alien:   { y: -54, r: 28, col: '#79d69e', eye: '#0a0a12', bigeye: true },
    doll:    { y: -38, r: 14, col: '#f0d0b0', eye: '#c83a3a' },
    brute:   { y: -84, r: 12, col: '#7a9a4e', eye: '#ff3020' },
  },
  monster(g, key, x, footY, s, t, opts) {
    (this[key] || this.zombie).call(this, g, x, footY, s, t, opts);
    const view = opts && opts.view;
    if (view !== 'up' && view !== 'side') return;
    const h = this._mhead[key];
    if (!h) return;
    g.save();
    g.translate(x, footY); g.scale(s, s);
    if (view === 'up') {
      // COSTAS: cobre o rosto com a nuca
      CT.blob(g, 0, h.y, h.r, h.r * 0.96, h.col, shadeC(h.col, -45), 3, null, 0, 0.05);
      g.fillStyle = 'rgba(0,0,0,.14)';
      g.beginPath(); g.ellipse(0, h.y + 2, h.r * 0.55, h.r * 0.28, 0, 0, TAU2); g.fill();
      if (h.ear) { CT.poly(g, [[-h.r * 0.5, -h.r * 0.7], [-h.r * 0.7, -h.r * 1.5], [-h.r * 0.1, -h.r * 0.9]], h.col, null, 3); CT.poly(g, [[h.r * 0.5, -h.r * 0.7], [h.r * 0.7, -h.r * 1.5], [h.r * 0.1, -h.r * 0.9]], h.col, null, 3); }
    } else {
      // PERFIL: redesenha a cabeça virada para a direita (blit espelha p/ esquerda)
      CT.blob(g, 1, h.y, h.r * 0.94, h.r * 0.95, h.col, shadeC(h.col, -45), 3, null, 0, 0.08);
      if (h.ear) CT.poly(g, [[-h.r * 0.3, -h.r * 0.7], [-h.r * 0.7, -h.r * 1.5], [h.r * 0.1, -h.r * 0.9]], h.col, null, 3);
      // focinho / nariz saliente à frente
      const front = h.r * 0.85;
      CT.blob(g, front, h.y + h.r * 0.12, h.r * (h.snout ? 0.38 : 0.24), h.r * (h.snout ? 0.3 : 0.24), h.col, shadeC(h.col, -35), 0, null, 0, 0.1);
      if (h.snout) { g.fillStyle = '#1a1014'; g.beginPath(); g.arc(front + h.r * 0.28, h.y + h.r * 0.1, h.r * 0.1, 0, TAU2); g.fill(); }
      // um olho voltado à frente
      const ex = h.r * 0.42, ey = h.y - h.r * 0.05;
      if (h.bigeye) {
        g.fillStyle = h.eye; g.beginPath(); g.ellipse(ex + h.r * 0.15, ey, h.r * 0.26, h.r * 0.4, 0.35, 0, TAU2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(ex + h.r * 0.05, ey - h.r * 0.12, h.r * 0.07, 0, TAU2); g.fill();
      } else if (h.mask) {
        g.fillStyle = '#e6e6ea'; g.beginPath(); g.ellipse(ex + h.r * 0.2, ey + 1, h.r * 0.5, h.r * 0.6, 0, 0, TAU2); g.fill();
        g.fillStyle = h.eye; g.beginPath(); g.arc(ex + h.r * 0.3, ey, h.r * 0.13, 0, TAU2); g.fill();
      } else {
        g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + h.r * 0.2, ey, h.r * 0.17, 0, TAU2); g.fill();
        g.fillStyle = h.eye; g.shadowColor = h.eye; g.shadowBlur = 6;
        g.beginPath(); g.arc(ex + h.r * 0.24, ey, h.r * 0.1, 0, TAU2); g.fill(); g.shadowBlur = 0;
      }
    }
    g.restore();
  },
  bossSprite(g, type, x, footY, s, t) {
    ({ abomination: this.bossAbom, necromancer: this.bossNecro, reaper: this.bossReaper }[type] || this.bossAbom).call(this, g, x, footY, s, t);
  },

  _buf: null, _bg: null,
  blit(ctx, fn, x, footY, opts) {
    opts = opts || {};
    if (!this._buf) { const c = document.createElement('canvas'); c.width = 220; c.height = 260; this._buf = c; this._bg = c.getContext('2d'); }
    const B = this._buf, g = this._bg, CXb = 110, CYb = 246;
    g.clearRect(0, 0, B.width, B.height);
    g.save(); fn(g, CXb, CYb); g.restore();
    if (opts.flash > 0) {
      g.save();
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = Math.min(1, opts.flash);
      g.fillStyle = opts.flashCol || '#ffffff';
      g.fillRect(0, 0, B.width, B.height);
      g.restore();
    }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(x, footY);
    if (opts.rot) ctx.rotate(opts.rot);         // tombar (morte)
    const sc = opts.scale || 1;
    if (opts.flip) ctx.scale(-1, 1);
    ctx.scale(sc, sc * (opts.sy != null ? opts.sy : 1));  // sy achata (squash)
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.drawImage(B, -CXb, -CYb);
    ctx.restore();
  },

  // ---- VIZINHO (civil em pânico, braços pra cima) ----
  civilian(ctx, x, footY, s, t, shirt) {
    shirt = shirt || '#3aa0d0';
    const skin = '#f0c79a', skinD = '#cf9a68', pants = '#4a4e58', pantsD = '#2c2f36';
    const panic = Math.sin(t * 9) * 4;
    ctx.save(); ctx.translate(x, footY); ctx.scale(s, s);
    CT.shadow(ctx, 0, 2, 22);
    CT.limb(ctx, -6, -28, -7, -4, 10, pants, pantsD);
    CT.limb(ctx, 6, -28, 7, -4, 10, pants, pantsD);
    CT.blob(ctx, -8, -3, 8, 5, '#3a2a1a', '#20140a', 3); CT.blob(ctx, 8, -3, 8, 5, '#3a2a1a', '#20140a', 3);
    CT.blob(ctx, 0, -40, 17, 19, shirt, shadeC(shirt, -45), 4);
    // braços erguidos (socorro!)
    CT.limb(ctx, -13, -48, -20, -66 - panic, 9, skin, skinD);
    CT.limb(ctx, 13, -48, 20, -66 + panic, 9, skin, skinD);
    CT.blob(ctx, -20, -67 - panic, 5, 5, skin, skinD, 3); CT.blob(ctx, 20, -67 + panic, 5, 5, skin, skinD, 3);
    // cabeça assustada
    CT.blob(ctx, 0, -68, 15, 15, skin, skinD, 4, null, 0, 0.14);
    CT.blob(ctx, 0, -74, 15, 8, '#5a3a1a', '#3a2410', 3, null, 0, 0.1);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-6, -68, 4, 5, 0, 0, TAU2); ctx.ellipse(6, -68, 4, 5, 0, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#2a1a24'; ctx.beginPath(); ctx.arc(-6, -67, 2, 0, TAU2); ctx.arc(6, -67, 2, 0, TAU2); ctx.fill();
    // boca aberta (grito)
    ctx.fillStyle = '#7a2a2a'; ctx.beginPath(); ctx.ellipse(0, -60, 3.5, 4, 0, 0, TAU2); ctx.fill();
    // gota de suor
    ctx.fillStyle = 'rgba(120,200,255,.8)'; ctx.beginPath(); ctx.ellipse(11, -72, 2, 3, 0, 0, TAU2); ctx.fill();
    ctx.restore();
  },
};

// helpers
function roundRectC(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function shadeC(hex, amt) {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1, 7), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}
