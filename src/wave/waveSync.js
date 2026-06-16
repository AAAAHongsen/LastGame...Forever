/**
 * 波次同步 socket 輔助。
 * 房主發送；客戶端接收並套用。
 */

export const WAVE_EVENTS = Object.freeze({
  STATE:            "waveState",
  SPAWN:            "waveSpawn",
  ENEMY_DAMAGE:     "waveEnemyDamage",
  ENEMY_DEATH:      "waveEnemyDeath",
  ENEMY_DIE_FX:     "waveEnemyDieFx",
  BOSS_SUMMON:      "waveBossSummon",
  LOOT_SPAWN:       "waveLootSpawn",
  PLAYER_STATS:     "wavePlayerStats",
  SYNC_HP:          "waveSyncHp",
  TUTORIAL_READY:   "waveTutorialReady",
  TUTORIAL_STATUS:  "waveTutorialStatus",
  STATE_REQUEST:    "waveStateRequest",
});

export function emitWaveState(socket, payload) {
  socket?.emit(WAVE_EVENTS.STATE, payload);
}

export function emitWaveSpawn(socket, payload) {
  socket?.emit(WAVE_EVENTS.SPAWN, payload);
}

export function emitEnemyDamage(socket, payload) {
  socket?.emit(WAVE_EVENTS.ENEMY_DAMAGE, payload);
}

export function emitEnemyDeath(socket, payload) {
  socket?.emit(WAVE_EVENTS.ENEMY_DEATH, payload);
}

export function emitBossSummon(socket, payload) {
  socket?.emit(WAVE_EVENTS.BOSS_SUMMON, payload);
}

export function emitPlayerStats(socket, payload) {
  socket?.emit(WAVE_EVENTS.PLAYER_STATS, payload);
}

export function emitSyncHp(socket, payload) {
  socket?.emit(WAVE_EVENTS.SYNC_HP, payload);
}
