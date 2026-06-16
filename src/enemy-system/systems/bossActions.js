/**
 * Boss／開發用攻擊觸發 — 蝙蝠、flyBoss 與 Gorgon 階段行動。
 * 各 Gorgon 行動：進入 ATTACK → 幀回呼 → playAnimationOnce → IDLE。
 */
import { faceTowardPlayer } from "../combat/facing.js";
import { getNearestPlayer, getPlayers } from "../combat/targeting.js";
import { damagePlayerEntry } from "../combat/damage.js";
import { spawnFallingFireball } from "../effects/fireball.js";
import { spawnLaser } from "../effects/laser.js";
import { spawnLightBall } from "../effects/lightBall.js";
import { spawnSoundWave } from "../effects/soundWave.js";
import {
  clearAnimationFrameHandler,
  onAnimationFrame,
  playAnimationOnce,
} from "../helpers/playAnimationOnce.js";
import { ENEMY_STATE } from "../helpers/stateMachine.js";

// ── 開發／測試觸發 ─────────────────────────────────────────────────────

export function triggerBatAttack(scene, enemy) {
  const s = enemy?.sprite;
  if (!s) return false;
  const cfg = enemy.config;
  const atkKey = cfg.attack ?? "test-bat-attack";
  const idleKey = cfg.idle ?? "test-bat-idle";
  const p = getNearestPlayer(scene, s);
  const speed = cfg.ranged?.projectileSpeed ?? 300;

  enemy.state = ENEMY_STATE.ATTACK;
  const proj = spawnSoundWave(scene, { fromSprite: s, target: p?.sprite, speed });
  if (proj) proj.setData("ownerEnemy", enemy);

  playAnimationOnce(s, atkKey).then(() => {
    enemy.state = ENEMY_STATE.IDLE;
    if (s.active) s.anims.play(idleKey, true);
  });
  return true;
}

export function triggerFlyBossAttack(scene, enemy) {
  const s = enemy?.sprite;
  if (!s) return null;
  const p = getNearestPlayer(scene, s);
  if (p?.sprite) faceTowardPlayer(s, p.sprite.x, enemy.config.facing ?? "right-art");
  const proj = spawnLightBall(scene, { fromSprite: s });
  if (proj) proj.setData("ownerEnemy", enemy);
  return proj;
}

// ── Gorgon Boss 行動 ─────────────────────────────────────────────────────

/** 地面重擊 — 在指定動畫幀生成下落火球。 */
export function playGorgonStomp(scene, enemy) {
  const s = enemy?.sprite;
  const cfg = enemy?.config;
  if (!s || !enemy) return false;

  const boss = cfg.boss ?? {};
  enemy.state = ENEMY_STATE.ATTACK;
  enemy.stateData.stompFired = false;
  const stompKey = cfg.stomp ?? "test-gorgon-stomp";
  const idleKey = cfg.idle ?? "test-gorgon-idle";
  const frameIdx = boss.stompFrame ?? 8;

  onAnimationFrame(s, stompKey, frameIdx, enemy, "_stompHandler", () => {
    if (enemy.stateData.stompFired) return;
    enemy.stateData.stompFired = true;
    spawnFallingFireball(scene, {
      spawnY: boss.fireballSpawnY ?? 72,
      fallSpeed: boss.fireballFallSpeed ?? 260,
      ownerEnemy: enemy,
    });
  });

  playAnimationOnce(s, stompKey).then(() => {
    clearAnimationFrameHandler(s, enemy, "_stompHandler");
    enemy.state = ENEMY_STATE.IDLE;
    if (s.active) s.anims.play(idleKey, true);
  });
  return true;
}

/** 水平尾掃 — 對 MELEE_RANGE px 內玩家造成 AoE 傷害。 */
export function playGorgonMelee(scene, enemy) {
  const s = enemy?.sprite;
  const cfg = enemy?.config;
  if (!s) return false;

  const idleKey  = cfg?.idle  ?? "test-gorgon-idle";
  const meleeKey = cfg?.melee ?? "test-gorgon-melee";

  enemy.state = ENEMY_STATE.ATTACK;
  s.anims.play(meleeKey, false);

  const MELEE_RANGE = 180;
  const MELEE_DMG   = 40;

  // 動畫中段（第 3 幀）套用傷害
  onAnimationFrame(s, meleeKey, 3, enemy, "_meleeHitHandler", () => {
    for (const p of getPlayers(scene)) {
      if (!p?.sprite?.active) continue;
      const dist = Math.abs(p.sprite.x - s.x);
      if (dist < MELEE_RANGE) {
        damagePlayerEntry(scene, p, MELEE_DMG);
      }
    }
  });

  playAnimationOnce(s, meleeKey).then(() => {
    clearAnimationFrameHandler(s, enemy, "_meleeHitHandler");
    enemy.state = ENEMY_STATE.IDLE;
    if (s.active) s.anims.play(idleKey, true);
  });
  return true;
}

/** 光束蓄力 — 暫停動畫、生成雷射危害、holdMs 後恢復。 */
export function playGorgonBeam(scene, enemy) {
  const s = enemy?.sprite;
  const cfg = enemy?.config;
  if (!s || !enemy) return false;

  const boss = cfg.boss ?? {};
  enemy.state = ENEMY_STATE.ATTACK;
  enemy.stateData.beamLaserFired = false;
  const beamKey = cfg.beam ?? "test-gorgon-beam";
  const idleKey = cfg.idle ?? "test-gorgon-idle";
  const frameIdx = boss.beamFrame ?? 8;
  const holdMs = boss.beamHoldMs ?? 500;

  onAnimationFrame(s, beamKey, frameIdx, enemy, "_beamHandler", () => {
    if (enemy.stateData.beamLaserFired) return;
    enemy.stateData.beamLaserFired = true;
    s.anims.pause();
    spawnLaser(scene, { fromSprite: s, ownerEnemy: enemy });
    scene.time.delayedCall(holdMs, () => {
      if (s.active && s.anims.isPaused) s.anims.resume();
    });
  });

  playAnimationOnce(s, beamKey).then(() => {
    clearAnimationFrameHandler(s, enemy, "_beamHandler");
    enemy.state = ENEMY_STATE.IDLE;
    if (s.active) s.anims.play(idleKey, true);
  });
  return true;
}
