import { BASE_WIDTH } from "../constants.js";

const LASER_DURATION_MS  = 5000;
const LASER_DAMAGE_PER_S = 20;

export function spawnLaser(scene, { fromSprite, ownerEnemy } = {}) {
  if (!fromSprite) return null;

  const bossDepth = fromSprite.depth ?? 15;
  const faceLeft  = Boolean(fromSprite.flipX);
  // 提高光束，避免站在 Gorgon 下方低地時被裁切。
  const y         = fromSprite.y - 80;

  // 使用物理 sprite 以參與 hazards overlap。
  const fx = scene.physics.add.sprite(0, y, "test-laser-sheet", 0);
  fx.setDepth(bossDepth - 1);
  fx.setScale(2);
  fx.setFlipY(true);
  fx.anims.play("test-laser-beam", true);
  if (fx.body) {
    fx.body.setAllowGravity(false);
    fx.body.setImmovable(true);
  }

  if (faceLeft) {
    const ax = fromSprite.x - 150;
    fx.setOrigin(1, 0.5);
    fx.setPosition(ax, y);
    fx.displayWidth = Math.max(10, ax);
    if (fx.body) fx.body.setSize(Math.max(10, ax), 28);
  } else {
    const ax = fromSprite.x + 150;
    fx.setOrigin(0, 0.5);
    fx.setPosition(ax, y);
    fx.displayWidth = Math.max(10, BASE_WIDTH - ax);
    if (fx.body) fx.body.setSize(Math.max(10, BASE_WIDTH - ax), 28);
  }

  // 標記以透過 hazards overlap 持續傷害。
  fx.setData("fixedDamage", LASER_DAMAGE_PER_S);
  if (ownerEnemy) fx.setData("ownerEnemy", ownerEnemy);

  // 加入 hazards 群組，由 combatSystem.js 處理每秒傷害。
  if (scene.projectileSystem?.hazards) {
    scene.projectileSystem.hazards.add(fx);
  }

  scene.time.delayedCall(LASER_DURATION_MS, () => { if (fx?.active) fx.destroy(); });
  return fx;
}
