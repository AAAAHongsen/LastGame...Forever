/** Gorgon Boss AI — HP 門檻雷射、踐踏、近戰；委派給 bossActions。 */
import { faceTowardPlayer } from "../combat/facing.js";
import { getNearestPlayer } from "../combat/targeting.js";
import {
  triggerFlyBossAttack,
  playGorgonStomp,
  playGorgonBeam,
  playGorgonMelee,
} from "../systems/bossActions.js";
import { ENEMY_STATE } from "../helpers/stateMachine.js";

// ── FlyBoss 常數 ───────────────────────────────────────────────────────
const FLY_BOSS_ATTACK_COOLDOWN_MS = 10000;
const FLY_BOSS_TRACK_SPEED        = 80;
const FLY_BOSS_MIN_Y              = 220;
const FLY_BOSS_MAX_Y              = 400;

// ── Gorgon（groundBoss）常數 ──────────────────────────────────────────
const GORGON_STOMP_INTERVAL_MS  = 15000;  // 每 15 秒踐踏一次
const GORGON_MELEE_RANGE        = 180;    // px — 玩家接近此距離時觸發尾掃
const GORGON_MELEE_COOLDOWN_MS  = 3500;   // 防止連發
// 每當 Gorgon 失去 10% 最大 HP 時發射雷射。
const GORGON_LASER_HP_STEP_PCT  = 0.10;

/** Boss 迴圈：每 update tick 執行一次（由 updateEnemies 閘控）。 */
export function updateBossAI(scene, enemy, now) {
  const s = enemy?.sprite;
  if (!s?.active) return;

  // ── 飛行 Boss ──────────────────────────────────────────────────────────────
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

  // ── 地面 Boss（Gorgon / groundBoss）──────────────────────────────────────
  if (enemy.type === "groundBoss") {
    // 面向最近玩家
    const target = getNearestPlayer(scene, s);
    if (target?.sprite) faceTowardPlayer(s, target.sprite.x, enemy.config?.facing ?? "right-art");

    // 攻擊中略過攻擊決策
    if (enemy.state === ENEMY_STATE.ATTACK) return;

    // 延遲初始化各敵人的計時器／追蹤器
    const sd = enemy.stateData;
    if (sd.gorgonNextStompAt  == null) sd.gorgonNextStompAt  = now + GORGON_STOMP_INTERVAL_MS;
    if (sd.gorgonLastHpPct    == null) sd.gorgonLastHpPct    = 1.0;
    if (sd.gorgonNextMeleeAt  == null) sd.gorgonNextMeleeAt  = 0;

    // ── 優先 1：踐踏（每 30 秒）──────────────────────────────────
    if (now >= sd.gorgonNextStompAt) {
      sd.gorgonNextStompAt = now + GORGON_STOMP_INTERVAL_MS;
      playGorgonStomp(scene, enemy);
      return;
    }

    // ── 優先 2：雷射光束（每失去 10% HP 觸發）────────────────────────
    const hpPct = enemy.hpMax > 0 ? enemy.hp / enemy.hpMax : 0;
    const stepsLost = Math.floor((sd.gorgonLastHpPct - hpPct) / GORGON_LASER_HP_STEP_PCT);
    if (stepsLost >= 1) {
      // 消耗步進
      sd.gorgonLastHpPct -= stepsLost * GORGON_LASER_HP_STEP_PCT;
      playGorgonBeam(scene, enemy);
      return;
    }

    // ── 優先 3：玩家靠近時近戰 ───────────────────────────────────────────
    if (target?.sprite?.active && now >= sd.gorgonNextMeleeAt) {
      const dist = Math.abs(target.sprite.x - s.x);
      if (dist < GORGON_MELEE_RANGE) {
        sd.gorgonNextMeleeAt = now + GORGON_MELEE_COOLDOWN_MS;
        playGorgonMelee(scene, enemy);
        return;
      }
    }

    // 未觸發攻擊時 idle
    if (s.anims?.currentAnim?.key !== enemy.config?.idle) {
      s.anims?.play?.(enemy.config?.idle ?? "test-gorgon-idle", true);
    }
    s.setVelocity(0, s.body?.velocity?.y ?? 0);
    return;
  }

  s.setVelocity(0, s.body?.velocity?.y ?? 0);
}
