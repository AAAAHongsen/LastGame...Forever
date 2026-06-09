import { getArcadeBodyRect, horizontalBodyGap } from "./collision.js";

/**
 * Forward weapon swipe hitbox anchored to skeleton physics body (not full sprite frame).
 * @param {Phaser.Physics.Arcade.Sprite} sprite
 * @param {number} facingDir -1 left, +1 right
 * @param {object} cfg
 * @returns {Phaser.Geom.Rectangle | null}
 */
export function getSkeletonAttackHitbox(sprite, facingDir, cfg = {}) {
  const body = getArcadeBodyRect(sprite);
  if (!body) return null;

  const w = cfg.width ?? 32;
  const h = cfg.height ?? 26;
  const forwardPad = cfg.forwardPad ?? 0;
  const offsetY = cfg.offsetY ?? -4;
  const fd = facingDir >= 0 ? 1 : -1;

  const cy = body.top + Math.max(0, (body.height - h) * 0.35) + offsetY;
  const cx = fd > 0 ? body.right + forwardPad : body.left - forwardPad - w;

  return new Phaser.Geom.Rectangle(cx, cy, w, h);
}

/** Max body gap at which a forward hitbox could connect (not detect/chase range). */
export function resolveSkeletonAttackReach(meleeCfg = {}) {
  const hitbox = meleeCfg.hitbox ?? {};
  const width = hitbox.width ?? 32;
  const forwardPad = hitbox.forwardPad ?? 0;
  const slack = meleeCfg.attackSlack ?? 6;
  return width + forwardPad + slack;
}

/** Horizontal body gap where skeleton holds position before swinging. */
export function isSkeletonAtStandoff(sprite, playerSprite, meleeCfg = {}) {
  const gap = horizontalBodyGap(sprite, playerSprite);
  const standoff = meleeCfg.standoffPx ?? 20;
  const tol = meleeCfg.standoffTolerance ?? 8;
  return gap <= standoff + tol;
}

/** True when facing player and held at standoff distance (body gap, not origin). */
export function isSkeletonInAttackRange(enemy, playerSprite, meleeCfg) {
  const sprite = enemy?.sprite;
  if (!sprite || !playerSprite) return false;

  const fd = enemy.facingDirection ?? 1;
  const dx = playerSprite.x - sprite.x;
  const inFront = fd > 0 ? dx > -8 : dx < 8;
  if (!inFront) return false;

  return isSkeletonAtStandoff(sprite, playerSprite, meleeCfg);
}

/** Skeleton weapon hitbox vs player physics hurtbox. */
export function skeletonHitboxHitsPlayer(sprite, facingDir, playerSprite, hitboxCfg) {
  const hit = getSkeletonAttackHitbox(sprite, facingDir, hitboxCfg);
  const hurt = getArcadeBodyRect(playerSprite);
  if (!hit || !hurt || !playerSprite?.active) return false;
  return Phaser.Geom.Rectangle.Overlaps(hit, hurt);
}

export function snapshotSkeletonHitRects(sprite, facingDir, playerSprite, hitboxCfg) {
  const hitbox = getSkeletonAttackHitbox(sprite, facingDir, hitboxCfg);
  const hurtbox = playerSprite ? getArcadeBodyRect(playerSprite) : null;
  return {
    hitbox: hitbox ? { x: hitbox.x, y: hitbox.y, w: hitbox.width, h: hitbox.height } : null,
    hurtbox: hurtbox ? { x: hurtbox.x, y: hurtbox.y, w: hurtbox.width, h: hurtbox.height } : null,
    overlap: hitbox && hurtbox ? Phaser.Geom.Rectangle.Overlaps(hitbox, hurtbox) : false,
  };
}
