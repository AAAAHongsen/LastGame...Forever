/**
 * 各敵人類型的標準基礎 HP／掉落表 id。
 * registry stats.baseHp 應一致；本檔為調參唯一參考。
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
