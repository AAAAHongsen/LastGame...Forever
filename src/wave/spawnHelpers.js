import { BASE_WIDTH, BASE_HEIGHT } from "../config/constants.js";

const MARGIN = 60;
const MIN_PLAYER_DIST = 160;
const GROUND_Y = BASE_HEIGHT - 30;
// Bats and flyBoss spawn between y=260 (below the highest platform) and y=~432.
// This keeps them reachable from lower platforms without jumping to the ceiling.
const FLY_MIN_Y = 260;
const FLY_MAX_Y = BASE_HEIGHT * 0.75;
const PLATFORM_ZONES = [
  { x: 180, y: 420, w: 200, h: 30 },
  { x: 470, y: 300, w: 250, h: 30 },
  { x: 730, y: 430, w: 190, h: 30 },
  { x: 930, y: 250, w: 220, h: 30 },
];

const SPAWN_COLS = 5;
const SPAWN_ROWS = 3;

function isInsidePlatform(x, y) {
  for (const p of PLATFORM_ZONES) {
    const left  = p.x - p.w / 2 - 20;
    const right = p.x + p.w / 2 + 20;
    const top   = p.y - p.h;
    const bot   = p.y + p.h;
    if (x >= left && x <= right && y >= top && y <= bot) return true;
  }
  return false;
}

function distToPlayers(x, y, scene) {
  let minDist = Infinity;
  for (const p of scene.players ?? []) {
    if (!p?.sprite) continue;
    const dx = p.sprite.x - x;
    const dy = p.sprite.y - y;
    minDist = Math.min(minDist, Math.hypot(dx, dy));
  }
  return minDist;
}

function distToActiveEnemies(x, y, scene) {
  let minDist = Infinity;
  for (const e of scene.enemyManager?.enemies ?? []) {
    if (!e?.sprite?.active || e.dead || e.dying) continue;
    const ex = Number(e.sprite.x);
    const ey = Number(e.sprite.y);
    if (!Number.isFinite(ex) || !Number.isFinite(ey)) continue;
    minDist = Math.min(minDist, Math.hypot(ex - x, ey - y));
  }
  return minDist;
}

function getGroundSurfaceCandidates(x) {
  const ys = [GROUND_Y];
  for (const p of PLATFORM_ZONES) {
    const left = p.x - p.w / 2;
    const right = p.x + p.w / 2;
    if (x < left || x > right) continue;
    // Spawn on the top face of the platform.
    ys.push(p.y - p.h / 2);
  }
  return ys;
}

/** Returns an array of {x,y} candidate cells spread across the arena. */
function buildCandidates() {
  const cols = SPAWN_COLS;
  const rows = SPAWN_ROWS;
  const xStep = (BASE_WIDTH  - MARGIN * 2) / (cols - 1);
  const yStep = (BASE_HEIGHT - MARGIN * 2 - 60) / (rows - 1);

  const out = [];
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      out.push({
        x: MARGIN + c * xStep,
        y: MARGIN + r * yStep,
      });
    }
  }
  return out;
}

/**
 * Returns {x, y} for a safe spawn near the ground/platform surface.
 * Falls back to right side of arena if no good candidate found.
 */
export function getSafeSpawnPoint(scene, isFlying = false) {
  const candidates = buildCandidates();
  const MIN_ENEMY_DIST = 90;
  const MIN_GROUND_BOSS_DIST = 150;

  // Shuffle
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const { x, y } of candidates) {
    if (isInsidePlatform(x, y)) continue;
    if (distToPlayers(x, y, scene) < MIN_PLAYER_DIST) continue;
    if (distToActiveEnemies(x, y, scene) < MIN_ENEMY_DIST) continue;
    // Keep minions away from groundBoss so Wave5 doesn't stack on top of it.
    const nearGroundBoss = (scene.enemyManager?.enemies ?? []).some((e) => {
      if (e?.type !== "groundBoss" || !e?.sprite?.active || e.dead || e.dying) return false;
      return Math.hypot((e.sprite.x ?? 0) - x, (e.sprite.y ?? 0) - y) < MIN_GROUND_BOSS_DIST;
    });
    if (nearGroundBoss) continue;
    if (x < MARGIN || x > BASE_WIDTH - MARGIN) continue;

    const finalY = isFlying
      ? Phaser.Math.Clamp(y, FLY_MIN_Y, FLY_MAX_Y)
      : Phaser.Utils.Array.GetRandom(getGroundSurfaceCandidates(x));

    return { x, y: finalY };
  }

  // Fallback
  return { x: BASE_WIDTH - 80, y: GROUND_Y };
}

/**
 * Produce an array of {x, y} for `count` spawns, spread out.
 * @param {Phaser.Scene} scene
 * @param {number} count
 * @param {boolean} isFlying
 */
export function getSafeSpawnPoints(scene, count, isFlying = false) {
  const used = [];
  const result = [];
  const MIN_BETWEEN = 80;
  const MIN_ENEMY_DIST = 90;
  const MIN_GROUND_BOSS_DIST = 150;

  for (let i = 0; i < count; i += 1) {
    const candidates = buildCandidates();
    for (let j = candidates.length - 1; j > 0; j -= 1) {
      const k = Math.floor(Math.random() * (j + 1));
      [candidates[j], candidates[k]] = [candidates[k], candidates[j]];
    }

    let picked = null;
    for (const { x, y } of candidates) {
      if (isInsidePlatform(x, y)) continue;
      if (distToPlayers(x, y, scene) < MIN_PLAYER_DIST) continue;
      if (distToActiveEnemies(x, y, scene) < MIN_ENEMY_DIST) continue;
      const nearGroundBoss = (scene.enemyManager?.enemies ?? []).some((e) => {
        if (e?.type !== "groundBoss" || !e?.sprite?.active || e.dead || e.dying) return false;
        return Math.hypot((e.sprite.x ?? 0) - x, (e.sprite.y ?? 0) - y) < MIN_GROUND_BOSS_DIST;
      });
      if (nearGroundBoss) continue;
      if (x < MARGIN || x > BASE_WIDTH - MARGIN) continue;

      // Resolve the FINAL spawn point first, then dedup against it — ground
      // enemies snap to the surface y, so comparing the grid y would let two
      // same-column spawns stack on top of each other.
      const finalY = isFlying
        ? Phaser.Math.Clamp(y, FLY_MIN_Y, FLY_MAX_Y)
        : Phaser.Utils.Array.GetRandom(getGroundSurfaceCandidates(x));

      const tooClose = used.some((u) => Math.hypot(u.x - x, u.y - finalY) < MIN_BETWEEN);
      if (tooClose) continue;

      picked = { x, y: finalY };
      break;
    }

    if (!picked) {
      // Deterministic fallback spread to avoid stacked spawns.
      const laneRatio = (i + 1) / (count + 1);
      let fallX = Phaser.Math.Clamp(
        MARGIN + laneRatio * (BASE_WIDTH - MARGIN * 2),
        MARGIN,
        BASE_WIDTH - MARGIN
      );
      const fallY = isFlying
        ? (FLY_MIN_Y + FLY_MAX_Y) * 0.5
        : Phaser.Utils.Array.GetRandom(getGroundSurfaceCandidates(fallX));

      // Nudge horizontally until clear of existing spawns (bounded attempts).
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const clash = used.some((u) => Math.hypot(u.x - fallX, u.y - fallY) < MIN_BETWEEN);
        if (!clash) break;
        fallX = Phaser.Math.Clamp(fallX + MIN_BETWEEN, MARGIN, BASE_WIDTH - MARGIN);
      }

      picked = { x: fallX, y: fallY };
    }

    used.push(picked);
    result.push(picked);
  }

  return result;
}
