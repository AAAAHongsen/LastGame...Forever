/**
 * Shared hurt flicker — does not change anim state, velocity, or AI state.
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.GameObject} target — sprite / visual
 */
export function playDamageFlash(scene, target) {
  if (!target?.active) return;
  scene.tweens.killTweensOf(target);
  target.setAlpha(1);
  scene.tweens.add({
    targets: target,
    alpha: 0.35,
    duration: 80,
    yoyo: true,
    repeat: 2,
    onComplete: () => {
      if (target.active) target.setAlpha(1);
    },
  });
}

/** Prefer visual sprite; fall back to physics sprite. */
export function getEnemyFlashTarget(enemy) {
  if (!enemy) return null;
  return enemy.visual ?? enemy.sprite ?? null;
}
