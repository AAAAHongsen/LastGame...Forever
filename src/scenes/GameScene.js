/**
 * 主遊戲場景 — 玩家控制、波次、戰鬥、多人同步與 UI 覆蓋層。
 */
import { BASE_WIDTH, BASE_HEIGHT } from "../config/constants.js";
import {
  createEnemyAnimations,
  installEnemyDevTools,
  preloadEnemyAssets,
} from "../enemy-system/installEnemyDevTools.js";
import { PlayerController } from "../controllers/PlayerController.js";
import { ensureSocket } from "../services/socketService.js";
import { installHudDevTools } from "../debug/installHudDevTools.js";
import { openSettingsOverlay, isSettingsOpen } from "../services/settingsOverlay.js";
import { checkAndOpenGameOver } from "../services/gameOverOverlay.js";
import {
  playMageAtkSfx,
  playMageSkillSfx,
  playWarriorAtkSfx,
  playWarriorSkillSfx,
  playWaveSceneSfx,
  playWinSfx,
  preloadAudio,
} from "../services/audioService.js";
import {
  getLocalPlayerIndex,
  isHostScene,
  isMultiplayerScene,
} from "../services/multiplayerSession.js";
import { getDefaultMaxHpForClass } from "../combat-stats/config/playerStats.js";
import { PLATFORM_ZONES } from "../wave/spawnHelpers.js";
import {
  buildPlayerEntry,
  classHudLabel,
  createMageCharacter,
  createPlayerAnimations,
  createSoldierCharacter,
  PLAYER_SPAWN_POINTS,
  preloadGameBackgroundAssets,
  preloadPlayerCharacterAssets,
  selectionToPlayerType,
} from "./playerSetup.js";
import { setupMultiplayerPlayerSync } from "./gameSceneNetwork.js";
import { HudUI } from "../ui/HudUI.js";
import {
  initPlayerCombat,
  onPlayerAttackStarted,
  preloadCombatLootAssets,
  resolvePlayerAttackDamage,
} from "../combat-stats/initCombatStats.js";
import { WaveManager } from "../wave/WaveManager.js";
import { TutorialDialog } from "../wave/TutorialDialog.js";
import { PreWaveModal } from "../wave/PreWaveModal.js";
import { WinScreen } from "../wave/WinScreen.js";
import { updateAllBossHpBars } from "../enemy-system/ui/BossHpBar.js";

/** 核心遊戲場景 — 玩家、波次、戰鬥與 HUD。 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.energyNoCostUntil = 0;
    this.playersInvincibleUntil = 0;
  }

  init(data) {
    this.roomCode = data?.roomCode ?? "";
    this.isTestRoom = Boolean(data?.isTestRoom);
    this.playerNumber = data?.playerNumber ?? null;
    this.selections = data?.selections ?? null;

    if (!data?.isTestRoom && this.roomCode === "00001") {
      this.isTestRoom = true;
    }

    this._gameOverOpen = false;
    this._gameOverFrozen = false;
    this.gameSession = {
      roomCode: this.roomCode,
      isTestRoom: this.isTestRoom,
      playerNumber: this.playerNumber,
      selections: this.selections,
    };
  }

  preload() {
    preloadAudio(this);

    // ── 世界與角色 ────────────────────────────────────────────────
    preloadCombatLootAssets(this);
    preloadEnemyAssets(this);
    preloadGameBackgroundAssets(this);
    preloadPlayerCharacterAssets(this);
  }

  create() {
    // 在建立 WaveManager 前先確保 socket 存在。
    const isMultiplayer = isMultiplayerScene(this);
    if (isMultiplayer) {
      this.socket = ensureSocket();
    }

    this.createBackground();
    this.createPlatformTexture();
    this.platformBodies = this.physics.add.staticGroup();
    this.createGround(this.platformBodies);
    this.createPlatforms(this.platformBodies);
    this.createAnimations();

    // 一律初始化敵人系統（不限測試房）
    createEnemyAnimations(this);
    installEnemyDevTools(this);

    this.createPlayers();

    // 玩家建立後重建戰鬥 overlap
    if (typeof this.combatSystem?.rebuildPlayerOverlaps === "function") {
      this.combatSystem.rebuildPlayerOverlaps();
    }

    this.createHud();
    this.createProjectiles();
    initPlayerCombat(this);

    this.setupNetworkSync();
    this.input.mouse.disableContextMenu();

    if (this.isTestRoom && !isMultiplayer) {
      this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
      this.onTabKeyDown = (event) => {
        if (event?.preventDefault) event.preventDefault();
      };
      this.input.keyboard.on("keydown-TAB", this.onTabKeyDown);
      this.tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);

      this.activeControlText = this.add
        .text(16, BASE_HEIGHT - 14, "", {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#f4e6bf",
        })
        .setOrigin(0, 1)
        .setScrollFactor(0)
        .setDepth(50);
      this.updateActiveControlText();
    } else {
      this.tabKey = null;
      this.activeControlText = null;
    }

    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // 波次系統
    this._tutorialDialog = null;
    this._preWaveModal   = null;
    this._winScreen      = null;
    this.waveManager = new WaveManager(this);
    this.waveManager.start();

    this.events.once("shutdown", () => {
      this._tutorialDialog?.destroy?.();
      this._preWaveModal?.destroy?.();
      this.waveManager?.destroy?.();
      this.gameOverModal?.destroy?.();
      this.settingsModal?.destroy?.();
      this.gameOverModal = null;
      this.settingsModal = null;
      this.hud?.destroy?.();
      this.hud = null;
    });
  }

  // ── 波次 UI 掛鉤（由 WaveManager 呼叫）────────────────────────────

  showTutorial(onLocalDone) {
    this.waveManager?.freeze();
    this._tutorialDialog?.destroy?.();
    this._tutorialDialog = new TutorialDialog(this, {
      onLocalDone: () => {
        // 先不銷毀 — 可能還要顯示「等待中」狀態
        onLocalDone?.();
      },
    });
  }

  hideTutorial() {
    this._tutorialDialog?.destroy?.();
    this._tutorialDialog = null;
  }

  showPreWaveModal(waveNum, cfg, onContinue) {
    this.waveManager?.freeze();
    this._preWaveModal?.destroy?.();
    playWaveSceneSfx(this);
    this._preWaveModal = new PreWaveModal(this, {
      waveNum,
      cfg,
      onContinue: () => {
        this._preWaveModal = null;
        this.waveManager?.unfreeze();
        onContinue?.();
      },
    });
  }

  hidePreWaveModal() {
    this._preWaveModal?.destroy?.();
    this._preWaveModal = null;
  }

  showWinScreen() {
    this.waveManager?.freeze();
    this._winScreen?.destroy?.();
    playWinSfx(this); // 暫停 BGM，播放勝利音效
    this._winScreen = new WinScreen(this);
  }

  createHud() {
    this.hud = new HudUI(this);

    // Player1 在左、Player2 在右。
    const p1Type = this.players?.[0]?.type ?? "soldier";
    const p2Type = this.players?.[1]?.type ?? "mage";
    const labelForType = classHudLabel;
    this.hud.setNames({ player1Name: labelForType(p1Type), player2Name: labelForType(p2Type) });

    // 以第 1 波預設值開始；WaveManager 會透過 _applyPlayerStats 覆寫
    const hpForType = getDefaultMaxHpForClass;
    this.hud.setWave(1);
    this.hud.setHealthMax(1, hpForType(p1Type));
    this.hud.setHealthMax(2, hpForType(p2Type));
    this.hud.setHealth(1, hpForType(p1Type));
    this.hud.setHealth(2, hpForType(p2Type));

    this.hud.setEnergyMax(50);
    this.hud.setEnergy(50);

    this.hud.setOrbs(1, 0);
    this.hud.setOrbs(2, 0);

    installHudDevTools(this);
  }

  createProjectiles() {
    this.fireballs = this.physics.add.group({ allowGravity: false });

    if (!this.anims.exists("fireball-fly")) {
      const frames = [];
      for (let i = 0; i <= 60; i += 1) frames.push({ key: `fireball-${i}` });
      this.anims.create({
        key: "fireball-fly",
        frames,
        frameRate: 24,
        repeat: -1,
      });
    }
  }

  update() {
    // 教學與波前視窗在凍結時仍需各自 update
    if (this._tutorialDialog) {
      this._tutorialDialog.update();
    }

    // Boss 血條一律更新（凍結／暫停時仍要顯示）
    updateAllBossHpBars(this);

    if (this._gameOverFrozen || isSettingsOpen(this)) return;

    // 波次管理器 tick（內部僅房主執行）
    this.waveManager?.update();

    checkAndOpenGameOver(this);

    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey) && !isSettingsOpen(this)) {
      openSettingsOverlay(this, "GameScene");
    }

    // 視覺 sprite 緊貼物理 body。
    for (const entry of this.players ?? []) {
      if (!entry?.sprite || !entry?.visual) continue;
      entry.visual.x = entry.sprite.x;
      entry.visual.y = entry.sprite.y;
    }

    // 僅測試房：允許 TAB 切換控制角色。
    const isMultiplayer = isMultiplayerScene(this);
    if (this.isTestRoom && !isMultiplayer && this.players.length > 1 && Phaser.Input.Keyboard.JustDown(this.tabKey)) {
      this.switchControlledPlayer();
    }

    if (this.playerController) {
      this.playerController.update();
    }

    if (this.remoteLerp && this.remoteTarget && this.remoteEntry) {
      const t = this.remoteTarget;
      const s = this.remoteEntry.sprite;
      s.x = Phaser.Math.Linear(s.x, t.x, this.remoteLerp);
      s.y = Phaser.Math.Linear(s.y, t.y, this.remoteLerp);
      if (Number.isFinite(t.vx) && Number.isFinite(t.vy)) {
        s.setVelocity(t.vx, t.vy);
      }
      if (typeof t.flipX === "boolean" && this.remoteEntry.visual) this.remoteEntry.visual.setFlipX(t.flipX);
      const v = this.remoteEntry.visual;
      if (t.animKey && v?.anims && (!v.anims.currentAnim || v.anims.currentAnim.key !== t.animKey)) {
        v.anims.play(t.animKey, true);
      }
    }

    // 投射物清理。
    for (const fb of this.fireballs?.getChildren?.() ?? []) {
      if (!fb) continue;
      if (fb.x < -80 || fb.x > BASE_WIDTH + 80) {
        fb.destroy();
      }
    }

    // 狂暴特效：跟隨擁有者，增益結束時自動停止。
    if (this.wildEffect && this.wildEffectOwner) {
      this.wildEffect.x = this.wildEffectOwner.x;
      this.wildEffect.y = this.wildEffectOwner.y;
      if (!this._isEnergyFree()) {
        this.wildEffect.destroy();
        this.wildEffect = null;
        this.wildEffectOwner = null;
      }
    }
  }

  _getRoleKeyByEntry(entry) {
    const idx = this.players.indexOf(entry);
    if (idx === 0) return "p1";
    if (idx === 1) return "p2";
    return null;
  }

  _isEnergyFree() {
    return Number(this.time?.now ?? 0) < Number(this.energyNoCostUntil ?? 0);
  }

  arePlayersInvincible() {
    return Number(this.time?.now ?? 0) < Number(this.playersInvincibleUntil ?? 0);
  }

  /** 單人／測試房，或多人中的房主（player1）時為 true。 */
  _isHostAuthority() {
    return isHostScene(this);
  }

  /**
   * 以房主權威套用法師治療，並將新 HP 推送到客戶端。
   * 與 damage.js 對齊，避免下次 SYNC_HP 把治療還原。
   */
  _applyMageHealAndSync() {
    const healPct = this._waveMageHealBonus > 0 ? this._waveMageHealBonus : 0.10;
    this._healBothPercent(healPct);
    this.waveManager?.syncPlayerHp?.();
    this.emitPlayerResource({
      hp: { p1: this.hud?.health?.p1, p2: this.hud?.health?.p2 },
    });
  }

  _tryConsumeEnergy(amount, forceConsume = false) {
    if (amount <= 0) return true;
    if (!forceConsume && this._isEnergyFree()) return true;
    // 波次特殊規則：僅戰士攻擊可免消耗能量。
    if (!forceConsume && this._waveWarriorNoCost) {
      const entry = this.getControlledEntry();
      if (entry?.type === "soldier") return true;
    }
    const cur = Math.max(0, Math.round(Number(this.hud?.energy) || 0));
    if (cur < amount) return false;
    const next = cur - amount;
    this.hud.setEnergy(next);
    this.emitPlayerResource({ energy: next });
    return true;
  }

  _tryConsumeOrbs(roleKey, amount) {
    if (!roleKey || amount <= 0) return false;
    const cur = Math.max(0, Math.round(Number(this.hud?.orbs?.[roleKey]) || 0));
    if (cur < amount) return false;
    const next = cur - amount;
    this.hud.setOrbs(roleKey, next);
    this.emitPlayerResource({ roleKey, orbs: next });
    return true;
  }

  _healBoth(amount) {
    const a = Math.max(0, Math.round(Number(amount) || 0));
    for (const roleKey of ["p1", "p2"]) {
      if (this.hud?.health?.[roleKey] == null || this.hud?.healthMax?.[roleKey] == null) continue;
      const cur = Math.max(0, Math.round(Number(this.hud.health[roleKey]) || 0));
      const max = Math.max(1, Math.round(Number(this.hud.healthMax[roleKey]) || 1));
      this.hud.setHealth(roleKey, Math.min(max, cur + a));
    }
  }

  /** 依各自最大 HP 比例治療雙方玩家。 */
  _healBothPercent(pct) {
    const p = Math.max(0, Number(pct) || 0);
    for (const roleKey of ["p1", "p2"]) {
      if (this.hud?.health?.[roleKey] == null || this.hud?.healthMax?.[roleKey] == null) continue;
      const cur = Math.max(0, Math.round(Number(this.hud.health[roleKey]) || 0));
      const max = Math.max(1, Math.round(Number(this.hud.healthMax[roleKey]) || 1));
      this.hud.setHealth(roleKey, Math.min(max, cur + Math.round(max * p)));
    }
  }

  _spawnFireball(entry, opts = {}) {
    const v = entry?.visual ?? entry?.sprite;
    if (!v) return;
    const facingLeft = typeof opts.flipX === "boolean" ? opts.flipX : Boolean(v.flipX);
    const dir = facingLeft ? -1 : 1;
    const spawnX = Number.isFinite(opts.x) ? opts.x : (entry.sprite?.x ?? v.x) + dir * 32;
    const spawnY = Number.isFinite(opts.y) ? opts.y : (entry.sprite?.y ?? v.y) - 26;
    const fb = this.fireballs.create(spawnX, spawnY, "fireball-0");
    fb.setData("owner", entry);
    fb.setData("damage", Number.isFinite(opts.damage) ? opts.damage : resolvePlayerAttackDamage(entry, this));
    fb.setDepth(20);
    fb.setScale(1.8);
    fb.setFlipX(facingLeft);
    fb.body.setAllowGravity(false);
    fb.body.setSize(28, 28, true);
    if (typeof fb.refreshBody === "function") fb.refreshBody();
    fb.setVelocityX(dir * 420);
    fb.anims.play("fireball-fly", true);
    return fb;
  }

  _spawnHealEffectAt(x, y) {
    const fx = this.add.sprite(x, y - 26, "heal-green-sheet", 0);
    fx.setDepth(30);
    fx.setScale(2);
    fx.anims.play("heal-green", true);
    fx.once("animationcomplete-heal-green", () => fx.destroy());
  }

  _playHealEffectsForPlayers() {
    for (const p of this.players ?? []) {
      if (!p?.sprite) continue;
      this._spawnHealEffectAt(p.sprite.x, p.sprite.y);
    }
  }

  _startWildEffect(entry) {
    const owner = entry?.sprite;
    if (!owner) return;
    if (this.wildEffect) {
      this.wildEffect.destroy();
      this.wildEffect = null;
      this.wildEffectOwner = null;
    }
    const fx = this.add.sprite(owner.x, owner.y, "wild-sheet", 0);
    fx.setOrigin(0.5, 1);
    fx.setDepth((entry?.visual?.depth ?? owner.depth ?? 10) - 1);
    fx.setScale(2);
    fx.anims.play("wild-rage", true);
    this.wildEffect = fx;
    this.wildEffectOwner = owner;
  }

  createBackground() {
    this.add.image(BASE_WIDTH / 2, BASE_HEIGHT / 2, "bg-layer-5").setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    this.add.image(BASE_WIDTH / 2, BASE_HEIGHT / 2, "bg-layer-4").setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    this.add.image(BASE_WIDTH / 2, BASE_HEIGHT / 2, "bg-layer-3").setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    this.add.image(BASE_WIDTH / 2, BASE_HEIGHT / 2, "bg-layer-2").setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    this.add.image(BASE_WIDTH / 2, BASE_HEIGHT / 2, "bg-layer-1").setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
  }

  createPlatformTexture() {
    // 從 Floor Tiles1 圖集裁切綠色平台條。
    const source = this.textures.get("floor-tiles-1").getSourceImage();
    const platformTexture = this.textures.createCanvas("platform-strip", 96, 24);
    const pctx = platformTexture.context;
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, 96, 24);
    // 浮空平台維持原樣。
    pctx.drawImage(source, 0, 0, 96, 24, 0, 0, 96, 24);
    platformTexture.refresh();

    // 地面使用中間條（不含側邊），避免接縫可見。
    const groundTexture = this.textures.createCanvas("ground-strip", 32, 30);
    const gctx = groundTexture.context;
    gctx.imageSmoothingEnabled = false;
    gctx.clearRect(0, 0, 32, 30);
    gctx.drawImage(source, 32, 0, 32, 18, 0, 0, 32, 18);
    gctx.drawImage(source, 32, 17, 32, 1, 0, 18, 32, 12);
    groundTexture.refresh();

    // 靜態物理 body 用的小型輔助貼圖。
    const bodyTex = this.textures.createCanvas("platform-body", 4, 4);
    const bodyCtx = bodyTex.context;
    bodyCtx.clearRect(0, 0, 4, 4);
    bodyCtx.fillStyle = "#ffffff";
    bodyCtx.fillRect(0, 0, 4, 4);
    bodyTex.refresh();
  }

  createGround(bodies) {
    const groundHeight = 30;
    const visual = this.add.tileSprite(
      BASE_WIDTH / 2,
      BASE_HEIGHT - groundHeight / 2,
      BASE_WIDTH + 64,
      groundHeight,
      "ground-strip"
    );
    visual.setOrigin(0.5);

    const body = bodies.create(BASE_WIDTH / 2, BASE_HEIGHT - groundHeight / 2, "platform-body");
    body.setDisplaySize(BASE_WIDTH + 64, groundHeight);
    body.setAlpha(0.001);
    body.refreshBody();
  }

  createPlatforms(bodies) {
    for (const platform of PLATFORM_ZONES) {
      this.createPlatformPiece(bodies, platform.x, platform.y, platform.w, platform.h);
    }
  }

  createPlatformPiece(bodies, x, y, width, height) {
    const visual = this.add.image(x, y, "platform-strip");
    visual.setDisplaySize(width, height);
    visual.setOrigin(0.5);

    const body = bodies.create(x, y, "platform-body");
    body.setDisplaySize(width, height);
    body.setAlpha(0.001);
    body.refreshBody();
  }

  createPlayers() {
    this.physics.world.setBounds(0, 0, BASE_WIDTH, BASE_HEIGHT);

    this.players = [];
    this.activePlayerIndex = 0;

    const isMultiplayer = isMultiplayerScene(this);
    const selections = this.selections;

    const p1Type = selections?.[1] ? selectionToPlayerType(selections[1]) : "soldier";
    const p2Type = selections?.[2] ? selectionToPlayerType(selections[2]) : "mage";
    const [spawn1, spawn2] = PLAYER_SPAWN_POINTS;

    const createForType = (type, x, y) =>
      type === "mage"
        ? createMageCharacter(this, x, y, this.platformBodies)
        : createSoldierCharacter(this, x, y, this.platformBodies);

    const p1 = createForType(p1Type, spawn1.x, spawn1.y);
    this.players.push(buildPlayerEntry(p1, p1Type));

    const shouldCreateP2 = isMultiplayer || this.isTestRoom;
    if (shouldCreateP2) {
      const p2 = createForType(p2Type, spawn2.x, spawn2.y);
      this.players.push(buildPlayerEntry(p2, p2Type));
    }

    const localIndex = getLocalPlayerIndex(this);
    this.activePlayerIndex = localIndex;
    this.playerController = new PlayerController(this, this.players[localIndex].sprite);

    // 遠端玩家 entry 參考（若存在）
    if (isMultiplayer && this.players.length > 1) {
      this.remoteEntry = this.players[localIndex === 0 ? 1 : 0];
    } else {
      this.remoteEntry = null;
    }
  }

  getControlledEntry() {
    return this.players[this.activePlayerIndex] ?? null;
  }

  isControlledPlayerLocked() {
    const entry = this.getControlledEntry();
    return Boolean(entry?.isAttacking);
  }

  setPlayerFacing(bodySprite, flipX) {
    const entry = this.players.find((p) => p.sprite === bodySprite);
    if (!entry) return;
    if (entry.visual) entry.visual.setFlipX(flipX);
  }

  switchControlledPlayer() {
    if (this.players.length <= 1) return;
    this.activePlayerIndex = this.activePlayerIndex === 0 ? 1 : 0;
    this.playerController.setPlayer(this.players[this.activePlayerIndex].sprite);
    this.updateActiveControlText();
  }

  setupNetworkSync() {
    setupMultiplayerPlayerSync(this);
  }

  updateActiveControlText() {
    if (!this.activeControlText) return;
    const isP2 = this.activePlayerIndex === 1;
    if (!this.isTestRoom || this.players.length <= 1) {
      this.activeControlText.setText("Control: Player1");
      return;
    }

    this.activeControlText.setText(
      isP2 ? "Control: Player2 (TAB switch)" : "Control: Player1 (TAB switch)"
    );
  }

  emitPlayerAction(action, payload = {}) {
    if (!this.socket || !isMultiplayerScene(this)) return;
    this.socket.emit("playerAction", {
      action,
      t: this.time?.now ?? 0,
      ...payload,
    });
  }

  emitPlayerResource(payload = {}) {
    if (!this.socket || !isMultiplayerScene(this)) return;
    this.socket.emit("playerResource", {
      t: this.time?.now ?? 0,
      ...payload,
    });
  }

  handleRemotePlayerAction(msg) {
    if (!msg || msg.playerNumber === this.playerNumber || !this.remoteEntry) return;

    if (msg.action === "attack") {
      this.playRemoteAttack(msg);
      return;
    }

    if (msg.action === "special") {
      this.playRemoteSpecial(msg);
    }
  }

  handleRemotePlayerResource(msg) {
    if (!msg || msg.playerNumber === this.playerNumber || !this.hud) return;

    if (Number.isFinite(msg.energy)) {
      this.hud.setEnergy(msg.energy);
    }
    if (typeof msg.roleKey === "string" && Number.isFinite(msg.orbs)) {
      this.hud.setOrbs(msg.roleKey, msg.orbs);
    }
    if (msg.hp && typeof msg.hp === "object") {
      if (Number.isFinite(msg.hp.p1)) this.hud.setHealth(1, msg.hp.p1);
      if (Number.isFinite(msg.hp.p2)) this.hud.setHealth(2, msg.hp.p2);
    }
  }

  /**
   * 夥伴已拾取戰利品球 — 標記本機副本為已收集，
   * 避免本側再拾取時重複發放寶珠。
   * 同時套用夥伴的寶珠更新以保持 HUD 同步。
   */
  handleRemoteLootCollected(msg) {
    if (!msg || msg.playerNumber === this.playerNumber) return;

    const { lootId } = msg;

    // 標記對應球體實體為已收集，collectEnergyBall 會略過。
    const pickups = this.lootManager?.pickups ?? [];
    for (const entity of pickups) {
      if (entity._lootId != null && entity._lootId === lootId) {
        entity.collected = true;
        entity.collecting = true;
        // 淡出並銷毀視覺，避免一直浮在場上。
        const ball = entity.sprite;
        if (ball?.active) {
          this.tweens?.add?.({
            targets: ball,
            alpha: 0,
            scale: 0,
            duration: 120,
            onComplete: () => { ball?.destroy?.(); },
          });
        }
        break;
      }
    }
  }

  /** 依網路 action 載荷鏡像遠端玩家朝向。 */
  _applyRemoteFlip(entry, msg) {
    if (typeof msg.flipX === "boolean") {
      entry.visual.setFlipX(msg.flipX);
    }
  }

  playRemoteAttack(msg) {
    const entry = this.remoteEntry;
    if (!entry?.visual) return;

    this._applyRemoteFlip(entry, msg);

    if (entry.type === "mage") {
      entry.visual.anims?.play("mage-attack-mighty", true);
      playMageAtkSfx(this);
      this._spawnFireball(entry, msg.fireball ?? {});
      entry.visual.once("animationcomplete-mage-attack-mighty", () => {
        entry.visual?.anims?.play("mage-run-idle", true);
      });
      return;
    }

    if (entry.type === "soldier") {
      // 由房主透過戰鬥管線處理遠端戰士近戰傷害。
      // 客戶端無害，因 damageEnemyEntry 以房主為權威。
      entry.isAttacking = true;
      playWarriorAtkSfx(this);
      entry.visual.anims?.play("soldier-attack01", true);
      onPlayerAttackStarted(this, entry);
      entry.visual.once("animationcomplete-soldier-attack01", () => {
        entry.isAttacking = false;
        entry.visual?.anims?.play("soldier-idle", true);
      });
    }
  }

  playRemoteSpecial(msg) {
    const entry = this.remoteEntry;
    if (!entry?.visual) return;

    this._applyRemoteFlip(entry, msg);

    if (entry.type === "mage") {
      this._playHealEffectsForPlayers();
      playMageSkillSfx(this);
      // 遠端（客戶端）法師已治療 — 若本機是房主，權威套用並同步 HP，
      // 使其生效並回傳給客戶端。
      if (this._isHostAuthority()) this._applyMageHealAndSync();
      entry.visual.anims?.play("mage-charge-mighty", true);
      entry.visual.once("animationcomplete-mage-charge-mighty", () => {
        entry.visual?.anims?.play("mage-run-idle", true);
      });
      return;
    }

    if (entry.type === "soldier") {
      // 鏡像增益計時，避免 update 迴圈立刻銷毀狂暴特效。
      const now = Number(this.time?.now ?? 0);
      this.energyNoCostUntil = now + 5000;
      playWarriorSkillSfx(this);
      // 鏡像無敵，使房主（傷害權威）略過對玩家的傷害。
      if (this._waveWarriorSkillInvincible) this.playersInvincibleUntil = now + 5000;
      this._startWildEffect(entry);
    }
  }

  createAnimations() {
    createPlayerAnimations(this);
  }

  tryPlayerAttack() {
    const entry = this.getControlledEntry();
    if (!entry || entry.isAttacking) return;
    if (entry.type === "mage") {
      // 能量消耗：法師左鍵 -5
      if (!this._tryConsumeEnergy(5)) return;
      entry.isAttacking = true;
      entry.sprite.setVelocityX(0);
      const body = entry.sprite.body;
      const isGrounded = Boolean(body?.blocked.down || body?.touching.down);
      if (isGrounded) {
        entry.gravityLocked = true;
        body.allowGravity = false;
        entry.sprite.setVelocityY(0);
      } else {
        entry.gravityLocked = false;
      }
      entry.visual.anims.play("mage-attack-mighty", true);
      playMageAtkSfx(this);
      const fireballDamage = resolvePlayerAttackDamage(entry, this);
      const fb = this._spawnFireball(entry, { damage: fireballDamage });
      this.emitPlayerAction("attack", {
        type: entry.type,
        flipX: Boolean(entry.visual?.flipX),
        fireball: {
          x: fb?.x,
          y: fb?.y,
          flipX: Boolean(fb?.flipX),
          damage: fireballDamage,
        },
      });

      entry.visual.once("animationcomplete-mage-attack-mighty", () => {
        entry.isAttacking = false;
        if (entry.gravityLocked && entry.sprite.body) {
          entry.sprite.body.allowGravity = true;
          entry.gravityLocked = false;
        }
        entry.visual.anims.play("mage-run-idle", true);
      });
      return;
    }
    if (entry.type !== "soldier") return;

    // 能量消耗：戰士左鍵 -2
    if (!this._tryConsumeEnergy(2)) return;
    entry.isAttacking = true;
    entry.sprite.setVelocityX(0);
    playWarriorAtkSfx(this);
    entry.visual.anims.play("soldier-attack01", true);
    onPlayerAttackStarted(this, entry);
    this.emitPlayerAction("attack", {
      type: entry.type,
      flipX: Boolean(entry.visual?.flipX),
    });
    entry.visual.once("animationcomplete-soldier-attack01", () => {
      entry.isAttacking = false;
      entry.visual.anims.play("soldier-idle", true);
    });
  }

  tryPlayerSpecial() {
    const entry = this.getControlledEntry();
    if (!entry) return;

    const roleKey = this._getRoleKeyByEntry(entry);
    if (!roleKey) return;

    if (entry.type === "mage") {
      // 右鍵：消耗 3 顆寶珠，治療雙方。第 4 波起可能改為百分比治療。
      if (!this._tryConsumeOrbs(roleKey, 3)) return;
      // 治療以房主為權威：僅房主修改 HP 後同步。
      // 若客戶端本地治療，下次 damage SYNC_HP 會還原。
      // 本機玩家是客戶端時，房主在收到此 "special" action 時套用治療（見 playRemoteSpecial）。
      if (this._isHostAuthority()) this._applyMageHealAndSync();
      this._playHealEffectsForPlayers();
      playMageSkillSfx(this);
      this.emitPlayerAction("special", {
        type: entry.type,
        flipX: Boolean(entry.visual?.flipX),
      });
      if (!entry.isAttacking && entry.visual?.anims) {
        entry.isAttacking = true;
        entry.sprite?.setVelocityX?.(0);
        entry.visual.anims.play("mage-charge-mighty", true);
        entry.visual.once("animationcomplete-mage-charge-mighty", () => {
          entry.isAttacking = false;
          entry.visual?.anims?.play("mage-run-idle", true);
        });
      }
      return;
    }

    if (entry.type === "soldier") {
      // 右鍵：消耗 3 顆寶珠，雙方 5 秒內攻擊不耗能量。
      if (!this._tryConsumeOrbs(roleKey, 3)) return;
      const now = Number(this.time?.now ?? 0);
      this.energyNoCostUntil = now + 5000;
      // 第 4 波：戰士大招期間雙方無敵。
      if (this._waveWarriorSkillInvincible) this.playersInvincibleUntil = now + 5000;
      playWarriorSkillSfx(this);
      this._startWildEffect(entry);
      this.emitPlayerAction("special", {
        type: entry.type,
        flipX: Boolean(entry.visual?.flipX),
      });
    }
  }

  updatePlayerMotionState(isMoving, player) {
    const entry = this.players.find((p) => p.sprite === player);
    if (!entry || entry.isAttacking) return;
    if (entry.type === "mage") {
      if (isMoving) {
        entry.visual.anims.play("mage-run", true);
      } else {
        entry.visual.anims.play("mage-run-idle", true);
      }
      return;
    }

    if (entry.type !== "soldier") return;

    if (isMoving) {
      entry.visual.anims.play("soldier-walk", true);
    } else {
      entry.visual.anims.play("soldier-idle", true);
    }
  }
}
