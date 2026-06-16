import { getArcadeBodyRect, horizontalBodyGap } from "./collision.js";

/**
 * 向前武器揮砍判定框錨定在骷髏物理 body（非完整 sprite 幀）。
 * @param {Phaser.Physics.Arcade.Sprite} sprite 物理 sprite
 * @param {number} facingDir -1 左，+1 右
 * @param {object} cfg 判定框設定
 * @returns {Phaser.Geom.Rectangle | null} 武器判定矩形或 null
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

/** 向前判定框可命中的最大 body 間距（非偵測／追擊範圍）。 */
export function resolveSkeletonAttackReach(meleeCfg = {}) {
  const hitbox = meleeCfg.hitbox ?? {};
  const width = hitbox.width ?? 32;
  const forwardPad = hitbox.forwardPad ?? 0;
  const slack = meleeCfg.attackSlack ?? 6;
  return width + forwardPad + slack;
}

/** 骷髏揮砍前原地保持的水平 body 間距。 */
export function isSkeletonAtStandoff(sprite, playerSprite, meleeCfg = {}) {
  const gap = horizontalBodyGap(sprite, playerSprite);
  const standoff = meleeCfg.standoffPx ?? 20;
  const tol = meleeCfg.standoffTolerance ?? 8;
  return gap <= standoff + tol;
}

/** 面向玩家且保持對峙距離（body 間距，非原點）時為 true。 */
export function isSkeletonInAttackRange(enemy, playerSprite, meleeCfg) {
  const sprite = enemy?.sprite;
  if (!sprite || !playerSprite) return false;

  const fd = enemy.facingDirection ?? 1;
  const dx = playerSprite.x - sprite.x;
  const inFront = fd > 0 ? dx > -8 : dx < 8;
  if (!inFront) return false;

  return isSkeletonAtStandoff(sprite, playerSprite, meleeCfg);
}

/** 骷髏武器判定框 vs 玩家物理受擊框。 */
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
