// ---------- Dados de sprites em pixel art (amostra de validação) ----------
// Paletas por sprite. '.' = transparente.

const PAL = {
  hero: {
    o: '#140f1c', y: '#ffd83a', Y: '#d9a417', s: '#f4c58c', k: '#cf9a5e',
    r: '#e63b2e', u: '#3f6bd6', U: '#274a9e', w: '#f2f2f4',
    d: '#2b2f37', a: '#171a20', c: '#63c8ff', C: '#2f8fd6', e: '#e0342c', E: '#9c1f1a',
  },
  zombie: {
    o: '#0f1710', g: '#5f8f3a', G: '#456b28', H: '#7aa84c', s: '#8fae6a',
    r: '#ff3a2a', m: '#180f14', p: '#7a4a7a', P: '#5a345c', b: '#22331c', d: '#3a2a1a',
  },
  maniac: {
    o: '#160f10', s: '#e8b088', k: '#c48a60', w: '#e8e8ea', W: '#b8b8c0',
    r: '#c02020', R: '#7a1414', d: '#3a3f47', D: '#23272e', m: '#6a6f78', M: '#40454d', b: '#141118',
  },
  alien: {
    o: '#0a1712', g: '#7ad6a0', G: '#4fae7a', H: '#a8f0c8', k: '#2f7a54',
    e: '#101018', w: '#dfffff', p: '#c86af0', P: '#8a34c0', c: '#63f0d8', b: '#123', d: '#123626',
  },
};

// Cada sprite é uma lista de linhas (largura 16). '.' vazio.
const SPRITES = {
  // ---- HERÓI ZECA, virado para BAIXO (frente) ----
  hero_down: {
    pal: 'hero', rows: [
      '.....yy.yy......',
      '....yyyyyyy.....',
      '...yyyyyyyyy....',
      '..yyyyyyyyyyy...',
      '..yyYYyyyYYyy...',
      '..yssssssssy....',
      '..ysssssssss....',
      '..ysrrwwuuss....',
      '..yssskkkssy....',
      '...sssssss......',
      '....skkks.......',
      '..sdddddddds....',
      '.saddrrrrddas...',
      '.sadddddddd as..',
      '.ssddddddddss...',
      '..addddddda.....',
      '..ouuuuuuuo.....',
      '..ouUuo ouUo....',
      '..oeeeo.oeeeo...',
      '..oEEo...oEEo...',
    ],
  },

  // ---- HERÓI ZECA, virado para a DIREITA (perfil, mira/arma) ----
  hero_side: {
    pal: 'hero', rows: [
      '...yyy..........',
      '..yyyyy.........',
      '.yyyyyyy........',
      '.yYyyyssss......',
      '.yyyssruss......',
      '.yysssskss......',
      '..ysssssk.......',
      '..okkkkko.......',
      '..dddddds ccc...',
      '.sdddddddsccccC.',
      '.addddddddscC...',
      '.adddddddd......',
      '..dddddddd......',
      '..uuuuuuu.......',
      '..uUu.uuUu......',
      '.uUu...uuU......',
      '.oeeo..oeeeo....',
      '.oEEo..oEEEo....',
      '................',
      '................',
    ],
  },

  // ---- ZUMBI clássico (horda, verde apodrecido, braços à frente) ----
  zombie: {
    pal: 'zombie', rows: [
      '....dddddd......',
      '...dggggggd.....',
      '..dgggggggd.....',
      '..gGgggggGg.....',
      '..grgggggrg.....',
      '..ggggggggg.....',
      '..gggmmmggg.....',
      '...gGGGGGg......',
      '.ppPPPPPPpp.....',
      'sgpPPPPPPpgs....',
      'sg.PPPPPP.gs....',
      '.g.PPbbPP.g.....',
      '...PbbbbP.......',
      '...GG..GG.......',
      '..gg....gg......',
      '..gg....gg......',
      '..bbb..bbb......',
      '..bbb..bbb......',
      '................',
      '................',
    ],
  },

  // ---- MANÍACO DE MOTOSSERRA (humano rápido, máscara de hóquei) ----
  maniac: {
    pal: 'maniac', rows: [
      '....wwwww.......',
      '...wWWWWWw......',
      '..wWwwwwwWw.....',
      '..wWbwbwbWw.....',
      '..wWwwwwwWw.....',
      '..wWWbbbWWw.....',
      '...WWWWWWW......',
      '...ssssss.......',
      '..RdddddR mmm...',
      '.RRddddddRMMMMm.',
      '.RdddddddR.MMMm.',
      '.Rdddddddd.mmm..',
      '..dddddddd......',
      '..DDDDDDDD......',
      '..DDD..DDD......',
      '..dd....dd......',
      '..dd....dd......',
      '..bb....bb......',
      '................',
      '................',
    ],
  },

  // ---- MARCIANO (cabeçudo, olhos enormes, raio à distância) ----
  alien: {
    pal: 'alien', rows: [
      '....GGGG........',
      '..GGgggggGG.....',
      '.GgggggggggG....',
      '.GgHHggggHHg....',
      '.GgeewggeewgG...',   // wait keep 16
      '.GgeewwgeewgG...',
      '.Ggggggggg gG...',
      '..GgggggggG.....',
      '...kkGGkk.......',
      '...gGGGGg.......',
      '..gGGGGGGg cc...',
      '.gGGGGGGGGccccP.',
      '.gGGGGGGGGcP....',
      '..GGGGGGGG......',
      '..kGg..gGk......',
      '..gg....gg......',
      '..gg....gg......',
      '..dd....dd......',
      '................',
      '................',
    ],
  },
};
