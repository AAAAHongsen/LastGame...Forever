/**
 * Launch a physics projectile toward a world target using velocity + sprite rotation.
 * @param {Phaser.Physics.Arcade.Sprite} sprite
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 * @param {number} speed
 * @param {number} [rotationOffset=0] — add if art default facing ≠ angle 0 (right)
 */
export function launchToward(sprite, fromX, fromY, toX, toY, speed, rotationOffset = 0) {
  const angle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  sprite.setVelocity(vx, vy);
  sprite.setFlipX(false);
  sprite.setRotation(angle + rotationOffset);
  return { angle, vx, vy };
}

export function spawnOffsetAlongAngle(x, y, angle, distance) {
  return {
    x: x + Math.cos(angle) * distance,
    y: y + Math.sin(angle) * distance,
  };
}
