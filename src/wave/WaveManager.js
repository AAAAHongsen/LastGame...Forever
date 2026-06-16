/**
 * 波次生命週期 — 生成、教學、Boss 召喚、勝利與多人同步。
 */
import { getWaveConfig, TOTAL_WAVES } from "./waveConfig.js";
import { getSafeSpawnPoints, FLYING_ENEMY_TYPES } from "./spawnHelpers.js";
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
import { playNetworkClientDeathFx } from "../combat-stats/enemyDeath.js";
import {
  isHostScene,
  playerKeyFromIndex,
  roleKeyFromIndex,
} from "../services/multiplayerSession.js";

/**
 * 中央波次狀態管理器。
 * 掛載於 scene.waveManager。
 */
export class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this._host = isHostScene(scene);
    this.currentWave = 0;
    this.state = "idle"; // 狀態：idle | tutorial | preModal | playing | waveClear | win
    this.spawnedEnemies = [];      // 本波已生成的敵人 entry
    this.bossSummonFired = {};     // tag → 已觸發
    this._checkCooldown = 0;
    this._boundSocket = false;
    this._frozenForUi = false;
    this._winHandled = false;
    this._tutorialReadyHeartbeat = null;
    this._tutorialLocalDone = false;

    // 多人模式一律監聽教學就緒；僅在 state === "tutorial" 時處理。
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
          // 客戶端等待房主將狀態切換為 "playing"。
          // 雙方未就緒時持續顯示等待 UI。
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

  // ─── 公開 API ──────────────────────────────────────────────────────

  /** 啟動第 1 波（教學完成後若需要）。 */
  start() {
    // 房主：監聽 enemy:killed 以同步死亡至客戶端
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

      if (this.scene.socket) {
        this._onStateRequest = () => this._emitCurrentStateSync();
        this.scene.socket.on(WAVE_EVENTS.STATE_REQUEST, this._onStateRequest);
        this.scene.events.once("shutdown", () => {
          this.scene.socket?.off(WAVE_EVENTS.STATE_REQUEST, this._onStateRequest);
          this._onStateRequest = null;
        });
      }

      this._advanceToWave(1);
    } else {
      // 客戶端可能晚於房主進入（例如較晚看完開場），需向房主索取目前波次。
      this._requestWaveStateSync();
    }
  }

  /** 凍結 AI 與玩家控制（教學／波前視窗）。 */
  freeze() {
    this._frozenForUi = true;
    this.scene._gameOverFrozen = true;
  }

  /** 解除凍結，恢復遊玩。 */
  unfreeze() {
    this._frozenForUi = false;
    this.scene._gameOverFrozen = false;
  }

  /** UI 覆蓋層顯示時，玩家／敵人不應移動。 */
  get frozen() { return this._frozenForUi; }

  /** 每幀 update 呼叫（未凍結時）。 */
  update() {
    if (!this._host) return;
    if (this.state !== "playing") return;

    const now = this.scene.time?.now ?? 0;
    if (now - this._checkCooldown < 500) return;
    this._checkCooldown = now;

    this._checkBossThresholds();
    this._checkWaveComplete();
  }

  /** 將敵人受傷事件同步至客戶端並套用。 */
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

  /** 將敵人死亡同步至客戶端。 */
  notifyEnemyDied(enemy) {
    if (!this._host) return;
    const socket = this.scene.socket;
    if (socket) {
      socket.emit(WAVE_EVENTS.ENEMY_DEATH, { id: enemy._waveId });
    }
  }

  /** 受傷後將玩家 HP 同步至客戶端。 */
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
    this._stopStateSyncRetry();
    if (this._onTutorialStatus) {
      this.scene.socket?.off(WAVE_EVENTS.TUTORIAL_STATUS, this._onTutorialStatus);
      this._onTutorialStatus = null;
    }
    if (this._onStateRequest) {
      this.scene.socket?.off(WAVE_EVENTS.STATE_REQUEST, this._onStateRequest);
      this._onStateRequest = null;
    }
    // 清理 Boss 血條
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

  /** 客戶端進場時向房主索取 waveState（避免錯過開場期間的廣播）。 */
  _requestWaveStateSync() {
    const socket = this.scene.socket;
    if (!socket || this._host) return;

    const emitRequest = () => socket.emit(WAVE_EVENTS.STATE_REQUEST, {});
    emitRequest();

    if (this._stateSyncRetry) return;
    this._stateSyncRetry = this.scene.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => {
        if (this.currentWave > 0) {
          this._stopStateSyncRetry();
          return;
        }
        socket.emit(WAVE_EVENTS.STATE_REQUEST, {});
      },
    });
  }

  _stopStateSyncRetry() {
    if (!this._stateSyncRetry) return;
    this._stateSyncRetry.remove(false);
    this._stateSyncRetry = null;
  }

  /** 房主回應客戶端的 waveState 索取。 */
  _emitCurrentStateSync() {
    if (!this._host || this.currentWave <= 0) return;
    const socket = this.scene.socket;
    if (!socket) return;

    emitWaveState(socket, { wave: this.currentWave, state: this.state });
    const cfg = getWaveConfig(this.currentWave);
    if (cfg) {
      emitPlayerStats(socket, this._buildPlayerStatsPayload(cfg));
    }
  }

  // ─── 房主輔助 ────────────────────────────────────────────────────

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

    // 套用玩家數值（hp、attack）
    this._applyPlayerStats(cfg, waveNum);

    // 廣播狀態至客戶端
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
      // 顯示教學；onLocalDone 在本機玩家讀完所有頁面時觸發
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

  /** 房主：本機玩家讀完教學頁面時呼叫。 */
  _onHostLocalTutorialDone(cfg, isMP) {
    this._tutorialLocalDone = true;
    this._tutorialHostReady = true;
    if (isMP) {
      // 顯示等待畫面並向客戶端發送就緒訊號
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

    // 關閉房主端教學／視窗 UI 並解除凍結
    this.scene._tutorialDialog?.destroy?.();
    this.scene._tutorialDialog = null;
    this.scene._preWaveModal?.destroy?.();
    this.scene._preWaveModal = null;
    this.unfreeze();

    // 廣播 playing 狀態至客戶端
    const socket = this.scene.socket;
    if (socket) {
      emitWaveState(socket, { wave: this.currentWave, state: "playing" });
    }

    this._spawnWaveEnemies(cfg);
  }

  /** 套用波次數值、追蹤生成，可選附加 Boss 血條，並廣播至客戶端。 */
  _registerWaveSpawn(enemy, { waveId, type, x, y, hp, hpMax, damage, emitDamage, withBossBar }) {
    if (hp != null) enemy.hp = hp;
    if (hpMax != null) enemy.hpMax = hpMax;
    if (damage != null) enemy._waveDamage = damage;
    enemy._waveId = waveId;

    if (withBossBar) createBossHpBar(this.scene, enemy);
    this.spawnedEnemies.push(enemy);

    const socket = this.scene.socket;
    if (socket) {
      emitWaveSpawn(socket, {
        id: waveId,
        type,
        x,
        y,
        hp: hp ?? enemy.hp,
        hpMax: hpMax ?? enemy.hpMax,
        damage: emitDamage ?? damage ?? enemy._waveDamage ?? 5,
      });
    }
  }

  _rebuildCombatOverlaps() {
    const scene = this.scene;
    if (typeof scene.combatSystem?.rebuildPlayerOverlaps === "function") {
      scene.combatSystem.rebuildPlayerOverlaps();
    }
  }

  _spawnWaveEnemies(cfg) {
    const scene = this.scene;
    let idCounter = 0;

    for (const group of cfg.enemies) {
      const isFlying = FLYING_ENEMY_TYPES.has(group.type);
      const positions = getSafeSpawnPoints(scene, group.count, isFlying);

      for (let i = 0; i < group.count; i += 1) {
        const pos = positions[i] ?? positions[0];
        const enemy = spawnEnemy(scene, group.type, pos.x, pos.y);
        if (!enemy) continue;

        idCounter += 1;
        this._registerWaveSpawn(enemy, {
          waveId: `w${this.currentWave}_${idCounter}`,
          type: group.type,
          x: pos.x,
          y: pos.y,
          hp: group.hp,
          hpMax: group.hp,
          damage: group.damage,
          withBossBar: true,
        });
      }
    }

    this._rebuildCombatOverlaps();
  }

  _checkBossThresholds() {
    const cfg = getWaveConfig(this.currentWave);
    if (!cfg?.bossThresholds?.length) return;

    for (const thresh of cfg.bossThresholds) {
      const tag = thresh.tag ?? `${thresh.bossType}_${thresh.hpBelow}`;
      if (this.bossSummonFired[tag]) continue;

      // 尋找此類型仍存活的 Boss
      const boss = this.spawnedEnemies.find(
        (e) => e.type === thresh.bossType && !e.dead && !e.dying
      );
      if (!boss) continue;
      if (boss.hp > thresh.hpBelow) continue;

      // 觸發召喚
      this.bossSummonFired[tag] = true;
      this._doSummon(thresh.spawns, tag);
    }
  }

  _doSummon(spawns, tag) {
    const scene = this.scene;
    const cfg = getWaveConfig(this.currentWave);
    let idCounter = Object.keys(this.bossSummonFired).length * 100;

    for (const group of spawns) {
      const isFlying = FLYING_ENEMY_TYPES.has(group.type);
      const positions = getSafeSpawnPoints(scene, group.count, isFlying);
      const groupCfg = cfg?.enemies?.find((e) => e.type === group.type);

      for (let i = 0; i < group.count; i += 1) {
        const pos = positions[i] ?? positions[0];
        const enemy = spawnEnemy(scene, group.type, pos.x, pos.y);
        if (!enemy) continue;

        idCounter += 1;
        this._registerWaveSpawn(enemy, {
          waveId: `w${this.currentWave}_summon_${tag}_${idCounter}`,
          type: group.type,
          x: pos.x,
          y: pos.y,
          hp: groupCfg?.hp,
          hpMax: groupCfg?.hp,
          damage: groupCfg?.damage,
          emitDamage: groupCfg?.damage ?? 5,
          withBossBar: false,
        });
      }
    }

    const socket = scene.socket;
    if (socket) {
      emitBossSummon(socket, { tag });
    }
  }

  _checkWaveComplete() {
    // 只計算真正的怪物 entry（非 fx、非 dying、非 dead，sprite 須 active）
    const alive = this.spawnedEnemies.filter(
      (e) =>
        !e.dead &&
        !e.dying &&
        !e.type?.startsWith("fx-") &&
        e.sprite?.active
    );

    if (alive.length > 0) return;
    if (this.spawnedEnemies.length === 0) return; // 尚未生成

    this.state = "waveClear";

    const nextWave = this.currentWave + 1;
    if (nextWave > TOTAL_WAVES) {
      this._handleWin();
    } else {
      // 短暫延遲後進入下一波
      this.scene.time.delayedCall(1200, () => {
        if (this.state !== "waveClear") return; // 防止重入
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

  /** 依波次編號取得設定（供除錯工具使用）。 */
  _getWaveCfg(waveNum) {
    return getWaveConfig(Number(waveNum));
  }

  _applyPlayerStats(cfg, waveNum) {
    const scene = this.scene;
    const hud = scene.hud;
    if (!hud || !scene.players) return;

    for (let i = 0; i < scene.players.length; i += 1) {
      const entry = scene.players[i];
      const type = entry.type; // 職業："soldier" | "mage"
      const pStats = cfg.players[type];
      if (!pStats) continue;

      const playerKey = playerKeyFromIndex(i);
      const roleKey = roleKeyFromIndex(i);

      const prevMax = hud.healthMax?.[roleKey] ?? pStats.hp;
      const prevCur = hud.health?.[roleKey] ?? prevMax;

      const newMax = pStats.hp;
      const newCur = Math.min(newMax, prevCur + (newMax - prevMax));

      hud.setHealthMax(playerKey, newMax);
      hud.setHealth(playerKey, newCur);

      // 透過 entry.combat 更新攻擊力
      if (!entry.combat) entry.combat = {};
      entry.combat._waveAttack = pStats.attack;
    }

    // 套用／清除波次特殊規則
    const sr = cfg.specialRules ?? {};
    scene._waveWarriorNoCost = Boolean(sr.warriorNoCost);
    scene._waveWarriorSkillInvincible = Boolean(sr.warriorSkillInvincible);
    scene._waveMageHealBonus = Number(sr.mageHealBonus) || 0;

    // 每波重置能量
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

  // ─── 客戶端監聽 ────────────────────────────────────────────────

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
    this._stopStateSyncRetry();
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
      // 客戶端顯示教學；本機讀完後發送就緒並顯示等待
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
      // 銷毀教學／視窗並解除凍結
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
    // 客戶端也為 Boss 附加血條
    createBossHpBar(scene, enemy);
    this.spawnedEnemies.push(enemy);

    this._rebuildCombatOverlaps();
    // 確保客戶端 HUD 波次已更新
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
    enemy.dead = true;
    enemy.dying = true;
    playNetworkClientDeathFx(this.scene, enemy.sprite, msg?.x ?? enemy.sprite.x);
  }

  _handleLootSpawn(msg) {
    if (!msg || msg.item !== "energyball") return;
    const count = Math.max(1, Math.round(Number(msg.count) || 1));
    const x = Number(msg.x);
    const y = Number(msg.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const entities = spawnEnergyBallBurst(this.scene, x, y, count);
    // 客戶端球體使用與房主相同的 ID。
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
      const playerKey = playerKeyFromIndex(p.index);
      const roleKey = roleKeyFromIndex(p.index);

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

    // 套用來自房主的特殊規則
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
