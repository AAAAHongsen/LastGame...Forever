/** 近戰揮砍前進速度（px/ms），與蘑菇衝刺節奏一致。 */
export const MELEE_SWIPE_PX_PER_MS = 20 / 90;

/** 蘑菇攻擊動畫長度（10 幀 @ 14fps）。 */
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

/** 開始衝刺前最大水平距離；等於衝刺後餘距 + 衝刺位移。 */
export function resolveMushroomEngageRange(cfg) {
  const melee = cfg.melee ?? {};
  const lungePx = melee.lungePx ?? melee.lunge ?? 20;
  const postLungeSlack = melee.engageSlack ?? 90;
  return lungePx + postLungeSlack;
}

/** 骷髏使用自身動畫長度，再將範圍縮為一半。 */
export function resolveSkeletonAttackRange(scene, cfg) {
  const full = resolveAttackRangeFromAnim(scene, cfg);
  const scale = cfg.stats?.attackRangeScale ?? 0.5;
  return Math.max(1, Math.round(full * scale));
}
