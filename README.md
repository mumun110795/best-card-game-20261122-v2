# BREAKWATER — The Three-Pier Card War

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/mumun110795/best-card-game-20261122-v2/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/mumun110795/best-card-game-20261122-v2/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

# the best card game

BREAKWATER is a lane-based card battler for one player, played entirely in the browser from `game/index.html` — no build step, no network. You are the Lantern Keeper defending Gloaming Bay against Captain Morvane, the Drowned Admiral. Three piers — Lantern Pier, Market Quay, Breakwater Point — each hold a 12-HP beacon per side: fell two of his three beacons to win (14-round cap, then tiebreaks). Each round your Tide grows (3→9); deploy crew and play tactics, then sound the battle: crews clash front-to-back per pier and the unopposed burn the enemy beacon. Morvane declares his intent — lane and card — before you play, so every round is a read-and-counter decision. Combos: Bond (a same-house pair in a pier: both +1 ATK/+1 max HP), Resonance (3+ houses on your board: all crew +1 ATK), plus card synergies — Blaze, Mend, First Strike, Thorns, Drain, Slip, Arrive-draw. A 19-card catalogue, 30-card decks, and four houses told apart by colour AND glyph (Ember ▲ orange / Tide ● blue / Thorn ◆ green / Gloom ☾ purple).

## Files

- `game/` — the game itself: index.html, styles, and one-job-each modules (rng, cards, engine, ai, art, render, anim, shots, main).
- `screenshots/` — four real renders of the running game: title, a round-6 battle, victory, defeat.
- `main.ts` — the hand-in program: copies game/ and screenshots/ to the output directory and writes the dossier.
- `vendor/makefun-game.ts` — the kit's dossier library, kept as shipped.

---

<sub>Entered on [make.fun](https://make.fun/?ref=vdsf53gd&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
