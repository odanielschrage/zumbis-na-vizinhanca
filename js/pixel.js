// ---------- Motor de sprites em pixel art ----------
// Sprites são grades de texto (1 char = 1 pixel) com uma paleta char->cor.
// '.' ou ' ' = transparente. Renderiza nítido (nearest-neighbor).
const Pixel = {
  // Constrói um canvas 1:1 a partir das linhas + paleta.
  make(rows, palette) {
    const h = rows.length;
    const w = Math.max(...rows.map(r => r.length));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const col = palette[ch];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    c._pw = w; c._ph = h;
    return c;
  },

  // Desenha um sprite centrado em (x,y), escalado, com pé em anchorY (1 = base).
  draw(ctx, sprite, x, y, opts = {}) {
    const scale = opts.scale || 1;
    const flip = opts.flip || false;
    const anchorY = opts.anchorY != null ? opts.anchorY : 0.5;
    const w = sprite.width * scale, h = sprite.height * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (opts.rot) ctx.rotate(opts.rot);
    if (flip) ctx.scale(-1, 1);
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    if (opts.tint) {
      // recolore mantendo silhueta (usado para flash de dano)
      ctx.drawImage(sprite, -w / 2, -h * anchorY, w, h);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = opts.tintA != null ? opts.tintA : 0.6;
      ctx.fillStyle = opts.tint;
      ctx.fillRect(-w / 2, -h * anchorY, w, h);
    } else {
      ctx.drawImage(sprite, -w / 2, -h * anchorY, w, h);
    }
    ctx.restore();
  },

  // valida que todas as linhas têm o mesmo comprimento (debug)
  check(name, rows) {
    const w = rows[0].length;
    const bad = rows.map((r, i) => r.length !== w ? i : -1).filter(i => i >= 0);
    if (bad.length) console.warn(`sprite ${name}: linhas com largura diferente:`, bad, '(esperado', w + ')');
    return bad.length === 0;
  },
};
