import { playDamageFlash, getEnemyFlashTarget } from "./damageFlash.js";
import { beginEnemyDeathSequence } from "./enemyDeath.js";
import { isHostScene, isMultiplayerScene } from "../services/multiplayerSession.js";

/**
 * 對敵人 entry 造成傷害（HP 在敵人物件上，非 AI）。
 * 多人模式以房主為權威。
 */
export function damageEnemyEntry(scene, enemy, amount, source = {}) {
  if (isMultiplayerScene(scene) && !isHostScene(scene)) return false;

  if (!enemy || enemy.dead || enemy.dying || !enemy.sprite?.active) return false;

  const dmg = Math.max(0, Math.round(Number(amount) || 0));
  if (dmg <= 0) return false;

  enemy.hp = Math.max(0, (enemy.hp ?? 1) - dmg);
  playDamageFlash(scene, getEnemyFlashTarget(enemy));
  scene.waveManager?.notifyEnemyDamaged?.(enemy);

  if (enemy.hp <= 0) {
    killEnemyEntry(scene, enemy, source);
    return true;
  }
  return true;
}

/** 開始震動 → 淡出死亡序列（非同步 despawn）。 */
export function killEnemyEntry(scene, enemy, source = {}) {
  if (!enemy || enemy.dying) return;
  beginEnemyDeathSequence(scene, enemy, source);
}

export { finalizeEnemyDeath } from "./enemyDeath.js";
