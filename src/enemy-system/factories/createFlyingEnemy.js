/**
 * @param {Phaser.Scene} scene
 * @param {object} config
 * @param {number} x
 * @param {number} y
 */
export function createFlyingEnemy(scene, config, x, y) {
  const s = scene.physics.add.sprite(x, y, config.texture, 0);
  s.setCollideWorldBounds(true);
  s.setDepth(config.depth ?? 14);
  s.setScale(config.scale ?? 2);
  s.setOrigin(0.5, 0.5);
  if (s.body) {
    s.body.allowGravity = false;
    const sc = config.scale ?? 2;
    s.body.setSize(Math.round(32 * sc), Math.round(24 * sc));
  }
  if (config.idle) s.anims.play(config.idle, true);
  s.setVelocity(0, 0);
  return s;
}
