import { getPlayers } from "../../enemy-system/combat/targeting.js";
import { roleKeyFromIndex } from "../../services/multiplayerSession.js";

/** 玩家 entry → HUD 玩家鍵（1 = 左／p1，2 = 右／p2）。 */
export function getHudPlayerKeyForEntry(scene, playerEntry) {
  const players = getPlayers(scene);
  const idx = players.indexOf(playerEntry);
  if (idx === 0) return 1;
  if (idx === 1) return 2;
  return null;
}

/** 為共用能量條下方顯示的玩家增加寶珠。
 *  房主與客戶端都會呼叫，但客戶端也會 emit `waveLootCollected`，
 *  讓房主對同一顆球略過重複發放。 */
export function grantOrbsToPlayer(scene, playerEntry, amount) {
  const hud = scene.hud;
  if (!hud?.setOrbs) return false;

  const playerKey = getHudPlayerKeyForEntry(scene, playerEntry);
  if (playerKey == null) return false;

  const roleKey = roleKeyFromIndex(playerKey - 1);
  const cur = Math.max(0, Math.round(Number(hud.orbs?.[roleKey]) || 0));
  const max = hud.orbsMax ?? 5;
  const add = Math.max(1, Math.round(Number(amount) || 1));
  const next = Math.min(max, cur + add);
  hud.setOrbs(playerKey, next);
  // 同步給夥伴，使其 HUD 立即反映新寶珠數。
  if (typeof scene?.emitPlayerResource === "function") {
    scene.emitPlayerResource({ roleKey, orbs: next });
  }
  return true;
}

/** 距離世界座標最近的存活玩家。 */
export function getNearestPlayerToPoint(scene, x, y) {
  const players = getPlayers(scene);
  let best = null;
  let bestD2 = Infinity;
  for (const p of players) {
    const s = p?.sprite;
    if (!s?.active) continue;
    const px = s.x;
    const py = s.y - 18;
    const d2 = (px - x) ** 2 + (py - y) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = p;
    }
  }
  return best ? { entry: best, dist: Math.sqrt(bestD2) } : null;
}
