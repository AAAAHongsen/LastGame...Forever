/** Global combat scaling knobs (stage / difficulty). Set on scene.combatStats at runtime. */
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
