import { openSettingsOverlay, isSettingsOpen } from "../services/settingsOverlay.js";
import { disposeBackgroundScenes, ensureMenuInput } from "../services/gameRunReset.js";

const BASE_WIDTH = 1024;
const BASE_HEIGHT = 576;

const CHARACTER_SIDES = {
  LEFT: "left",
  RIGHT: "right",
};

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super("CharacterSelectScene");
  }

  init(data) {
    this.roomCode = data?.roomCode ?? "";
    this.playerNumber = data?.playerNumber ?? null;
    this.socket = null;
    this.roomState = null;
    this.isTestRoom = this.roomCode === "00001";
  }

  preload() {
    this.load.image("front-bg", "Assets/BG/FrontPage-BG.png");
    this.load.spritesheet(
      "soldier-idle-sheet",
      "Assets/character/solider-character/Soldier/Soldier-Idle.png",
      {
        frameWidth: 100,
        frameHeight: 100,
      }
    );
    this.load.image(
      "mage-image",
      "Assets/character/Mage-character/Idle/Idle1.png"
    );
  }

  create() {
    disposeBackgroundScenes(this);

    const bg = this.add.image(BASE_WIDTH / 2, BASE_HEIGHT / 2, "front-bg");
    bg.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    bg.setTint(0xbbbbbb);

    this.add.rectangle(BASE_WIDTH / 2, BASE_HEIGHT / 2, 980, 540, 0x4d351f, 0.85);
    this.add.rectangle(BASE_WIDTH / 2, BASE_HEIGHT / 2, 940, 500, 0xdec9a5, 0.86);
    this.add.line(BASE_WIDTH / 2, BASE_HEIGHT / 2, 0, -250, 0, 250, 0x6e4a26, 1).setLineWidth(8);

    this.createLeftCharacterPanel();
    this.createRightCharacterPanel();
    this.createCenterBoard();
    this.createInputHints();
    this.setupControls();
    if (!this.isTestRoom) {
      this.setupNetwork();
    }
    this.refreshUI();
    ensureMenuInput(this);
  }

  createLeftCharacterPanel() {
    this.add.rectangle(255, 255, 430, 420, 0xffffff, 0.14).setStrokeStyle(4, 0x8f6f43, 0.9);

    this.player1Title = this.add
      .text(255, 80, "Samurai Knight", {
        fontFamily: "Arial",
        fontSize: "44px",
        color: "#1b1f2a",
        align: "center",
      })
      .setOrigin(0.5, 0);

    this.leftCharacter = this.add.sprite(255, 603, "soldier-idle-sheet", 0);
    this.leftCharacter.setOrigin(0.5, 1);
    // Soldier sprite is tiny inside the 100x100 frame, crop to full body.
    this.leftCharacter.setCrop(36, 22, 28, 40);
    this.leftCharacter.setDisplaySize(500, 500);
    this.leftCharacter.setTint(0xffffff);

    this.leftPickTag = this.add
      .text(255, 248, "", {
        fontFamily: "Arial",
        fontSize: "30px",
        color: "#1b1f2a",
        backgroundColor: "#efe2c3",
        padding: { left: 10, right: 10, top: 4, bottom: 4 },
      })
      .setOrigin(0.5);
    this.leftPickTag.setVisible(false);
  }

  createRightCharacterPanel() {
    this.add.rectangle(770, 255, 430, 420, 0xffffff, 0.14).setStrokeStyle(4, 0x8f6f43, 0.9);

    this.player2Title = this.add
      .text(770, 80, "Mage", {
        fontFamily: "Arial",
        fontSize: "44px",
        color: "#1b1f2a",
        align: "center",
      })
      .setOrigin(0.5, 0);

    this.rightCharacter = this.add.image(770, 390, "mage-image");
    this.rightCharacter.setOrigin(0.5, 1);
    this.rightCharacter.setDisplaySize(96, 96);
    this.rightCharacter.setTint(0xffffff);

    this.rightPickTag = this.add
      .text(770, 248, "", {
        fontFamily: "Arial",
        fontSize: "30px",
        color: "#1b1f2a",
        backgroundColor: "#efe2c3",
        padding: { left: 10, right: 10, top: 4, bottom: 4 },
      })
      .setOrigin(0.5);
    this.rightPickTag.setVisible(false);
  }

  createCenterBoard() {
    this.add.rectangle(512, 226, 255, 150, 0x2f2317, 1).setStrokeStyle(6, 0x8f6f43, 1);
    this.add
      .text(512, 205, "Last Game\nForever", {
        fontFamily: "Courier New, monospace",
        fontSize: "46px",
        fontStyle: "bold",
        color: "#f4e6bf",
        align: "center",
      })
      .setOrigin(0.5);

    this.add.text(380, 304, "<", {
      fontFamily: "Arial",
      fontSize: "120px",
      color: "#6b3d1d",
    });
    this.add.text(595, 304, ">", {
      fontFamily: "Arial",
      fontSize: "120px",
      color: "#6b3d1d",
    });

    this.statusBoard = this.add.rectangle(512, 360, 320, 120, 0xf3dfbf, 1).setStrokeStyle(5, 0x8f6f43, 1);

    this.player1StatusText = this.add
      .text(512, 335, "", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#242424",
        align: "center",
      })
      .setOrigin(0.5);

    this.player2StatusText = this.add
      .text(512, 382, "", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#242424",
        align: "center",
      })
      .setOrigin(0.5);
  }

  createInputHints() {
    this.centerHint = this.add
      .text(512, 490, "Arrow keys select, E ready", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#3a2f20",
      })
      .setOrigin(0.5);

    this.centerHint2 = this.add
      .text(512, 515, "X cancel, ESC settings", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#3a2f20",
      })
      .setOrigin(0.5);

    this.countdownText = this.add
      .text(512, 100, "", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#f4e6bf",
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.defaultHintText = "Arrow keys select, E ready";
    this.hintResetTimer = null;

    if (this.roomCode) {
      this.add
        .text(948, 532, `CODE:${this.roomCode}`, {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#3a2f20",
        })
        .setOrigin(1, 1);
    }
  }

  createQuickEnterButton() {
    const button = this.add.container(870, 70);
    button.setDepth(20);

    const bg = this.add.rectangle(0, 0, 170, 44, 0x6b5163, 0.95);
    bg.setStrokeStyle(3, 0x2d2030, 1);
    const text = this.add
      .text(0, 0, "Start Test", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#f0e4c4",
      })
      .setOrigin(0.5);

    button.add([bg, text]);
    button.setSize(170, 44);
    button.setInteractive(
      new Phaser.Geom.Rectangle(-85, -22, 170, 44),
      Phaser.Geom.Rectangle.Contains,
      { useHandCursor: true }
    );

    button.on("pointerover", () => bg.setFillStyle(0x7a5f72));
    button.on("pointerout", () => bg.setFillStyle(0x6b5163));
    button.on("pointerup", () => {
      this.scene.start("IntroVideoScene", {
        roomCode: this.roomCode,
        isTestRoom: this.isTestRoom,
      });
    });
  }

  setupControls() {
    this.playerState = {
      1: { joined: false, selected: null, ready: false },
      2: { joined: false, selected: null, ready: false },
    };

    // Test room allows single client to control both players for local debugging.
    this.activePlayer = this.isTestRoom ? 1 : null;
    if (this.isTestRoom) {
      this.playerState[1].joined = true;
      this.playerState[2].joined = true;
    }

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      x: Phaser.Input.Keyboard.KeyCodes.X,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      tab: Phaser.Input.Keyboard.KeyCodes.TAB,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    // Prevent browser focusing address bar in test room.
    if (this.isTestRoom) {
      this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
      this.onTabKeyDown = (event) => {
        if (event?.preventDefault) event.preventDefault();
      };
      this.input.keyboard.on("keydown-TAB", this.onTabKeyDown);
      this.events.once("shutdown", () => {
        if (this.onTabKeyDown) this.input.keyboard.off("keydown-TAB", this.onTabKeyDown);
        this.onTabKeyDown = null;
      });
    }
  }

  getInputPlayerNumber() {
    if (this.isTestRoom) return this.activePlayer;
    return this.playerNumber;
  }

  switchActivePlayer() {
    if (!this.isTestRoom) return;
    this.activePlayer = this.activePlayer === 1 ? 2 : 1;
    this.refreshUI();
  }

  setupNetwork() {
    import("../services/socketService.js").then(({ ensureSocket }) => {
      const socket = ensureSocket();
      this.socket = socket;

      const onRoomState = (state) => {
        if (!state || state.code !== this.roomCode) return;
        this.roomState = state;

        const p1 = state.players?.[1] ?? null;
        const p2 = state.players?.[2] ?? null;

        this.playerState[1].joined = Boolean(p1);
        this.playerState[2].joined = Boolean(p2);
        this.playerState[1].selected = p1?.selectedSide ?? null;
        this.playerState[2].selected = p2?.selectedSide ?? null;
        this.playerState[1].ready = Boolean(p1?.ready);
        this.playerState[2].ready = Boolean(p2?.ready);
        this.refreshUI();
      };

      const onStartGame = ({ code }) => {
        if (code !== this.roomCode) return;
        this.hideCountdown();
        this.scene.start("IntroVideoScene", {
          roomCode: this.roomCode,
          playerNumber: this.playerNumber,
          selections: {
            1: this.playerState[1].selected,
            2: this.playerState[2].selected,
          },
        });
      };

      const onStartCountdown = ({ code, startAt, durationMs }) => {
        if (code !== this.roomCode) return;
        this.startCountdown(startAt, durationMs);
      };

      const onCountdownCancelled = ({ code }) => {
        if (code !== this.roomCode) return;
        this.hideCountdown();
      };

      socket.on("roomState", onRoomState);
      socket.on("startCountdown", onStartCountdown);
      socket.on("countdownCancelled", onCountdownCancelled);
      socket.on("startGame", onStartGame);

      // Ensure we have fresh state even if we missed initial broadcast during scene transition.
      socket.emit("getRoomState", { code: this.roomCode });

      this.events.once("shutdown", () => {
        socket.off("roomState", onRoomState);
        socket.off("startCountdown", onStartCountdown);
        socket.off("countdownCancelled", onCountdownCancelled);
        socket.off("startGame", onStartGame);
      });
    });
  }

  startCountdown(startAt, durationMs) {
    const startAtMs = Number(startAt);
    const durMs = Number(durationMs || 5000);
    if (!Number.isFinite(startAtMs) || !Number.isFinite(durMs)) return;

    this.hideCountdown();
    this.countdownText.setVisible(true);

    const tick = () => {
      const remaining = Math.max(0, startAtMs - Date.now());
      const seconds = Math.ceil(remaining / 1000);
      this.countdownText.setText(`Starting in ${seconds}`);
      if (remaining <= 0) {
        this.hideCountdown();
      }
    };

    tick();
    this.countdownTimer = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: tick,
    });
  }

  hideCountdown() {
    if (this.countdownTimer) {
      this.countdownTimer.remove(false);
      this.countdownTimer = null;
    }
    if (this.countdownText) this.countdownText.setVisible(false);
  }

  update() {
    if (isSettingsOpen(this)) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.left)) {
      this.selectSide(CHARACTER_SIDES.LEFT);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.right)) {
      this.selectSide(CHARACTER_SIDES.RIGHT);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.x)) {
      this.cancelSelection();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.confirmReady();
    }

    if (this.isTestRoom && Phaser.Input.Keyboard.JustDown(this.keys.tab)) {
      this.switchActivePlayer();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc) && !isSettingsOpen(this)) {
      openSettingsOverlay(this, "CharacterSelectScene");
    }
  }

  selectSide(side) {
    const pn = this.getInputPlayerNumber();
    if (pn !== 1 && pn !== 2) return;
    const me = this.playerState[pn];
    if (!me.joined || me.ready) return;

    const otherNum = pn === 1 ? 2 : 1;
    const other = this.playerState[otherNum];
    if (other.joined && other.selected === side) {
      this.showHintMessage("This role is already selected");
      return;
    }

    if (this.isTestRoom) {
      me.selected = side;
      me.ready = false;
      this.showHintMessage(this.defaultHintText);
      this.refreshUI();
      return;
    }

    if (!this.socket) return;
    this.socket.emit("setSelection", { selectedSide: side });
    this.showHintMessage(this.defaultHintText);
  }

  cancelSelection() {
    const pn = this.getInputPlayerNumber();
    if (pn !== 1 && pn !== 2) return;
    const me = this.playerState[pn];
    if (!me.joined) return;

    if (this.isTestRoom) {
      me.ready = false;
      me.selected = null;
      this.hideCountdown();
      this.showHintMessage(this.defaultHintText);
      this.refreshUI();
      return;
    }

    if (!this.socket) return;
    this.socket.emit("setReady", { ready: false });
    this.socket.emit("setSelection", { selectedSide: null });
    this.showHintMessage(this.defaultHintText);
  }

  confirmReady() {
    const pn = this.getInputPlayerNumber();
    if (pn !== 1 && pn !== 2) return;
    const me = this.playerState[pn];
    if (!me.joined || !me.selected || me.ready) return;

    if (this.isTestRoom) {
      me.ready = true;
      this.showHintMessage(this.defaultHintText);
      this.refreshUI();

      const allReady = this.playerState[1].ready && this.playerState[2].ready;
      if (allReady) {
        const startAt = Date.now() + 5000;
        this.startCountdown(startAt, 5000);
        this.time.delayedCall(5000, () => {
          // If someone cancelled during countdown, don't start.
          if (!(this.playerState[1].ready && this.playerState[2].ready)) return;
          this.hideCountdown();
          this.scene.start("IntroVideoScene", {
            roomCode: this.roomCode,
            isTestRoom: true,
            selections: {
              1: this.playerState[1].selected,
              2: this.playerState[2].selected,
            },
          });
        });
      }
      return;
    }

    if (!this.socket) return;
    this.socket.emit("setReady", { ready: true });
    this.showHintMessage(this.defaultHintText);
  }

  refreshUI() {
    const p1 = this.playerState[1];
    const p2 = this.playerState[2];

    this.player1StatusText.setText(this.getCenterStatusLabel(1));

    if (p2.joined) {
      this.player2StatusText.setVisible(true);
      this.player2StatusText.setText(this.getCenterStatusLabel(2));
      this.statusBoard.setSize(320, 120);
      this.player1StatusText.setPosition(512, 340);
      this.player2StatusText.setPosition(512, 378);
    } else {
      // Player 2 not in room: keep center board only for player 1.
      this.player2StatusText.setVisible(false);
      this.statusBoard.setSize(320, 88);
      this.player1StatusText.setPosition(512, 360);
    }

    this.updatePickedTags();

    this.leftCharacter.clearTint();
    this.rightCharacter.clearTint();

    if (p1.selected === CHARACTER_SIDES.LEFT || p2.selected === CHARACTER_SIDES.LEFT) {
      this.leftCharacter.setTint(0xfff6ce);
    } else {
      this.leftCharacter.setTint(0xffffff);
    }

    if (p1.selected === CHARACTER_SIDES.RIGHT || p2.selected === CHARACTER_SIDES.RIGHT) {
      this.rightCharacter.setTint(0xfff6ce);
    } else {
      this.rightCharacter.setTint(0xffffff);
    }
  }

  getCenterStatusLabel(playerNumber) {
    const player = this.playerState[playerNumber];
    if (!player.joined) return `Player${playerNumber}`;
    if (player.ready) return `Player${playerNumber} (Ready)`;
    if (this.isTestRoom && this.activePlayer === playerNumber) return `Player${playerNumber} (Control)`;
    return `Player${playerNumber}`;
  }

  updatePickedTags() {
    const leftPickers = [];
    const rightPickers = [];

    if (this.playerState[1].selected === CHARACTER_SIDES.LEFT) leftPickers.push("Player 1");
    if (this.playerState[2].selected === CHARACTER_SIDES.LEFT) leftPickers.push("Player 2");
    if (this.playerState[1].selected === CHARACTER_SIDES.RIGHT) rightPickers.push("Player 1");
    if (this.playerState[2].selected === CHARACTER_SIDES.RIGHT) rightPickers.push("Player 2");

    this.leftPickTag.setText(leftPickers.join(" / "));
    this.leftPickTag.setVisible(leftPickers.length > 0);

    this.rightPickTag.setText(rightPickers.join(" / "));
    this.rightPickTag.setVisible(rightPickers.length > 0);
  }

  showHintMessage(message) {
    this.centerHint.setText(message);
    if (this.hintResetTimer) {
      this.hintResetTimer.remove(false);
      this.hintResetTimer = null;
    }

    if (message !== this.defaultHintText) {
      this.hintResetTimer = this.time.delayedCall(1200, () => {
        this.centerHint.setText(this.defaultHintText);
        this.hintResetTimer = null;
      });
    }
  }

  // Countdown removed: server emits "startGame" when both ready.
}
