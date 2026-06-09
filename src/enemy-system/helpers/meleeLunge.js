/**
 * Short forward burst at attack start (not a teleport).
 * @returns {Promise<void>}
 */
export function meleeLunge(scene, sprite, pixels, durationMs = 80, direction = null) {
  if (!sprite?.active || !pixels) return Promise.resolve();
  const dir = typeof direction === "number" ? Math.sign(direction) || 1 : sprite.flipX ? -1 : 1;
  return new Promise((resolve) => {
    scene.tweens.add({
      targets: sprite,
      x: sprite.x + dir * pixels,
      duration: durationMs,
      ease: "Quad.easeOut",
      onComplete: () => resolve(),
    });
  });
}
