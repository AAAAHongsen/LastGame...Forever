/** 全域戰鬥縮放參數（關卡／難度）。執行時設於 scene.combatStats。 */
export const DEFAULT_COMBAT_SCALING = Object.freeze({
  difficultyMultiplier: 1,
  stageMultiplier: 1,
});

export function getCombatScaling(scene) {
  return {
    ...DEFAULT_COMBAT_SCALING,
    ...(scene?.combatStats ?? {}),
  };
}
