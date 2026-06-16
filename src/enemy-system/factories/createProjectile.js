/**
 * 通用投射物工廠。
 * @param {Phaser.Scene} scene 場景
 * @param {object} options 建立選項
 * @returns {Phaser.Physics.Arcade.Sprite|null} 建立的投射物或 null
 */
export function createProjectile(scene, options) {
  const {
    x,
    y,
    texture,
    frame = 0,
    scale = 1,
    depth = 22,
    originX = 0.5,
    originY = 0.5,
    velocityX = 0,
    velocityY = 0,
    bodyWidth,
    bodyHeight,
    bodyOffsetX = 0,
    bodyOffsetY = 0,
    allowGravity = false,
    kind = "generic",
    rotation = 0,
    flipX = false,
    animKey,
    animRepeat = false,
    addToGroup = true,
  } = options;

  const sprite = scene.physics.add.sprite(x, y, texture, frame);
  sprite.setDepth(depth);
  sprite.setScale(scale);
  sprite.setOrigin(originX, originY);
  sprite.setFlipX(flipX);
  sprite.setData("testProjKind", kind);

  if (sprite.body) {
    sprite.body.setAllowGravity(allowGravity);
    if (bodyWidth != null && bodyHeight != null) {
      sprite.body.setSize(bodyWidth, bodyHeight, false);
      sprite.body.setOffset(bodyOffsetX, bodyOffsetY);
    }
  }

  sprite.setRotation(rotation);

  if (addToGroup && scene.projectileSystem?.group) {
    scene.projectileSystem.group.add(sprite);
  }

  sprite.setVelocity(velocityX, velocityY);
  if (sprite.body) {
    sprite.body.velocity.x = velocityX;
    sprite.body.velocity.y = velocityY;
  }

  if (animKey) {
    sprite.anims.play(animKey, animRepeat);
  }

  return sprite;
}
