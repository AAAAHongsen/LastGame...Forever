import { BASE_WIDTH } from "../constants.js";

const LASER_DURATION_MS  = 5000;
const LASER_DAMAGE_PER_S = 20;

export function spawnLaser(scene, { fromSprite, ownerEnemy } = {}) {
  if (!fromSprite) return null;

  const bossDepth = fromSprite.depth ?? 15;
  const faceLeft  = Boolean(fromSprite.flipX);
  // Lift beam higher so standing on lower ground under Gorgon won't get clipped.
  const y         = fromSprite.y - 80;

  // Use physics sprite so it can participate in the hazards overlap.
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

  // Tag for continuous damage via hazards overlap.
  fx.setData("fixedDamage", LASER_DAMAGE_PER_S);
  if (ownerEnemy) fx.setData("ownerEnemy", ownerEnemy);

  // Add to hazards group so combatSystem.js handles per-second damage.
  if (scene.projectileSystem?.hazards) {
    scene.projectileSystem.hazards.add(fx);
  }

  scene.time.delayedCall(LASER_DURATION_MS, () => { if (fx?.active) fx.destroy(); });
  return fx;
}
