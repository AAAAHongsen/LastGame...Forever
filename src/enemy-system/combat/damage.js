import { getPlayers } from "./targeting.js";
import { checkAndOpenGameOver } from "../../services/gameOverOverlay.js";
import { playDamageFlash } from "../../combat-stats/damageFlash.js";
import { playPlayerHurtSfx } from "../../services/audioService.js";
import { isHostScene, isMultiplayerScene } from "../../services/multiplayerSession.js";

/** 透過 wave sync + playerResource 通道將目前 HUD HP 推送到客戶端。 */
function syncPlayerHpState(scene) {
  scene.waveManager?.syncPlayerHp?.();
  if (typeof scene.emitPlayerResource === "function") {
    scene.emitPlayerResource({
      hp: {
        p1: scene.hud?.health?.p1,
        p2: scene.hud?.health?.p2,
      },
    });
  }
}

/**
 * 對單一玩家 entry 套用敵人傷害。
 * 多人模式以房主為權威 — 客戶端提早 return。
 */
export function damagePlayerEntry(scene, playerEntry, amount) {
  if (isMultiplayerScene(scene) && !isHostScene(scene)) return;

  if (!playerEntry) return;

  // 第 4 波：戰士大招期間雙方不受傷。
  if (scene?.arePlayersInvincible?.()) return;

  const idx = getPlayers(scene).indexOf(playerEntry);
  const playerKey = idx === 1 ? 2 : 1;
  const hud = scene.hud;
  if (hud?.health?.p1 != null && hud?.setHealth) {
    const role = playerKey === 2 ? "p2" : "p1";
    const cur = Math.max(0, Math.round(Number(hud.health?.[role]) || 0));
    hud.setHealth(playerKey, Math.max(0, cur - Math.max(1, Math.round(Number(amount) || 1))));
    checkAndOpenGameOver(scene);
    syncPlayerHpState(scene);
    if (playerEntry.visual) {
      playDamageFlash(scene, playerEntry.visual);
    }
    playPlayerHurtSfx(scene);
  }
}
