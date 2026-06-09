import { ANIMATIONS } from "../registry/animationRegistry.js";

export function createEnemyAnimations(scene) {
  for (const def of ANIMATIONS) {
    if (scene.anims.exists(def.key)) continue;

    if (def.frames) {
      scene.anims.create({
        key: def.key,
        frames: def.frames.map((f) => ({ key: def.texture, frame: f })),
        frameRate: def.frameRate,
        repeat: def.repeat ?? -1,
      });
    } else {
      scene.anims.create({
        key: def.key,
        frames: scene.anims.generateFrameNumbers(def.texture, { start: def.start, end: def.end }),
        frameRate: def.frameRate,
        repeat: def.repeat ?? -1,
      });
    }
  }
}
