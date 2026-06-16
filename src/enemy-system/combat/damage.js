import { getPlayers } from "./targeting.js";
import { checkAndOpenGameOver } from "../../services/gameOverOverlay.js";
import { playDamageFlash } from "../../combat-stats/damageFlash.js";
import { playPlayerHurtSfx } from "../../services/audioService.js";

export function damagePlayerEntry(scene, playerEntry, amount) {
  // Multiplayer authority: only host (player1) applies player HP changes.
  const isMultiplayer = Boolean(scene?.roomCode && (scene?.playerNumber === 1 || scene?.playerNumber === 2));
  if (isMultiplayer && scene?.playerNumber !== 1) return;

  if (!playerEntry) return;

  // Wave 4: during the warrior's ULT, both players take no damage.
  if (scene?.arePlayersInvincible?.()) return;

  const idx = getPlayers(scene).indexOf(playerEntry);
  const playerKey = idx === 1 ? 2 : 1;
  const hud = scene.hud;
  if (hud?.health?.p1 != null && hud?.setHealth) {
    const role = playerKey === 2 ? "p2" : "p1";
    const cur = Math.max(0, Math.round(Number(hud.health?.[role]) || 0));
    hud.setHealth(playerKey, Math.max(0, cur - Math.max(1, Math.round(Number(amount) || 1))));
    checkAndOpenGameOver(scene);
    // Sync updated HP to client via wave manager (host only)
    scene.waveManager?.syncPlayerHp?.();
    // Also sync through playerResource channel so HUD state stays aligned.
    if (typeof scene.emitPlayerResource === "function") {
      scene.emitPlayerResource({
        hp: {
          p1: scene.hud?.health?.p1,
          p2: scene.hud?.health?.p2,
        },
      });
    }
    if (playerEntry.visual) {
      playDamageFlash(scene, playerEntry.visual);
    }
    playPlayerHurtSfx(scene);
  }
}
