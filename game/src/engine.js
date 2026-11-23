// engine.js — the rules of Breakwater, with no DOM in sight: match state, legal
// plays, tactics, the lane-by-lane battle, and the win check. The browser drives
// it through main.js; the balance harness drives the very same code from Node.

import { CARD_BY_ID, buildDeck } from './cards.js';
import { makeRng, shuffle } from './rng.js';

export const LANES = [
  { name: 'Lantern Pier', short: 'LANTERN' },
  { name: 'Market Quay', short: 'MARKET' },
  { name: 'Breakwater Point', short: 'BREAKWATER' },
];
export const LANE_SLOTS = 3;      // crew per side per pier — a full pier is a wall
export const BEACON_HP = 12;
export const MAX_ROUND = 14;
export const START_TIDE = 3;

let uidSeq = 1;

export function tideFor(round) {
  return Math.min(START_TIDE + round - 1, 9);
}

function makeUnit(cardId, owner) {
  const def = CARD_BY_ID.get(cardId);
  return {
    uid: uidSeq++, cardId, owner,
    hp: def.hp, buffHp: 0, tempAtk: 0,
  };
}

function makeSide(rng) {
  const deck = shuffle(rng, buildDeck());
  const hand = [];
  for (let i = 0; i < 4; i++) hand.push(deck.pop());
  return {
    deck, hand,
    board: [[], [], []],                       // board[lane] = unit instances
    beacons: [BEACON_HP, BEACON_HP, BEACON_HP], // 0 means the pier has fallen
    tide: 0,
  };
}

/** A fresh match. `foe` is Captain Morvane, driven by ai.js. */
export function newMatch(seed) {
  uidSeq = 1;
  const rng = makeRng(seed);
  const state = {
    rng,
    round: 1,
    you: makeSide(rng),
    foe: makeSide(rng),
    over: false,
    winner: null, // 'you' | 'foe' | 'draw'
    intent: null, // the foe's committed plan for this round, set by ai.js
    log: [],
  };
  state.you.tide = tideFor(1);
  return state;
}

export function defOf(unit) {
  return CARD_BY_ID.get(unit.cardId);
}

export function other(side) {
  return side === 'you' ? 'foe' : 'you';
}

export function sideOf(state, side) {
  return state[side];
}

export function beaconsDown(state, side) {
  return state[side].beacons.filter((hp) => hp <= 0).length;
}

function housesOnBoard(state, side) {
  const set = new Set();
  for (const lane of state[side].board) for (const u of lane) set.add(defOf(u).house);
  return set;
}

/** Resonance: three or more houses standing together fight +1 strong. */
export function isResonant(state, side) {
  return housesOnBoard(state, side).size >= 3;
}

function hasBondPartner(state, unit, lane) {
  const house = defOf(unit).house;
  return state[unit.owner].board[lane].some((u) => u !== unit && defOf(u).house === house);
}

function blazeLit(state, unit) {
  if (defOf(unit).id !== 'drake') return false;
  for (let lane = 0; lane < 3; lane++) {
    for (const u of state[unit.owner].board[lane]) {
      if (u !== unit && defOf(u).house === 'ember') return true;
    }
  }
  return false;
}

/** A unit's attack right now, with every bonus the board gives it. */
export function effAtk(state, unit, lane) {
  let atk = defOf(unit).atk + (unit.tempAtk || 0);
  if (blazeLit(state, unit)) atk += 1;
  if (hasBondPartner(state, unit, lane)) atk += 1;
  if (isResonant(state, unit.owner)) atk += 1;
  return atk;
}

export function maxHpOf(unit) {
  return defOf(unit).hp + (unit.buffHp || 0);
}

/** Total attack a side would throw in one pier this battle. */
export function lanePower(state, side, lane) {
  return state[side].board[lane].reduce((sum, u) => sum + effAtk(state, u, lane), 0);
}

function drawCards(state, side, n, events) {
  const s = state[side];
  let drew = 0;
  for (let i = 0; i < n && s.deck.length > 0; i++) {
    s.hand.push(s.deck.pop());
    drew++;
  }
  if (drew > 0 && events) events.push({ type: 'draw', side, n: drew });
  return drew;
}

function damageBeacon(state, side, lane, dmg, events) {
  const s = state[side];
  if (s.beacons[lane] <= 0 || dmg <= 0) return 0;
  const dealt = Math.min(dmg, s.beacons[lane]);
  s.beacons[lane] -= dealt;
  events.push({ type: 'beacon-hit', side, lane, dmg: dealt, left: s.beacons[lane] });
  if (s.beacons[lane] <= 0) events.push({ type: 'beacon-down', side, lane });
  return dealt;
}

function healBeacon(state, side, lane, amount, events) {
  const s = state[side];
  if (s.beacons[lane] <= 0 || s.beacons[lane] >= BEACON_HP) return 0;
  const healed = Math.min(amount, BEACON_HP - s.beacons[lane]);
  s.beacons[lane] += healed;
  events.push({ type: 'beacon-heal', side, lane, amount: healed });
  return healed;
}

/** Every play `side` may legally make right now. */
export function legalPlays(state, side) {
  const s = state[side];
  const plays = [];
  s.hand.forEach((cardId, handIndex) => {
    const def = CARD_BY_ID.get(cardId);
    if (def.cost > s.tide) return;
    if (def.kind === 'unit') {
      for (let lane = 0; lane < 3; lane++) {
        if (s.board[lane].length < LANE_SLOTS) plays.push({ type: 'unit', handIndex, cardId, lane });
      }
      return;
    }
    switch (def.effect) {
      case 'surge':
        for (let lane = 0; lane < 3; lane++) {
          if (s.board[lane].length > 0) plays.push({ type: 'tactic', handIndex, cardId, lane });
        }
        break;
      case 'repair':
        for (let lane = 0; lane < 3; lane++) {
          if (s.beacons[lane] > 0 && s.beacons[lane] < BEACON_HP) plays.push({ type: 'tactic', handIndex, cardId, lane });
        }
        break;
      case 'draw2':
        plays.push({ type: 'tactic', handIndex, cardId });
        break;
      case 'rally':
        for (let lane = 0; lane < 3; lane++) {
          for (const u of s.board[lane]) plays.push({ type: 'tactic', handIndex, cardId, targetUid: u.uid });
        }
        break;
      case 'crosswind':
        for (let lane = 0; lane < 3; lane++) {
          for (const u of s.board[lane]) {
            for (const to of [lane - 1, lane + 1]) {
              if (to >= 0 && to < 3 && s.board[to].length < LANE_SLOTS) {
                plays.push({ type: 'tactic', handIndex, cardId, targetUid: u.uid, toLane: to });
              }
            }
          }
        }
        break;
      case 'squall':
        for (let lane = 0; lane < 3; lane++) {
          if (state[other(side)].board[lane].length > 0) plays.push({ type: 'tactic', handIndex, cardId, lane });
        }
        break;
      default:
        break;
    }
  });
  return plays;
}

function findUnit(state, side, uid) {
  const s = state[side];
  for (let lane = 0; lane < 3; lane++) {
    const at = s.board[lane].findIndex((u) => u.uid === uid);
    if (at >= 0) return { unit: s.board[lane][at], lane, at };
  }
  return null;
}

/**
 * Play one card from `side`'s hand. Returns the events it caused, or null when
 * the play is not legal (the caller asked for something the rules refuse).
 */
export function applyPlay(state, side, play) {
  const legal = legalPlays(state, side);
  const ok = legal.some((p) =>
    p.type === play.type && p.handIndex === play.handIndex && p.cardId === play.cardId &&
    p.lane === play.lane && p.targetUid === play.targetUid && p.toLane === play.toLane);
  if (!ok) return null;
  const s = state[side];
  const def = CARD_BY_ID.get(play.cardId);
  const events = [{ type: 'play', side, cardId: play.cardId, lane: play.lane ?? null }];
  s.tide -= def.cost;
  s.hand.splice(play.handIndex, 1);

  if (play.type === 'unit') {
    const unit = makeUnit(play.cardId, side);
    s.board[play.lane].push(unit);
    events.push({ type: 'deploy', side, lane: play.lane, uid: unit.uid, cardId: play.cardId });
    if (play.cardId === 'caller') drawCards(state, side, 1, events);
    return events;
  }
  switch (def.effect) {
    case 'surge':
      for (const u of s.board[play.lane]) u.tempAtk += 2;
      events.push({ type: 'surge', side, lane: play.lane });
      break;
    case 'repair':
      healBeacon(state, side, play.lane, 4, events);
      break;
    case 'draw2':
      drawCards(state, side, 2, events);
      break;
    case 'rally': {
      const found = findUnit(state, side, play.targetUid);
      if (found) {
        found.unit.buffHp += 2;
        found.unit.hp += 2;
        events.push({ type: 'rally', side, uid: found.unit.uid, lane: found.lane });
      }
      break;
    }
    case 'crosswind': {
      const found = findUnit(state, side, play.targetUid);
      if (found) {
        s.board[found.lane].splice(found.at, 1);
        s.board[play.toLane].push(found.unit);
        events.push({ type: 'crosswind', side, uid: found.unit.uid, from: found.lane, to: play.toLane });
      }
      break;
    }
    case 'squall': {
      const foe = state[other(side)];
      for (const u of [...foe.board[play.lane]]) {
        u.hp -= 2;
        events.push({ type: 'squall-hit', side: other(side), lane: play.lane, uid: u.uid, dmg: 2 });
      }
      sweepDead(state, foe, play.lane, events);
      break;
    }
    default:
      break;
  }
  return events;
}

function sweepDead(state, sideState, lane, events) {
  const side = sideState === state.you ? 'you' : 'foe';
  const before = sideState.board[lane];
  const dead = before.filter((u) => u.hp <= 0);
  sideState.board[lane] = before.filter((u) => u.hp > 0);
  for (const u of dead) events.push({ type: 'die', side, lane, uid: u.uid, cardId: u.cardId });
  return dead;
}

/**
 * The battle: pier by pier, crew clash in order, the unopposed strike beacons.
 * Returns the events in the order they happened, for the renderer to replay.
 */
export function resolveBattle(state) {
  const events = [{ type: 'battle-start', round: state.round }];
  for (let lane = 0; lane < 3; lane++) {
    const yours = [...state.you.board[lane]];
    const foes = [...state.foe.board[lane]];
    const pairs = Math.max(yours.length, foes.length);
    for (let i = 0; i < pairs; i++) {
      const a = yours[i];
      const b = foes[i];
      if (a && b) clash(state, a, b, lane, events);
      else if (a) strikeBeacon(state, a, 'foe', lane, events);
      else if (b) strikeBeacon(state, b, 'you', lane, events);
    }
    sweepDead(state, state.you, lane, events);
    sweepDead(state, state.foe, lane, events);
  }
  // Mend: Kelp Wardens tend their beacon once the fighting stops.
  for (const side of ['you', 'foe']) {
    for (let lane = 0; lane < 3; lane++) {
      const wardens = state[side].board[lane].filter((u) => u.cardId === 'warden').length;
      if (wardens > 0) healBeacon(state, side, lane, wardens, events);
    }
  }
  for (const side of ['you', 'foe']) {
    for (const lane of state[side].board) for (const u of lane) u.tempAtk = 0;
  }
  settleWinner(state);
  events.push({ type: 'battle-end', round: state.round, over: state.over, winner: state.winner });
  return events;
}

function clash(state, a, b, lane, events) {
  const aAtk = effAtk(state, a, lane);
  const bAtk = effAtk(state, b, lane);
  const aFirst = defOf(a).id === 'assassin';
  const bFirst = defOf(b).id === 'assassin';
  const aHpBefore = a.hp;
  const bHpBefore = b.hp;
  events.push({ type: 'clash', lane, aUid: a.uid, bUid: b.uid, aDmg: aAtk, bDmg: bAtk });
  if (aFirst !== bFirst) {
    // One side strikes first; a kill ends the clash before the reply.
    const [first, second, firstAtk] = aFirst ? [a, b, aAtk] : [b, a, bAtk];
    second.hp -= firstAtk;
    if (defOf(second).id === 'turtle' && firstAtk > 0) first.hp -= 1;
    if (second.hp > 0) {
      const reply = first === a ? bAtk : aAtk;
      first.hp -= reply;
      if (defOf(first).id === 'turtle' && reply > 0) second.hp -= 1;
    }
  } else {
    b.hp -= aAtk;
    a.hp -= bAtk;
    if (defOf(b).id === 'turtle' && aAtk > 0) a.hp -= 1;
    if (defOf(a).id === 'turtle' && bAtk > 0) b.hp -= 1;
  }
  // Drain: a Drowned Knight who kills feeds its beacon.
  if (b.hp <= 0 && bHpBefore > 0 && aAtk >= bHpBefore && defOf(a).id === 'knight') {
    healBeacon(state, 'you', lane, 2, events);
  }
  if (a.hp <= 0 && aHpBefore > 0 && bAtk >= aHpBefore && defOf(b).id === 'knight') {
    healBeacon(state, 'foe', lane, 2, events);
  }
}

function strikeBeacon(state, unit, targetSide, lane, events) {
  let dmg = effAtk(state, unit, lane);
  if (defOf(unit).id === 'stowaway') dmg += 1; // Slip
  events.push({ type: 'strike', side: unit.owner, lane, uid: unit.uid, dmg });
  damageBeacon(state, targetSide, lane, dmg, events);
}

function settleWinner(state) {
  const youDown = beaconsDown(state, 'you');
  const foeDown = beaconsDown(state, 'foe');
  if (foeDown >= 2 || youDown >= 2) {
    state.over = true;
    state.winner = foeDown >= 2 && youDown < 2 ? 'you' : youDown >= 2 && foeDown < 2 ? 'foe' : 'draw';
    return;
  }
  if (state.round >= MAX_ROUND) {
    state.over = true;
    if (foeDown !== youDown) {
      state.winner = foeDown > youDown ? 'you' : 'foe';
      return;
    }
    const youHp = state.you.beacons.reduce((x, y) => x + Math.max(0, y), 0);
    const foeHp = state.foe.beacons.reduce((x, y) => x + Math.max(0, y), 0);
    state.winner = youHp === foeHp ? 'draw' : youHp > foeHp ? 'you' : 'foe';
  }
}

/** Begin the next round after a battle that settled nothing. */
export function advanceRound(state) {
  state.round += 1;
  state.you.tide = tideFor(state.round);
  drawCards(state, 'you', 1, null);
  drawCards(state, 'foe', 1, null);
}
