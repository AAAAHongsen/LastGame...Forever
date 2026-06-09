import { canTurn, faceTowardPlayer } from "../combat/facing.js";
import { distanceToPlayer, getNearestPlayer } from "../combat/targeting.js";
import { COMBAT_EFFECTS } from "../registry/effectRegistry.js";
import { playAnimationOnce } from "../helpers/playAnimationOnce.js";
import { ENEMY_STATE, setEnemyState } from "../helpers/stateMachine.js";

export function updateRangedAI(scene, enemy, now) {
  const s = enemy.sprite;
  const cfg = enemy.config;
  if (!s?.active) return;

  const stats = cfg.stats ?? {};
  const ranged = cfg.ranged ?? {};
  const p = getNearestPlayer(scene, s);
  if (!p?.sprite) return;

  const idleKey = cfg.idle;
  const atkKey = cfg.attack;
  const detectRange = stats.detectRange ?? 280;

  if (enemy.state === ENEMY_STATE.ATTACK) return;

  const dist = distanceToPlayer(s, p);
  if (dist > detectRange) {
    if (enemy.state === ENEMY_STATE.IDLE && !s.anims.isPlaying) {
      s.anims.play(idleKey, true);
    }
    return;
  }

  if (canTurn(enemy)) {
    faceTowardPlayer(s, p.sprite.x, cfg.facing ?? "left-default");
  }

  const cooldown = stats.cooldown ?? 3000;
  if (now >= (enemy.stateData.nextShot ?? 0)) {
    setEnemyState(enemy, ENEMY_STATE.ATTACK);
    enemy.stateData.nextShot = now + cooldown;

    const delay = ranged.attackDelay ?? 220;
    const effectKey = ranged.effect ?? "soundWave";
    const spawnFn = COMBAT_EFFECTS[effectKey];
    const speed = ranged.projectileSpeed ?? 300;

    scene.time.delayedCall(delay, () => {
      if (!s.active) return;
      const proj = spawnFn?.(scene, { fromSprite: s, target: p.sprite, speed });
      if (proj) proj.setData("ownerEnemy", enemy);
    });

    playAnimationOnce(s, atkKey).then(() => {
      if (!s.active) return;
      setEnemyState(enemy, ENEMY_STATE.IDLE);
      s.anims.play(idleKey, true);
    });
  } else if (enemy.state === ENEMY_STATE.IDLE && !s.anims.isPlaying) {
    s.anims.play(idleKey, true);
  }
}
