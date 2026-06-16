import { getPlayerClassBaseAttack } from "./config/playerStats.js";

/**
 * 玩家攻擊力 = (waveAttack ?? base + weaponDamage + levelBonus) × buffMultiplier
 * WaveManager 設定 entry.combat._waveAttack 時，波次攻擊覆寫基礎值。
 * @param {object} playerEntry 玩家 entry
 * @param {Phaser.Scene} scene 場景
 * @param {object} [opts] 選項
 */
export function resolvePlayerAttackDamage(playerEntry, scene, opts = {}) {
  const classId = playerEntry?.type ?? "soldier";
  const combat = playerEntry?.combat ?? {};

  // 波次專用攻擊覆寫職業基礎值
  const base = combat._waveAttack ?? getPlayerClassBaseAttack(classId);
  const weapon = combat.weaponDamage ?? opts.weaponDamage ?? 0;
  const levelBonus = combat.levelBonus ?? opts.levelBonus ?? 0;
  const buff = combat.buffMultiplier ?? opts.buffMultiplier ?? 1;
  return Math.max(1, Math.round((base + weapon + levelBonus) * buff));
}
