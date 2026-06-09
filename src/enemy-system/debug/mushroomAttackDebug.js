/** Enable: `enemyDebug.mushroomTrace(true)` or `window.__mushroomAttackDebug = true` */
export function isMushroomAttackDebug() {
  return typeof window !== "undefined" && Boolean(window.__mushroomAttackDebug);
}

export function mushroomAttackLog(phase, payload) {
  if (!isMushroomAttackDebug()) return;
  // eslint-disable-next-line no-console
  console.log(`[mushroom-attack] ${phase}`, payload);
}
