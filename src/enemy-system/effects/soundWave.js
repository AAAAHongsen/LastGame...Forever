import { launchToward, spawnOffsetAlongAngle } from "../combat/projectileLaunch.js";
import { getNearestPlayer } from "../combat/targeting.js";
import { createProjectile } from "../factories/createProjectile.js";

export function spawnSoundWave(scene, { fromSprite, target, speed: speedOpt } = {}) {
  if (!fromSprite) return null;

  const player = target ?? getNearestPlayer(scene, fromSprite);
  const targetSprite = player?.sprite ?? target;
  const tx = targetSprite?.x ?? fromSprite.x + 120;
  const ty = targetSprite?.y ?? fromSprite.y;

  const ox = fromSprite.x;
  const oy = fromSprite.y;
  const angle = Phaser.Math.Angle.Between(ox, oy, tx, ty);
  const spawn = spawnOffsetAlongAngle(ox, oy, angle, 10);
  const speed = speedOpt ?? scene._lastSoundWaveSpeed ?? 300;

  const s = createProjectile(scene, {
    x: spawn.x,
    y: spawn.y,
    texture: "test-soundattack-fx",
    scale: 2.2,
    kind: "soundWave",
    bodyWidth: 12,
    bodyHeight: 20,
    bodyOffsetX: 2,
    bodyOffsetY: 6,
    animKey: "test-soundattack",
    animRepeat: true,
    flipX: false,
  });

  launchToward(s, spawn.x, spawn.y, tx, ty, speed, 0);

  s.once("animationcomplete-test-soundattack", () => {
    if (!s.active) return;
    s.anims.stop();
    s.setFrame(2);
  });

  return s;
}

/** @param {number} speed */
export function setSoundWaveSpeed(scene, speed) {
  scene._lastSoundWaveSpeed = speed;
}
