import { spriteBoundsHit } from "../combat/collision.js";
import { damagePlayerEntry } from "../combat/damage.js";
import { canTurn, faceTowardPlayer, playerInFront } from "../combat/facing.js";
import { distanceToPlayer } from "../combat/targeting.js";
import { meleeLunge } from "../helpers/meleeLunge.js";
import { playAnimationOnce } from "../helpers/playAnimationOnce.js";
import { ENEMY_STATE, setEnemyState } from "../helpers/stateMachine.js";

export function handleMeleeRecover(enemy, sprite, idleKey, now) {
  if (enemy.state !== ENEMY_STATE.RECOVER) return false;
  if (now >= (enemy.stateData.recoveryUntil ?? 0)) {
    setEnemyState(enemy, ENEMY_STATE.IDLE);
  } else if (sprite.anims.currentAnim?.key !== idleKey) {
    sprite.anims.play(idleKey, true);
  }
  return true;
}

export function handleMeleeAttackDamage(scene, enemy, playerEntry, playerVisual, damage) {
  if (enemy.state !== ENEMY_STATE.ATTACK) return false;
  const sprite = enemy.sprite;
  if (enemy.stateData.canDealDamage && !enemy.stateData.hitApplied && playerVisual && spriteBoundsHit(sprite, playerVisual)) {
    enemy.stateData.hitApplied = true;
    damagePlayerEntry(scene, playerEntry, damage);
  }
  return true;
}

export function beginMeleeAttack(scene, enemy, { atkKey, idleKey, lungePx, lungeMs, recovery, cooldown, now }) {
  setEnemyState(enemy, ENEMY_STATE.ATTACK, {
    hitApplied: false,
    canDealDamage: false,
    nextAtk: now + cooldown,
  });

  const sprite = enemy.sprite;
  const runAttackAnim = () => {
    enemy.stateData.canDealDamage = true;
    playAnimationOnce(sprite, atkKey).then(() => {
      if (!sprite.active) return;
      enemy.stateData.canDealDamage = false;
      if (recovery > 0) {
        setEnemyState(enemy, ENEMY_STATE.RECOVER, {
          recoveryUntil: (scene.time?.now ?? Date.now()) + recovery,
        });
      } else {
        setEnemyState(enemy, ENEMY_STATE.IDLE);
      }
      if (sprite.active) sprite.anims.play(idleKey, true);
    });
  };

  if (lungePx > 0) {
    const dir = enemy.facingDirection || 1;
    meleeLunge(scene, sprite, lungePx, lungeMs, dir).then(() => {
      if (!sprite.active || enemy.state !== ENEMY_STATE.ATTACK) return;
      runAttackAnim();
    });
  } else {
    runAttackAnim();
  }
}

export function getMeleeDistances(sprite, playerSprite, stats) {
  const dx = playerSprite.x - sprite.x;
  const absDx = Math.abs(dx);
  const dy = playerSprite.y - sprite.y;
  const absDy = Math.abs(dy);
  const dist =
    stats.attackRangeMode === "x" || stats.detectRangeMode === "x"
      ? absDx
      : distanceToPlayer(sprite, { sprite: playerSprite });
  const detectDist = stats.detectRangeMode === "x" ? absDx : dist;
  return { dx, absDx, absDy, dist, detectDist };
}

export function canMeleeEngage({ sprite, playerSprite, stats, absDx, absDy, dist, attackRange, now, enemy }) {
  const verticalTol = stats.verticalTolerance ?? 40;
  const usesVerticalTol = stats.verticalTolerance != null;

  return (
    playerInFront(sprite, playerSprite.x) &&
    (stats.attackRangeMode === "x" ? absDx : dist) <= attackRange &&
    (!usesVerticalTol || absDy <= verticalTol) &&
    now >= (enemy.stateData.nextAtk ?? 0)
  );
}

export function faceMeleeTarget(enemy, sprite, playerX, facingMode) {
  if (!canTurn(enemy)) return;
  const dx = playerX - sprite.x;
  enemy.facingDirection = dx < 0 ? -1 : 1;
  faceTowardPlayer(sprite, playerX, facingMode);
}
