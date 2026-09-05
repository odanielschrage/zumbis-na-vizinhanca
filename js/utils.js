// ---------- Utilidades matemáticas ----------
const TAU = Math.PI * 2;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
function angTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

function rand(a = 1, b) {
  if (b === undefined) { b = a; a = 0; }
  return a + Math.random() * (b - a);
}
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Colisão círculo vs retângulo. Retorna {px,py} = vetor de correção, ou null.
function circleRectPush(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx, dy = cy - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  const d = Math.sqrt(d2);
  if (d > 0.0001) {
    const push = (r - d) / d;
    return { px: dx * push, py: dy * push };
  }
  // centro dentro do retângulo: empurra pelo lado mais próximo
  const left = cx - rx, right = rx + rw - cx, top = cy - ry, bottom = ry + rh - cy;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { px: -(left + r), py: 0 };
  if (m === right) return { px: right + r, py: 0 };
  if (m === top) return { px: 0, py: -(top + r) };
  return { px: 0, py: bottom + r };
}

// Colisão círculo vs círculo. Retorna vetor de correção para o primeiro, ou null.
function circleCirclePush(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by;
  const rr = ar + br;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr || d2 === 0) return null;
  const d = Math.sqrt(d2);
  const push = (rr - d) / d;
  return { px: dx * push, py: dy * push };
}
