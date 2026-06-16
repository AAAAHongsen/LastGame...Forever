import { rollDropTable } from "../config/dropTables.js";
import { spawnEnergyBallBurst } from "./energyBall.js";

let _lootIdSeq = 0;
function nextLootId() { return ++_lootIdSeq; }

const ITEM_SPAWNERS = Object.freeze({
  energyball: (scene, x, y, count) => spawnEnergyBallBurst(scene, x, y, count),
});

/**
 * Spawn loot from a drop table id at world position.
 * @param {Phaser.Scene} scene
 * @param {string} tableId
 * @param {number} x
 * @param {number} y
 */
export function spawnDropsFromTable(scene, tableId, x, y, rng = Math.random) {
  const rolled = rollDropTable(tableId, rng);
  const isMultiplayer = Boolean(scene?.roomCode && (scene?.playerNumber === 1 || scene?.playerNumber === 2));
  const isHost = !isMultiplayer || scene?.playerNumber === 1;

  // Client does not roll local loot; it waits for host's explicit spawn sync.
  if (isMultiplayer && !isHost) {
    return [];
  }

  const spawned = [];
  for (const drop of rolled) {
    const spawner = ITEM_SPAWNERS[drop.item];
    if (!spawner) {
      // eslint-disable-next-line no-console
      console.warn("[combat-stats] Unknown drop item:", drop.item);
      continue;
    }
    const entities = spawner(scene, x, y, drop.count);
    // Assign unique IDs so the host can deduplicate when client confirms pickup.
    const lootIds = entities.map((e) => {
      const id = nextLootId();
      e._lootId = id;
      e.sprite?.setData?.("lootId", id);
      return id;
    });
    spawned.push(...entities);
    if (scene?.socket && isHost) {
      scene.socket.emit("waveLootSpawn", {
        item: drop.item,
        count: drop.count,
        x,
        y,
        lootIds,
      });
    }
  }
  return spawned;
}

export function spawnDropsForEnemyDeath(scene, enemy) {
  const tableId = enemy?.config?.drops ?? enemy?.drops ?? "normal";
  const sprite = enemy?.sprite;
  if (!sprite) return [];
  return spawnDropsFromTable(scene, tableId, sprite.x, sprite.y - 20);
}
