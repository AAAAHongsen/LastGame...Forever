import { registerLootPickup } from "./lootManager.js";
import { ENERGY_BALL_DEFAULTS, ENERGY_BALL_TEXTURE } from "./energyBallConfig.js";

/**
 * Reusable energy ball pickup entity (pickup / magnet hooks ready).
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {object} [opts]
 */
export function createEnergyBallEntity(scene, x, y, opts = {}) {
  const cfg = { ...ENERGY_BALL_DEFAULTS, ...opts };
  const sprite = scene.physics.add.sprite(x, y, ENERGY_BALL_TEXTURE);
  sprite.setDepth(cfg.depth);
  sprite.setScale(cfg.scale);
  sprite.setBounce(cfg.bounce);
  sprite.setCollideWorldBounds(true);

  if (sprite.body) {
    const size = cfg.bodySize;
    sprite.body.setSize(size, size, true);
    sprite.body.setAllowGravity(true);
  }

  if (scene.platformBodies) {
    scene.physics.add.collider(sprite, scene.platformBodies);
  }

  const entity = {
    kind: "energyball",
    sprite,
    value: cfg.value,
    pickupRadius: cfg.pickupRadius,
    magnetRadius: cfg.magnetRadius,
    collected: false,
    /** Future: scene.events.emit('loot:pickup', entity, playerEntry) */
    onPickup(playerEntry) {
      if (this.collected) return false;
      this.collected = true;
      return { kind: this.kind, value: this.value, player: playerEntry };
    },
  };

  sprite.setData("lootEntity", entity);
  registerLootPickup(scene, entity);
  return entity;
}

/** Small spread so multiple drops don't stack perfectly. */
export function spawnEnergyBallBurst(scene, x, y, count, spreadPx = 18) {
  const spawned = [];
  for (let i = 0; i < count; i += 1) {
    const ox = (Math.random() - 0.5) * spreadPx * 2;
    const oy = -Math.random() * spreadPx;
    const entity = createEnergyBallEntity(scene, x + ox, y + oy);
    if (entity.sprite.body) {
      entity.sprite.setVelocity((Math.random() - 0.5) * 80, -40 - Math.random() * 60);
    }
    spawned.push(entity);
  }
  return spawned;
}
