import { getEnemyBaseStats } from "./config/enemyBaseStats.js";
import { getCombatScaling } from "./config/scaling.js";

/**
 * enemyHp = baseHp × difficultyMultiplier × stageMultiplier
 * @param {string} type
 * @param {object} config — ENEMY_TYPES entry
 * @param {Phaser.Scene} scene
 */
export function resolveEnemyMaxHp(type, config, scene) {
  const stats = config?.stats ?? {};
  const typeDefaults = getEnemyBaseStats(type);
  const baseHp = stats.baseHp ?? stats.hp ?? typeDefaults.baseHp ?? 1;
  const { difficultyMultiplier, stageMultiplier } = getCombatScaling(scene);
  return Math.max(1, Math.round(baseHp * difficultyMultiplier * stageMultiplier));
}

export function resolveEnemyDropTableId(enemy) {
  if (enemy?.drops) return enemy.drops;
  const cfg = enemy?.config ?? {};
  if (cfg.drops) return cfg.drops;
  return getEnemyBaseStats(enemy?.type ?? "").drops ?? "normal";
}
