/** Phaser overlap 回呼可能傳 (player, proj) 或 (proj, player)。 */
export function pickGroupMember(group, a, b) {
  if (!group) return null;
  if (group.contains?.(a)) return a;
  if (group.contains?.(b)) return b;
  return null;
}

/** Arcade 物理 body AABB（世界座標）。 */
export function getArcadeBodyRect(sprite) {
  const b = sprite?.body;
  if (!b) return null;
  return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
}

/** 物理 body 重疊時為 true（非顯示貼圖 bounds）。 */
export function arcadeBodiesOverlap(spriteA, spriteB) {
  const ra = getArcadeBodyRect(spriteA);
  const rb = getArcadeBodyRect(spriteB);
  if (!ra || !rb || !spriteA?.active || !spriteB?.active) return false;
  return Phaser.Geom.Rectangle.Overlaps(ra, rb);
}

/** 兩 body 水平間距；重疊時為 0。 */
export function horizontalBodyGap(spriteA, spriteB) {
  const ra = getArcadeBodyRect(spriteA);
  const rb = getArcadeBodyRect(spriteB);
  if (!ra || !rb) return Infinity;
  if (Phaser.Geom.Rectangle.Overlaps(ra, rb)) return 0;
  if (ra.right <= rb.left) return rb.left - ra.right;
  if (rb.right <= ra.left) return ra.left - rb.right;
  return 0;
}

/**
 * 顯示 bounds 重疊（完整幀 — 可能遠大於物理 body）。
 * 近戰傷害請優先 arcadeBodiesOverlap / skeletonHitbox。
 */
export function spriteBoundsHit(a, b) {
  if (!a?.active || !b?.active) return false;
  const ra = a.getBounds();
  const rb = b.getBounds();
  return Phaser.Geom.Rectangle.Overlaps(ra, rb);
}
