// ---------- Motor de arte "realista" (candidato) ----------
// Ataca as três assinaturas que fazem o estilo atual ler como desenho:
//   1. contorno            → removido (nenhum stroke de silhueta)
//   2. proporção cabeçuda  → figura de ~7,5 cabeças
//   3. preenchimento chato → gradiente cilíndrico por membro + luz de borda
// Mais textura procedural e um passe de pós-processamento cinematográfico.

const TAU_R = Math.PI * 2;
const LIGHT = { x: -0.55, y: -0.84 };   // luz vinda de cima à esquerda

const RFX = {
  // ---- ruído em tile (cache) ----
  _noise: null,
  noise(size = 128) {
    if (this._noise) return this._noise;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 110 + Math.random() * 90;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this._noise = c;
    return c;
  },

  // ---- chão texturizado (asfalto/terra), não cor chapada ----
  ground(g, w, h, base, spec) {
    spec = spec || {};
    g.save();
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    // manchas largas de variação tonal
    for (let i = 0; i < 34; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const t = Math.random() < 0.5 ? 22 : -22;
      gr.addColorStop(0, shadeC(base, t) + '');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.30;
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, r, 0, TAU_R); g.fill();
    }
    g.globalAlpha = 1;
    // rachaduras / detritos finos
    g.strokeStyle = shadeC(base, -34);
    g.lineWidth = 1;
    for (let i = 0; i < (spec.cracks == null ? 16 : spec.cracks); i++) {
      let x = Math.random() * w, y = Math.random() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 5; s++) { x += (Math.random() - 0.5) * 44; y += (Math.random() - 0.5) * 44; g.lineTo(x, y); }
      g.stroke();
    }
    // grão fino por cima (tira o aspecto "vetor liso")
    const n = this.noise();
    g.globalCompositeOperation = 'overlay';
    g.globalAlpha = 0.22;
    const p = g.createPattern(n, 'repeat');
    g.fillStyle = p;
    g.fillRect(0, 0, w, h);
    g.restore();
  },

  // ---- membro cilíndrico: gradiente perpendicular ao eixo = volume ----
  tube(g, x1, y1, x2, y2, r1, r2, col) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    let px = Math.cos(a + Math.PI / 2), py = Math.sin(a + Math.PI / 2);
    // orienta o gradiente para que o lado iluminado bata com a luz da cena
    if (px * LIGHT.x + py * LIGHT.y < 0) { px = -px; py = -py; }
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, rr = Math.max(r1, r2);
    const grad = g.createLinearGradient(mx + px * rr, my + py * rr, mx - px * rr, my - py * rr);
    grad.addColorStop(0, shadeC(col, 40));
    grad.addColorStop(0.40, col);
    grad.addColorStop(1, shadeC(col, -54));
    g.fillStyle = grad;
    const nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
    g.beginPath();
    g.moveTo(x1 + nx * r1, y1 + ny * r1);
    g.lineTo(x2 + nx * r2, y2 + ny * r2);
    g.lineTo(x2 - nx * r2, y2 - ny * r2);
    g.lineTo(x1 - nx * r1, y1 - ny * r1);
    g.closePath(); g.fill();
    g.beginPath(); g.arc(x1, y1, r1, 0, TAU_R); g.fill();
    g.beginPath(); g.arc(x2, y2, r2, 0, TAU_R); g.fill();
  },

  // ---- massa arredondada (tronco, cabeça) com luz direcional ----
  mass(g, x, y, rx, ry, col, rot = 0) {
    g.save();
    g.translate(x, y); g.rotate(rot);
    const grad = g.createRadialGradient(LIGHT.x * rx * 0.55, LIGHT.y * ry * 0.55, rx * 0.12, 0, 0, Math.max(rx, ry) * 1.12);
    grad.addColorStop(0, shadeC(col, 44));
    grad.addColorStop(0.45, col);
    grad.addColorStop(1, shadeC(col, -56));
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU_R); g.fill();
    g.restore();
  },

  // ---- luz de borda: fio de luz no lado da fonte (dá "foto") ----
  rim(g, x, y, rx, ry, col, rot = 0) {
    g.save();
    g.translate(x, y); g.rotate(rot);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5;
    g.strokeStyle = col;
    g.lineWidth = 1.6;
    g.beginPath();
    const a0 = Math.atan2(LIGHT.y, LIGHT.x);
    g.ellipse(0, 0, rx, ry, 0, a0 - 1.0, a0 + 1.0);
    g.stroke();
    g.restore();
  },

  // ---- sombra projetada direcional (não é um borrão elíptico) ----
  castShadow(g, x, footY, h, w) {
    g.save();
    g.globalAlpha = 0.34;
    g.fillStyle = '#000';
    g.translate(x, footY);
    g.transform(1, 0, -0.72, 0.30, 0, 0);   // inclina no sentido oposto à luz
    g.beginPath(); g.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, TAU_R); g.fill();
    g.restore();
  },

  // ---- pós-processamento cinematográfico ----
  post(canvas, opts) {
    opts = opts || {};
    const g = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tg = tmp.getContext('2d');

    // bloom: cópia borrada e clareada, somada por cima (halo de luz)
    if (opts.bloom) {
      tg.filter = 'blur(9px) brightness(1.3)';
      tg.drawImage(canvas, 0, 0);
      tg.filter = 'none';
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = opts.bloom;
      g.drawImage(tmp, 0, 0);
      g.restore();
    }

    // correção de cor: sombras frias, altas quentes
    if (opts.grade) {
      g.save();
      g.globalCompositeOperation = 'soft-light';
      g.globalAlpha = opts.grade;
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#3d5f8a');
      gr.addColorStop(1, '#6b4326');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.restore();
    }

    // dessatura + contraste (tira o "colorido de desenho")
    if (opts.sat != null) {
      tg.clearRect(0, 0, w, h);
      tg.filter = `saturate(${opts.sat}) contrast(${opts.contrast || 1.1})`;
      tg.drawImage(canvas, 0, 0);
      tg.filter = 'none';
      g.clearRect(0, 0, w, h);
      g.drawImage(tmp, 0, 0);
    }

    // grão de filme
    if (opts.grain) {
      g.save();
      g.globalCompositeOperation = 'overlay';
      g.globalAlpha = opts.grain;
      g.fillStyle = g.createPattern(this.noise(), 'repeat');
      g.fillRect(0, 0, w, h);
      g.restore();
    }

    // vinheta
    if (opts.vignette) {
      const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,0,0,${opts.vignette})`);
      g.fillStyle = vg;
      g.fillRect(0, 0, w, h);
    }
  },
};

// ---------- Figuras em proporção realista (~7,5 cabeças) ----------
const REAL = {
  // altura total ≈ 104 unidades acima de footY (mesma escala do motor atual)
  hero(g, look, x, footY, s = 1, t = 0, opts = {}) {
    const L = typeof look === 'string' ? HERO_LOOKS[look] : look;
    const moving = opts.moving !== false;
    const step = moving ? Math.sin(t * 9) * 6 : 0;
    const bob = moving ? Math.abs(Math.sin(t * 9)) * 1.6 : 0;

    g.save();
    g.translate(x, footY);
    g.scale(s, s);
    RFX.castShadow(g, 0, 2, 26, 34);
    g.translate(0, -bob);

    const HEAD_Y = -95, SH_Y = -80, WAIST_Y = -56, HIP_Y = -52;

    // perna de trás → frente (profundidade)
    RFX.tube(g, -6, HIP_Y, -7 - step * 0.5, -27, 6.2, 5.2, shadeC(L.pants, -16));
    RFX.tube(g, -7 - step * 0.5, -27, -8 - step, -3, 5.2, 4.4, shadeC(L.pants, -16));
    RFX.mass(g, -8 - step, -2, 6.4, 3.4, shadeC(L.shoe, -18));

    RFX.tube(g, 6, HIP_Y, 7 + step * 0.5, -27, 6.4, 5.4, L.pants);
    RFX.tube(g, 7 + step * 0.5, -27, 8 + step, -3, 5.4, 4.6, L.pants);
    RFX.mass(g, 8 + step, -2, 6.6, 3.5, L.shoe);

    // quadril + tronco (ombro largo, cintura estreita)
    RFX.mass(g, 0, HIP_Y + 2, 10.5, 7, shadeC(L.pants, -8));
    const torso = L.shirt2 || L.shirt;
    g.save();
    const tg = g.createLinearGradient(-13, SH_Y, 11, WAIST_Y);
    tg.addColorStop(0, shadeC(torso, 34));
    tg.addColorStop(0.45, torso);
    tg.addColorStop(1, shadeC(torso, -50));
    g.fillStyle = tg;
    g.beginPath();
    g.moveTo(-13, SH_Y + 2);
    g.quadraticCurveTo(-14.5, WAIST_Y + 12, -9.5, WAIST_Y);
    g.lineTo(9.5, WAIST_Y);
    g.quadraticCurveTo(14.5, WAIST_Y + 12, 13, SH_Y + 2);
    g.quadraticCurveTo(0, SH_Y - 5, -13, SH_Y + 2);
    g.closePath();
    g.fill();
    // dobras de tecido
    g.strokeStyle = shadeC(torso, -34);
    g.globalAlpha = 0.5; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-5, SH_Y + 12); g.quadraticCurveTo(-2, WAIST_Y - 8, -6, WAIST_Y - 1);
    g.moveTo(6, SH_Y + 10); g.quadraticCurveTo(3, WAIST_Y - 9, 7, WAIST_Y - 2);
    g.stroke();
    g.restore();
    RFX.rim(g, 0, (SH_Y + WAIST_Y) / 2, 13, 13, shadeC(torso, 70));

    // braços
    const swing = moving ? Math.sin(t * 9) * 5 : 0;
    RFX.tube(g, -12, SH_Y + 3, -17, -62 + swing, 4.6, 3.9, shadeC(torso, -14));
    RFX.tube(g, -17, -62 + swing, -19, -47 + swing, 3.9, 3.3, L.skin);
    RFX.mass(g, -19, -46 + swing, 3.4, 3.8, L.skin);

    RFX.tube(g, 12, SH_Y + 3, 17, -62 - swing, 4.7, 4.0, torso);
    RFX.tube(g, 17, -62 - swing, 20, -50 - swing, 4.0, 3.4, L.skin);

    // arma (metal com specular forte = material diferente do tecido/pele)
    if (opts.weapon !== false) this.gun(g, 21, -52 - swing, L);
    RFX.mass(g, 20, -49 - swing, 3.5, 3.9, L.skin);

    // pescoço + cabeça (≈1/7,5 da altura)
    RFX.tube(g, 0, SH_Y + 1, 0, HEAD_Y + 9, 4.2, 4.0, shadeC(L.skin, -22));
    RFX.mass(g, 0, HEAD_Y, 7.2, 8.6, L.skin);
    this.face(g, 0, HEAD_Y, L);
    this.hair(g, 0, HEAD_Y, L);
    RFX.rim(g, 0, HEAD_Y, 7.2, 8.6, shadeC(L.skin, 78));

    g.restore();
  },

  face(g, x, y, L) {
    g.save();
    g.translate(x, y);
    // sombra da órbita (dá profundidade sem contorno)
    g.globalAlpha = 0.30;
    g.fillStyle = shadeC(L.skin, -58);
    g.beginPath(); g.ellipse(-2.9, -0.9, 2.4, 1.7, 0, 0, TAU_R);
    g.ellipse(2.9, -0.9, 2.4, 1.7, 0, 0, TAU_R); g.fill();
    g.globalAlpha = 1;
    // olhos pequenos e escuros (nada de olho grande de desenho)
    g.fillStyle = '#221a16';
    g.beginPath(); g.ellipse(-2.9, -0.7, 1.25, 0.95, 0, 0, TAU_R);
    g.ellipse(2.9, -0.7, 1.25, 0.95, 0, 0, TAU_R); g.fill();
    // sombra do nariz e boca discreta
    g.globalAlpha = 0.34;
    g.fillStyle = shadeC(L.skin, -52);
    g.beginPath(); g.moveTo(0.2, 0.4); g.lineTo(-1.3, 2.6); g.lineTo(1.1, 2.6); g.closePath(); g.fill();
    g.globalAlpha = 0.5;
    g.strokeStyle = shadeC(L.skin, -62); g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(-1.8, 4.4); g.quadraticCurveTo(0, 5.2, 1.8, 4.4); g.stroke();
    g.restore();
  },

  hair(g, x, y, L) {
    g.save();
    g.translate(x, y);
    const hg = g.createLinearGradient(-6, -9, 5, 2);
    hg.addColorStop(0, shadeC(L.hair, 30));
    hg.addColorStop(1, shadeC(L.hair, -44));
    g.fillStyle = hg;
    g.beginPath();
    if (L.hairStyle === 'mohawk') {
      g.moveTo(-6.6, -3.4);
      g.quadraticCurveTo(-6.2, -9.6, 0, -13.4);
      g.quadraticCurveTo(6.2, -9.6, 6.6, -3.4);
      g.quadraticCurveTo(3.4, -7.6, 0, -7.8);
      g.quadraticCurveTo(-3.4, -7.6, -6.6, -3.4);
    } else {
      g.moveTo(-7.4, -1.6);
      g.quadraticCurveTo(-8.2, -9.4, 0, -9.2);
      g.quadraticCurveTo(8.2, -9.4, 7.4, -1.6);
      g.quadraticCurveTo(5.6, -6.2, 0, -6.0);
      g.quadraticCurveTo(-5.6, -6.2, -7.4, -1.6);
    }
    g.closePath(); g.fill();
    if (L.hairStyle === 'ponytail') {
      g.beginPath(); g.ellipse(-8.4, 1.6, 2.6, 5.2, 0.5, 0, TAU_R); g.fill();
    }
    g.restore();
  },

  gun(g, x, y, L) {
    g.save();
    g.translate(x, y);
    // corpo metálico com specular alto
    const mg = g.createLinearGradient(0, -3, 0, 3);
    mg.addColorStop(0, '#8d949c');
    mg.addColorStop(0.35, '#4a5058');
    mg.addColorStop(1, '#22262b');
    g.fillStyle = mg;
    g.fillRect(-3, -2.4, 17, 4.4);
    g.fillStyle = '#2b3036';
    g.fillRect(-2, 1.6, 4.4, 5.6);
    // brilho especular (fio de luz) — material metálico
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55;
    g.fillStyle = '#cfd8e2';
    g.fillRect(-2.4, -2.1, 15.4, 0.8);
    g.restore();
  },

  // ---- zumbi realista: postura curvada, pele acinzentada, roupa suja ----
  zombie(g, x, footY, s = 1, t = 0, opts = {}) {
    const skin = opts.skin || '#8fa07a';
    const cloth = opts.cloth || '#4a4438';
    const lurch = Math.sin(t * 4) * 3;
    const step = Math.sin(t * 4.6) * 5;

    g.save();
    g.translate(x, footY);
    g.scale(s, s);
    RFX.castShadow(g, 0, 2, 24, 32);
    g.rotate(lurch * 0.012);

    const HEAD_Y = -88, SH_Y = -74, HIP_Y = -50;

    RFX.tube(g, -6, HIP_Y, -7 - step * 0.5, -26, 6.0, 5.0, shadeC(cloth, -18));
    RFX.tube(g, -7 - step * 0.5, -26, -8 - step, -3, 5.0, 4.2, shadeC(cloth, -18));
    RFX.mass(g, -8 - step, -2, 6.2, 3.2, '#2e2a22');
    RFX.tube(g, 6, HIP_Y, 7 + step * 0.5, -26, 6.2, 5.2, cloth);
    RFX.tube(g, 7 + step * 0.5, -26, 8 + step, -3, 5.2, 4.4, cloth);
    RFX.mass(g, 8 + step, -2, 6.4, 3.3, '#2e2a22');

    // tronco inclinado para a frente (postura de zumbi)
    g.save();
    g.translate(0, HIP_Y);
    g.rotate(0.14);
    RFX.mass(g, 0, -11, 11.5, 13, cloth);
    // rasgos na roupa deixando ver a pele
    g.globalAlpha = 0.8;
    RFX.mass(g, 3.5, -6, 3.4, 4.2, shadeC(skin, -16));
    g.globalAlpha = 1;
    g.restore();
    RFX.rim(g, 0, SH_Y + 8, 11.5, 13, shadeC(cloth, 60));

    // braços pendendo à frente
    RFX.tube(g, -11, SH_Y + 6, -19, -50 + lurch, 4.4, 3.6, shadeC(cloth, -12));
    RFX.tube(g, -19, -50 + lurch, -25, -44 + lurch, 3.6, 3.0, skin);
    RFX.mass(g, -26, -43 + lurch, 3.2, 3.6, skin);
    RFX.tube(g, 11, SH_Y + 6, 19, -52 - lurch, 4.5, 3.7, cloth);
    RFX.tube(g, 19, -52 - lurch, 26, -46 - lurch, 3.7, 3.1, skin);
    RFX.mass(g, 27, -45 - lurch, 3.3, 3.7, skin);

    // pescoço torto + cabeça
    RFX.tube(g, 0, SH_Y + 2, 1.5, HEAD_Y + 8, 4.0, 3.8, shadeC(skin, -26));
    RFX.mass(g, 1.5, HEAD_Y, 7.0, 8.2, skin);
    // olhos fundos e mandíbula caída
    g.save();
    g.translate(1.5, HEAD_Y);
    g.globalAlpha = 0.6;
    g.fillStyle = shadeC(skin, -66);
    g.beginPath(); g.ellipse(-2.8, -1.0, 2.6, 2.0, 0, 0, TAU_R);
    g.ellipse(2.8, -1.0, 2.6, 2.0, 0, 0, TAU_R); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = '#d8e8c0';
    g.beginPath(); g.ellipse(-2.8, -0.9, 1.1, 0.9, 0, 0, TAU_R);
    g.ellipse(2.8, -0.9, 1.1, 0.9, 0, 0, TAU_R); g.fill();
    g.fillStyle = '#1a1410';
    g.beginPath(); g.ellipse(-2.6, -0.9, 0.55, 0.7, 0, 0, TAU_R);
    g.ellipse(3.0, -0.9, 0.55, 0.7, 0, 0, TAU_R); g.fill();
    g.fillStyle = '#3a2020';
    g.beginPath(); g.ellipse(0, 4.6, 2.2, 2.6, 0, 0, TAU_R); g.fill();
    g.restore();
    RFX.rim(g, 1.5, HEAD_Y, 7.0, 8.2, shadeC(skin, 80));

    g.restore();
  },
};
