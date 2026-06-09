/**
 * @param {Phaser.Scene} scene
 * @param {object} config — ENEMY_TYPES entry
 * @param {number} x
 * @param {number} y
 */
export function createGroundEnemy(scene, config, x, y) {
  const s = scene.physics.add.sprite(x, y, config.texture, 0);
  s.setCollideWorldBounds(true);
  s.setBounce(0.02);
  s.setDepth(config.depth ?? 14);
  s.setScale(config.scale ?? 1);
  s.setOrigin(0.5, 1);

  if (config.spawn?.flipX) s.setFlipX(true);

  // Ground enemies should fall by default; allow registry override per-enemy.
  if (s.body) {
    const allowGravity = config.physics?.allowGravity;
    if (typeof allowGravity === "boolean") s.body.setAllowGravity(allowGravity);
    else s.body.setAllowGravity(true);
  }

  const body = config.body;
  if (body && s.body) {
    const fw = s.frame?.realWidth ?? 0;
    const fh = s.frame?.realHeight ?? 0;
    const useCenter = body.useCenteredOffset !== false;
    const offX = useCenter ? Math.max(0, Math.floor((fw - body.width) / 2)) : (body.offsetX ?? 0);
    const offY = useCenter ? Math.max(0, Math.floor(fh - body.height)) : (body.offsetY ?? 0);
    s.body.setSize(body.width, body.height, false);
    s.body.setOffset(body.offsetX ?? offX, body.offsetY ?? offY);
  }

  scene.physics.add.collider(s, scene.platformBodies);
  if (config.idle) s.anims.play(config.idle, true);
  s.setVelocity(0, 0);
  return s;
}
