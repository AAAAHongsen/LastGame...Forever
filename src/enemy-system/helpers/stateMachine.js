/** 敵人狀態機 — IDLE／CHASE／ATTACK 等狀態切換輔助。 */
import { ENEMY_STATE } from "../constants.js";

export function createEnemyState(initial = ENEMY_STATE.IDLE) {
  return {
    current: initial,
    data: {},
  };
}

export function setEnemyState(enemy, state, patch = {}) {
  enemy.state = state;
  enemy.stateData = { ...enemy.stateData, ...patch };
}

export function isEnemyState(enemy, ...states) {
  return states.includes(enemy.state);
}

export { ENEMY_STATE };
