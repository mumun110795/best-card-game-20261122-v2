// ai.js — Captain Morvane, the Drowned Admiral: the opposing captain. He commits
// to a plan in the open (his INTENT, shown to the player before they act, so it
// can be read and countered), then plays his hand greedily by the same scoring
// the intent was picked with, which keeps him honest to his word most rounds.

import { CARD_BY_ID } from './cards.js';
import { applyPlay, effAtk, lanePower, legalPlays, other, tideFor } from './engine.js';

function scoreUnitPlay(state, side, def, lane, intentLane) {
  const foe = other(side);
  let score = def.atk * 1.7 + def.hp * 0.9;
  const myPower = lanePower(state, side, lane);
  const foePower = lanePower(state, foe, lane);
  const myCount = state[side].board[lane].length;
  const foeCount = state[foe].board[lane].length;
  if (foeCount === 0) score += 1.6;                       // an empty pier is free pressure
  if (foePower > myPower) score += 2.0;                   // contest a pier we are losing
  if (myCount === 0 && foePower >= 3) score += 2.0;       // plug a breach before it breaks
  const foeBeacon = state[foe].beacons[lane];
  if (foeBeacon > 0 && myPower + def.atk >= foeBeacon) score += 5.0; // a kill is in reach
  const myBeacon = state[side].beacons[lane];
  if (myBeacon > 0 && myBeacon <= 6 && foePower >= 3) score += 2.5;  // defend a dying beacon
  if (lane === intentLane) score += 2.5;                  // honour the committed plan
  score += state.rng() * 0.35;                            // a little weather in the choice
  return score;
}

function scorePlay(state, side, play, intentLane) {
  const def = CARD_BY_ID.get(play.cardId);
  if (play.type === 'unit') return scoreUnitPlay(state, side, def, play.lane, intentLane);
  const foe = other(side);
  switch (def.effect) {
    case 'surge': {
      const crew = state[side].board[play.lane];
      return crew.length >= 2 ? 1.4 * crew.length + 0.5 * lanePower(state, side, play.lane) : 0;
    }
    case 'squall': {
      let value = 0;
      for (const u of state[foe].board[play.lane]) value += u.hp <= 2 ? 4.2 : 1.6;
      return value;
    }
    case 'repair': {
      const hp = state[side].beacons[play.lane];
      return hp > 0 && hp <= 8 ? Math.min(4, 12 - hp) * 1.15 : 0;
    }
    case 'draw2':
      return state[side].hand.length <= 4 ? 3.2 : 1.4;
    case 'rally':
      return 2.6;
    case 'crosswind': {
      // Worth it only to move crew from a quiet pier into a fight.
      const moving = state[side].board.flatMap((laneUnits, lane) =>
        laneUnits.filter((u) => u.uid === play.targetUid).map(() => lane));
      if (moving.length === 0) return 0;
      const from = moving[0];
      const quiet = state[foe].board[from].length === 0;
      const fight = state[foe].board[play.toLane].length > 0;
      return quiet && fight ? 2.2 : 0;
    }
    default:
      return 0;
  }
}

/**
 * The Admiral commits his plan for this round: the pier he means to strike and
 * the crew he means to send. Called before the player acts; the renderer shows
 * it on a banner, and takeTurn's scoring keeps him to it.
 */
export function commitIntent(state) {
  const side = 'foe';
  const tide = tideFor(state.round);
  let best = null;
  for (const cardId of state.foe.hand) {
    const def = CARD_BY_ID.get(cardId);
    if (def.kind !== 'unit' || def.cost > tide) continue;
    for (let lane = 0; lane < 3; lane++) {
      if (state.foe.board[lane].length >= 3) continue;
      const score = scoreUnitPlay(state, side, def, lane, -1);
      if (best === null || score > best.score) best = { score, lane, cardId };
    }
  }
  if (best === null) {
    // Nothing to send: he will shore up his frailest pier instead.
    let lane = 0;
    for (let i = 1; i < 3; i++) if (state.foe.beacons[i] < state.foe.beacons[lane]) lane = i;
    state.intent = { lane, cardId: null };
  } else {
    state.intent = { lane: best.lane, cardId: best.cardId };
  }
  return state.intent;
}

/** Play the foe's whole hand for this round, best-scoring play first. */
export function takeTurn(state) {
  state.foe.tide = tideFor(state.round);
  return greedyTurn(state, 'foe', state.intent ? state.intent.lane : -1);
}

/**
 * The greedy captain both sides use when nobody is steering: the harness lets
 * two of these fight to prove the match can be won and lost.
 */
export function greedyTurn(state, side, intentLane = -1) {
  const events = [];
  for (let step = 0; step < 10; step++) {
    const plays = legalPlays(state, side);
    if (plays.length === 0) break;
    let best = null;
    for (const play of plays) {
      const score = scorePlay(state, side, play, intentLane);
      if (best === null || score > best.score) best = { score, play };
    }
    if (best === null || best.score < 2.4) break;
    const caused = applyPlay(state, side, best.play);
    if (caused === null) break;
    events.push(...caused);
  }
  return events;
}

/** A single number for how much fight a unit brings, for the rally choice. */
export function unitWeight(state, unit, lane) {
  return effAtk(state, unit, lane) + unit.hp;
}
