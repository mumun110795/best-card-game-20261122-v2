// Breakwater — hand-in program.
//
// The game itself is the static site in game/ (open game/index.html in a
// browser and play; it needs no build and no network). This program's whole
// job is to carry that site, plus the maker's screenshots/, into the output
// directory and to write the dossier the judge reads, using the vendored
// make.fun library so the bytes match what the scorer rebuilds.
//
// Run it the way the grader does, or locally with an override:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outRoot = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The output root is a mounted volume in the grader: create it if it is
// missing, but never remove it or anything above the folders we own.
mkdirSync(outRoot, { recursive: true });

// Carry the two payloads across, folder for folder, exactly as they sit.
cpSync(join(repoRoot, 'game'), join(outRoot, 'game'), { recursive: true });
mkdirSync(join(outRoot, 'screenshots'), { recursive: true });
const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outRoot, 'screenshots'), { recursive: true });
}

// The dossier, built with the scorer's own caps: the text budget shapes the
// bytes, the rest make this program refuse anything the scorer would refuse
// (too many screenshots or game files, an oversized file, an overlong path).
const dossier = buildDossier(outRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outRoot, 'dossier.json'), dossier);

console.log(`Breakwater handed in to ${outRoot} (dossier ${dossier.length} bytes)`);
