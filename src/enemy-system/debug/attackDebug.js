/**
 * 各敵人攻擊追蹤輔助的工廠（主控台除錯旗標）。
 */

export function createAttackDebugHelper(logPrefix, windowFlag) {
  function isEnabled() {
    return typeof window !== "undefined" && Boolean(window[windowFlag]);
  }

  function log(phase, payload) {
    if (!isEnabled()) return;
    // eslint-disable-next-line no-console — 略過主控台警告
    console.log(`[${logPrefix}] ${phase}`, payload);
  }

  return { isEnabled, log };
}
