import { BASE_HEIGHT, BASE_WIDTH } from "../config/constants.js";

export { BASE_HEIGHT, BASE_WIDTH };

export const GROUND_SURFACE_Y = BASE_HEIGHT - 30;

export const ENEMY_STATE = Object.freeze({
  IDLE: "idle",
  CHASE: "chase",
  LUNGE: "lunge",
  ATTACK: "attack",
  RECOVER: "recover",
  DEAD: "dead",
});
