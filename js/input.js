// ---------- Entrada: teclado e mouse ----------
const Input = {
  keys: new Set(),
  mouse: { x: 0, y: 0, down: false, moved: false },
  pressed: new Set(), // teclas pressionadas neste frame (limpo pelo loop)
  capture: null,      // quando definido, o próximo keydown é capturado (remapeamento)

  // teclas que rolam/ativam a página e devem ser bloqueadas mesmo se não mapeadas
  SCROLL_KEYS: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Tab'],

  init(canvas) {
    window.addEventListener('keydown', e => {
      // modo captura: a tecla vira um novo atalho em vez de jogar
      if (this.capture) {
        e.preventDefault();
        const cb = this.capture;
        this.capture = null;
        cb(e.code);
        return;
      }
      if (this.SCROLL_KEYS.includes(e.code) || Controls.isBound(e.code)) e.preventDefault();
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

// ---------- Controles remapeáveis ----------
// Ações na ordem em que aparecem na tela de configuração.
const CONTROL_ACTIONS = [
  { id: 'up',     name: 'Cima' },
  { id: 'down',   name: 'Baixo' },
  { id: 'left',   name: 'Esquerda' },
  { id: 'right',  name: 'Direita' },
  { id: 'shoot',  name: 'Atirar' },
  { id: 'swap',   name: 'Trocar arma' },
];

const DEFAULT_BINDS = [
  { up: 'KeyW',    down: 'KeyS',      left: 'KeyA',      right: 'KeyD',       shoot: 'Space', swap: 'KeyQ' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', shoot: 'Enter', swap: 'ShiftRight' },
];

// Escape é reservado (pausa) e nunca pode ser mapeado.
const RESERVED_KEYS = ['Escape'];

const Controls = {
  binds: null,

  load() {
    this.binds = DEFAULT_BINDS.map(b => Object.assign({}, b));
    try {
      const saved = JSON.parse(localStorage.getItem('zv_keys') || 'null');
      if (Array.isArray(saved)) {
        for (let i = 0; i < this.binds.length; i++) {
          if (!saved[i]) continue;
          for (const a of CONTROL_ACTIONS) {
            const code = saved[i][a.id];
            // só aceita string não vazia e não reservada (protege contra save corrompido)
            if (typeof code === 'string' && code && !RESERVED_KEYS.includes(code)) {
              this.binds[i][a.id] = code;
            }
          }
        }
      }
    } catch (e) { /* save inválido: mantém o padrão */ }
    return this.binds;
  },

  save() {
    try { localStorage.setItem('zv_keys', JSON.stringify(this.binds)); } catch (e) {}
  },

  reset() {
    this.binds = DEFAULT_BINDS.map(b => Object.assign({}, b));
    this.save();
  },

  get(player, action) {
    if (!this.binds) this.load();
    const b = this.binds[player];
    return b ? b[action] : null;
  },

  set(player, action, code) {
    if (!this.binds) this.load();
    this.binds[player][action] = code;
    this.save();
  },

  // quem já usa esta tecla? → { player, action } ou null
  usedBy(code, skipPlayer, skipAction) {
    if (!this.binds) this.load();
    for (let i = 0; i < this.binds.length; i++) {
      for (const a of CONTROL_ACTIONS) {
        if (i === skipPlayer && a.id === skipAction) continue;
        if (this.binds[i][a.id] === code) return { player: i, action: a };
      }
    }
    return null;
  },

  isBound(code) { return !!this.usedBy(code); },
  isReserved(code) { return RESERVED_KEYS.includes(code); },

  down(player, action) { return Input.down(this.get(player, action)); },
  justPressed(player, action) { return Input.justPressed(this.get(player, action)); },

  // nome amigável da tecla para exibir na interface
  label(code) {
    if (!code) return '—';
    const map = {
      Space: 'Espaço', Enter: 'Enter', Tab: 'Tab', Escape: 'Esc', Backspace: '⌫',
      ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
      ShiftLeft: 'Shift Esq.', ShiftRight: 'Shift Dir.',
      ControlLeft: 'Ctrl Esq.', ControlRight: 'Ctrl Dir.',
      AltLeft: 'Alt Esq.', AltRight: 'Alt Dir.',
      Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Semicolon: ';',
      Quote: "'", BracketLeft: '[', BracketRight: ']', Backquote: '`',
      Minus: '-', Equal: '=', CapsLock: 'Caps',
      NumpadAdd: 'Num +', NumpadSubtract: 'Num −', NumpadMultiply: 'Num *',
      NumpadDivide: 'Num /', NumpadDecimal: 'Num .', NumpadEnter: 'Num Enter',
    };
    if (map[code]) return map[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
    if (/^F\d{1,2}$/.test(code)) return code;
    return code;
  },

  // resumo curto para as dicas do menu, ex.: "W A S D"
  moveLabel(player) {
    return ['up', 'left', 'down', 'right'].map(a => this.label(this.get(player, a))).join(' ');
  },
};
