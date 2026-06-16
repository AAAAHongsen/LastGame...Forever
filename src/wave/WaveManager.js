import { getWaveConfig, TOTAL_WAVES } from "./waveConfig.js";
import { getSafeSpawnPoints } from "./spawnHelpers.js";
import { spawnEnemy } from "../enemy-system/systems/enemyManager.js";
import {
  WAVE_EVENTS,
  emitWaveState,
  emitWaveSpawn,
  emitBossSummon,
  emitPlayerStats,
  emitSyncHp,
} from "./waveSync.js";
import { spawnEnergyBallBurst } from "../combat-stats/loot/energyBall.js";
import { createBossHpBar, destroyBossHpBar } from "../enemy-system/ui/BossHpBar.js";
import { playEnemyDeadSfx } from "../services/audioService.js";

const FLYING_TYPES = new Set(["bat", "flyBoss"]);

/**
 * Determine if this client drives wave logic (host).
 * player1 or single/test room are host.
 */
function isHost(scene) {
  const mp = Boolean(scene.roomCode && (scene.playerNumber === 1 || scene.playerNumber === 2));
  if (!mp) return true;
  return scene.playerNumber === 1;
}

/**
 * Central wave state manager.
 * Attach to scene as scene.waveManager.
 */
export class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this._host = isHost(scene);
    this.currentWave = 0;
    this.state = "idle"; // idle | tutorial | preModal | playing | waveClear | win
    this.spawnedEnemies = [];      // entries spawned in this wave
    this.bossSummonFired = {};     // tag → true
    this._checkCooldown = 0;
    this._boundSocket = false;
    this._frozenForUi = false;
    this._winHandled = false;
    this._tutorialReadyHeartbeat = null;
    this._tutorialLocalDone = false;

    // Always listen for tutorial ready in multiplayer; gate by state === "tutorial".
    if (this.scene.socket) {
      this._onTutorialStatus = (msg) => {
        if (!msg || this.state !== "tutorial") return;
        if (Number(msg.wave) !== Number(this.currentWave)) return;
        const ready = msg.ready ?? {};
        const hostReady = Boolean(ready[1]);
        const clientReady = Boolean(ready[2]);
        if (this._host) {
          this._tutorialHostReady = hostReady;
          this._tutorialClientReady = clientReady;
          const cfg = getWaveConfig(this.currentWave);
          if (cfg) this._tryBeginAfterTutorial(cfg);
        } else {
          // Client waits for host to switch state to "playing".
          // Keep waiting UI visible while not both ready.
          if (this._tutorialLocalDone && !(hostReady && clientReady)) {
            this.scene._tutorialDialog?.showWaiting?.();
          }
        }
      };
      this.scene.socket.on(WAVE_EVENTS.TUTORIAL_STATUS, this._onTutorialStatus);
    }

    if (!this._host) {
      this._listenAsClient();
    }
  }

  // ─── public API ──────────────────────────────────────────────────────

  /** Called once to kick off wave 1 (after tutorial if needed). */
  start() {
    // Host: listen for enemy:killed to sync deaths to client
    if (this._host) {
      this._onEnemyKilled = (data) => {
        const enemy = data?.enemy;
        if (!enemy?._waveId) return;
        destroyBossHpBar(enemy);
        const socket = this.scene.socket;
        if (socket) {
          socket.emit(WAVE_EVENTS.ENEMY_DEATH, { id: enemy._waveId });
        }
      };
      this.scene.events.on("enemy:killed", this._onEnemyKilled);
      this.scene.events.once("shutdown", () => {
        this.scene.events.off("enemy:killed", this._onEnemyKilled);
      });

      this._advanceToWave(1);
    }
  }

  /** Freeze AI & player controls (tutorial / pre-wave modal). */
  freeze() {
    this._frozenForUi = true;
    this.scene._gameOverFrozen = true;
  }

  /** Unfreeze and allow gameplay. */
  unfreeze() {
    this._frozenForUi = false;
    this.scene._gameOverFrozen = false;
  }

  /** True when players/enemies should not move (UI overlay up). */
  get frozen() { return this._frozenForUi; }

  /** Called every update frame (only if not frozen). */
  update() {
    if (!this._host) return;
    if (this.state !== "playing") return;

    const now = this.scene.time?.now ?? 0;
    if (now - this._checkCooldown < 500) return;
    this._checkCooldown = now;

    this._checkBossThresholds();
    this._checkWaveComplete();
  }

  /** Sync an enemy damage event to client and apply. */
  notifyEnemyDamaged(enemy) {
    if (!this._host) return;
    const socket = this.scene.socket;
    if (socket) {
      socket.emit(WAVE_EVENTS.ENEMY_DAMAGE, {
        id: enemy._waveId,
        hp: enemy.hp,
        hpMax: enemy.hpMax,
      });
    }
  }

  /** Sync an enemy death to client. */
  notifyEnemyDied(enemy) {
    if (!this._host) return;
    const socket = this.scene.socket;
    if (socket) {
      socket.emit(WAVE_EVENTS.ENEMY_DEATH, { id: enemy._waveId });
    }
  }

  /** Sync player HP to client after taking damage. */
  syncPlayerHp() {
    if (!this._host) return;
    const hud = this.scene.hud;
    const socket = this.scene.socket;
    if (!hud || !socket) return;
    socket.emit(WAVE_EVENTS.SYNC_HP, {
      p1: hud.health.p1,
      p2: hud.health.p2,
    });
  }

  destroy() {
    this._stopTutorialReadyHeartbeat();
    if (this._onTutorialStatus) {
      this.scene.socket?.off(WAVE_EVENTS.TUTORIAL_STATUS, this._onTutorialStatus);
      this._onTutorialStatus = null;
    }
    // Clean up boss HP bars
    for (const enemy of this.spawnedEnemies) {
      destroyBossHpBar(enemy);
    }
    this._unbindSocketClient();
  }

  _startTutorialReadyHeartbeat() {
    if (this._tutorialReadyHeartbeat) return;
    if (!this.scene.socket || !this.scene.roomCode) return;
    this.scene.socket.emit(WAVE_EVENTS.TUTORIAL_READY, { wave: this.currentWave });
    this._tutorialReadyHeartbeat = this.scene.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        if (this.state !== "tutorial") return;
        this.scene.socket?.emit(WAVE_EVENTS.TUTORIAL_READY, { wave: this.currentWave });
      },
    });
  }

  _stopTutorialReadyHeartbeat() {
    if (!this._tutorialReadyHeartbeat) return;
    this._tutorialReadyHeartbeat.remove(false);
    this._tutorialReadyHeartbeat = null;
  }

  // ─── host helpers ────────────────────────────────────────────────────

  _advanceToWave(waveNum) {
    if (waveNum > TOTAL_WAVES) {
      this._handleWin();
      return;
    }

    const cfg = getWaveConfig(waveNum);
    if (!cfg) return;

    this.currentWave = waveNum;
    this.bossSummonFired = {};
    this.spawnedEnemies = [];

    // Apply player stats (hp, attack)
    this._applyPlayerStats(cfg, waveNum);

    // Broadcast state to client
    const socket = this.scene.socket;
    if (socket) {
      emitWaveState(socket, {
        wave: waveNum,
        state: cfg.tutorial ? "tutorial" : cfg.preWaveModal ? "preModal" : "playing",
      });
      emitPlayerStats(socket, this._buildPlayerStatsPayload(cfg));
    }

    this.scene.hud?.setWave?.(waveNum);

    if (cfg.tutorial) {
      this.state = "tutorial";
      this._tutorialLocalDone = false;
      this._tutorialHostReady   = false;
      this._tutorialClientReady = false;

      const isMP = Boolean(this.scene.socket && this.scene.roomCode);
      // Show tutorial; onLocalDone fires when THIS player finishes all pages
      this.scene.showTutorial(() => this._onHostLocalTutorialDone(cfg, isMP));
      return;
    }

    if (cfg.preWaveModal) {
      this.state = "preModal";
      this.scene.showPreWaveModal(waveNum, cfg, () => this._startWavePlaying(cfg));
      return;
    }

    this._startWavePlaying(cfg);
  }

  /** Host: called when local player finishes reading tutorial pages. */
  _onHostLocalTutorialDone(cfg, isMP) {
    this._tutorialLocalDone = true;
    this._tutorialHostReady = true;
    if (isMP) {
      // Show waiting screen and emit ready signal to client
      this.scene._tutorialDialog?.showWaiting?.();
      this._startTutorialReadyHeartbeat();
    }
    this._tryBeginAfterTutorial(cfg);
  }

  _tryBeginAfterTutorial(cfg) {
    const isMP = Boolean(this.scene.socket && this.scene.roomCode);
    if (isMP && (!this._tutorialHostReady || !this._tutorialClientReady)) return;

    this._startWavePlaying(cfg);
  }

  _startWavePlaying(cfg) {
    this.state = "playing";
    this._tutorialLocalDone = false;
    this._stopTutorialReadyHeartbeat();

    // Close any tutorial/modal UI on host and unfreeze
    this.scene._tutorialDialog?.destroy?.();
    this.scene._tutorialDialog = null;
    this.scene._preWaveModal?.destroy?.();
    this.scene._preWaveModal = null;
    this.unfreeze();

    // Broadcast playing state to client
    const socket = this.scene.socket;
    if (socket) {
      emitWaveState(socket, { wave: this.currentWave, state: "playing" });
    }

    this._spawnWaveEnemies(cfg);
  }

  _spawnWaveEnemies(cfg) {
    const scene = this.scene;
    let idCounter = 0;

    for (const group of cfg.enemies) {
      const isFlying = FLYING_TYPES.has(group.type);
      const positions = getSafeSpawnPoints(scene, group.count, isFlying);

      for (let i = 0; i < group.count; i += 1) {
        const pos = positions[i] ?? positions[0];
        const enemy = spawnEnemy(scene, group.type, pos.x, pos.y);
        if (!enemy) continue;

        // Override hp & damage from wave config
        enemy.hp = group.hp;
        enemy.hpMax = group.hp;
        enemy._waveDamage = group.damage;
        idCounter += 1;
        enemy._waveId = `w${this.currentWave}_${idCounter}`;

        // Attach HP bar for bosses
        createBossHpBar(scene, enemy);

        this.spawnedEnemies.push(enemy);

        // Broadcast to client
        const socket = scene.socket;
        if (socket) {
          emitWaveSpawn(socket, {
            id: enemy._waveId,
            type: group.type,
            x: pos.x,
            y: pos.y,
            hp: group.hp,
            hpMax: group.hp,
            damage: group.damage,
          });
        }
      }
    }

    // Rebuild projectile ↔ player overlaps now that new enemies exist
    if (typeof scene.combatSystem?.rebuildPlayerOverlaps === "function") {
      scene.combatSystem.rebuildPlayerOverlaps();
    }
  }

  _checkBossThresholds() {
    const cfg = getWaveConfig(this.currentWave);
    if (!cfg?.bossThresholds?.length) return;

    for (const thresh of cfg.bossThresholds) {
      const tag = thresh.tag ?? `${thresh.bossType}_${thresh.hpBelow}`;
      if (this.bossSummonFired[tag]) continue;

      // Find alive boss of this type
      const boss = this.spawnedEnemies.find(
        (e) => e.type === thresh.bossType && !e.dead && !e.dying
      );
      if (!boss) continue;
      if (boss.hp > thresh.hpBelow) continue;

      // Fire summon
      this.bossSummonFired[tag] = true;
      this._doSummon(thresh.spawns, tag);
    }
  }

  _doSummon(spawns, tag) {
    const scene = this.scene;
    const cfg = getWaveConfig(this.currentWave);
    let idCounter = Object.keys(this.bossSummonFired).length * 100;

    for (const group of spawns) {
      const isFlying = FLYING_TYPES.has(group.type);
      const positions = getSafeSpawnPoints(scene, group.count, isFlying);
      const groupCfg = cfg?.enemies?.find((e) => e.type === group.type);

      for (let i = 0; i < group.count; i += 1) {
        const pos = positions[i] ?? positions[0];
        const enemy = spawnEnemy(scene, group.type, pos.x, pos.y);
        if (!enemy) continue;

        if (groupCfg) {
          enemy.hp = groupCfg.hp;
          enemy.hpMax = groupCfg.hp;
          enemy._waveDamage = groupCfg.damage;
        }
        idCounter += 1;
        enemy._waveId = `w${this.currentWave}_summon_${tag}_${idCounter}`;
        this.spawnedEnemies.push(enemy);

        const socket = scene.socket;
        if (socket) {
          emitWaveSpawn(socket, {
            id: enemy._waveId,
            type: group.type,
            x: pos.x,
            y: pos.y,
            hp: groupCfg?.hp ?? enemy.hpMax,
            hpMax: groupCfg?.hp ?? enemy.hpMax,
            damage: groupCfg?.damage ?? 5,
          });
        }
      }
    }

    const socket = scene.socket;
    if (socket) {
      emitBossSummon(socket, { tag });
    }
  }

  _checkWaveComplete() {
    // Only count true monster entries (not fx, not dying, not dead, sprite must be active)
    const alive = this.spawnedEnemies.filter(
      (e) =>
        !e.dead &&
        !e.dying &&
        !e.type?.startsWith("fx-") &&
        e.sprite?.active
    );

    if (alive.length > 0) return;
    if (this.spawnedEnemies.length === 0) return; // haven't spawned yet

    this.state = "waveClear";

    const nextWave = this.currentWave + 1;
    if (nextWave > TOTAL_WAVES) {
      this._handleWin();
    } else {
      // Small delay then advance
      this.scene.time.delayedCall(1200, () => {
        if (this.state !== "waveClear") return; // guard re-entry
        this._advanceToWave(nextWave);
      });
    }
  }

  _handleWin() {
    if (this._winHandled) return;
    this._winHandled = true;
    this.state = "win";

    const socket = this.scene.socket;
    if (socket) {
      emitWaveState(socket, { wave: this.currentWave, state: "win" });
    }

    this.scene.showWinScreen();
  }

  /** Expose wave config by number for debug tools. */
  _getWaveCfg(waveNum) {
    return getWaveConfig(Number(waveNum));
  }

  _applyPlayerStats(cfg, waveNum) {
    const scene = this.scene;
    const hud = scene.hud;
    if (!hud || !scene.players) return;

    for (let i = 0; i < scene.players.length; i += 1) {
      const entry = scene.players[i];
      const type = entry.type; // "soldier" | "mage"
      const pStats = cfg.players[type];
      if (!pStats) continue;

      const playerKey = i === 0 ? 1 : 2;
      const roleKey = i === 0 ? "p1" : "p2";

      const prevMax = hud.healthMax?.[roleKey] ?? pStats.hp;
      const prevCur = hud.health?.[roleKey] ?? prevMax;

      const newMax = pStats.hp;
      const newCur = Math.min(newMax, prevCur + (newMax - prevMax));

      hud.setHealthMax(playerKey, newMax);
      hud.setHealth(playerKey, newCur);

      // Update attack via entry.combat
      if (!entry.combat) entry.combat = {};
      entry.combat._waveAttack = pStats.attack;
    }

    // Apply / clear wave special rules
    const sr = cfg.specialRules ?? {};
    scene._waveWarriorNoCost = Boolean(sr.warriorNoCost);
    scene._waveWarriorSkillInvincible = Boolean(sr.warriorSkillInvincible);
    scene._waveMageHealBonus = Number(sr.mageHealBonus) || 0;

    // Reset energy each wave
    hud.setEnergy(50);
  }

  _buildPlayerStatsPayload(cfg) {
    const scene = this.scene;
    const hud = scene.hud;
    const payload = {
      wave: this.currentWave,
      players: [],
      specialRules: cfg.specialRules ?? {},
    };

    for (let i = 0; i < (scene.players?.length ?? 0); i += 1) {
      const entry = scene.players[i];
      const type = entry.type;
      const pStats = cfg.players[type];
      const roleKey = i === 0 ? "p1" : "p2";

      payload.players.push({
        index: i,
        type,
        hpMax: pStats?.hp ?? hud?.healthMax?.[roleKey] ?? 100,
        hp:    hud?.health?.[roleKey] ?? pStats?.hp ?? 100,
        attack: pStats?.attack ?? 5,
      });
    }

    return payload;
  }

  // ─── client listeners ────────────────────────────────────────────────

  _listenAsClient() {
    const socket = this.scene.socket;
    if (!socket) return;
    this._boundSocket = true;

    this._onWaveState = (msg) => this._handleWaveState(msg);
    this._onWaveSpawn = (msg) => this._handleWaveSpawn(msg);
    this._onEnemyDamage = (msg) => this._handleEnemyDamage(msg);
    this._onEnemyDeath = (msg) => this._handleEnemyDeath(msg);
    this._onBossSummon = (msg) => this._handleBossSummon(msg);
    this._onPlayerStats = (msg) => this._handlePlayerStats(msg);
    this._onSyncHp = (msg) => this._handleSyncHp(msg);
    this._onEnemyDieFx = (msg) => this._handleEnemyDieFx(msg);
    this._onLootSpawn = (msg) => this._handleLootSpawn(msg);

    socket.on(WAVE_EVENTS.STATE,        this._onWaveState);
    socket.on(WAVE_EVENTS.SPAWN,        this._onWaveSpawn);
    socket.on(WAVE_EVENTS.ENEMY_DAMAGE, this._onEnemyDamage);
    socket.on(WAVE_EVENTS.ENEMY_DEATH,  this._onEnemyDeath);
    socket.on(WAVE_EVENTS.BOSS_SUMMON,  this._onBossSummon);
    socket.on(WAVE_EVENTS.PLAYER_STATS, this._onPlayerStats);
    socket.on(WAVE_EVENTS.SYNC_HP,      this._onSyncHp);
    socket.on(WAVE_EVENTS.ENEMY_DIE_FX, this._onEnemyDieFx);
    socket.on(WAVE_EVENTS.LOOT_SPAWN,   this._onLootSpawn);
  }

  _unbindSocketClient() {
    const socket = this.scene.socket;
    if (!socket || !this._boundSocket) return;

    socket.off(WAVE_EVENTS.STATE,        this._onWaveState);
    socket.off(WAVE_EVENTS.SPAWN,        this._onWaveSpawn);
    socket.off(WAVE_EVENTS.ENEMY_DAMAGE, this._onEnemyDamage);
    socket.off(WAVE_EVENTS.ENEMY_DEATH,  this._onEnemyDeath);
    socket.off(WAVE_EVENTS.BOSS_SUMMON,  this._onBossSummon);
    socket.off(WAVE_EVENTS.PLAYER_STATS, this._onPlayerStats);
    socket.off(WAVE_EVENTS.SYNC_HP,      this._onSyncHp);
    socket.off(WAVE_EVENTS.ENEMY_DIE_FX, this._onEnemyDieFx);
    socket.off(WAVE_EVENTS.LOOT_SPAWN,   this._onLootSpawn);
  }

  _handleWaveState(msg) {
    this.currentWave = msg.wave;
    this.scene.hud?.setWave?.(msg.wave);

    if (msg.state === "win") {
      this.state = "win";
      this.scene.showWinScreen();
      return;
    }
    if (msg.state === "tutorial") {
      this.state = "tutorial";
      this._tutorialLocalDone = false;
      // Client shows tutorial; when finished locally, emit ready and show waiting
      this.scene.showTutorial(() => {
        this._tutorialLocalDone = true;
        this.scene._tutorialDialog?.showWaiting?.();
        this._startTutorialReadyHeartbeat();
      });
      return;
    }
    if (msg.state === "preModal") {
      this.state = "preModal";
      const cfg = getWaveConfig(msg.wave);
      this.scene.showPreWaveModal(msg.wave, cfg, () => {});
      return;
    }
    if (msg.state === "playing") {
      this.state = "playing";
      this._tutorialLocalDone = false;
      this._stopTutorialReadyHeartbeat();
      // Destroy tutorial/modal and unfreeze
      this.scene._tutorialDialog?.destroy?.();
      this.scene._tutorialDialog = null;
      this.scene.hidePreWaveModal?.();
      this.unfreeze();
    }
  }

  _handleWaveSpawn(msg) {
    const scene = this.scene;
    const enemy = spawnEnemy(scene, msg.type, msg.x, msg.y);
    if (!enemy) return;
    enemy.hp    = msg.hp;
    enemy.hpMax = msg.hpMax;
    enemy._waveDamage = msg.damage;
    enemy._waveId = msg.id;
    // Attach HP bar for bosses on client side too
    createBossHpBar(scene, enemy);
    this.spawnedEnemies.push(enemy);

    if (typeof scene.combatSystem?.rebuildPlayerOverlaps === "function") {
      scene.combatSystem.rebuildPlayerOverlaps();
    }
    // Ensure client's HUD wave is updated
    scene.hud?.setWave?.(this.currentWave);
  }

  _handleEnemyDamage(msg) {
    const enemy = this.spawnedEnemies.find((e) => e._waveId === msg.id);
    if (!enemy) return;
    enemy.hp = msg.hp;
  }

  _handleEnemyDeath(msg) {
    const enemy = this.spawnedEnemies.find((e) => e._waveId === msg.id);
    if (!enemy) return;
    destroyBossHpBar(enemy);
    enemy.dead = true;
    enemy.dying = false;
    enemy.sprite?.destroy?.();
  }

  _handleEnemyDieFx(msg) {
    const enemy = this.spawnedEnemies.find((e) => e._waveId === msg?.id);
    if (!enemy?.sprite?.active) return;
    playEnemyDeadSfx(this.scene);
    enemy.dead = true;
    enemy.dying = true;
    const s = enemy.sprite;
    if (s.body) {
      s.setVelocity(0, 0);
      s.body.enable = false;
    }
    if (this.scene.enemyPhysicsGroup?.contains?.(s)) {
      this.scene.enemyPhysicsGroup.remove(s, false, false);
    }
    // Client-side visual only; host handles authoritative removal.
    this.scene.tweens.killTweensOf(s);
    this.scene.tweens.add({
      targets: s,
      x: (msg?.x ?? s.x) + 6,
      duration: 45,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.scene.tweens.add({
          targets: s,
          x: msg?.x ?? s.x,
          alpha: 0,
          duration: 140,
          ease: "Quad.easeIn",
        });
      },
    });
  }

  _handleLootSpawn(msg) {
    if (!msg || msg.item !== "energyball") return;
    const count = Math.max(1, Math.round(Number(msg.count) || 1));
    const x = Number(msg.x);
    const y = Number(msg.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const entities = spawnEnergyBallBurst(this.scene, x, y, count);
    // Tag client-side balls with the same IDs the host assigned.
    const ids = Array.isArray(msg.lootIds) ? msg.lootIds : [];
    entities.forEach((e, i) => {
      const id = ids[i];
      if (id != null) {
        e._lootId = id;
        e.sprite?.setData?.("lootId", id);
      }
    });
  }

  _handleBossSummon(msg) {
    this.bossSummonFired[msg.tag] = true;
  }

  _handlePlayerStats(msg) {
    const scene = this.scene;
    const hud = scene.hud;
    if (!hud) return;

    this.currentWave = msg.wave;
    hud.setWave?.(msg.wave);

    for (const p of msg.players ?? []) {
      const playerKey = p.index === 0 ? 1 : 2;
      const roleKey   = p.index === 0 ? "p1" : "p2";

      const prevMax = hud.healthMax?.[roleKey] ?? p.hpMax;
      const prevCur = hud.health?.[roleKey]    ?? prevMax;
      const newCur  = Math.min(p.hpMax, prevCur + (p.hpMax - prevMax));

      hud.setHealthMax(playerKey, p.hpMax);
      hud.setHealth(playerKey, newCur);

      const entry = scene.players?.[p.index];
      if (entry) {
        if (!entry.combat) entry.combat = {};
        entry.combat._waveAttack = p.attack;
      }
    }

    // Apply special rules from host
    const sr = msg.specialRules ?? {};
    scene._waveWarriorNoCost = Boolean(sr.warriorNoCost);
    scene._waveWarriorSkillInvincible = Boolean(sr.warriorSkillInvincible);
    scene._waveMageHealBonus = Number(sr.mageHealBonus) || 0;

    hud.setEnergy(50);
  }

  _handleSyncHp(msg) {
    const hud = this.scene.hud;
    if (!hud) return;
    if (msg.p1 != null) hud.setHealth(1, msg.p1);
    if (msg.p2 != null) hud.setHealth(2, msg.p2);
  }
}
