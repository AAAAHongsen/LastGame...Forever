/** 啟用：`enemyDebug.skeletonTrace(true)` 或 `window.__skeletonAttackDebug = true` */
import { createAttackDebugHelper } from "./attackDebug.js";

const helper = createAttackDebugHelper("skeleton-attack", "__skeletonAttackDebug");

export function isSkeletonAttackDebug() {
  return helper.isEnabled();
}

export function skeletonAttackLog(phase, payload) {
  helper.log(phase, payload);
}
