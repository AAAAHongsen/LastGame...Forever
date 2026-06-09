/**
 * Enemy → player damage.
 * Wave-specific damage stored on entry._waveDamage takes priority over registry stats.
 */
export function resolveEnemyAttackDamage(config) {
  return config?.stats?.damage ?? 6;
}

export function resolveEnemyAttackDamageFromEntry(enemy) {
  if (enemy?._waveDamage != null) return enemy._waveDamage;
  return resolveEnemyAttackDamage(enemy?.config);
}
