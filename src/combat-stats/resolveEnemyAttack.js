/**
 * 敵人 → 玩家傷害。
 * entry._waveDamage 的波次傷害優先於 registry 數值。
 */
export function resolveEnemyAttackDamage(config) {
  return config?.stats?.damage ?? 6;
}

export function resolveEnemyAttackDamageFromEntry(enemy) {
  if (enemy?._waveDamage != null) return enemy._waveDamage;
  return resolveEnemyAttackDamage(enemy?.config);
}
