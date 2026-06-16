/**
 * 多人連線工作階段輔助 — 房間／角色判斷的單一來源。
 * 房主（player1）在連線對戰中擁有戰鬥、波次與戰利品權威。
 */

/** 場景為進行中的雙人連線對戰時為 true。 */
export function isMultiplayerScene(scene) {
  return Boolean(scene?.roomCode && (scene?.playerNumber === 1 || scene?.playerNumber === 2));
}

/** 單人／測試房，或多人中的 player1（波次／戰鬥權威）時為 true。 */
export function isHostScene(scene) {
  if (!isMultiplayerScene(scene)) return true;
  return scene.playerNumber === 1;
}

/** scene.players 中本機控制玩家的索引（0 或 1）。 */
export function getLocalPlayerIndex(scene) {
  if (!isMultiplayerScene(scene)) return 0;
  return scene.playerNumber === 2 ? 1 : 0;
}

/** 由 scene.players 索引（0 | 1）對應 HUD 玩家鍵（1 | 2）。 */
export function playerKeyFromIndex(index) {
  return index === 0 ? 1 : 2;
}

/** 由 scene.players 索引（0 | 1）對應 HUD 角色鍵（"p1" | "p2"）。 */
export function roleKeyFromIndex(index) {
  return index === 0 ? "p1" : "p2";
}
