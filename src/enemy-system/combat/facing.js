import { ENEMY_STATE } from "../constants.js";

/** @typedef {'right-art' | 'left-default'} FacingMode */

export function faceTowardPlayer(sprite, playerX, mode = "left-default") {
  const dx = playerX - sprite.x;
  if (mode === "right-art") sprite.setFlipX(dx < 0);
  else sprite.setFlipX(dx > 0);
}

export function playerInFront(sprite, playerX, margin = 8) {
  const dx = playerX - sprite.x;
  const facingRight = !sprite.flipX;
  return facingRight ? dx > -margin : dx < margin;
}

export function canTurn(enemy) {
  return enemy.state !== ENEMY_STATE.ATTACK && enemy.state !== ENEMY_STATE.RECOVER;
}
