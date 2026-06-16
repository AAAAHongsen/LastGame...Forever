import { getEnemyFlashTarget } from "./damageFlash.js";
import { resolveEnemyDropTableId } from "./resolveEnemyStats.js";
import { spawnDropsFromTable } from "./loot/dropSystem.js";
import { destroyEnemy } from "../enemy-system/helpers/spriteCleanup.js";
import { playEnemyDeadSfx } from "../services/audioService.js";

/** Death shake before despawn (does not interrupt prior hurt flash). */
export const ENEMY_DEATH_SHAKE = Object.freeze({
  amplitude: 6,
  stepMs: 45,
  repeats: 1,
  fadeMs: 140,
});

/** Called after death VFX — spawn loot and remove enemy. */
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

/**
 * HP already 0 — play shake → fade → drops → destroy.
 * Sets dying/dead immediately so AI and hitboxes ignore this enemy.
 */
export function beginEnemyDeathSequence(scene, enemy, source = {}) {
  if (!enemy || enemy.dying) return;
  const isMultiplayer = Boolean(scene?.roomCode && (scene?.playerNumber === 1 || scene?.playerNumber === 2));
  const isHost = !isMultiplayer || scene?.playerNumber === 1;
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

  // Host broadcasts a lightweight die-FX event so client won't "pop-disappear".
  if (isHost && scene?.socket && enemy._waveId) {
    scene.socket.emit("waveEnemyDieFx", {
      id: enemy._waveId,
      x: enemy._deathX,
      y: enemy._deathY,
    });
  }

  if (sprite?.body) {
    sprite.setVelocity(0, 0);
    sprite.body.enable = false;
  }

  if (scene.enemyPhysicsGroup?.contains?.(sprite)) {
    scene.enemyPhysicsGroup.remove(sprite, false, false);
  }

  scene.tweens.killTweensOf(visual);
  visual.setAlpha(1);

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
