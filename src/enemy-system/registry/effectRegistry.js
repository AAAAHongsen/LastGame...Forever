/** 特效種類 → 生成函式對照（除錯預覽與 bossActions 使用）。 */
import { spawnFallingFireball, spawnGroundedFirePreview } from "../effects/fireball.js";
import { spawnLaser } from "../effects/laser.js";
import {
  spawnLightBall,
  spawnLightBallBoomPreview,
  spawnLightBallPreview,
} from "../effects/lightBall.js";
import { spawnSoundWave } from "../effects/soundWave.js";
import { GROUND_SURFACE_Y } from "../constants.js";

/** 特效預覽／除錯生成（非戰鬥預警使用 add.sprite）。 */
export const EFFECTS = {
  soundWave: (scene, opts = {}) => {
    const { x, y } = opts;
    if (x != null) {
      const fx = scene.add.sprite(x, y, "test-soundattack-fx");
      fx.setDepth(20);
      fx.setScale(2.2);
      fx.anims.play("test-soundattack", true);
      fx.once("animationcomplete-test-soundattack", () => fx.destroy());
      return fx;
    }
    return spawnSoundWave(scene, opts);
  },

  lightBall: (scene, opts) => spawnLightBallPreview(scene, opts),
  lightBallBoom: (scene, opts) => spawnLightBallBoomPreview(scene, opts),
  lightBallCombat: (scene, opts) => spawnLightBall(scene, opts),

  laser: (scene, opts = {}) => {
    const { x, y, fromSprite } = opts;
    if (fromSprite) return spawnLaser(scene, { fromSprite });
    const fx = scene.add.sprite(x ?? 200, (y ?? 200) - 40, "test-laser-sheet");
    fx.setDepth(20);
    fx.setScale(2);
    fx.anims.play("test-laser-beam", true);
    return fx;
  },

  fallFireball: (scene, opts = {}) => {
    if (opts.fromBoss) return spawnFallingFireball(scene, opts);
    const { x, y } = opts;
    const fx = scene.add.sprite(x ?? 200, y ?? 100, "test-fall_fireball-sheet", 0);
    fx.setDepth(20);
    fx.setScale(3);
    fx.anims.play("test-fall_fireball", true);
    fx.once("animationcomplete-test-fall_fireball", () => {
      fx.anims.stop();
      fx.setFrame(5);
    });
    return fx;
  },

  groundedFire: (scene, opts = {}) => spawnGroundedFirePreview(scene, { x: opts.x, y: opts.y ?? GROUND_SURFACE_Y }),

};

export const COMBAT_EFFECTS = {
  soundWave: spawnSoundWave,
  lightBall: spawnLightBall,
  fallFireball: spawnFallingFireball,
  laser: spawnLaser,
};
