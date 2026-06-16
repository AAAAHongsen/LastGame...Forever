/** 敵人系統共用常數 — 畫布尺寸、地面高度、狀態列舉。 */
import { BASE_HEIGHT, BASE_WIDTH, GROUND_SURFACE_Y } from "../config/constants.js";

export { BASE_HEIGHT, BASE_WIDTH, GROUND_SURFACE_Y };

export const ENEMY_STATE = Object.freeze({
  IDLE: "idle",
  CHASE: "chase",
  LUNGE: "lunge",
  ATTACK: "attack",
  RECOVER: "recover",
  DEAD: "dead",
});
