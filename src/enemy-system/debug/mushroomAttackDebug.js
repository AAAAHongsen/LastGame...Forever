/** 啟用：`enemyDebug.mushroomTrace(true)` 或 `window.__mushroomAttackDebug = true` */
import { createAttackDebugHelper } from "./attackDebug.js";

const helper = createAttackDebugHelper("mushroom-attack", "__mushroomAttackDebug");

export function isMushroomAttackDebug() {
  return helper.isEnabled();
}

export function mushroomAttackLog(phase, payload) {
  helper.log(phase, payload);
}
