/**
 * Shared multiplayer role helpers.
 * Host (player1) is authoritative for enemy simulation, HP and loot.
 * Single-player / test rooms are always host.
 */
export function isMultiplayer(scene) {
  return Boolean(scene?.roomCode && (scene?.playerNumber === 1 || scene?.playerNumber === 2));
}

export function isHostScene(scene) {
  return !isMultiplayer(scene) || scene?.playerNumber === 1;
}
