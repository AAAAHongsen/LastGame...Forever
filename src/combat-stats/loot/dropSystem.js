import { rollDropTable } from "../config/dropTables.js";
import { spawnEnergyBallBurst } from "./energyBall.js";
import { isHostScene, isMultiplayerScene } from "../../services/multiplayerSession.js";

let _lootIdSeq = 0;
function nextLootId() { return ++_lootIdSeq; }

const ITEM_SPAWNERS = Object.freeze({
  energyball: (scene, x, y, count) => spawnEnergyBallBurst(scene, x, y, count),
});

/**
 * 依掉落表 id 在世界座標生成戰利品。
 * @param {Phaser.Scene} scene 場景
 * @param {string} tableId 掉落表 id
 * @param {number} x X 座標
 * @param {number} y Y 座標
 */
export function spawnDropsFromTable(scene, tableId, x, y, rng = Math.random) {
  const rolled = rollDropTable(tableId, rng);

  // 客戶端不本地擲掉落；等待房主明確 spawn 同步。
  if (isMultiplayerScene(scene) && !isHostScene(scene)) {
    return [];
  }

  const spawned = [];
  for (const drop of rolled) {
    const spawner = ITEM_SPAWNERS[drop.item];
    if (!spawner) {
      // eslint-disable-next-line no-console — 略過主控台警告
      console.warn("[combat-stats] Unknown drop item:", drop.item);
      continue;
    }
    const entities = spawner(scene, x, y, drop.count);
    // 指派唯一 ID，客戶端確認拾取時房主可去重。
    const lootIds = entities.map((e) => {
      const id = nextLootId();
      e._lootId = id;
      e.sprite?.setData?.("lootId", id);
      return id;
    });
    spawned.push(...entities);
    if (scene?.socket && isHostScene(scene)) {
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
