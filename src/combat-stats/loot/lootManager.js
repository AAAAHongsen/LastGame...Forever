/** 場景中可拾取戰利品註冊、更新與清除。 */
import { ENERGY_BALL_TEXTURE } from "./energyBallConfig.js";

export function initLootManager(scene) {
  if (scene.lootManager) return scene.lootManager;
  scene.lootManager = {
    pickups: [],
    group: scene.physics.add.group({ allowGravity: true }),
  };
  return scene.lootManager;
}

export function registerLootPickup(scene, entity) {
  const mgr = initLootManager(scene);
  if (entity?.sprite) mgr.group.add(entity.sprite);
  mgr.pickups.push(entity);
  return entity;
}

export function unregisterLootPickup(scene, entity) {
  const mgr = scene.lootManager;
  if (!mgr || !entity) return;
  const idx = mgr.pickups.indexOf(entity);
  if (idx >= 0) mgr.pickups.splice(idx, 1);
  if (entity.sprite) mgr.group.remove(entity.sprite, true, true);
}

export function updateLootPickups(scene) {
  const mgr = scene.lootManager;
  if (!mgr) return;
  for (let i = mgr.pickups.length - 1; i >= 0; i -= 1) {
    const entity = mgr.pickups[i];
    if (!entity?.sprite?.active) {
      mgr.pickups.splice(i, 1);
    }
  }
}

export function clearLootPickups(scene) {
  const mgr = scene.lootManager;
  if (!mgr) return;
  for (const entity of mgr.pickups) {
    entity.sprite?.destroy?.();
  }
  mgr.pickups = [];
  mgr.group?.clear?.(true, true);
}

/** 預載能量球圖（在 scene preload 呼叫）。 */
export function preloadCombatLootAssets(scene) {
  scene.load.image(ENERGY_BALL_TEXTURE, "Assets/effects/energyball/energy_ball.png");
}
