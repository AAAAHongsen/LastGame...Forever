export function getPlayers(scene) {
  return (scene.players ?? []).filter((p) => p?.sprite);
}

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

export function getPlayerVisual(entry) {
  return entry?.visual ?? entry?.sprite;
}

export function distanceToPlayer(sprite, playerEntry) {
  if (!sprite || !playerEntry?.sprite) return Infinity;
  return Phaser.Math.Distance.Between(sprite.x, sprite.y, playerEntry.sprite.x, playerEntry.sprite.y);
}

export function findEnemyByType(scene, type) {
  return (scene.enemyManager?.enemies ?? []).find((e) => e?.type === type) ?? null;
}

export function findEnemyBySprite(scene, sprite) {
  if (!sprite) return null;
  return (
    (scene.enemyManager?.enemies ?? []).find(
      (e) => e?.sprite === sprite || e?.visual === sprite
    ) ?? null
  );
}
