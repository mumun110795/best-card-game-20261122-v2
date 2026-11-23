// main.js — the controller: boots the game, wires mouse and keyboard, runs the
// turn (your plays, the Admiral's answer, the animated battle) and stages the
// screenshot scenes. All rules live in engine.js; this file only conducts.

import { CARD_BY_ID } from './cards.js';
import {
  advanceRound, applyPlay, legalPlays, newMatch, resolveBattle,
} from './engine.js';
import { commitIntent, takeTurn } from './ai.js';
import { renderEnd, renderTable, renderTitle, setTicker, showScreen, unitEl, beaconEl } from './render.js';
import { confettiBurst, sleep, spawnFloater } from './anim.js';
import { stageShot } from './shots.js';

const stage = document.getElementById('stage');
let state = null;
let phase = 'title'; // 'play' | 'anim' | 'over'
let pending = null;  // the half-made play: { handIndex, cardId, stage, targetUid }
let fresh = new Map(); // uid -> 'deal' | 'flip', for one render only
let stats = { crewLost: 0 };

function fitStage() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
  stage.style.transform = `scale(${s})`;
}
window.addEventListener('resize', fitStage);
fitStage();

function currentView() {
  const view = { armed: null, targetLanes: new Set(), targetUids: new Set(), fresh };
  if (pending) {
    const def = CARD_BY_ID.get(pending.cardId);
    if (pending.stage === 'lane') {
      view.armed = pending.handIndex;
      for (const p of legalPlays(state, 'you')) {
        if (p.handIndex === pending.handIndex && p.lane !== undefined) view.targetLanes.add(p.lane);
      }
    } else if (pending.stage === 'unit') {
      view.armed = pending.handIndex;
      for (const p of legalPlays(state, 'you')) {
        if (p.handIndex === pending.handIndex && p.targetUid !== undefined) view.targetUids.add(p.targetUid);
      }
    } else if (pending.stage === 'unitLane') {
      for (const p of legalPlays(state, 'you')) {
        if (p.handIndex === pending.handIndex && p.targetUid === pending.targetUid && p.toLane !== undefined) {
          view.targetLanes.add(p.toLane);
        }
      }
    }
    void def;
  }
  return view;
}

function render() {
  renderTable(state, currentView());
  document.getElementById('btn-battle').disabled = phase !== 'play';
  fresh = new Map();
}

function startMatch(seed) {
  state = newMatch(seed ?? Math.floor(Math.random() * 1e9));
  stats = { crewLost: 0 };
  pending = null;
  phase = 'play';
  commitIntent(state);
  showScreen('table');
  render();
  setTicker(`Round 1 — the Admiral has declared his intent. Deploy your crew, then sound the battle.`);
}

function describePlay(side, play, events) {
  const def = CARD_BY_ID.get(play.cardId);
  const laneName = ['Lantern Pier', 'Market Quay', 'Breakwater Point'];
  if (play.type === 'unit') return `${side === 'you' ? 'You deploy' : 'Morvane deploys'} ${def.name} to ${laneName[play.lane]}.`;
  return `${side === 'you' ? 'You play' : 'Morvane plays'} ${def.name}.`;
}

function doPlay(play) {
  const events = applyPlay(state, 'you', play);
  if (events === null) return false;
  for (const e of events) {
    if (e.type === 'deploy') fresh.set(e.uid, 'deal');
    if (e.type === 'die' && e.side === 'you') stats.crewLost++;
  }
  pending = null;
  render();
  setTicker(describePlay('you', play, events));
  return true;
}

function onHandClick(index) {
  if (phase !== 'play') return;
  const cardId = state.you.hand[index];
  if (cardId === undefined) return;
  const def = CARD_BY_ID.get(cardId);
  if (pending && pending.handIndex === index) { pending = null; render(); return; }
  pending = null;
  if (def.cost > state.you.tide) {
    setTicker(`Not enough Tide for ${def.name} — it costs ${def.cost}, you hold ${state.you.tide}.`);
    render();
    return;
  }
  if (def.kind === 'unit') {
    pending = { handIndex: index, cardId, stage: 'lane' };
    setTicker(`Choose a pier for ${def.name} — click a lane (or press 1, 2, 3).`);
  } else if (def.effect === 'draw2') {
    doPlay({ type: 'tactic', handIndex: index, cardId });
    return;
  } else if (def.effect === 'rally' || def.effect === 'crosswind') {
    pending = { handIndex: index, cardId, stage: 'unit' };
    setTicker(def.effect === 'rally' ? `Choose one of your crew to rally.` : `Choose one of your crew to blow across.`);
  } else {
    pending = { handIndex: index, cardId, stage: 'lane' };
    setTicker(`Choose the pier for ${def.name}.`);
  }
  render();
}

function onLaneClick(lane) {
  if (phase !== 'play' || !pending) return;
  const { handIndex, cardId } = pending;
  const def = CARD_BY_ID.get(cardId);
  if (pending.stage === 'lane') {
    if (def.kind === 'unit') doPlay({ type: 'unit', handIndex, cardId, lane });
    else doPlay({ type: 'tactic', handIndex, cardId, lane });
  } else if (pending.stage === 'unitLane') {
    doPlay({ type: 'tactic', handIndex, cardId, targetUid: pending.targetUid, toLane: lane });
  }
}

function onUnitClick(uid) {
  if (phase !== 'play' || !pending || pending.stage !== 'unit') return;
  const def = CARD_BY_ID.get(pending.cardId);
  if (def.effect === 'rally') {
    doPlay({ type: 'tactic', handIndex: pending.handIndex, cardId: pending.cardId, targetUid: uid });
  } else if (def.effect === 'crosswind') {
    pending = { ...pending, stage: 'unitLane', targetUid: uid };
    setTicker('Now choose the neighbouring pier.');
    render();
  }
}

async function runBattle() {
  if (phase !== 'play' || !state || state.over) return;
  phase = 'anim';
  pending = null;
  render();

  // The Admiral answers.
  const before = new Set();
  for (const lane of state.foe.board) for (const u of lane) before.add(u.uid);
  const foeEvents = takeTurn(state);
  for (const lane of state.foe.board) {
    for (const u of lane) if (!before.has(u.uid)) fresh.set(u.uid, 'flip');
  }
  const foePlays = foeEvents.filter((e) => e.type === 'play');
  render();
  if (foePlays.length > 0) {
    const last = foePlays[foePlays.length - 1];
    setTicker(`Morvane answers with ${foePlays.length} play${foePlays.length > 1 ? 's' : ''} — last, ${CARD_BY_ID.get(last.cardId).name}.`);
  } else {
    setTicker('Morvane holds his hand and watches you.');
  }
  await sleep(750);

  // The battle itself, replayed event by event over the final state.
  const events = resolveBattle(state);
  for (const e of events) {
    if (e.type === 'clash') {
      const a = unitEl(e.aUid);
      const b = unitEl(e.bUid);
      if (a) a.classList.add('clash-you');
      if (b) b.classList.add('clash-foe');
      if (e.bDmg > 0) spawnFloater(a, `-${e.bDmg}`, 'dmg');
      if (e.aDmg > 0) spawnFloater(b, `-${e.aDmg}`, 'dmg');
      await sleep(430);
    } else if (e.type === 'strike') {
      const el = unitEl(e.uid);
      if (el) el.classList.add(e.side === 'you' ? 'clash-you' : 'clash-foe');
      await sleep(200);
    } else if (e.type === 'beacon-hit') {
      const el = beaconEl(e.side, e.lane);
      if (el) {
        el.classList.add('hit');
        spawnFloater(el, `-${e.dmg}`, 'dmg');
        const bar = el.querySelector('.hpbar i');
        if (bar) bar.style.width = `${Math.round((e.left / 12) * 100)}%`;
        const num = el.querySelector('.hp-num');
        if (num) num.textContent = e.left <= 0 ? '☠ FALLEN' : `${e.left} / 12`;
      }
      await sleep(320);
    } else if (e.type === 'beacon-down') {
      const el = beaconEl(e.side, e.lane);
      if (el) spawnFloater(el, 'BEACON FALLEN!', 'info');
      setTicker(e.side === 'foe' ? 'One of Morvane’s beacons goes dark!' : 'One of your beacons has fallen!');
      await sleep(380);
    } else if (e.type === 'beacon-heal') {
      const el = beaconEl(e.side, e.lane);
      if (el) spawnFloater(el, `+${e.amount} HP`, 'heal');
    } else if (e.type === 'die') {
      const el = unitEl(e.uid);
      if (el) el.classList.add('dying');
      if (e.side === 'you') stats.crewLost++;
      await sleep(120);
    }
  }
  await sleep(420);

  if (state.over) {
    phase = 'over';
    renderEnd(state, stats);
    showScreen('end');
    if (state.winner === 'you') confettiBurst(80);
    return;
  }
  advanceRound(state);
  commitIntent(state);
  phase = 'play';
  render();
  setTicker(`Round ${state.round} — Morvane's intent is declared above. The tide brings you to ${state.you.tide}.`);
}

// ───────────────────────── wiring ─────────────────────────
document.getElementById('btn-start').addEventListener('click', () => startMatch());
document.getElementById('btn-again').addEventListener('click', () => startMatch());
document.getElementById('btn-battle').addEventListener('click', runBattle);
document.getElementById('hand').addEventListener('click', (ev) => {
  const card = ev.target.closest('[data-hand-index]');
  if (card) onHandClick(Number(card.dataset.handIndex));
});
document.getElementById('lanes').addEventListener('click', (ev) => {
  const unit = ev.target.closest('[data-uid]');
  if (unit) { onUnitClick(Number(unit.dataset.uid)); return; }
  const lane = ev.target.closest('.lane');
  if (lane) onLaneClick(Number(lane.dataset.lane));
});
document.addEventListener('keydown', (ev) => {
  if (phase === 'play') {
    if (ev.key === '1' || ev.key === '2' || ev.key === '3') onLaneClick(Number(ev.key) - 1);
    else if (ev.key === 'Enter') runBattle();
    else if (ev.key === 'Escape') { pending = null; render(); }
  }
});

// ───────────────────────── boot / screenshot scenes ─────────────────────────
renderTitle();
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  stage.classList.add('shot-mode');
  state = newMatch(7);
  const scene = stageShot(shot, state);
  if (scene.screen === 'title') {
    showScreen('title');
  } else if (scene.screen === 'table') {
    phase = 'play';
    showScreen('table');
    render();
    if (scene.ticker) setTicker(scene.ticker);
    setTimeout(() => {
      if (scene.clash) {
        const a = unitEl(scene.clash.aUid);
        const b = unitEl(scene.clash.bUid);
        if (a) a.classList.add('clash-you');
        if (b) b.classList.add('clash-foe');
      }
      for (const f of scene.floaters ?? []) {
        const el = unitEl(f.uid);
        if (el) spawnFloater(el, f.text, f.kind);
      }
    }, 480);
  } else {
    renderEnd(state, scene.stats ?? { crewLost: 0 });
    showScreen('end');
    if (scene.confetti) confettiBurst(80);
  }
  setTimeout(() => { window.__shotReady = true; }, 300);
} else {
  showScreen('title');
}
