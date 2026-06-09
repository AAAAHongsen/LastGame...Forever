import { faceTowardPlayer } from "../combat/facing.js";
import { getNearestPlayer } from "../combat/targeting.js";
import {
  triggerFlyBossAttack,
  playGorgonStomp,
  playGorgonBeam,
  playGorgonMelee,
} from "../systems/bossActions.js";
import { ENEMY_STATE } from "../helpers/stateMachine.js";

// ── FlyBoss constants ───────────────────────────────────────────────────────
const FLY_BOSS_ATTACK_COOLDOWN_MS = 10000;
const FLY_BOSS_TRACK_SPEED        = 80;
const FLY_BOSS_MIN_Y              = 220;
const FLY_BOSS_MAX_Y              = 400;

// ── Gorgon (groundBoss) constants ──────────────────────────────────────────
const GORGON_STOMP_INTERVAL_MS  = 15000;  // stomp every 15 s
const GORGON_MELEE_RANGE        = 180;    // px — trigger tail swipe when player this close
const GORGON_MELEE_COOLDOWN_MS  = 3500;   // prevent spam
// Laser fires every time Gorgon loses 10% of its max HP.
const GORGON_LASER_HP_STEP_PCT  = 0.10;

/** Boss loop: runs once per update tick (gated by updateEnemies). */
export function updateBossAI(scene, enemy, now) {
  const s = enemy?.sprite;
  if (!s?.active) return;

  // ── FlyBoss ──────────────────────────────────────────────────────────────
  if (enemy.type === "flyBoss") {
    const target = getNearestPlayer(scene, s);
    const p = target?.sprite;
    if (!p?.active) return;

    const desiredX = Phaser.Math.Clamp(p.x, 120, scene.physics.world.bounds.width - 120);
    const desiredY = Phaser.Math.Clamp(p.y - 60, FLY_BOSS_MIN_Y, FLY_BOSS_MAX_Y);
    const dx = desiredX - s.x;
    const dy = desiredY - s.y;
    const len = Math.hypot(dx, dy) || 1;
    s.setVelocity((dx / len) * FLY_BOSS_TRACK_SPEED, (dy / len) * FLY_BOSS_TRACK_SPEED);

    faceTowardPlayer(s, p.x, enemy.config?.facing ?? "right-art");
    if (enemy.state !== ENEMY_STATE.ATTACK && s.anims?.currentAnim?.key !== enemy.config?.idle) {
      s.anims?.play?.(enemy.config?.idle ?? "test-flyboss-fly", true);
    }

    const nextAt = enemy.stateData.nextAttackAt ?? 0;
    if (now >= nextAt && enemy.state !== ENEMY_STATE.ATTACK) {
      enemy.state = ENEMY_STATE.ATTACK;
      enemy.stateData.nextAttackAt = now + FLY_BOSS_ATTACK_COOLDOWN_MS;
      triggerFlyBossAttack(scene, enemy);
      scene.time.delayedCall(400, () => {
        if (!s.active) return;
        enemy.state = ENEMY_STATE.IDLE;
        s.anims?.play?.(enemy.config?.idle ?? "test-flyboss-fly", true);
      });
    }
    return;
  }

  // ── Gorgon (groundBoss) ──────────────────────────────────────────────────
  if (enemy.type === "groundBoss") {
    // Face nearest player
    const target = getNearestPlayer(scene, s);
    if (target?.sprite) faceTowardPlayer(s, target.sprite.x, enemy.config?.facing ?? "right-art");

    // Skip attack decisions while already attacking
    if (enemy.state === ENEMY_STATE.ATTACK) return;

    // Initialise per-enemy timers/trackers lazily
    const sd = enemy.stateData;
    if (sd.gorgonNextStompAt  == null) sd.gorgonNextStompAt  = now + GORGON_STOMP_INTERVAL_MS;
    if (sd.gorgonLastHpPct    == null) sd.gorgonLastHpPct    = 1.0;
    if (sd.gorgonNextMeleeAt  == null) sd.gorgonNextMeleeAt  = 0;

    // ── Priority 1: Stomp (every 30 s) ──────────────────────────────────
    if (now >= sd.gorgonNextStompAt) {
      sd.gorgonNextStompAt = now + GORGON_STOMP_INTERVAL_MS;
      playGorgonStomp(scene, enemy);
      return;
    }

    // ── Priority 2: Laser beam (triggered on every 10% HP loss) ─────────
    const hpPct = enemy.hpMax > 0 ? enemy.hp / enemy.hpMax : 0;
    const stepsLost = Math.floor((sd.gorgonLastHpPct - hpPct) / GORGON_LASER_HP_STEP_PCT);
    if (stepsLost >= 1) {
      // Consume the step(s)
      sd.gorgonLastHpPct -= stepsLost * GORGON_LASER_HP_STEP_PCT;
      playGorgonBeam(scene, enemy);
      return;
    }

    // ── Priority 3: Melee when player is close ───────────────────────────
    if (target?.sprite?.active && now >= sd.gorgonNextMeleeAt) {
      const dist = Math.abs(target.sprite.x - s.x);
      if (dist < GORGON_MELEE_RANGE) {
        sd.gorgonNextMeleeAt = now + GORGON_MELEE_COOLDOWN_MS;
        playGorgonMelee(scene, enemy);
        return;
      }
    }

    // Idle when no attack triggered
    if (s.anims?.currentAnim?.key !== enemy.config?.idle) {
      s.anims?.play?.(enemy.config?.idle ?? "test-gorgon-idle", true);
    }
    s.setVelocity(0, s.body?.velocity?.y ?? 0);
    return;
  }

  s.setVelocity(0, s.body?.velocity?.y ?? 0);
}
