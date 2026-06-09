import { getNearestPlayerToPoint, grantOrbsToPlayer } from "./orbRewards.js";
import { unregisterLootPickup } from "./lootManager.js";

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

      // In multiplayer, tell the OTHER side to suppress its duplicate ball.
      const isMultiplayer = Boolean(
        scene?.roomCode &&
          (scene?.playerNumber === 1 || scene?.playerNumber === 2)
      );
      if (isMultiplayer && scene?.socket) {
        const lootId = entity._lootId ?? ball.getData?.("lootId");
        const playerIndex = (scene.players ?? []).indexOf(playerEntry);
        // Emit to both sides: the local side ignores its own message via playerNumber check.
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

/** Magnet toward nearest player; auto-collect within pickup radius. */
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
