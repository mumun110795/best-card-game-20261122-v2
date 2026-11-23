// art.js — every picture in Breakwater is drawn here, procedurally, as SVG:
// a little painted scene per card, the card back, the beacon towers and the two
// captains' portraits. No image files, nothing fetched — the shapes are the art.

let stamp = 0;

/** A shared night-harbour backdrop: dusk sky, a moon, layered sea. */
function backdrop(id, tint) {
  return `
    <rect width="200" height="120" fill="url(#sky${id})"/>
    <circle cx="168" cy="22" r="10" fill="#f4e9c8" opacity="0.9"/>
    <circle cx="164" cy="20" r="9" fill="${tint}" opacity="0.25"/>
    <path d="M0 84 Q 25 76 50 84 T 100 84 T 150 84 T 200 84 V120 H0 Z" fill="#0d2f47"/>
    <path d="M0 96 Q 25 89 50 96 T 100 96 T 150 96 T 200 96 V120 H0 Z" fill="#081f31"/>`;
}

const MOTIFS = {
  imp: (c) => `<g fill="${c}">
      <path d="M78 78 q22 -34 44 0 q4 16 -8 22 q-14 6 -28 0 q-12 -6 -8 -22Z"/>
      <path d="M80 52 l-8 -14 l16 6Z"/><path d="M120 52 l8 -14 l-16 6Z"/>
      <circle cx="90" cy="72" r="4" fill="#0b2237"/><circle cx="110" cy="72" r="4" fill="#0b2237"/>
      <path d="M92 88 q8 6 16 0" stroke="#0b2237" stroke-width="3" fill="none"/>
      <path d="M64 96 q-10 -14 -2 -24 M136 96 q10 -14 2 -24" stroke="${c}" stroke-width="5" fill="none"/></g>`,
  lancer: (c) => `<g stroke="${c}" stroke-width="6" stroke-linecap="round">
      <path d="M52 104 L150 30"/></g>
      <path d="M150 30 l14 -8 l-4 15Z" fill="#f4e9c8"/>
      <path d="M66 58 q22 6 24 28 q-16 12 -32 2 q-6 -18 8 -30Z" fill="${c}"/>
      <circle cx="76" cy="72" r="5" fill="#0b2237"/>`,
  drake: (c) => `<g fill="${c}">
      <path d="M30 62 q40 -34 78 -10 q30 6 44 -14 q4 22 -12 34 q8 18 -8 26 q-46 16 -84 -6 q-20 -12 -18 -30Z"/>
      <path d="M58 44 q-16 -22 -34 -20 q10 16 22 24Z" opacity="0.75"/>
      <path d="M96 30 q10 -16 26 -16 q-4 14 -14 22Z" opacity="0.75"/>
      <circle cx="138" cy="52" r="4" fill="#ffe9a8"/>
      <path d="M150 62 q14 4 12 14 q-10 2 -16 -4Z" fill="#ffb37a"/></g>`,
  roc: (c) => `<g fill="${c}">
      <path d="M100 58 L18 26 q10 26 34 34 q-14 2 -22 10 q30 8 52 -2Z"/>
      <path d="M100 58 L182 26 q-10 26 -34 34 q14 2 22 10 q-30 8 -52 -2Z"/>
      <ellipse cx="100" cy="66" rx="14" ry="18"/>
      <path d="M100 46 l7 10 l-7 8 l-7 -8Z" fill="#f4e9c8"/>
      <path d="M92 84 l-4 12 M108 84 l4 12" stroke="${c}" stroke-width="4"/></g>`,
  surge: (c) => `<g fill="${c}">
      <path d="M96 8 L62 62 h22 L74 110 L124 48 H100 L116 8Z"/>
      <path d="M140 30 l-18 26 h12 l-8 30 l30 -38 h-14 l10 -18Z" opacity="0.7"/></g>`,
  monk: (c) => `<g>
      <path d="M100 30 q26 0 26 30 l0 34 l-52 0 l0 -34 q0 -30 26 -30Z" fill="${c}"/>
      <circle cx="100" cy="56" r="12" fill="#0e2c42"/>
      <rect x="128" y="58" width="16" height="22" rx="3" fill="#f4e9c8"/>
      <rect x="132" y="62" width="8" height="10" fill="#ffca6a"/>
      <path d="M136 58 v-8" stroke="#f4e9c8" stroke-width="3"/></g>`,
  warden: (c) => `<g fill="${c}">
      <path d="M40 110 q4 -44 -8 -64 q20 6 24 34 q4 -26 -4 -40 q18 10 18 40 q6 -22 20 -28 q-4 22 2 36 q8 -16 22 -18 q-8 26 -2 40Z"/>
      <circle cx="128" cy="66" r="20" opacity="0.9"/>
      <circle cx="128" cy="66" r="12" fill="#0e2c42"/></g>`,
  caller: (c) => `<g fill="${c}">
      <path d="M74 108 l0 -40 q0 -16 14 -16 l4 0 q14 0 14 16 l0 40Z"/>
      <circle cx="90" cy="44" r="10" fill="#f0d9b8"/>
      <path d="M104 62 q20 -12 34 2 q-16 6 -22 16 q-10 -6 -12 -18Z" fill="#f4e9c8"/>
      <path d="M146 44 a18 18 0 0 1 0 26 M158 36 a28 28 0 0 1 0 42" stroke="${c}" stroke-width="4" fill="none"/></g>`,
  repair: (c) => `<g stroke="${c}" stroke-width="7" stroke-linecap="round">
      <path d="M58 34 L128 96"/><path d="M142 34 L72 96"/></g>
      <path d="M52 26 l18 18 l-8 8 l-18 -18Z" fill="#f4e9c8"/>
      <circle cx="146" cy="28" r="11" fill="none" stroke="#f4e9c8" stroke-width="6"/>
      <rect x="52" y="100" width="96" height="9" fill="#8a5a2b"/>`,
  secondwind: (c) => `<g fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round">
      <path d="M30 48 q40 -18 66 0 q18 12 36 2"/>
      <path d="M22 74 q44 -20 76 -2 q20 12 40 0"/>
      <path d="M44 98 q34 -14 58 -2"/></g>
      <path d="M150 82 l14 30 l-26 0Z" fill="#f4e9c8"/>
      <path d="M157 82 v-22" stroke="#f4e9c8" stroke-width="4"/>`,
  brute: (c) => `<g fill="${c}">
      <path d="M52 110 l4 -34 q4 -20 26 -22 l36 0 q22 2 26 22 l4 34Z"/>
      <circle cx="100" cy="42" r="14"/>
      <path d="M60 66 q-16 4 -18 22 M140 66 q16 4 18 22" stroke="${c}" stroke-width="9" fill="none"/>
      <path d="M100 76 v22 M88 88 h24" stroke="#0b2237" stroke-width="5"/></g>`,
  turtle: (c) => `<g fill="${c}">
      <path d="M34 96 q6 -40 66 -40 q60 0 66 40 q-66 12 -132 0Z"/>
      <path d="M62 62 l6 -14 l8 12 M96 56 l4 -14 l9 13 M128 62 l7 -12 l7 12" stroke="${c}" stroke-width="6" fill="none"/>
      <circle cx="170" cy="88" r="10"/>
      <path d="M40 96 h120" stroke="#0b2237" stroke-width="4" opacity="0.4"/></g>`,
  golem: (c) => `<g fill="${c}">
      <rect x="78" y="22" width="44" height="30" rx="7"/>
      <rect x="62" y="54" width="76" height="42" rx="9"/>
      <rect x="40" y="58" width="18" height="40" rx="8"/><rect x="142" y="58" width="18" height="40" rx="8"/>
      <circle cx="90" cy="37" r="4" fill="#aef2ff"/><circle cx="110" cy="37" r="4" fill="#aef2ff"/></g>
      <path d="M150 50 q14 -16 6 -30 M52 48 q-12 -14 -6 -28" stroke="#ff9d7a" stroke-width="5" fill="none"/>`,
  rally: (c) => `<g>
      <path d="M70 108 V26" stroke="#8a5a2b" stroke-width="6"/>
      <path d="M70 28 q30 -10 52 2 q-24 12 -52 4Z" fill="${c}"/>
      <path d="M46 110 q10 -18 24 -20 M154 110 q-10 -18 -24 -20" stroke="${c}" stroke-width="5" fill="none"/>
      <circle cx="70" cy="24" r="5" fill="#f4e9c8"/></g>`,
  stowaway: (c) => `<g>
      <rect x="66" y="66" width="68" height="42" rx="6" fill="#8a5a2b"/>
      <path d="M66 78 h68 M66 94 h68" stroke="#5f3c17" stroke-width="4"/>
      <circle cx="100" cy="58" r="15" fill="${c}"/>
      <path d="M86 52 q14 -12 28 0 l0 8 l-28 0Z" fill="${c}"/>
      <circle cx="94" cy="58" r="3" fill="#0b2237"/><circle cx="106" cy="58" r="3" fill="#0b2237"/></g>`,
  assassin: (c) => `<g fill="${c}">
      <path d="M100 26 q24 4 22 28 q-2 20 -22 22 q-20 -2 -22 -22 q-2 -24 22 -28Z"/>
      <path d="M84 58 q16 -8 32 0" stroke="#0b2237" stroke-width="5" fill="none"/></g>
      <path d="M138 96 L168 52" stroke="#e8f4ff" stroke-width="5" stroke-linecap="round"/>
      <path d="M168 52 l8 -12 l2 14Z" fill="#e8f4ff"/>
      <path d="M30 100 q20 -10 40 0 M140 108 q18 -8 34 0" stroke="${c}" stroke-width="4" fill="none" opacity="0.7"/>`,
  knight: (c) => `<g fill="${c}">
      <path d="M72 108 l0 -44 q0 -26 28 -26 q28 0 28 26 l0 44Z"/>
      <path d="M100 38 q2 -18 18 -22 q-2 12 -8 18" fill="#ff7a3c"/>
      <rect x="84" y="58" width="32" height="7" fill="#0b2237"/>
      <path d="M88 76 h24 M92 88 h16" stroke="#0b2237" stroke-width="4"/></g>
      <path d="M146 100 V44" stroke="#e8f4ff" stroke-width="5" stroke-linecap="round"/>
      <circle cx="146" cy="106" r="6" fill="#f4e9c8"/>`,
  crosswind: (c) => `<g fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round">
      <path d="M28 44 q60 -26 108 0"/>
      <path d="M172 76 q-60 26 -108 0"/></g>
      <path d="M136 40 l18 4 l-10 14Z" fill="${c}"/><path d="M64 80 l-18 -4 l10 -14Z" fill="${c}"/>
      <rect x="24" y="92" width="30" height="16" fill="#8a5a2b"/><rect x="146" y="14" width="30" height="16" fill="#8a5a2b"/>`,
  squall: (c) => `<g fill="${c}">
      <path d="M44 58 q-14 -2 -12 -16 q2 -12 16 -12 q6 -16 26 -14 q16 2 20 14 q16 -4 22 8 q16 2 12 16 q-2 12 -18 12Z"/>
      <path d="M56 74 l-6 16 M84 76 l-6 16 M112 74 l-6 16 M138 70 l-6 14" stroke="${c}" stroke-width="5" stroke-linecap="round"/></g>
      <path d="M20 108 q20 -10 40 0 t40 0 t40 0 t40 0" stroke="#3cc8ff" stroke-width="5" fill="none"/>`,
};

/** The painted scene for one card definition, as an inline SVG string. */
export function cardArt(def, house) {
  const id = ++stamp;
  const motif = MOTIFS[def.art] ?? MOTIFS.monk;
  return `<svg viewBox="0 0 200 120" class="art-svg" aria-hidden="true">
    <defs><linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#173f5c"/><stop offset="1" stop-color="${house.deep}"/>
    </linearGradient></defs>
    ${backdrop(id, house.colour)}
    ${motif(house.colour)}
  </svg>`;
}

/** The card back: a rope-framed wave crest over deep water. */
export function cardBackArt() {
  return `<svg viewBox="0 0 200 120" class="art-svg" aria-hidden="true">
    <rect width="200" height="120" fill="#0d2f47"/>
    <path d="M20 84 Q 50 58 84 74 Q 118 90 150 62 Q 168 48 182 60" stroke="#f4b942" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="100" cy="34" r="13" fill="none" stroke="#f4b942" stroke-width="5"/>
    <path d="M0 104 Q 25 97 50 104 T 100 104 T 150 104 T 200 104 V120 H0Z" fill="#081f31"/>
  </svg>`;
}

/** A beacon tower, lit while it stands and dark once it has fallen. */
export function beaconArt(lit) {
  const flame = lit ? '#ffca6a' : '#3a4a57';
  const glow = lit ? '<circle cx="30" cy="14" r="12" fill="#ffca6a" opacity="0.28"/>' : '';
  return `<svg viewBox="0 0 60 74" class="beacon-svg" aria-hidden="true">
    ${glow}
    <path d="M22 66 L26 26 h8 L38 66Z" fill="#5b4632"/>
    <path d="M18 66 h24 l3 8 H15Z" fill="#3d2c1d"/>
    <rect x="23" y="14" width="14" height="13" rx="2" fill="#22303c"/>
    <circle cx="30" cy="20" r="4.5" fill="${flame}"/>
    <path d="M20 14 h20 l-3 -6 H23Z" fill="#22303c"/>
  </svg>`;
}

/** Captain portraits: the Lantern Keeper (you) and Morvane, the Drowned Admiral. */
export function portraitArt(who) {
  if (who === 'foe') {
    return `<svg viewBox="0 0 80 80" class="portrait-svg" aria-hidden="true">
      <circle cx="40" cy="40" r="38" fill="#2a1440"/>
      <path d="M18 66 q4 -26 22 -26 q18 0 22 26Z" fill="#472a75"/>
      <circle cx="40" cy="34" r="13" fill="#cdbcf0"/>
      <path d="M24 26 q16 -16 32 0 l-4 8 q-12 -8 -24 0Z" fill="#1d0d33"/>
      <circle cx="35" cy="34" r="2.6" fill="#12081f"/><circle cx="45" cy="34" r="2.6" fill="#12081f"/>
      <path d="M30 62 q10 6 20 0" stroke="#7ddb4f" stroke-width="3" fill="none"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 80 80" class="portrait-svg" aria-hidden="true">
    <circle cx="40" cy="40" r="38" fill="#0d3a4d"/>
    <path d="M18 66 q4 -26 22 -26 q18 0 22 26Z" fill="#0d4d73"/>
    <circle cx="40" cy="34" r="13" fill="#f0d0a8"/>
    <path d="M25 28 q15 -13 30 0 l0 7 q-15 -7 -30 0Z" fill="#f4b942"/>
    <circle cx="35" cy="35" r="2.6" fill="#12242f"/><circle cx="45" cy="35" r="2.6" fill="#12242f"/>
    <rect x="56" y="44" width="11" height="15" rx="2" fill="#f4e9c8"/>
    <rect x="59" y="48" width="5" height="7" fill="#ffca6a"/>
  </svg>`;
}

/** The title wave crest that sits under the game's name. */
export function crestArt() {
  return `<svg viewBox="0 0 600 90" class="crest-svg" aria-hidden="true">
    <path d="M10 62 Q 90 20 170 48 Q 240 72 320 40 Q 400 10 470 42 Q 540 70 590 44" stroke="#f4b942" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M10 78 Q 110 44 210 66 Q 310 86 410 58 Q 500 34 590 62" stroke="#3cc8ff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/>
    <circle cx="300" cy="26" r="9" fill="#f4e9c8"/>
  </svg>`;
}
