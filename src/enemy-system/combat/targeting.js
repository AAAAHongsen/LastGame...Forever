/** 玩家／敵人查詢 — 最近目標、距離與 sprite 對應。 */

/** 場景中所有具 sprite 的玩家 entry。 */
export function getPlayers(scene) {
  return (scene.players ?? []).filter((p) => p?.sprite);
}

/** 距 fromSprite 最近的玩家 entry；無玩家時回傳 null。 */
export function getNearestPlayer(scene, fromSprite) {
  const ps = getPlayers(scene);
  if (!fromSprite || ps.length === 0) return null;
  let best = null;
  let bestD2 = Infinity;
  for (const p of ps) {
    const dx = (p.sprite.x ?? 0) - fromSprite.x;
    const dy = (p.sprite.y ?? 0) - fromSprite.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = p;
    }
  }
  return best;
}

/** 玩家 entry 的視覺 sprite（visual 優先，否則 body sprite）。 */
export function getPlayerVisual(entry) {
  return entry?.visual ?? entry?.sprite;
}

/** sprite 與玩家 entry 之間的歐氏距離；缺 sprite 時為 Infinity。 */
export function distanceToPlayer(sprite, playerEntry) {
  if (!sprite || !playerEntry?.sprite) return Infinity;
  return Phaser.Math.Distance.Between(sprite.x, sprite.y, playerEntry.sprite.x, playerEntry.sprite.y);
}

/** 依 type 在 enemyManager 中尋找第一個敵人 entry。 */
export function findEnemyByType(scene, type) {
  return (scene.enemyManager?.enemies ?? []).find((e) => e?.type === type) ?? null;
}

/** 依 sprite 參考在 enemyManager 中尋找對應敵人 entry。 */
export function findEnemyBySprite(scene, sprite) {
  if (!sprite) return null;
  return (
    (scene.enemyManager?.enemies ?? []).find(
      (e) => e?.sprite === sprite || e?.visual === sprite
    ) ?? null
  );
}
