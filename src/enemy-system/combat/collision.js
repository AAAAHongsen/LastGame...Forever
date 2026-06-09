/** Phaser overlap callbacks may pass (player, proj) or (proj, player). */
export function pickGroupMember(group, a, b) {
  if (!group) return null;
  if (group.contains?.(a)) return a;
  if (group.contains?.(b)) return b;
  return null;
}

/** Arcade physics body AABB (world space). */
export function getArcadeBodyRect(sprite) {
  const b = sprite?.body;
  if (!b) return null;
  return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
}

/** True when physics bodies overlap (not display texture bounds). */
export function arcadeBodiesOverlap(spriteA, spriteB) {
  const ra = getArcadeBodyRect(spriteA);
  const rb = getArcadeBodyRect(spriteB);
  if (!ra || !rb || !spriteA?.active || !spriteB?.active) return false;
  return Phaser.Geom.Rectangle.Overlaps(ra, rb);
}

/** Horizontal separation between two bodies; 0 if overlapping. */
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
 * Display-bounds overlap (full frame — can be much larger than physics body).
 * Prefer arcadeBodiesOverlap / skeletonHitbox for melee damage.
 */
export function spriteBoundsHit(a, b) {
  if (!a?.active || !b?.active) return false;
  const ra = a.getBounds();
  const rb = b.getBounds();
  return Phaser.Geom.Rectangle.Overlaps(ra, rb);
}
