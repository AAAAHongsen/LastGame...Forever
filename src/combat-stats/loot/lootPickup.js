/** 能量球磁力吸引、拾取 tween 與多人 waveLootCollected 同步。 */
import { getNearestPlayerToPoint, grantOrbsToPlayer } from "./orbRewards.js";
import { unregisterLootPickup } from "./lootManager.js";
import { isMultiplayerScene } from "../../services/multiplayerSession.js";

const MAGNET_SPEED = 240;
const COLLECT_TWEEN_MS = 100;

function collectEnergyBall(scene, entity, playerEntry) {
  if (entity.collected || entity.collecting) return;
  entity.collecting = true;
  entity.collected = true;

  const ball = entity.sprite;
  if (!ball?.active) {
    unregisterLootPickup(scene, entity);
    return;
  }

  if (ball.body) {
    ball.body.enable = false;
    ball.setVelocity(0, 0);
  }

  const targetX = playerEntry.sprite.x;
  const targetY = playerEntry.sprite.y - 18;

  scene.tweens.add({
    targets: ball,
    x: targetX,
    y: targetY,
    scale: ball.scale * 0.4,
    alpha: 0.85,
    duration: COLLECT_TWEEN_MS,
    ease: "Quad.easeIn",
    onComplete: () => {
      entity.onPickup?.(playerEntry);
      grantOrbsToPlayer(scene, playerEntry, entity.value ?? 1);
      unregisterLootPickup(scene, entity);
      ball.destroy();

      // 多人模式：通知另一側略過重複球體。
      if (isMultiplayerScene(scene) && scene?.socket) {
        const lootId = entity._lootId ?? ball.getData?.("lootId");
        const playerIndex = (scene.players ?? []).indexOf(playerEntry);
        // 雙向 emit：本機端以 playerNumber 檢查略過自己的訊息。
        scene.socket.emit("waveLootCollected", { lootId, playerIndex });
      }

      scene.events?.emit?.("loot:collected", {
        kind: entity.kind,
        value: entity.value,
        player: playerEntry,
      });
    },
  });
}

/** 吸向最近玩家；進入拾取半徑自動收集。 */
export function updateLootMagnetAndPickup(scene) {
  const mgr = scene.lootManager;
  if (!mgr?.pickups?.length) return;

  for (const entity of [...mgr.pickups]) {
    if (entity.collected || entity.collecting) continue;
    const ball = entity.sprite;
    if (!ball?.active) continue;

    const nearest = getNearestPlayerToPoint(scene, ball.x, ball.y);
    if (!nearest) continue;

    const magnetR = entity.magnetRadius ?? 72;
    const pickupR = entity.pickupRadius ?? 22;

    if (nearest.dist <= pickupR) {
      collectEnergyBall(scene, entity, nearest.entry);
      continue;
    }

    if (nearest.dist <= magnetR) {
      if (ball.body) {
        ball.body.setAllowGravity(false);
      }
      const tx = nearest.entry.sprite.x;
      const ty = nearest.entry.sprite.y - 18;
      const angle = Phaser.Math.Angle.Between(ball.x, ball.y, tx, ty);
      ball.setVelocity(Math.cos(angle) * MAGNET_SPEED, Math.sin(angle) * MAGNET_SPEED);
    } else if (ball.body && !ball.body.allowGravity) {
      ball.body.setAllowGravity(true);
    }
  }
}
