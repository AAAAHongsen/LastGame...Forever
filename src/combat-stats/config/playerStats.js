/** Base attack per player class — extend via level / weapon / buff in resolvePlayerAttack. */
export const PLAYER_CLASS_BASE_ATTACK = Object.freeze({
  soldier: 5,
  mage: 10,
});

export function getPlayerClassBaseAttack(classId) {
  return PLAYER_CLASS_BASE_ATTACK[classId] ?? PLAYER_CLASS_BASE_ATTACK.soldier;
}
