/** Forward speed during melee swipe (px/ms), matched to mushroom lunge pace. */
export const MELEE_SWIPE_PX_PER_MS = 20 / 90;

/** Mushroom attack anim length (10 frames @ 14fps). */
export const MUSHROOM_ATTACK_ANIM_MS = (10 / 14) * 1000;

function resolveAttackRangeFromAnim(scene, cfg, animMsOverride) {
  const stats = cfg.stats ?? {};
  const melee = cfg.melee ?? {};
  if (!stats.attackRangeFromAnimation) {
    return stats.attackRange ?? 88;
  }

  let animMs = animMsOverride;
  if (animMs == null) {
    const atkKey = cfg.attack;
    const anim = atkKey ? scene.anims?.get?.(atkKey) : null;
    const frameCount = anim?.frames?.length ?? 9;
    const frameRate = anim?.frameRate ?? 14;
    animMs = (frameCount / frameRate) * 1000;
  }

  const lunge = melee.lunge ?? 0;
  const engageLead = Math.max(lunge, melee.engageLeadPx ?? 20);
  const swipePxPerMs = melee.attackSwipePxPerMs ?? MELEE_SWIPE_PX_PER_MS;
  const computed = Math.round(engageLead + animMs * swipePxPerMs);
  const floor = stats.attackRange ?? 0;
  return Math.max(floor, computed);
}

/** Max horizontal distance (pre-lunge) to start a lunge; equals post-lunge slack + lunge travel. */
export function resolveMushroomEngageRange(cfg) {
  const melee = cfg.melee ?? {};
  const lungePx = melee.lungePx ?? melee.lunge ?? 20;
  const postLungeSlack = melee.engageSlack ?? 90;
  return lungePx + postLungeSlack;
}

/** Skeleton uses its own anim length, then scales range to half. */
export function resolveSkeletonAttackRange(scene, cfg) {
  const full = resolveAttackRangeFromAnim(scene, cfg);
  const scale = cfg.stats?.attackRangeScale ?? 0.5;
  return Math.max(1, Math.round(full * scale));
}
