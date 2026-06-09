import { BASE_HEIGHT, BASE_WIDTH } from "../constants.js";

export function isOutOfBounds(sprite) {
  return (
    !sprite ||
    sprite.x < -80 ||
    sprite.x > BASE_WIDTH + 80 ||
    sprite.y < -120 ||
    sprite.y > BASE_HEIGHT + 120
  );
}

export function destroyProjectile(projectile) {
  projectile?.destroy?.();
}

export function destroyEnemy(enemy) {
  if (!enemy) return;
  const s = enemy.sprite;
  if (s?.anims) {
    s.removeAllListeners?.("animationcomplete");
    s.removeAllListeners?.("animationupdate");
  }
  enemy.sprite?.destroy?.();
  if (enemy.sprite && enemy.visual && enemy.visual !== enemy.sprite) {
    enemy.visual.destroy();
  }
  enemy.sprite = null;
  enemy.visual = null;
}

export function cleanupOutOfBounds(scene) {
  const groups = [scene.projectileSystem?.group, scene.projectileSystem?.hazards];
  for (const group of groups) {
    for (const ch of group?.getChildren?.() ?? []) {
      if (ch?.active && isOutOfBounds(ch)) destroyProjectile(ch);
    }
  }
  for (const enemy of scene.enemyManager?.enemies ?? []) {
    if (enemy.type?.startsWith?.("fx-") && enemy.sprite && isOutOfBounds(enemy.sprite)) {
      destroyEnemy(enemy);
    }
  }
}
