import {
  arcadeBodiesOverlap,
  getArcadeBodyRect,
  horizontalBodyGap,
  spriteBoundsHit,
} from "../combat/collision.js";
import { damagePlayerEntry } from "../combat/damage.js";
import { resolveEnemyAttackDamageFromEntry } from "../../combat-stats/resolveEnemyAttack.js";
import { getNearestPlayer } from "../combat/targeting.js";
import { ENEMY_STATE } from "../constants.js";
import { isMushroomAttackDebug, mushroomAttackLog } from "../debug/mushroomAttackDebug.js";
import { meleeLunge } from "../helpers/meleeLunge.js";
import { playAnimationOnce } from "../helpers/playAnimationOnce.js";
import { setEnemyState } from "../helpers/stateMachine.js";
import {
  faceMeleeTarget,
  getMeleeDistances,
  handleMeleeRecover,
} from "./meleeCommon.js";

function getAnimDurationMs(scene, key) {
  const anim = key ? scene.anims?.get?.(key) : null;
  if (!anim?.frames?.length) return 500;
  return (anim.frames.length / (anim.frameRate || 12)) * 1000;
}

function snapshotCombatPositions(enemySprite, playerSprite) {
  const eb = getArcadeBodyRect(enemySprite);
  const pb = playerSprite ? getArcadeBodyRect(playerSprite) : null;
  return {
    enemyOrigin: { x: enemySprite.x, y: enemySprite.y },
    enemyBody: eb ? { x: eb.x, y: eb.y, w: eb.width, h: eb.height } : null,
    playerOrigin: playerSprite ? { x: playerSprite.x, y: playerSprite.y } : null,
    playerBody: pb ? { x: pb.x, y: pb.y, w: pb.width, h: pb.height } : null,
    bodyGap: playerSprite ? horizontalBodyGap(enemySprite, playerSprite) : null,
  };
}

/** Uses facingDirection (set by faceMeleeTarget), NOT flipX — left-default flipX breaks playerInFront. */
function isPlayerInMushroomFacing(enemy, playerSprite, margin = 4) {
  const dx = playerSprite.x - enemy.sprite.x;
  const fd = enemy.facingDirection ?? 1;
  return fd > 0 ? dx > -margin : dx < margin;
}

function tryMushroomMeleeHit(scene, enemy, playerEntry, damage, reason) {
  const sprite = enemy.sprite;
  const playerSprite = playerEntry?.sprite;
  if (!playerSprite) return false;

  const bodyHit = arcadeBodiesOverlap(sprite, playerSprite);
  const boundsHit = spriteBoundsHit(sprite, playerSprite);

  if (isMushroomAttackDebug()) {
    mushroomAttackLog("hit-check", {
      reason,
      state: enemy.state,
      lungeComplete: enemy.stateData.lungeComplete,
      bodyHit,
      boundsHit,
      hitApplied: enemy.stateData.hitApplied,
      ...snapshotCombatPositions(sprite, playerSprite),
    });
  }

  if (!bodyHit) return false;

  enemy.stateData.hitApplied = true;
  damagePlayerEntry(scene, playerEntry, damage);
  mushroomAttackLog("damage-applied", { reason, damage, ...snapshotCombatPositions(sprite, playerSprite) });
  return true;
}

/** Damage only after lunge; physics body overlap required (ignores oversized display bounds). */
function handleMushroomAttackHit(scene, enemy, playerEntry, damage) {
  if (enemy.state !== ENEMY_STATE.ATTACK) return false;
  if (!enemy.stateData.lungeComplete) return true;
  if (enemy.stateData.hitApplied) return true;

  tryMushroomMeleeHit(scene, enemy, playerEntry, damage, "attack-frame");
  return true;
}

function canMushroomEngage({ enemy, playerSprite, absDy, lungePx, engageSlack, now }) {
  const sprite = enemy.sprite;
  const verticalTol = enemy.config?.stats?.verticalTolerance ?? 40;

  if (!isPlayerInMushroomFacing(enemy, playerSprite)) {
    return { ok: false, why: "not-in-facing", bodyGap: horizontalBodyGap(sprite, playerSprite) };
  }
  if (absDy > verticalTol) {
    return { ok: false, why: "vertical", bodyGap: horizontalBodyGap(sprite, playerSprite) };
  }
  if (now < (enemy.stateData.nextAtk ?? 0)) {
    return { ok: false, why: "cooldown", bodyGap: horizontalBodyGap(sprite, playerSprite) };
  }

  const bodyGap = horizontalBodyGap(sprite, playerSprite);
  const postLungeGap = Math.max(0, bodyGap - lungePx);
  if (postLungeGap > engageSlack) {
    return { ok: false, why: "post-lunge-gap", bodyGap, postLungeGap, engageSlack, lungePx };
  }

  return { ok: true, bodyGap, postLungeGap, engageSlack, lungePx };
}

function beginMushroomLungeThenAttack(
  scene,
  enemy,
  playerEntry,
  { lungeKey, atkKey, idleKey, lungePx, lungeMs, recovery, cooldown, now }
) {
  const sprite = enemy.sprite;
  const playerSprite = playerEntry?.sprite;

  const lungeStart = snapshotCombatPositions(sprite, playerSprite);
  enemy.stateData._lungeStartX = sprite.x;
  enemy.stateData._lungeStartY = sprite.y;

  setEnemyState(enemy, ENEMY_STATE.LUNGE, {
    hitApplied: false,
    lungeComplete: false,
    nextAtk: now + cooldown,
  });

  mushroomAttackLog("lunge-start", {
    lungePx,
    lungeMs,
    facingDirection: enemy.facingDirection,
    ...lungeStart,
  });

  const dir = enemy.facingDirection || 1;
  const lungeMove = meleeLunge(scene, sprite, lungePx, lungeMs, dir);
  const lungeAnim = playAnimationOnce(sprite, lungeKey);

  Promise.all([lungeMove, lungeAnim]).then(() => {
    if (!sprite.active || enemy.state !== ENEMY_STATE.LUNGE) {
      mushroomAttackLog("lunge-aborted", { state: enemy.state, active: sprite.active });
      return;
    }

    const lungeEnd = snapshotCombatPositions(sprite, playerSprite);
    mushroomAttackLog("lunge-end", {
      lungeStartX: enemy.stateData._lungeStartX,
      lungeStartY: enemy.stateData._lungeStartY,
      deltaX: sprite.x - (enemy.stateData._lungeStartX ?? sprite.x),
      ...lungeEnd,
    });

    setEnemyState(enemy, ENEMY_STATE.ATTACK, {
      hitApplied: false,
      lungeComplete: true,
    });

    mushroomAttackLog("attack-state-enter", {
      timing: "after-lunge-promise",
      ...snapshotCombatPositions(sprite, playerSprite),
    });

    const damage = resolveEnemyAttackDamageFromEntry(enemy);
    tryMushroomMeleeHit(scene, enemy, playerEntry, damage, "lunge-end-immediate");

    playAnimationOnce(sprite, atkKey).then(() => {
      if (!sprite.active) return;
      if (recovery > 0) {
        setEnemyState(enemy, ENEMY_STATE.RECOVER, {
          recoveryUntil: (scene.time?.now ?? Date.now()) + recovery,
          lungeComplete: false,
        });
      } else {
        setEnemyState(enemy, ENEMY_STATE.IDLE, { lungeComplete: false });
      }
      if (sprite.active) sprite.anims.play(idleKey, true);
    });
  });
}

export function updateMushroomMeleeAI(scene, enemy, now) {
  const sprite = enemy.sprite;
  const cfg = enemy.config;
  if (!sprite?.active) return;

  const stats = cfg.stats ?? {};
  const melee = cfg.melee ?? {};
  const player = getNearestPlayer(scene, sprite);
  if (!player?.sprite) return;

  const idleKey = cfg.idle;
  const lungeKey = cfg.lunge ?? "test-mushroom-lunge";
  const atkKey = cfg.attack;

  if (handleMeleeRecover(enemy, sprite, idleKey, now)) return;
  if (handleMushroomAttackHit(scene, enemy, player, resolveEnemyAttackDamageFromEntry(enemy))) return;

  if (enemy.state === ENEMY_STATE.LUNGE) {
    return;
  }

  if (enemy.state !== ENEMY_STATE.IDLE) {
    return;
  }

  const lungePx = melee.lungePx ?? melee.lunge ?? 20;
  const engageSlack = melee.engageSlack ?? 90;
  const detectRange = stats.detectRange ?? 400;
  const { absDy, detectDist } = getMeleeDistances(sprite, player.sprite, stats);

  const verticalTol = stats.verticalTolerance ?? 40;
  if (detectDist > detectRange || absDy > verticalTol) {
    if (sprite.anims.currentAnim?.key !== idleKey) {
      sprite.anims.play(idleKey, true);
    }
    return;
  }

  faceMeleeTarget(enemy, sprite, player.sprite.x, cfg.facing ?? "left-default");

  const engage = canMushroomEngage({
    enemy,
    playerSprite: player.sprite,
    absDy,
    lungePx,
    engageSlack,
    now,
  });

  if (!engage.ok) {
    if (isMushroomAttackDebug()) {
      mushroomAttackLog("engage-reject", {
        why: engage.why,
        absDy,
        facingDirection: enemy.facingDirection,
        flipX: sprite.flipX,
        ...snapshotCombatPositions(sprite, player.sprite),
        ...engage,
      });
    }
    if (sprite.anims.currentAnim?.key !== idleKey) {
      sprite.anims.play(idleKey, true);
    }
    return;
  }

  mushroomAttackLog("engage-accept", {
    timing: "attack-trigger",
    ...snapshotCombatPositions(sprite, player.sprite),
    ...engage,
  });

  const lungeMs = melee.lungeDuration ?? getAnimDurationMs(scene, lungeKey);

  beginMushroomLungeThenAttack(scene, enemy, player, {
    lungeKey,
    atkKey,
    idleKey,
    lungePx,
    lungeMs,
    recovery: melee.recovery ?? 0,
    cooldown: stats.cooldown ?? 2000,
    now,
  });
}
