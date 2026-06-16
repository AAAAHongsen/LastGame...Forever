/**
 * 以速度 + sprite 旋轉朝世界目標發射物理投射物。
 * @param {Phaser.Physics.Arcade.Sprite} sprite 物理 sprite
 * @param {number} fromX 起點 X
 * @param {number} fromY 起點 Y
 * @param {number} toX 目標 X
 * @param {number} toY 目標 Y
 * @param {number} speed 速度
 * @param {number} [rotationOffset=0] — 美術預設朝向 ≠ 角度 0（右）時加上
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
