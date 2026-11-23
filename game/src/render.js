// render.js — paints the match state into the page: the captains' bars, the
// intent banner, the three piers with their beacons and crews, your hand and
// tide. It reads state and never changes it; main.js owns every decision.

import { CARD_BY_ID, HOUSES } from './cards.js';
import { LANES, BEACON_HP, effAtk, isResonant, lanePower, maxHpOf, tideFor } from './engine.js';
import { beaconArt, cardArt, cardBackArt, crestArt, portraitArt } from './art.js';

const $ = (id) => document.getElementById(id);

export function showScreen(name) {
  for (const s of ['title', 'table', 'end']) $(`screen-${s}`).classList.toggle('hidden', s !== name);
}

/** The title screen's crest and house chips. */
export function renderTitle() {
  $('title-crest').innerHTML = crestArt();
  $('houses-row').innerHTML = Object.values(HOUSES)
    .map((h) => `<span class="house-chip" style="border-color:${h.colour};color:${h.colour}">${h.glyph} ${h.name.toUpperCase()}</span>`)
    .join('');
}

function badgesFor(state, unit, lane) {
  const def = CARD_BY_ID.get(unit.cardId);
  const out = [];
  const bonus = effAtk(state, unit, lane) - def.atk;
  if (bonus > 0) out.push(`<span class="badge">⚔ +${bonus}</span>`);
  const trait = { assassin: 'FIRST STRIKE', turtle: 'THORNS', warden: 'MEND', knight: 'DRAIN', stowaway: 'SLIP', drake: 'BLAZE' }[def.id];
  if (trait) out.push(`<span class="badge res">${trait}</span>`);
  return out.length ? `<div class="badges">${out.join('')}</div>` : '';
}

function cardFace(def, inner) {
  const house = HOUSES[def.house];
  return `
    <div class="card-top">
      <span class="cost-orb">${def.cost}</span>
      <span class="card-name">${def.name}</span>
      <span class="house-glyph" style="color:${house.colour}">${house.glyph}</span>
    </div>
    <div class="card-art">${cardArt(def, house)}</div>
    ${inner}`;
}

function unitCard(state, unit, lane, view) {
  const def = CARD_BY_ID.get(unit.cardId);
  const house = HOUSES[def.house];
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.uid = String(unit.uid);
  el.style.setProperty('--house', house.colour);
  const hurt = unit.hp < maxHpOf(unit) ? ' hurt' : '';
  el.innerHTML = cardFace(def, `
    <div class="card-stats">
      <span class="stat atk">⚔ ${effAtk(state, unit, lane)}</span>
      <span class="stat hp${hurt}">♥ ${unit.hp}</span>
    </div>`) + badgesFor(state, unit, lane);
  if (view.targetUids.has(unit.uid)) el.classList.add('targetable');
  const fresh = view.fresh.get(unit.uid);
  if (fresh) el.classList.add(fresh === 'flip' ? 'flip-in' : 'deal-in');
  return el;
}

function handCard(state, cardId, index, view) {
  const def = CARD_BY_ID.get(cardId);
  const house = HOUSES[def.house];
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.handIndex = String(index);
  el.style.setProperty('--house', house.colour);
  const stats = def.kind === 'unit'
    ? `<div class="card-stats"><span class="stat atk">⚔ ${def.atk}</span><span class="stat hp">♥ ${def.hp}</span></div>`
    : `<div class="tactic-ribbon">✦ TACTIC ✦</div>`;
  el.innerHTML = cardFace(def, `<div class="card-text">${def.text}</div>${stats}`);
  if (def.cost > state.you.tide) el.classList.add('unaffordable');
  if (view.armed === index) el.classList.add('armed');
  if (view.targetUids.size === 0 && view.targetLanes.size === 0) {
    // not targeting: hand cards are clickable to arm
  }
  return el;
}

function beaconHtml(state, side, lane) {
  const hp = Math.max(0, state[side].beacons[lane]);
  const down = hp <= 0;
  const pct = Math.round((hp / BEACON_HP) * 100);
  return `
    ${beaconArt(!down)}
    <div class="beacon-info">
      <div class="beacon-label"><span>${side === 'foe' ? "MORVANE'S BEACON" : 'YOUR BEACON'}</span>
      <span class="hp-num">${down ? '☠ FALLEN' : `${hp} / ${BEACON_HP}`}</span></div>
      <div class="hpbar ${side}"><i style="width:${pct}%"></i></div>
    </div>`;
}

/** Paint the whole table from state. `view` carries the moment's interaction marks. */
export function renderTable(state, view) {
  $('foe-id').innerHTML = `${portraitArt('foe')}<div><div class="captain-name">CAPTAIN MORVANE</div><div class="captain-sub">The Drowned Admiral</div></div>`;
  $('you-id').innerHTML = `${portraitArt('you')}<div><div class="captain-name">THE LANTERN KEEPER</div><div class="captain-sub">You · Keeper of Gloaming Bay</div></div>`;
  $('foe-hand').innerHTML = state.foe.hand.map(() => `<div class="card-back">${cardBackArt()}</div>`).join('');
  $('foe-deck').textContent = `Deck · ${state.foe.deck.length}`;
  $('you-deck').textContent = `Deck · ${state.you.deck.length}`;
  $('round-badge').textContent = `ROUND ${state.round}`;

  // The Admiral's declared intent.
  const intent = state.intent;
  if (intent) {
    const card = intent.cardId ? CARD_BY_ID.get(intent.cardId) : null;
    $('intent-banner').innerHTML = card
      ? `⚠ <b>Morvane's intent</b> — he sends his <span class="intent-card">${card.name}</span> to <b>${LANES[intent.lane].name}</b> this round. Counter it!`
      : `⚠ <b>Morvane's intent</b> — he means to shore up <b>${LANES[intent.lane].name}</b> this round.`;
  } else {
    $('intent-banner').textContent = 'The Admiral is watching the water…';
  }

  for (let lane = 0; lane < 3; lane++) {
    const laneEl = document.querySelector(`.lane[data-lane="${lane}"]`);
    laneEl.classList.toggle('targeted', intent !== null && intent.lane === lane);
    laneEl.classList.toggle('targetable', view.targetLanes.has(lane));
    laneEl.querySelector('.lane-name').textContent = LANES[lane].name.toUpperCase();
    const yp = lanePower(state, 'you', lane);
    const fp = lanePower(state, 'foe', lane);
    $('power-' + lane).innerHTML =
      `<span class="${yp > fp ? 'win' : yp < fp ? 'lose' : ''}">⚔ ${yp}</span> — <span class="${fp > yp ? 'lose' : ''}">${fp} ⚔</span>`;

    for (const side of ['foe', 'you']) {
      const slot = $(`beacon-${side}-${lane}`);
      slot.innerHTML = beaconHtml(state, side, lane);
      slot.classList.toggle('down', state[side].beacons[lane] <= 0);
      const board = $(`board-${side}-${lane}`);
      board.innerHTML = '';
      for (const unit of state[side].board[lane]) board.appendChild(unitCard(state, unit, lane, view));
      for (let i = state[side].board[lane].length; i < 3; i++) {
        const ghost = document.createElement('div');
        ghost.className = 'slot-ghost';
        ghost.textContent = 'OPEN BERTH';
        board.appendChild(ghost);
      }
    }
  }

  // Your tide and hand.
  const max = tideFor(state.round);
  $('tide-pips').innerHTML = Array.from({ length: max }, (_, i) =>
    `<span class="pip ${i < state.you.tide ? 'full' : 'spent'}"></span>`).join('');
  $('resonance-badge').classList.toggle('hidden', !isResonant(state, 'you'));
  const hand = $('hand');
  hand.innerHTML = '';
  hand.className = 'hand' + (state.you.hand.length >= 9 ? ' tight2' : state.you.hand.length >= 6 ? ' tight' : '');
  state.you.hand.forEach((cardId, i) => hand.appendChild(handCard(state, cardId, i, view)));
}

/** Element lookups the animation driver needs. */
export const unitEl = (uid) => document.querySelector(`[data-uid="${uid}"]`);
export const beaconEl = (side, lane) => $(`beacon-${side}-${lane}`);
export const laneEl = (lane) => document.querySelector(`.lane[data-lane="${lane}"]`);

export function setTicker(text) {
  $('ticker').textContent = text;
}

/** The end screen for a settled match. */
export function renderEnd(state, stats) {
  const end = $('screen-end');
  const won = state.winner === 'you';
  const drew = state.winner === 'draw';
  end.classList.toggle('victory', won);
  end.classList.toggle('defeat', !won);
  $('end-art').innerHTML = beaconArt(won);
  $('end-title').textContent = won ? 'THE HARBOUR IS YOURS' : drew ? 'A HARBOUR SHARED' : 'THE TIDE TAKES THE HARBOUR';
  $('end-sub').textContent = won
    ? 'Morvane’s beacons gutter and go dark. By dawn every lamp in Gloaming Bay burns for the Lantern Keeper.'
    : drew
      ? 'Fourteen rounds, and neither captain yields the bay. The lanterns burn on, undecided.'
      : 'Your last beacon drowns in black water. The Drowned Admiral rings the harbour bell — once, and slowly.';
  const foeDown = state.foe.beacons.filter((h) => h <= 0).length;
  const youDown = state.you.beacons.filter((h) => h <= 0).length;
  $('end-stats').innerHTML = `
    <div class="end-stat"><div class="num">${state.round}</div><div class="lbl">Rounds</div></div>
    <div class="end-stat"><div class="num">${foeDown}</div><div class="lbl">Enemy beacons felled</div></div>
    <div class="end-stat"><div class="num">${youDown}</div><div class="lbl">Your beacons lost</div></div>
    <div class="end-stat"><div class="num">${stats.crewLost}</div><div class="lbl">Your crew lost</div></div>`;
}
