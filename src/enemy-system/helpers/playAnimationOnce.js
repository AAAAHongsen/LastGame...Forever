/**
 * 播放單次動畫，完成時 resolve（比對 key）。
 * @returns {Promise<Phaser.Animations.Animation>} 動畫完成時 resolve
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
 * 綁定單一幀索引的 animationupdate；自動移除敵人上先前儲存的 handler。
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
