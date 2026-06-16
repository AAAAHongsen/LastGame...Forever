import { getEnemyFlashTarget } from "./damageFlash.js";
import { resolveEnemyDropTableId } from "./resolveEnemyStats.js";
import { spawnDropsFromTable } from "./loot/dropSystem.js";
import { destroyEnemy } from "../enemy-system/helpers/spriteCleanup.js";
import { playEnemyDeadSfx } from "../services/audioService.js";
import { isHostScene } from "../services/multiplayerSession.js";

/** 移除 sprite 前死亡震動（不中斷先前受傷閃爍）。 */
export const ENEMY_DEATH_SHAKE = Object.freeze({
  amplitude: 6,
  stepMs: 45,
  repeats: 1,
  fadeMs: 140,
});

/** 死亡特效後呼叫 — 生成戰利品並移除敵人。 */
export function finalizeEnemyDeath(scene, enemy, source = {}) {
  if (!enemy) return;

  const x = enemy._deathX ?? enemy.sprite?.x ?? 0;
  const y = (enemy._deathY ?? enemy.sprite?.y ?? 0) - 20;
  const tableId = resolveEnemyDropTableId(enemy);

  if (tableId) {
    spawnDropsFromTable(scene, tableId, x, y);
  }

  const list = scene.enemyManager?.enemies;
  if (list) {
    const idx = list.indexOf(enemy);
    if (idx >= 0) list.splice(idx, 1);
  }

  destroyEnemy(enemy);
  scene.events?.emit?.("enemy:killed", { enemy, type: enemy.type, source });
}

export function detachEnemySpritePhysics(scene, sprite) {
  if (sprite?.body) {
    sprite.setVelocity(0, 0);
    sprite.body.enable = false;
  }
  if (scene.enemyPhysicsGroup?.contains?.(sprite)) {
    scene.enemyPhysicsGroup.remove(sprite, false, false);
  }
}

function runDeathShakeThenFade(scene, visual, enemy, source) {
  const { amplitude, stepMs, repeats, fadeMs } = ENEMY_DEATH_SHAKE;

  scene.tweens.add({
    targets: visual,
    x: visual.x + amplitude,
    duration: stepMs,
    yoyo: true,
    repeat: repeats,
    onComplete: () => {
      if (!visual.active) {
        finalizeEnemyDeath(scene, enemy, source);
        return;
      }
      scene.tweens.add({
        targets: visual,
        x: enemy._deathX,
        alpha: 0,
        duration: fadeMs,
        ease: "Quad.easeIn",
        onComplete: () => finalizeEnemyDeath(scene, enemy, source),
      });
    },
  });
}

/**
 * 客戶端死亡視覺由房主同步（無戰利品／destroy）。
 * 權威移除由 beginEnemyDeathSequence 在房主端處理。
 */
export function playNetworkClientDeathFx(scene, target, deathX) {
  playEnemyDeadSfx(scene);
  detachEnemySpritePhysics(scene, target);
  scene.tweens.killTweensOf(target);

  const { amplitude, stepMs, repeats, fadeMs } = ENEMY_DEATH_SHAKE;
  scene.tweens.add({
    targets: target,
    x: deathX + amplitude,
    duration: stepMs,
    yoyo: true,
    repeat: repeats,
    onComplete: () => {
      scene.tweens.add({
        targets: target,
        x: deathX,
        alpha: 0,
        duration: fadeMs,
        ease: "Quad.easeIn",
      });
    },
  });
}

/**
 * HP 已為 0 — 播放震動 → 淡出 → 掉落 → destroy。
 * 立即設 dying/dead，AI 與判定框略過此敵。
 */
export function beginEnemyDeathSequence(scene, enemy, source = {}) {
  if (!enemy || enemy.dying) return;
  enemy.dying = true;
  enemy.dead = true;

  const sprite = enemy.sprite;
  const visual = getEnemyFlashTarget(enemy) ?? sprite;
  if (!visual?.active) {
    finalizeEnemyDeath(scene, enemy, source);
    return;
  }

  enemy._deathX = visual.x;
  enemy._deathY = visual.y;

  playEnemyDeadSfx(scene);

  // 房主廣播輕量 die-FX 事件，避免客戶端「瞬間消失」。
  if (isHostScene(scene) && scene?.socket && enemy._waveId) {
    scene.socket.emit("waveEnemyDieFx", {
      id: enemy._waveId,
      x: enemy._deathX,
      y: enemy._deathY,
    });
  }

  detachEnemySpritePhysics(scene, sprite);

  scene.tweens.killTweensOf(visual);
  visual.setAlpha(1);

  runDeathShakeThenFade(scene, visual, enemy, source);
}
