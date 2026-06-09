import { BASE_HEIGHT, BASE_WIDTH } from "../constants.js";

/**
 * Registry-driven enemy definitions.
 * Add new enemies here — core systems should not need if-else branches.
 */
export const ENEMY_TYPES = {
  mushroom: {
    kind: "ground",
    texture: "test-mushroom-idle",
    idle: "test-mushroom-idle",
    lunge: "test-mushroom-lunge",
    attack: "test-mushroom-attack",
    scale: 1.3,
    depth: 14,
    facing: "left-default",
    physics: { allowGravity: true },
    body: { width: 24, height: 40, offsetX: 25, offsetY: 24 },
    ai: "mushroomMelee",
    drops: "normal",
    stats: {
      baseHp: 5,
      damage: 6,
      detectRange: 400,
      detectRangeMode: "x",
      verticalTolerance: 40,
      cooldown: 2000,
    },
    melee: {
      lungePx: 20,
      /** Horizontal gap allowed before lunge (player can be this far; mushroom closes via lunge). */
      engageSlack: 90,
      recovery: 1000,
    },
  },

  skeleton: {
    kind: "ground",
    texture: "test-skeleton-idle",
    idle: "test-skeleton-idle",
    walk: "test-skeleton-walk",
    attack: "test-skeleton-attack",
    scale: 1,
    depth: 14,
    facing: "right-art",
    body: { width: 34, height: 48 },
    ai: "skeletonMelee",
    drops: "normal",
    stats: {
      baseHp: 20,
      damage: 6,
      /** Spot player (far). */
      detectRange: 400,
      /** Keep chasing while player within this (mid). */
      chaseRange: 280,
      chaseSpeed: 85,
      detectRangeMode: "x",
      verticalTolerance: 40,
      cooldown: 2000,
    },
    melee: {
      /** Hold ~20px body gap from player before attacking (not player origin). */
      standoffPx: 20,
      standoffTolerance: 8,
      attackSlack: 6,
      activeFrames: [3, 4, 5, 6],
      hitbox: { width: 32, height: 26, forwardPad: 0, offsetY: -4 },
      recovery: 0,
    },
  },

  bat: {
    kind: "flying",
    texture: "test-bat-idle",
    idle: "test-bat-idle",
    attack: "test-bat-attack",
    scale: 2.2,
    depth: 14,
    facing: "left-default",
    spawnOffset: { y: -40 },
    ai: "ranged",
    drops: "normal",
    stats: { baseHp: 15, damage: 6, detectRange: 320, cooldown: 3000 },
    ranged: { effect: "soundWave", attackDelay: 220, projectileSpeed: 300 },
  },

  flyBoss: {
    kind: "flying",
    texture: "test-flyboss-fly",
    idle: "test-flyboss-fly",
    scale: 2,
    depth: 14,
    facing: "right-art",
    spawnOffset: { y: -80 },
    ai: "boss",
    drops: "flyboss",
    stats: { baseHp: 200, damage: 12 },
    boss: { lightBall: true },
  },

  flyBossGround: {
    kind: "ground",
    texture: "test-flyboss-idle-ground",
    idle: "test-flyboss-idle-ground",
    scale: 2,
    depth: 14,
    body: { width: 100, height: 70, offsetX: 40, offsetY: 40, useCenteredOffset: false },
    ai: "boss",
    drops: "flyboss",
    stats: { baseHp: 200 },
  },

  groundBoss: {
    kind: "ground",
    texture: "test-gorgon-idle",
    idle: "test-gorgon-idle",
    stomp: "test-gorgon-stomp",
    beam: "test-gorgon-beam",
    melee: "test-gorgon-melee",
    scale: 3.6,
    depth: 15,
    facing: "right-art",
    body: { width: 70, height: 100 },
    spawn: { x: BASE_WIDTH - 76, y: BASE_HEIGHT - 50, flipX: true },
    ai: "boss",
    drops: "gorgon",
    stats: { baseHp: 500 },
    boss: {
      stompFrame: 8,
      beamFrame: 8,
      beamHoldMs: 500,
      fireballSpawnY: 72,
      fireballFallSpeed: 260,
    },
  },
};

export function getEnemyConfig(type) {
  return ENEMY_TYPES[type] ?? null;
}
