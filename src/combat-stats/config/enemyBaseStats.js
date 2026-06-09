/**
 * Canonical base HP / drop table ids per enemy type.
 * Registry stats.baseHp should match; this file is the single reference for tuning.
 */
export const ENEMY_BASE_STATS = Object.freeze({
  mushroom: { baseHp: 5, drops: "normal" },
  skeleton: { baseHp: 20, drops: "normal" },
  bat: { baseHp: 15, drops: "normal" },
  flyBoss: { baseHp: 200, drops: "flyboss" },
  flyBossGround: { baseHp: 200, drops: "flyboss" },
  groundBoss: { baseHp: 500, drops: "gorgon" },
});

export function getEnemyBaseStats(type) {
  return ENEMY_BASE_STATS[type] ?? { baseHp: 1, drops: "normal" };
}
