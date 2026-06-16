/** 依 Phaser 動畫 metadata 估算時長（毫秒）。 */
export function getAnimDurationMs(scene, key) {
  const anim = key ? scene.anims?.get?.(key) : null;
  if (!anim?.frames?.length) return 500;
  return (anim.frames.length / (anim.frameRate || 12)) * 1000;
}
