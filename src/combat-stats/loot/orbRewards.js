import { getPlayers } from "../../enemy-system/combat/targeting.js";

/** Map player entry → HUD player key (1 = left / p1, 2 = right / p2). */
export function getHudPlayerKeyForEntry(scene, playerEntry) {
  const players = getPlayers(scene);
  const idx = players.indexOf(playerEntry);
  if (idx === 0) return 1;
  if (idx === 1) return 2;
  return null;
}

/** Add orbs to the player shown below the shared energy bar.
 *  Both host and client call this, but the client also emits `waveLootCollected`
 *  so the host can suppress its own grant for the same ball (no double-grant). */
export function grantOrbsToPlayer(scene, playerEntry, amount) {
  const hud = scene.hud;
  if (!hud?.setOrbs) return false;

  const playerKey = getHudPlayerKeyForEntry(scene, playerEntry);
  if (playerKey == null) return false;

  const roleKey = playerKey === 2 ? "p2" : "p1";
  const cur = Math.max(0, Math.round(Number(hud.orbs?.[roleKey]) || 0));
  const max = hud.orbsMax ?? 5;
  const add = Math.max(1, Math.round(Number(amount) || 1));
  const next = Math.min(max, cur + add);
  hud.setOrbs(playerKey, next);
  // Sync to partner so their HUD reflects the new orb count immediately.
  if (typeof scene?.emitPlayerResource === "function") {
    scene.emitPlayerResource({ roleKey, orbs: next });
  }
  return true;
}

/** Nearest living player to a world point. */
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
