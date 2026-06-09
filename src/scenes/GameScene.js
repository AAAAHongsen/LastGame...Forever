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
    preloadCombatLootAssets(this);

    // Enemy assets must be available in both multiplayer and test room.
    // Wave spawning/animations rely on these textures globally.
    preloadEnemyAssets(this);

    this.load.image(
      "bg-layer-1",
      "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 1.png"
    );
    this.load.image(
      "bg-layer-2",
      "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 2.png"
    );
    this.load.image(
      "bg-layer-3",
      "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 3.png"
    );
    this.load.image(
      "bg-layer-4",
      "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 4.png"
    );
    this.load.image(
      "bg-layer-5",
      "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 5.png"
    );
    this.load.image(
      "floor-tiles-1",
      "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/Floor Tiles1.png"
    );
    this.load.image(
      "other-tiles-2",
      "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/Other Tiles2.png"
    );
    // this.load.image(
    //   "player-soldier",
    //   "Assets/character/solider-character/Soldier/solider-image.png"
    // );
    this.load.spritesheet(
      "soldier-walk-sheet",
      "Assets/character/solider-character/Soldier/Soldier-Walk.png",
      {
        frameWidth: 100,
        frameHeight: 100,
      }
    );
    this.load.spritesheet(
      "soldier-attack01-sheet",
      "Assets/character/solider-character/Soldier/Soldier-Attack01.png",
      {
        frameWidth: 100,
        frameHeight: 100,
      }
    );
    this.load.spritesheet(
      "mage-run-sheet",
      "Assets/character/Mage-character/Run/Run_script.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet(
      "mage-attack-mighty-sheet",
      "Assets/character/Mage-character/Attack/StaffMighty/AttackMighty_script.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet(
      `mage-charge-mighty-sheet`,
      `Assets/character/Mage-character/AttackCharge/StaffMighty/ChargeMighty.png`,
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );

    // Effects (spritesheets are laid out left-to-right in one row).
    this.load.spritesheet("heal-green-sheet", "Assets/effects/heal/Heal-Green.png", {
      frameWidth: 16, // 96 / 6
      frameHeight: 32,
    });
    this.load.spritesheet("wild-sheet", "Assets/effects/wild/wild.png", {
      frameWidth: 16, // 48 / 3
      frameHeight: 32,
    });
    // Mage fireball frames (separate PNGs).
    for (let i = 0; i <= 60; i += 1) {
      this.load.image(`fireball-${i}`, `Assets/effects/fireball/1_${i}.png`);
    }

    // HUD is drawn (no textures).
  }

  create() {
    // Ensure socket exists before WaveManager construction.
    const isMultiplayer = Boolean(this.roomCode && (this.playerNumber === 1 || this.playerNumber === 2));
    if (isMultiplayer) {
      this.socket = ensureSocket();
    }

    this.createBackground();
    this.createPlatformTexture();
    this.platformBodies = this.physics.add.staticGroup();
    this.createGround(this.platformBodies);
    this.createPlatforms(this.platformBodies);
    this.createAnimations();

    // Always initialise enemy system (not just test room)
    createEnemyAnimations(this);
    installEnemyDevTools(this);

    this.createPlayers();

    // Rebuild combat overlaps after players exist
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

    // Wave system
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

  // ── Wave UI hooks (called by WaveManager) ────────────────────────────

  showTutorial(onLocalDone) {
    this.waveManager?.freeze();
    this._tutorialDialog?.destroy?.();
    this._tutorialDialog = new TutorialDialog(this, {
      onLocalDone: () => {
        // Don't destroy yet — may need to show "waiting" state
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
    this._winScreen = new WinScreen(this);
  }

  createHud() {
    this.hud = new HudUI(this);

    // Player1 should be left; Player2 right.
    const p1Type = this.players?.[0]?.type ?? "soldier";
    const p2Type = this.players?.[1]?.type ?? "mage";
    const labelForType = (t) => (t === "mage" ? "Mage" : "Warrior");
    this.hud.setNames({ player1Name: labelForType(p1Type), player2Name: labelForType(p2Type) });

    // Start at wave-1 defaults; WaveManager will overwrite via _applyPlayerStats
    const hpForType = (t) => (t === "mage" ? 70 : 100);
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
    // Tutorial and pre-wave modal need their own update even when frozen
    if (this._tutorialDialog) {
      this._tutorialDialog.update();
    }

    // Boss HP bars always update (so they're visible even when game is frozen/paused)
    updateAllBossHpBars(this);

    if (this._gameOverFrozen || isSettingsOpen(this)) return;

    // Wave manager ticks (host-only checks inside)
    this.waveManager?.update();

    checkAndOpenGameOver(this);

    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey) && !isSettingsOpen(this)) {
      openSettingsOverlay(this, "GameScene");
    }

    // Keep visual sprites glued to their physics bodies.
    for (const entry of this.players ?? []) {
      if (!entry?.sprite || !entry?.visual) continue;
      entry.visual.x = entry.sprite.x;
      entry.visual.y = entry.sprite.y;
    }

    // Test-room only: allow TAB swapping.
    const isMultiplayer = Boolean(this.roomCode && (this.playerNumber === 1 || this.playerNumber === 2));
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

    // Projectile cleanup.
    for (const fb of this.fireballs?.getChildren?.() ?? []) {
      if (!fb) continue;
      if (fb.x < -80 || fb.x > BASE_WIDTH + 80) {
        fb.destroy();
      }
    }

    // Wild effect: follow owner and auto-stop when buff ends.
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

  _tryConsumeEnergy(amount, forceConsume = false) {
    if (amount <= 0) return true;
    if (!forceConsume && this._isEnergyFree()) return true;
    // Wave special rule: only warrior attacks can bypass energy consumption.
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

  /** Heal both players by a fraction of their individual max HP. */
  _healBothPercent(pct) {
    const p = Math.max(0, Number(pct) || 0);
    for (const roleKey of ["p1", "p2"]) {
      if (this.hud?.health?.[roleKey] == null || this.hud?.healthMax?.[roleKey] == null) continue;
      const cur = Math.max(0, Math.round(Number(this.hud.health[roleKey]) || 0));
      const max = Math.max(1, Math.round(Number(this.hud.healthMax[roleKey]) || 1));
      this.hud.setHealth(roleKey, Math.min(max, cur + Math.round(max * p)));
    }
  }

  /**
   * Host-authoritative mage heal. HP is mutated only on the host (matching the
   * damage pipeline) and then broadcast, so a client's local heal can't get
   * overwritten by a stale syncPlayerHp ("healed then instantly reverted").
   */
  _applyMageHealAuthoritative() {
    const isMultiplayer = Boolean(this.roomCode && (this.playerNumber === 1 || this.playerNumber === 2));
    // Only the host mutates HP; the client waits for the synced value.
    if (isMultiplayer && this.playerNumber !== 1) return;

    const healPct = this._waveMageHealBonus > 0 ? this._waveMageHealBonus : 0.10;
    this._healBothPercent(healPct);

    // Push the new HP to the client immediately via both channels.
    this.waveManager?.syncPlayerHp?.();
    if (typeof this.emitPlayerResource === "function") {
      this.emitPlayerResource({
        hp: {
          p1: this.hud?.health?.p1,
          p2: this.hud?.health?.p2,
        },
      });
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
    // Crop a green platform strip from Floor Tiles1 spritesheet.
    const source = this.textures.get("floor-tiles-1").getSourceImage();
    const platformTexture = this.textures.createCanvas("platform-strip", 96, 24);
    const pctx = platformTexture.context;
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, 96, 24);
    // Floating platforms keep original look.
    pctx.drawImage(source, 0, 0, 96, 24, 0, 0, 96, 24);
    platformTexture.refresh();

    // Ground uses a center strip (without side edges) to avoid visible seams.
    const groundTexture = this.textures.createCanvas("ground-strip", 32, 30);
    const gctx = groundTexture.context;
    gctx.imageSmoothingEnabled = false;
    gctx.clearRect(0, 0, 32, 30);
    gctx.drawImage(source, 32, 0, 32, 18, 0, 0, 32, 18);
    gctx.drawImage(source, 32, 17, 32, 1, 0, 18, 32, 12);
    groundTexture.refresh();

    // Tiny helper texture for static physics bodies.
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
    this.createPlatformPiece(bodies, 180, 420, 200, 30);
    this.createPlatformPiece(bodies, 470, 300, 250, 30);
    this.createPlatformPiece(bodies, 730, 430, 190, 30);
    this.createPlatformPiece(bodies, 930, 250, 220, 30);
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

    const isMultiplayer = Boolean(this.roomCode && (this.playerNumber === 1 || this.playerNumber === 2));
    const selections = this.selections;

    const selectionToType = (sel) => (sel === "right" ? "mage" : "soldier");
    const p1Type = selections?.[1] ? selectionToType(selections[1]) : "soldier";
    const p2Type = selections?.[2] ? selectionToType(selections[2]) : "mage";
    const spawn1 = { x: 120, y: -80 };
    const spawn2 = { x: 220, y: -120 };

    const createSoldier = (x, y) => {
      const soldier = this.physics.add.sprite(x, y, "soldier-walk-sheet", 0);
      soldier.setScale(2);
      soldier.setCollideWorldBounds(true);
      // Keep players above enemies/effects by default.
      soldier.setDepth(40);
      soldier.body.setSize(7, 18, true);
      soldier.body.setOffset(46, 39);
      soldier.setBounce(0.02);
      soldier.anims.play("soldier-idle");
      this.physics.add.collider(soldier, this.platformBodies);
      return { body: soldier, visual: soldier };
    };

    const createMage = (x, y) => {
      // Physics body is decoupled from animation frame sizes to prevent platform tunneling.
      const body = this.physics.add.sprite(x, y, "platform-body");
      body.setAlpha(0.001);
      // Give Arcade body a stable size reference for offsets.
      body.setDisplaySize(8, 8);
      body.setOrigin(0.5, 1);
      body.setCollideWorldBounds(true);
      body.setDepth(40);
      body.body.setSize(7, 15, true);
      // Shift hitbox upward a bit so sprite doesn't look like it's floating.
      body.body.setOffset(-2, -11);
      body.setBounce(0.02);
      this.physics.add.collider(body, this.platformBodies);

      const visual = this.add.sprite(x, y, "mage-run-sheet", 2);
      visual.setScale(2.3);
      visual.setOrigin(0.5, 1);
      visual.setDepth(41);
      visual.anims.play("mage-run-idle");
      return { body, visual };
    };

    const p1 = p1Type === "mage" ? createMage(spawn1.x, spawn1.y) : createSoldier(spawn1.x, spawn1.y);
    this.players.push({
      sprite: p1.body,
      visual: p1.visual,
      type: p1Type,
      isAttacking: false,
      gravityLocked: false,
    });

    const shouldCreateP2 = isMultiplayer || this.isTestRoom;
    if (shouldCreateP2) {
      const p2 = p2Type === "mage" ? createMage(spawn2.x, spawn2.y) : createSoldier(spawn2.x, spawn2.y);
      this.players.push({
        sprite: p2.body,
        visual: p2.visual,
        type: p2Type,
        isAttacking: false,
        gravityLocked: false,
      });
    }

    // Local control: in multiplayer, control your own playerNumber; otherwise player 1.
    const localIndex = isMultiplayer ? (this.playerNumber === 2 ? 1 : 0) : 0;
    this.activePlayerIndex = localIndex;
    this.playerController = new PlayerController(this, this.players[localIndex].sprite);

    // Remote entry handle (if exists)
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
    const isMultiplayer = Boolean(this.roomCode && (this.playerNumber === 1 || this.playerNumber === 2));
    if (!isMultiplayer) return;

    const socket = ensureSocket();
    this.socket = socket;

    this.remoteTarget = null;
    this.remoteLerp = 0.35;

    const onTransform = (msg) => {
      if (!msg || typeof msg !== "object") return;
      // Ignore if somehow received our own state.
      if (msg.playerNumber === this.playerNumber) return;
      if (!this.remoteEntry) return;
      this.remoteTarget = {
        x: Number(msg.x ?? this.remoteEntry.sprite.x),
        y: Number(msg.y ?? this.remoteEntry.sprite.y),
        vx: Number(msg.vx ?? 0),
        vy: Number(msg.vy ?? 0),
        flipX: Boolean(msg.flipX),
        animKey: typeof msg.animKey === "string" ? msg.animKey : null,
      };
    };

    const onPlayerAction = (msg) => {
      this.handleRemotePlayerAction(msg);
    };
    const onPlayerResource = (msg) => {
      this.handleRemotePlayerResource(msg);
    };
    const onLootCollected = (msg) => {
      this.handleRemoteLootCollected(msg);
    };

    socket.on("playerTransform", onTransform);
    socket.on("playerAction", onPlayerAction);
    socket.on("playerResource", onPlayerResource);
    socket.on("waveLootCollected", onLootCollected);

    // Publish local transform at a high frequency for LAN smoothness.
    this.transformTimer = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        const entry = this.getControlledEntry();
        const s = entry?.sprite;
        const v = entry?.visual ?? entry?.sprite;
        if (!s || !s.body) return;
        const animKey = v.anims?.currentAnim?.key ?? null;
        socket.emit("playerTransform", {
          x: s.x,
          y: s.y,
          vx: s.body.velocity.x,
          vy: s.body.velocity.y,
          flipX: Boolean(v.flipX),
          animKey,
        });
      },
    });

    this.events.once("shutdown", () => {
      socket.off("playerTransform", onTransform);
      socket.off("playerAction", onPlayerAction);
      socket.off("playerResource", onPlayerResource);
      if (this.transformTimer) {
        this.transformTimer.remove(false);
        this.transformTimer = null;
      }
    });
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
    if (!this.socket || !(this.roomCode && (this.playerNumber === 1 || this.playerNumber === 2))) return;
    this.socket.emit("playerAction", {
      action,
      t: this.time?.now ?? 0,
      ...payload,
    });
  }

  emitPlayerResource(payload = {}) {
    if (!this.socket || !(this.roomCode && (this.playerNumber === 1 || this.playerNumber === 2))) return;
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
   * Partner already collected a loot ball — mark the local copy as collected
   * so this side doesn't double-grant orbs when its own ball is picked up.
   * Also applies the partner's orb update to keep HUD in sync.
   */
  handleRemoteLootCollected(msg) {
    if (!msg || msg.playerNumber === this.playerNumber) return;

    const { lootId } = msg;

    // Mark the matching ball entity as collected so collectEnergyBall skips it.
    const pickups = this.lootManager?.pickups ?? [];
    for (const entity of pickups) {
      if (entity._lootId != null && entity._lootId === lootId) {
        entity.collected = true;
        entity.collecting = true;
        // Fade and destroy the visual so it doesn't float there forever.
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

  playRemoteAttack(msg) {
    const entry = this.remoteEntry;
    if (!entry?.visual) return;

    if (typeof msg.flipX === "boolean") {
      entry.visual.setFlipX(msg.flipX);
    }

    if (entry.type === "mage") {
      entry.visual.anims?.play("mage-attack-mighty", true);
      this._spawnFireball(entry, msg.fireball ?? {});
      entry.visual.once("animationcomplete-mage-attack-mighty", () => {
        entry.visual?.anims?.play("mage-run-idle", true);
      });
      return;
    }

    if (entry.type === "soldier") {
      // Let host apply remote soldier melee damage via combat pipeline.
      // On client this is harmless because damageEnemyEntry is host-authoritative.
      entry.isAttacking = true;
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

    if (typeof msg.flipX === "boolean") {
      entry.visual.setFlipX(msg.flipX);
    }

    if (entry.type === "mage") {
      // Host applies + syncs the heal when the client cast it; client just
      // shows the effect and waits for the synced HP.
      this._applyMageHealAuthoritative();
      this._playHealEffectsForPlayers();
      entry.visual.anims?.play("mage-charge-mighty", true);
      entry.visual.once("animationcomplete-mage-charge-mighty", () => {
        entry.visual?.anims?.play("mage-run-idle", true);
      });
      return;
    }

    if (entry.type === "soldier") {
      // Mirror the buff timer so the update loop doesn't immediately destroy the wild effect.
      const now = Number(this.time?.now ?? 0);
      this.energyNoCostUntil = now + 5000;
      // Mirror invincibility so the host (damage authority) skips player damage.
      if (this._waveWarriorSkillInvincible) this.playersInvincibleUntil = now + 5000;
      this._startWildEffect(entry);
    }
  }

  createAnimations() {
    if (!this.anims.exists("soldier-idle")) {
      this.anims.create({
        key: "soldier-idle",
        frames: [{ key: "soldier-walk-sheet", frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
    }

    if (!this.anims.exists("soldier-walk")) {
      this.anims.create({
        key: "soldier-walk",
        frames: this.anims.generateFrameNumbers("soldier-walk-sheet", { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists("soldier-attack01")) {
      this.anims.create({
        key: "soldier-attack01",
        frames: this.anims.generateFrameNumbers("soldier-attack01-sheet", { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      });
    }

    if (!this.anims.exists("mage-run")) {
      this.anims.create({
        key: "mage-run",
        frames: this.anims.generateFrameNumbers("mage-run-sheet", { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists("mage-run-idle")) {
      this.anims.create({
        key: "mage-run-idle",
        frames: [{ key: "mage-run-sheet", frame: 2 }],
        frameRate: 1,
        repeat: -1,
      });
    }

    if (!this.anims.exists("mage-attack-mighty")) {
      this.anims.create({
        key: "mage-attack-mighty",
        frames: this.anims.generateFrameNumbers("mage-attack-mighty-sheet", { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      });
    }

    if (!this.anims.exists("mage-charge-mighty")) {
      this.anims.create({
        key: "mage-charge-mighty",
        frames: this.anims.generateFrameNumbers("mage-charge-mighty-sheet", { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      });
    }

    if (!this.anims.exists("heal-green")) {
      this.anims.create({
        key: "heal-green",
        frames: this.anims.generateFrameNumbers("heal-green-sheet", { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      });
    }

    if (!this.anims.exists("wild-rage")) {
      this.anims.create({
        key: "wild-rage",
        frames: this.anims.generateFrameNumbers("wild-sheet", { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  tryPlayerAttack() {
    const entry = this.getControlledEntry();
    if (!entry || entry.isAttacking) return;
    if (entry.type === "mage") {
      // Energy cost: mage LMB -5
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

    // Energy cost: soldier LMB -2
    if (!this._tryConsumeEnergy(2)) return;
    entry.isAttacking = true;
    entry.sprite.setVelocityX(0);
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
      // RMB: consume 3 orbs, heal both. Wave 4+ may use % heal.
      if (!this._tryConsumeOrbs(roleKey, 3)) return;
      // Heal is host-authoritative + synced so the client value isn't reverted.
      this._applyMageHealAuthoritative();
      this._playHealEffectsForPlayers();
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
      // RMB: consume 3 orbs, 5 seconds no energy consumption for both players.
      if (!this._tryConsumeOrbs(roleKey, 3)) return;
      const now = Number(this.time?.now ?? 0);
      this.energyNoCostUntil = now + 5000;
      // Wave 4: warrior ULT also makes both players invincible for its duration.
      if (this._waveWarriorSkillInvincible) this.playersInvincibleUntil = now + 5000;
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
