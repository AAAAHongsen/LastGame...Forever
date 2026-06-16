/** 每幀敵人與投射物更新；遵守 game-over 凍結。 */
import { updateEnemyAI } from "../ai/index.js";
import { cleanupOutOfBounds } from "../helpers/spriteCleanup.js";
import { updateEnemies } from "./enemyManager.js";
import { updateProjectiles } from "./projectileSystem.js";

export function updateEnemySystem(scene, now) {
  updateEnemies(scene, now);
  updateProjectiles(scene);
  cleanupOutOfBounds(scene);
}

export function attachEnemySystemUpdate(scene) {
  scene.enemySystem = {
    updateAI: updateEnemyAI,
  };

  if (scene._enemySystemUpdateHandler) {
    scene.events.off("update", scene._enemySystemUpdateHandler);
  }

  scene._enemySystemUpdateHandler = () => {
    if (scene._gameOverFrozen) return;
    const now = scene.time?.now ?? Date.now();
    updateEnemySystem(scene, now);
  };

  scene.events.on("update", scene._enemySystemUpdateHandler);
  scene._testEnemyUpdateHandler = scene._enemySystemUpdateHandler;
}
