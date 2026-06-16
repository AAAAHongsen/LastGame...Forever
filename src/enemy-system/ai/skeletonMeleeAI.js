/**
 * 骷髏近戰 AI — 對峙追擊、幀精確武器判定、有效幀傷害。
 * 距離模型：detectRange > chaseRange > attackReach（body 間距）。
 */
import { horizontalBodyGap } from "../combat/collision.js";
import { damagePlayerEntry } from "../combat/damage.js";
import { resolveEnemyAttackDamageFromEntry } from "../../combat-stats/resolveEnemyAttack.js";
import {
  isSkeletonInAttackRange,
  resolveSkeletonAttackReach,
  skeletonHitboxHitsPlayer,
  snapshotSkeletonHitRects,
} from "../combat/skeletonHitbox.js";
import { getNearestPlayer } from "../combat/targeting.js";
import { isSkeletonAttackDebug, skeletonAttackLog } from "../debug/skeletonAttackDebug.js";
import {
  clearAnimationFrameHandler,
  playAnimationOnce,
} from "../helpers/playAnimationOnce.js";
import { ENEMY_STATE, setEnemyState } from "../helpers/stateMachine.js";
import {
  faceMeleeTarget,
  getMeleeDistances,
  handleMeleeRecover,
} from "./meleeCommon.js";

const SKELETON_ATK_HANDLER = "_skeletonAtkFrameHandler";

// ── 設定與移動 ─────────────────────────────────────────────────────────

function getSkeletonMeleeConfig(cfg) {
  const melee = cfg.melee ?? {};
  const stats = cfg.stats ?? {};
  return {
    activeFrames: melee.activeFrames ?? [3, 4, 5, 6],
    hitbox: melee.hitbox ?? { width: 32, height: 26, forwardPad: 0, offsetY: -4 },
    attackSlack: melee.attackSlack ?? 6,
    standoffPx: melee.standoffPx ?? 25,
    standoffTolerance: melee.standoffTolerance ?? 8,
    recovery: melee.recovery ?? 0,
    chaseSpeed: stats.chaseSpeed ?? melee.chaseSpeed ?? 85,
    detectRange: stats.detectRange ?? 400,
    chaseRange: stats.chaseRange ?? 280,
    attackReach: resolveSkeletonAttackReach(melee),
  };
}

function stopSkeletonMotion(sprite) {
  if (sprite?.body) sprite.setVelocityX(0);
}

function returnSkeletonToIdle(enemy, sprite, idleKey) {
  setEnemyState(enemy, ENEMY_STATE.IDLE);
  enemy.stateData.chaseCommitted = false;
  stopSkeletonMotion(sprite);
  if (sprite.anims.currentAnim?.key !== idleKey) {
    sprite.anims.play(idleKey, true);
  }
}

/**
 * 距離層級：detectRange (400) > chaseRange (280) > attackReach (~38)
 * - detectRange：發現／開始朝玩家移動
 * - chaseRange：玩家曾進入此範圍後才放棄，直到其逃離
 * - attackReach：判定框可命中的 body 間距（來自 hitbox 設定）
 */
function evaluateSkeletonRanges(enemy, detectDist, absDy, meleeCfg, verticalTol) {
  const { detectRange, chaseRange } = meleeCfg;
  const aligned = absDy <= verticalTol;
  const withinDetect = detectDist <= detectRange && aligned;
  const withinChaseBand = detectDist <= chaseRange && aligned;

  if (withinChaseBand) {
    enemy.stateData.chaseCommitted = true;
  }

  let abandonChase = false;
  if (enemy.state === ENEMY_STATE.CHASE) {
    if (!withinDetect) {
      abandonChase = true;
    } else if (!withinChaseBand && enemy.stateData.chaseCommitted) {
      abandonChase = true;
    }
  }

  return { withinDetect, withinChaseBand, abandonChase };
}

// ── 追擊 ───────────────────────────────────────────────────────────────────

function updateSkeletonChase(
  enemy,
  sprite,
  cfg,
  playerSprite,
  idleKey,
  walkKey,
  chaseSpeed,
  standoffPx,
  standoffTolerance
) {
  faceMeleeTarget(enemy, sprite, playerSprite.x, cfg.facing ?? "right-art");

  const bodyGap = horizontalBodyGap(sprite, playerSprite);
  const atStandoff = bodyGap <= standoffPx + standoffTolerance;

  if (atStandoff) {
    stopSkeletonMotion(sprite);
    if (sprite.anims.currentAnim?.key !== idleKey) {
      sprite.anims.play(idleKey, true);
    }
    return;
  }

  const dir = enemy.facingDirection ?? 1;
  sprite.setVelocityX(dir * chaseSpeed);
  if (sprite.anims.currentAnim?.key !== walkKey) {
    sprite.anims.play(walkKey, true);
  }
}

// ── 命中偵測與攻擊序列 ─────────────────────────────────────────

function trySkeletonMeleeHit(scene, enemy, playerEntry, damage, reason) {
  if (enemy.state !== ENEMY_STATE.ATTACK) return false;
  if (!enemy.stateData.canDealDamage) return false;
  if (enemy.stateData.hitApplied) return false;

  const sprite = enemy.sprite;
  const playerSprite = playerEntry?.sprite;
  if (!playerSprite) return false;

  const hitboxCfg = enemy.stateData.hitboxCfg ?? getSkeletonMeleeConfig(enemy.config).hitbox;
  const facingDir = enemy.facingDirection ?? 1;
  const rects = snapshotSkeletonHitRects(sprite, facingDir, playerSprite, hitboxCfg);
  const overlap = skeletonHitboxHitsPlayer(sprite, facingDir, playerSprite, hitboxCfg);

  if (isSkeletonAttackDebug()) {
    skeletonAttackLog("hit-check", {
      reason,
      overlap,
      activeFrame: enemy.stateData.activeFrame,
      canDealDamage: enemy.stateData.canDealDamage,
      facingDirection: facingDir,
      ...rects,
    });
  }

  if (!overlap) return false;

  enemy.stateData.hitApplied = true;
  damagePlayerEntry(scene, playerEntry, damage);
  skeletonAttackLog("damage-applied", {
    reason,
    damage,
    activeFrame: enemy.stateData.activeFrame,
    ...rects,
  });
  return true;
}

function clearSkeletonAttackHandler(sprite, enemy) {
  clearAnimationFrameHandler(sprite, enemy, SKELETON_ATK_HANDLER);
  enemy.stateData.canDealDamage = false;
  enemy.stateData.activeFrame = -1;
}

function bindSkeletonActiveHitFrames(scene, enemy, playerEntry, atkKey, activeFrames, hitboxCfg, damage) {
  const sprite = enemy.sprite;

  const wrapped = (_anim, frame) => {
    if (sprite.anims.currentAnim?.key !== atkKey) return;

    const isActive = activeFrames.includes(frame.index);
    enemy.stateData.canDealDamage = isActive;
    enemy.stateData.activeFrame = frame.index;

    if (!isActive) return;

    trySkeletonMeleeHit(scene, enemy, playerEntry, damage, `active-frame-${frame.index}`);
  };

  clearAnimationFrameHandler(sprite, enemy, SKELETON_ATK_HANDLER);
  enemy[SKELETON_ATK_HANDLER] = wrapped;
  sprite.on("animationupdate", wrapped);
}

function beginSkeletonAttack(scene, enemy, playerEntry, { atkKey, idleKey, recovery, cooldown, now, activeFrames, hitboxCfg }) {
  const sprite = enemy.sprite;
  const damage = resolveEnemyAttackDamageFromEntry(enemy);

  stopSkeletonMotion(sprite);

  setEnemyState(enemy, ENEMY_STATE.ATTACK, {
    hitApplied: false,
    canDealDamage: false,
    activeFrame: -1,
    hitboxCfg,
    nextAtk: now + cooldown,
  });

  skeletonAttackLog("attack-start", {
    atkKey,
    activeFrames,
    hitboxCfg,
    bodyGap: horizontalBodyGap(sprite, playerEntry?.sprite),
    facingDirection: enemy.facingDirection,
    ...snapshotSkeletonHitRects(sprite, enemy.facingDirection ?? 1, playerEntry?.sprite, hitboxCfg),
  });

  bindSkeletonActiveHitFrames(scene, enemy, playerEntry, atkKey, activeFrames, hitboxCfg, damage);
  playAnimationOnce(sprite, atkKey).then(() => {
    if (!sprite.active) return;
    clearSkeletonAttackHandler(sprite, enemy);

    if (recovery > 0) {
      setEnemyState(enemy, ENEMY_STATE.RECOVER, {
        recoveryUntil: (scene.time?.now ?? Date.now()) + recovery,
      });
    } else {
      setEnemyState(enemy, ENEMY_STATE.IDLE);
    }
    stopSkeletonMotion(sprite);
    if (sprite.active) sprite.anims.play(idleKey, true);
  });
}

function handleSkeletonAttackHit(scene, enemy, playerEntry, damage) {
  if (enemy.state !== ENEMY_STATE.ATTACK) return false;
  if (!enemy.stateData.canDealDamage) return true;
  if (enemy.stateData.hitApplied) return true;

  trySkeletonMeleeHit(scene, enemy, playerEntry, damage, "attack-update");
  return true;
}

// ── 主 update 迴圈 ────────────────────────────────────────────────────────

export function updateSkeletonMeleeAI(scene, enemy, now) {
  const sprite = enemy.sprite;
  const cfg = enemy.config;
  if (!sprite?.active) return;

  const stats = cfg.stats ?? {};
  const meleeCfg = getSkeletonMeleeConfig(cfg);
  const player = getNearestPlayer(scene, sprite);
  if (!player?.sprite) return;

  const idleKey = cfg.idle;
  const walkKey = cfg.walk ?? "test-skeleton-walk";
  const atkKey = cfg.attack;
  const verticalTol = stats.verticalTolerance ?? 40;

  if (handleMeleeRecover(enemy, sprite, idleKey, now)) {
    stopSkeletonMotion(sprite);
    return;
  }
  if (handleSkeletonAttackHit(scene, enemy, player, resolveEnemyAttackDamageFromEntry(enemy))) return;

  if (enemy.state === ENEMY_STATE.ATTACK) return;

  const { absDy, detectDist } = getMeleeDistances(sprite, player.sprite, stats);
  const bodyGap = horizontalBodyGap(sprite, player.sprite);
  const ranges = evaluateSkeletonRanges(enemy, detectDist, absDy, meleeCfg, verticalTol);
  const canAttack =
    enemy.state === ENEMY_STATE.CHASE &&
    isSkeletonInAttackRange(enemy, player.sprite, meleeCfg) &&
    now >= (enemy.stateData.nextAtk ?? 0);

  if (isSkeletonAttackDebug() && enemy.state !== ENEMY_STATE.RECOVER) {
    skeletonAttackLog("range-check", {
      state: enemy.state,
      detectDist,
      detectRange: meleeCfg.detectRange,
      chaseRange: meleeCfg.chaseRange,
      attackReach: meleeCfg.attackReach,
      standoffPx: meleeCfg.standoffPx,
      bodyGap,
      canAttack,
      chaseCommitted: enemy.stateData.chaseCommitted,
      ...ranges,
    });
  }

  if (!ranges.withinDetect) {
    if (enemy.state !== ENEMY_STATE.IDLE) {
      skeletonAttackLog("detect-lost", { detectDist, detectRange: meleeCfg.detectRange });
      returnSkeletonToIdle(enemy, sprite, idleKey);
    }
    return;
  }

  if (ranges.abandonChase) {
    skeletonAttackLog("chase-lost", {
      detectDist,
      chaseRange: meleeCfg.chaseRange,
      chaseCommitted: enemy.stateData.chaseCommitted,
    });
    returnSkeletonToIdle(enemy, sprite, idleKey);
    return;
  }

  if (canAttack) {
    skeletonAttackLog("attack-trigger", {
      bodyGap,
      attackReach: meleeCfg.attackReach,
      state: enemy.state,
    });
    beginSkeletonAttack(scene, enemy, player, {
      atkKey,
      idleKey,
      recovery: meleeCfg.recovery,
      cooldown: stats.cooldown ?? 2000,
      now,
      activeFrames: meleeCfg.activeFrames,
      hitboxCfg: meleeCfg.hitbox,
    });
    return;
  }

  if (enemy.state !== ENEMY_STATE.RECOVER) {
    if (enemy.state !== ENEMY_STATE.CHASE) {
      setEnemyState(enemy, ENEMY_STATE.CHASE, { chaseCommitted: enemy.stateData.chaseCommitted ?? false });
      skeletonAttackLog("chase-start", { detectDist, bodyGap, attackReach: meleeCfg.attackReach });
    }
    updateSkeletonChase(
      enemy,
      sprite,
      cfg,
      player.sprite,
      idleKey,
      walkKey,
      meleeCfg.chaseSpeed,
      meleeCfg.standoffPx,
      meleeCfg.standoffTolerance
    );
  }
}
