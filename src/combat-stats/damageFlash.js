/**
 * 共用受傷閃爍 — 不改變動畫、速度或 AI 狀態。
 * @param {Phaser.Scene} scene 場景
 * @param {Phaser.GameObjects.GameObject} target 目標 — sprite／visual
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

/** 優先 visual sprite；否則使用物理 sprite。 */
export function getEnemyFlashTarget(enemy) {
  if (!enemy) return null;
  return enemy.visual ?? enemy.sprite ?? null;
}
