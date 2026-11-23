// anim.js — the juice: floating damage numbers, screen flourishes and victory
// confetti, all as short-lived elements in the stage's fx layer. Pure decoration:
// nothing here touches game state.

const stage = () => document.getElementById('stage');
const fx = () => document.getElementById('fx-layer');

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The centre of an element in stage coordinates (the stage may be scaled). */
export function centreOf(el) {
  const s = stage().getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const scale = s.width / 1280;
  return {
    x: (r.left - s.left) / scale + r.width / scale / 2,
    y: (r.top - s.top) / scale + r.height / scale / 2,
  };
}

/** A floating label that rises and fades over an element: "-4", "+2 HP", "BOND +1". */
export function spawnFloater(el, text, kind = 'dmg') {
  if (!el) return;
  const { x, y } = centreOf(el);
  const node = document.createElement('div');
  node.className = `floater ${kind}`;
  node.textContent = text;
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  fx().appendChild(node);
  setTimeout(() => node.remove(), 1050);
}

/** A short golden burst of confetti for the victory screen. */
export function confettiBurst(count = 70) {
  const hues = ['#f4b942', '#3cc8ff', '#7ddb4f', '#ff7a3c', '#c07dff', '#fdf6dd'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('i');
    piece.className = 'confetti';
    const size = 6 + Math.random() * 8;
    piece.style.left = `${Math.random() * 1280}px`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.55}px`;
    piece.style.background = hues[i % hues.length];
    piece.style.animationDuration = `${2.2 + Math.random() * 2.4}s`;
    piece.style.animationDelay = `${Math.random() * 0.9}s`;
    fx().appendChild(piece);
    setTimeout(() => piece.remove(), 6000);
  }
}
