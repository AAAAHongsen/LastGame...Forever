import { DEFAULT_COMBAT_SCALING } from "./config/scaling.js";
import { initLootManager, preloadCombatLootAssets, updateLootPickups } from "./loot/lootManager.js";
import { updateLootMagnetAndPickup } from "./loot/lootPickup.js";
import { initPlayerCombat, updatePlayerCombat } from "./playerCombat.js";

export { preloadCombatLootAssets };
export { initPlayerCombat, onPlayerAttackStarted } from "./playerCombat.js";
export { damageEnemyEntry, killEnemyEntry } from "./damageEnemy.js";
export { resolvePlayerAttackDamage } from "./resolvePlayerAttack.js";
export { resolveEnemyMaxHp, resolveEnemyDropTableId } from "./resolveEnemyStats.js";
export { playDamageFlash } from "./damageFlash.js";
export { PLAYER_CLASS_BASE_ATTACK } from "./config/playerStats.js";
export { ENEMY_BASE_STATS } from "./config/enemyBaseStats.js";
export { DROP_TABLES } from "./config/dropTables.js";

export function initCombatStats(scene) {
  if (!scene.combatStats) {
    scene.combatStats = { ...DEFAULT_COMBAT_SCALING };
  }
  initLootManager(scene);

  if (!scene._combatStatsUpdateHandler) {
    scene._combatStatsUpdateHandler = () => {
      if (scene._gameOverFrozen) return;
      updateLootPickups(scene);
      updateLootMagnetAndPickup(scene);
      updatePlayerCombat(scene);
    };
    scene.events.on("update", scene._combatStatsUpdateHandler);
    scene.events.once("shutdown", () => {
      scene.events.off("update", scene._combatStatsUpdateHandler);
      scene._combatStatsUpdateHandler = null;
    });
  }
}
