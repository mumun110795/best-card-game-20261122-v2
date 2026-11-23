// shots.js — the deterministic scenes behind ?shot=title|battle|victory|defeat.
// Each scene builds a real match state with the real engine, arranges it into a
// moment worth photographing, and hands it to the renderer untouched — the
// screenshots are the game itself, staged, never drawn or edited elsewhere.

let shotUid = 900;

function place(state, side, lane, cardId, hp) {
  const unit = { uid: shotUid++, cardId, owner: side, hp, buffHp: 0, tempAtk: 0 };
  state[side].board[lane].push(unit);
  return unit;
}

function clearBoards(state) {
  for (const side of ['you', 'foe']) {
    state[side].board = [[], [], []];
  }
}

/**
 * Arrange `state` (a fresh match) into the named scene. Returns what the
 * controller needs to finish the picture: which screen, and for the battle
 * scene which pair is mid-clash with which floaters to raise.
 */
export function stageShot(name, state) {
  shotUid = 900;
  if (name === 'battle') {
    clearBoards(state);
    state.round = 6;
    state.you.tide = 5;
    state.you.beacons = [8, 12, 5];
    state.foe.beacons = [12, 4, 9];
    state.you.hand = ['roc', 'squall', 'caller', 'repair'];
    state.foe.hand = ['imp', 'monk', 'brute', 'rally'];
    // Lantern Pier: a Tide bond holds against Ember raiders.
    place(state, 'you', 0, 'monk', 3);
    place(state, 'you', 0, 'warden', 4);
    place(state, 'foe', 0, 'lancer', 2);
    place(state, 'foe', 0, 'imp', 1);
    // Market Quay: the Drake meets the Roc over a beacon at 4 HP — the clash.
    const drake = place(state, 'you', 1, 'drake', 3);
    place(state, 'you', 1, 'stowaway', 2);
    const roc = place(state, 'foe', 1, 'roc', 3);
    place(state, 'foe', 1, 'warden', 2);
    // Breakwater Point: the Turtle endures two Gloom blades.
    place(state, 'you', 2, 'turtle', 7);
    place(state, 'foe', 2, 'assassin', 2);
    place(state, 'foe', 2, 'imp', 1);
    state.intent = { lane: 1, cardId: 'drake' };
    return {
      screen: 'table',
      clash: { aUid: drake.uid, bUid: roc.uid },
      floaters: [
        { uid: roc.uid, text: '-4', kind: 'dmg' },
        { uid: drake.uid, text: '-5', kind: 'dmg' },
      ],
      ticker: 'Round 6 — the Cinder Drake meets the Storm Roc over Market Quay!',
    };
  }
  if (name === 'victory') {
    state.over = true;
    state.winner = 'you';
    state.round = 9;
    state.you.beacons = [6, 10, 3];
    state.foe.beacons = [0, 0, 7];
    return { screen: 'end', stats: { crewLost: 5 }, confetti: true };
  }
  if (name === 'defeat') {
    state.over = true;
    state.winner = 'foe';
    state.round = 8;
    state.you.beacons = [0, 4, 0];
    state.foe.beacons = [11, 12, 6];
    return { screen: 'end', stats: { crewLost: 9 }, confetti: false };
  }
  return { screen: 'title' };
}
