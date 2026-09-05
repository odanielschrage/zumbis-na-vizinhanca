// ---------- Entrada: teclado e mouse ----------
const Input = {
  keys: new Set(),
  mouse: { x: 0, y: 0, down: false, moved: false },
  pressed: new Set(), // teclas pressionadas neste frame (limpo pelo loop)

  init(canvas) {
    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      Sound.init();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.moved = true;
    });
    canvas.addEventListener('mousedown', e => { if (e.button === 0) this.mouse.down = true; Sound.init(); });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.mouse.down = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  },

  down(code) { return this.keys.has(code); },
  justPressed(code) { return this.pressed.has(code); },
  endFrame() { this.pressed.clear(); },
};
