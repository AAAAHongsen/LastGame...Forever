/** 主選單 — 建立房間、加入流程與設定入口。 */
import { BASE_WIDTH, BASE_HEIGHT } from "../config/constants.js";
import { ensureBgm, playButtonHoverSfx, preloadAudio } from "../services/audioService.js";
import { JoinRoomModal } from "../ui/JoinRoomModal.js";
import { ensureSocket, leaveActiveRoom } from "../services/socketService.js";
import { openSettingsOverlay } from "../services/settingsOverlay.js";
import { disposeBackgroundScenes, ensureMenuInput } from "../services/gameRunReset.js";

export class FrontPageScene extends Phaser.Scene {
  constructor() {
    super("FrontPageScene");
  }

  preload() {
    this.load.image("front-bg", "Assets/BG/FrontPage-BG.png");
    preloadAudio(this);
  }

  create() {
    // 返回選單會結束目前連線並釋放房間名額。
    leaveActiveRoom();
    disposeBackgroundScenes(this);

    const bg = this.add.image(BASE_WIDTH / 2, BASE_HEIGHT / 2, "front-bg");
    bg.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    ensureBgm(this);

    const buttonX = 175;

    this.createButton(buttonX, 260, "Play", () => {
      const socket = ensureSocket();

      const onRoomJoined = ({ code, playerNumber }) => {
        socket.off("joinRejected", onJoinRejected);
        this.scene.start("CharacterSelectScene", {
          roomCode: code,
          playerNumber,
        });
      };
      const onJoinRejected = ({ reason }) => {
        socket.off("roomJoined", onRoomJoined);
        // 留在首頁；顯示視窗供重試。
        this.joinModal.open();
        this.joinModal.setError(reason || "Join failed");
      };

      socket.once("roomJoined", onRoomJoined);
      socket.once("joinRejected", onJoinRejected);
      socket.emit("createRoom");
    });

    this.createButton(buttonX, 345, "Join", () => {
      this.joinModal.open();
    });

    this.createButton(buttonX, 430, "Setting", () => {
      openSettingsOverlay(this, "FrontPageScene");
    });

    this.joinModal = new JoinRoomModal(this, {
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      onSubmit: (code) => {
        const socket = ensureSocket();
        const normalized = String(code || "").trim().toUpperCase();
        if (!normalized) {
          this.joinModal.setError("Invalid room code");
          return;
        }

        const onRoomJoined = ({ code: joinedCode, playerNumber }) => {
          socket.off("joinRejected", onJoinRejected);
          this.joinModal.close();
          this.scene.start("CharacterSelectScene", {
            roomCode: joinedCode,
            playerNumber,
          });
        };
        const onJoinRejected = ({ reason }) => {
          socket.off("roomJoined", onRoomJoined);
          this.joinModal.setError(reason || "Join failed");
        };

        socket.once("roomJoined", onRoomJoined);
        socket.once("joinRejected", onJoinRejected);
        socket.emit("joinRoom", { code: normalized });
      },
    });

    ensureMenuInput(this);
  }

  createButton(x, y, label, onClick) {
    const width = 250;
    const height = 62;
    const pressOffset = 3;
    let isPressed = false;

    // 陰影固定；按下時面板與文字位移。
    const shadow = this.add.rectangle(x, y, width, height, 0x3f2f3c, 0.9);
    shadow.setOrigin(0.5);
    shadow.setStrokeStyle(4, 0x1d1520);

    const panel = this.add.rectangle(x, y - 6, width, height, 0x6b5163, 0.95);
    panel.setOrigin(0.5);
    panel.setStrokeStyle(4, 0x2d2030);
    // 直接使用 Rectangle（非 Container/Zone）以避開 Phaser 3.90 輸入 bug。
    panel.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    if (panel.input) panel.input.cursor = "pointer";

    const text = this.add
      .text(x, y - 6, label, {
        fontFamily: "Courier New, monospace",
        fontSize: "50px",
        fontStyle: "bold",
        color: "#d8bb4a",
      })
      .setOrigin(0.5);

    panel.on("pointerover", () => {
      panel.setFillStyle(0x7a5f72);
      text.setColor("#f0d36a");
      playButtonHoverSfx(this);
    });

    panel.on("pointerout", () => {
      panel.setFillStyle(0x6b5163);
      text.setColor("#d8bb4a");
      if (isPressed) {
        isPressed = false;
        panel.y -= pressOffset;
        text.y -= pressOffset;
        shadow.alpha = 0.9;
      }
    });

    panel.on("pointerdown", () => {
      if (isPressed) return;
      isPressed = true;
      panel.y += pressOffset;
      text.y += pressOffset;
      shadow.alpha = 0.55;
    });

    panel.on("pointerup", () => {
      if (!isPressed) return;
      isPressed = false;
      panel.y -= pressOffset;
      text.y -= pressOffset;
      shadow.alpha = 0.9;
      onClick();
    });

    panel.on("pointerupoutside", () => {
      if (!isPressed) return;
      isPressed = false;
      panel.y -= pressOffset;
      text.y -= pressOffset;
      shadow.alpha = 0.9;
    });
  }
}
