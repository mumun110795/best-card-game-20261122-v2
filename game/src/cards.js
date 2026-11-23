// cards.js — the Breakwater card catalogue: every unit and tactic in the game,
// as plain data. The engine reads these definitions; the renderer draws them.

// The four houses. Each house owns a colour AND a shape, so a card's house reads
// at a glance even in greyscale or shrunk to a thumbnail.
export const HOUSES = {
  ember: { name: 'Ember', glyph: '▲', colour: '#ff7a3c', deep: '#8f2d0e' },
  tide: { name: 'Tide', glyph: '●', colour: '#3cc8ff', deep: '#0d4d73' },
  thorn: { name: 'Thorn', glyph: '◆', colour: '#7ddb4f', deep: '#2c5c14' },
  gloom: { name: 'Gloom', glyph: '☾', colour: '#c07dff', deep: '#472a75' },
};

// kind: 'unit' | 'tactic'. Units carry atk/hp; tactics carry an effect key the
// engine resolves. `art` names the procedural picture art.js paints for the card.
export const CARDS = [
  // — Ember: the house of the first blow —
  { id: 'imp', name: 'Cinder Imp', house: 'ember', kind: 'unit', cost: 1, atk: 2, hp: 1, art: 'imp',
    text: 'Small, furious, flammable.' },
  { id: 'lancer', name: 'Ash Lancer', house: 'ember', kind: 'unit', cost: 2, atk: 3, hp: 2, art: 'lancer',
    text: 'His charge has ended arguments.' },
  { id: 'drake', name: 'Cinder Drake', house: 'ember', kind: 'unit', cost: 4, atk: 4, hp: 3, art: 'drake',
    text: 'BLAZE — +1 ATK while another Ember ally stands anywhere on your shore.' },
  { id: 'roc', name: 'Storm Roc', house: 'ember', kind: 'unit', cost: 5, atk: 5, hp: 4, art: 'roc',
    text: 'When it dives, the harbour holds its breath.' },
  { id: 'surge', name: 'Surge of Sparks', house: 'ember', kind: 'tactic', cost: 2, art: 'surge', effect: 'surge',
    text: 'TACTIC — Your crew in one pier gains +2 ATK until the battle ends.' },

  // — Tide: the house that mends and provides —
  { id: 'monk', name: 'Lantern Monk', house: 'tide', kind: 'unit', cost: 2, atk: 2, hp: 3, art: 'monk',
    text: 'He keeps the lamps lit and the wounded breathing.' },
  { id: 'warden', name: 'Kelp Warden', house: 'tide', kind: 'unit', cost: 2, atk: 1, hp: 4, art: 'warden',
    text: 'MEND — After each battle, restore 1 HP to your beacon in this pier.' },
  { id: 'caller', name: 'Tidecaller', house: 'tide', kind: 'unit', cost: 3, atk: 2, hp: 3, art: 'caller',
    text: 'ARRIVE — Draw a card when the Tidecaller comes ashore.' },
  { id: 'repair', name: 'Repair Crew', house: 'tide', kind: 'tactic', cost: 2, art: 'repair', effect: 'repair',
    text: 'TACTIC — Restore 4 HP to one of your beacons.' },
  { id: 'secondwind', name: 'Second Wind', house: 'tide', kind: 'tactic', cost: 2, art: 'secondwind', effect: 'draw2',
    text: 'TACTIC — Draw 2 cards.' },

  // — Thorn: the house that does not move —
  { id: 'brute', name: 'Harbour Brute', house: 'thorn', kind: 'unit', cost: 3, atk: 3, hp: 4, art: 'brute',
    text: 'Paid by the week. Immovable by the hour.' },
  { id: 'turtle', name: 'Thornback Turtle', house: 'thorn', kind: 'unit', cost: 4, atk: 2, hp: 7, art: 'turtle',
    text: 'THORNS — Whoever strikes the Turtle takes 1 damage back.' },
  { id: 'golem', name: 'Coral Golem', house: 'thorn', kind: 'unit', cost: 5, atk: 3, hp: 8, art: 'golem',
    text: 'It grew where the old pier fell. It intends to stay.' },
  { id: 'rally', name: 'Root and Rally', house: 'thorn', kind: 'tactic', cost: 1, art: 'rally', effect: 'rally',
    text: 'TACTIC — One of your crew gains +0 ATK / +2 HP for good.' },

  // — Gloom: the house of the quiet knife —
  { id: 'stowaway', name: 'Gloom Stowaway', house: 'gloom', kind: 'unit', cost: 2, atk: 2, hp: 2, art: 'stowaway',
    text: 'SLIP — Unopposed, the Stowaway deals +1 extra damage to a beacon.' },
  { id: 'assassin', name: 'Mist Assassin', house: 'gloom', kind: 'unit', cost: 3, atk: 3, hp: 2, art: 'assassin',
    text: 'FIRST STRIKE — In a clash, the Assassin deals damage before taking any.' },
  { id: 'knight', name: 'Drowned Knight', house: 'gloom', kind: 'unit', cost: 4, atk: 3, hp: 5, art: 'knight',
    text: 'DRAIN — When the Knight destroys a foe, restore 2 HP to your beacon here.' },
  { id: 'crosswind', name: 'Crosswind', house: 'gloom', kind: 'tactic', cost: 1, art: 'crosswind', effect: 'crosswind',
    text: 'TACTIC — Move one of your crew to a neighbouring pier.' },
  { id: 'squall', name: 'Harbour Squall', house: 'gloom', kind: 'tactic', cost: 3, art: 'squall', effect: 'squall',
    text: 'TACTIC — Deal 2 damage to every enemy crew in one pier.' },
];

export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

/** The deck both captains sail with: two of most cards, one of the heavy ones. */
export function buildDeck() {
  const plan = [
    ['imp', 2], ['lancer', 2], ['drake', 1], ['roc', 1], ['surge', 2],
    ['monk', 2], ['warden', 2], ['caller', 2], ['repair', 1], ['secondwind', 1],
    ['brute', 2], ['turtle', 1], ['golem', 1], ['rally', 2],
    ['stowaway', 2], ['assassin', 2], ['knight', 1], ['crosswind', 2], ['squall', 1],
  ];
  const ids = [];
  for (const [id, n] of plan) for (let i = 0; i < n; i++) ids.push(id);
  return ids; // 30 cards
}
