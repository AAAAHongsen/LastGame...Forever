import { getPlayerClassBaseAttack } from "./config/playerStats.js";

/**
 * playerAttack = (waveAttack ?? base + weaponDamage + levelBonus) × buffMultiplier
 * Wave attack overrides base when WaveManager sets entry.combat._waveAttack.
 * @param {object} playerEntry
 * @param {Phaser.Scene} scene
 * @param {object} [opts]
 */
export function resolvePlayerAttackDamage(playerEntry, scene, opts = {}) {
  const classId = playerEntry?.type ?? "soldier";
  const combat = playerEntry?.combat ?? {};

  // Wave-specific attack overrides the class base
  const base = combat._waveAttack ?? getPlayerClassBaseAttack(classId);
  const weapon = combat.weaponDamage ?? opts.weaponDamage ?? 0;
  const levelBonus = combat.levelBonus ?? opts.levelBonus ?? 0;
  const buff = combat.buffMultiplier ?? opts.buffMultiplier ?? 1;
  return Math.max(1, Math.round((base + weapon + levelBonus) * buff));
}
