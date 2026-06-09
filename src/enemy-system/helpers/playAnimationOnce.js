/**
 * Play a one-shot animation and resolve when it completes (key-matched).
 * @returns {Promise<Phaser.Animations.Animation>}
 */
export function playAnimationOnce(sprite, key) {
  return new Promise((resolve) => {
    if (!sprite?.anims) {
      resolve(null);
      return;
    }
    sprite.anims.play(key, false);
    const onDone = (anim) => {
      if (anim?.key !== key) return;
      sprite.off("animationcomplete", onDone);
      resolve(anim);
    };
    sprite.once("animationcomplete", onDone);
  });
}

/**
 * Bind animationupdate for a single frame index; auto-removes prior handler stored on enemy.
 */
export function onAnimationFrame(sprite, animKey, frameIndex, enemy, handlerKey, fn) {
  const prev = enemy[handlerKey];
  if (prev) sprite.off("animationupdate", prev);
  const wrapped = (_anim, frame) => {
    if (sprite.anims.currentAnim?.key !== animKey) return;
    if (frame.index === frameIndex) fn();
  };
  enemy[handlerKey] = wrapped;
  sprite.on("animationupdate", wrapped);
}

export function clearAnimationFrameHandler(sprite, enemy, handlerKey) {
  const prev = enemy[handlerKey];
  if (prev) sprite.off("animationupdate", prev);
  enemy[handlerKey] = null;
}
