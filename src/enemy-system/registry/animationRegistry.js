function frameRange(n) {
  return Array.from({ length: n }, (_, i) => i);
}

/** Data-driven animation definitions. */
export const ANIMATIONS = [
  { key: "test-mushroom-run", texture: "test-mushroom-run", start: 0, end: 7, frameRate: 12, repeat: -1 },
  { key: "test-mushroom-lunge", texture: "test-mushroom-run", start: 0, end: 7, frameRate: 12, repeat: 0 },
  { key: "test-mushroom-idle", texture: "test-mushroom-idle", start: 0, end: 6, frameRate: 8, repeat: -1 },
  { key: "test-mushroom-attack", texture: "test-mushroom-attack", start: 0, end: 9, frameRate: 14, repeat: 0 },

  { key: "test-bat-run", texture: "test-bat-run", start: 0, end: 7, frameRate: 12, repeat: -1 },
  { key: "test-bat-idle", texture: "test-bat-idle", start: 0, end: 8, frameRate: 10, repeat: -1 },
  { key: "test-bat-attack", texture: "test-bat-attack", start: 0, end: 10, frameRate: 14, repeat: 0 },

  { key: "test-skeleton-walk", texture: "test-skeleton-walk", start: 0, end: 9, frameRate: 12, repeat: -1 },
  { key: "test-skeleton-idle", texture: "test-skeleton-idle", start: 0, end: 7, frameRate: 8, repeat: -1 },
  { key: "test-skeleton-attack", texture: "test-skeleton-attack", start: 0, end: 8, frameRate: 14, repeat: 0 },

  { key: "test-flyboss-fly", texture: "test-flyboss-fly", start: 0, end: 5, frameRate: 10, repeat: -1 },
  { key: "test-flyboss-idle-ground", texture: "test-flyboss-idle-ground", start: 0, end: 14, frameRate: 10, repeat: -1 },
  { key: "test-flyboss-atk-ground", texture: "test-flyboss-atk-ground", start: 0, end: 8, frameRate: 12, repeat: 0 },

  { key: "test-gorgon-idle", texture: "test-gorgon-idle", start: 0, end: 4, frameRate: 6, repeat: -1 },
  { key: "test-gorgon-stomp", texture: "test-gorgon-stomp", start: 0, end: 15, frameRate: 12, repeat: 0 },
  { key: "test-gorgon-melee", texture: "test-gorgon-melee", start: 0, end: 6, frameRate: 12, repeat: 0 },
  { key: "test-gorgon-beam", texture: "test-gorgon-beam", start: 0, end: 9, frameRate: 12, repeat: 0 },
  { key: "test-gorgon-summon", texture: "test-gorgon-summon", start: 0, end: 4, frameRate: 10, repeat: 0 },

  { key: "test-lightball-move", texture: "test-lightball-sheet", start: 0, end: 3, frameRate: 12, repeat: 0 },
  { key: "test-lightball-boom", texture: "test-lightball-boom-sheet", start: 0, end: 3, frameRate: 14, repeat: 0 },
  { key: "test-laser-beam", texture: "test-laser-sheet", start: 0, end: 11, frameRate: 16, repeat: 0 },
  {
    key: "test-soundattack",
    texture: "test-soundattack-fx",
    frames: frameRange(3),
    frameRate: 12,
    repeat: 0,
  },

  { key: "test-fall_fireball", texture: "test-fall_fireball-sheet", start: 0, end: 5, frameRate: 14, repeat: 0 },
  { key: "test-grounded_fire", texture: "test-Grounded_fireball-sheet", start: 0, end: 3, frameRate: 12, repeat: -1 },
];
