/** 各職業基礎攻擊 — 可在 resolvePlayerAttack 以等級／武器／增益擴充。 */
export const PLAYER_CLASS_BASE_ATTACK = Object.freeze({
  soldier: 5,
  mage: 10,
});

export function getPlayerClassBaseAttack(classId) {
  return PLAYER_CLASS_BASE_ATTACK[classId] ?? PLAYER_CLASS_BASE_ATTACK.soldier;
}

/** 第 1 波各職業預設最大 HP（重置本局時亦使用）。 */
export function getDefaultMaxHpForClass(classId) {
  return classId === "mage" ? 70 : 100;
}
