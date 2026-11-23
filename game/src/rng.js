// rng.js — a tiny seedable random source (mulberry32) so a match can be replayed
// exactly from its seed: the screenshot scenes and the balance harness both lean on it.

export function makeRng(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [0, n) drawn from rng. */
export function randInt(rng, n) {
  return Math.floor(rng() * n);
}

/** Shuffle an array in place with rng and return it. */
export function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}
