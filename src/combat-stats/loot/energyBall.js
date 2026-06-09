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

/**
 * Generate the random scatter params for a burst (host computes these, then
 * ships them to the client so both sides spawn an identical-looking burst).
 * @returns {Array<{ox:number, oy:number, vx:number, vy:number}>}
 */
export function makeBurstParams(count, spreadPx = 18) {
  const params = [];
  for (let i = 0; i < count; i += 1) {
    params.push({
      ox: (Math.random() - 0.5) * spreadPx * 2,
      oy: -Math.random() * spreadPx,
      vx: (Math.random() - 0.5) * 80,
      vy: -40 - Math.random() * 60,
    });
  }
  return params;
}

/**
 * Small spread so multiple drops don't stack perfectly.
 * Pass `opts.params` (from makeBurstParams) to spawn a deterministic burst that
 * matches across host/client; otherwise random params are generated locally.
 */
export function spawnEnergyBallBurst(scene, x, y, count, opts = {}) {
  const spreadPx = opts.spreadPx ?? 18;
  const params = Array.isArray(opts.params) ? opts.params : makeBurstParams(count, spreadPx);
  const spawned = [];
  for (let i = 0; i < count; i += 1) {
    const p = params[i] ?? { ox: 0, oy: 0, vx: 0, vy: 0 };
    const entity = createEnergyBallEntity(scene, x + p.ox, y + p.oy);
    if (entity.sprite.body) {
      entity.sprite.setVelocity(p.vx, p.vy);
    }
    spawned.push(entity);
  }
  return spawned;
}
