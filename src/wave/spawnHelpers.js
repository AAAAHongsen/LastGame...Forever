/** 波次安全生成點 — 避開平台、與玩家保持距離。 */
import { BASE_WIDTH, BASE_HEIGHT, GROUND_SURFACE_Y } from "../config/constants.js";

const MARGIN = 60;
const MIN_PLAYER_DIST = 160;
// 蝙蝠與 flyBoss 生成於 y=260（最高平台下方）至 y≈432。
const FLY_MIN_Y = 260;
const FLY_MAX_Y = BASE_HEIGHT * 0.75;

/** 與 GameScene 平台配置及生成安全檢查共用。 */
export const PLATFORM_ZONES = [
  { x: 180, y: 420, w: 200, h: 30 },
  { x: 470, y: 300, w: 250, h: 30 },
  { x: 730, y: 430, w: 190, h: 30 },
  { x: 930, y: 250, w: 220, h: 30 },
];

/** 使用空中生成點的敵人類型。 */
export const FLYING_ENEMY_TYPES = new Set(["bat", "flyBoss"]);

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
  const ys = [GROUND_SURFACE_Y];
  for (const p of PLATFORM_ZONES) {
    const left = p.x - p.w / 2;
    const right = p.x + p.w / 2;
    if (x < left || x > right) continue;
    // 生成於平台頂面。
    ys.push(p.y - p.h / 2);
  }
  return ys;
}

/** 回傳競技場內分散的 {x,y} 候選格陣列。 */
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
 * 回傳靠近地面／平台表面的安全生成點 {x, y}。
 * 找不到合適候選時退回競技場右側。
 */
export function getSafeSpawnPoint(scene, isFlying = false) {
  const candidates = buildCandidates();
  const MIN_ENEMY_DIST = 90;
  const MIN_GROUND_BOSS_DIST = 150;

  // 洗牌
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const { x, y } of candidates) {
    if (isInsidePlatform(x, y)) continue;
    if (distToPlayers(x, y, scene) < MIN_PLAYER_DIST) continue;
    if (distToActiveEnemies(x, y, scene) < MIN_ENEMY_DIST) continue;
    // 小怪遠離 groundBoss，避免第 5 波堆疊在其上。
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

  // 後備
  return { x: BASE_WIDTH - 80, y: GROUND_SURFACE_Y };
}

/**
 * 產生 `count` 個分散的 {x, y} 生成點陣列。
 * @param {Phaser.Scene} scene 場景
 * @param {number} count 數量
 * @param {boolean} isFlying 是否為飛行單位
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

      // 先決定最終生成點再去重 — 地面敵人會貼齊表面 y，
      // 若比較網格 y 會讓同欄生成堆疊。
      const finalY = isFlying
        ? Phaser.Math.Clamp(y, FLY_MIN_Y, FLY_MAX_Y)
        : Phaser.Utils.Array.GetRandom(getGroundSurfaceCandidates(x));

      const tooClose = used.some((u) => Math.hypot(u.x - x, u.y - finalY) < MIN_BETWEEN);
      if (tooClose) continue;

      picked = { x, y: finalY };
      break;
    }

    if (!picked) {
      // 確定性後備分散，避免生成堆疊。
      const laneRatio = (i + 1) / (count + 1);
      let fallX = Phaser.Math.Clamp(
        MARGIN + laneRatio * (BASE_WIDTH - MARGIN * 2),
        MARGIN,
        BASE_WIDTH - MARGIN
      );
      const fallY = isFlying
        ? (FLY_MIN_Y + FLY_MAX_Y) * 0.5
        : Phaser.Utils.Array.GetRandom(getGroundSurfaceCandidates(fallX));

      // 水平微調直到與既有生成點拉開（次數有上限）。
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
