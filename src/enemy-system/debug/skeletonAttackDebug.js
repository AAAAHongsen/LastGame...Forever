/** Enable: `enemyDebug.skeletonTrace(true)` or `window.__skeletonAttackDebug = true` */
export function isSkeletonAttackDebug() {
  return typeof window !== "undefined" && Boolean(window.__skeletonAttackDebug);
}

export function skeletonAttackLog(phase, payload) {
  if (!isSkeletonAttackDebug()) return;
  // eslint-disable-next-line no-console
  console.log(`[skeleton-attack] ${phase}`, payload);
}
