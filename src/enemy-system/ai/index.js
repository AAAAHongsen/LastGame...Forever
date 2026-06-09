import { updateBossAI } from "./bossAI.js";
import { updateMushroomMeleeAI } from "./mushroomMeleeAI.js";
import { updateRangedAI } from "./rangedAI.js";
import { updateSkeletonMeleeAI } from "./skeletonMeleeAI.js";

export const AI_HANDLERS = {
  mushroomMelee: updateMushroomMeleeAI,
  skeletonMelee: updateSkeletonMeleeAI,
  ranged: updateRangedAI,
  boss: updateBossAI,
};

export function updateEnemyAI(scene, enemy, now) {
  const handler = AI_HANDLERS[enemy.config?.ai];
  handler?.(scene, enemy, now);
}
