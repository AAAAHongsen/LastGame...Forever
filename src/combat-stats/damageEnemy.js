import { playDamageFlash, getEnemyFlashTarget } from "./damageFlash.js";
import { beginEnemyDeathSequence } from "./enemyDeath.js";

/**
 * Apply damage to an enemy entry (HP tracked on enemy object, not in AI).
 */
export function damageEnemyEntry(scene, enemy, amount, source = {}) {
  // Multiplayer authority: only host (player1) applies enemy HP changes.
  const isMultiplayer = Boolean(scene?.roomCode && (scene?.playerNumber === 1 || scene?.playerNumber === 2));
  if (isMultiplayer && scene?.playerNumber !== 1) return false;

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

/** Starts shake → fade death sequence (async despawn). */
export function killEnemyEntry(scene, enemy, source = {}) {
  if (!enemy || enemy.dying) return;
  beginEnemyDeathSequence(scene, enemy, source);
}

export { finalizeEnemyDeath } from "./enemyDeath.js";
