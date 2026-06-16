/** 首頁視窗 — 輸入代碼加入現有房間。 */
import { playButtonHoverSfx } from "../services/audioService.js";

export class JoinRoomModal {
  constructor(scene, options) {
    this.scene = scene;
    this.width = options.width;
    this.height = options.height;
    this.onSubmit = options.onSubmit;

    this.roomCode = "";
    this.build();
  }

  build() {
    this.container = this.scene.add.container(this.width / 2, this.height / 2);
    this.container.setDepth(50);
    this.container.setVisible(false);

    const overlay = this.scene.add.rectangle(0, 0, this.width, this.height, 0x000000, 0.5);
    overlay.setOrigin(0.5);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(-this.width / 2, -this.height / 2, this.width, this.height),
      Phaser.Geom.Rectangle.Contains
    );

    const panelShadow = this.scene.add.rectangle(10, 10, 540, 340, 0x2d222d, 0.9);
    const panel = this.scene.add.rectangle(0, 0, 540, 340, 0xe8d5b5, 1);
    panel.setStrokeStyle(6, 0x6e4a26, 1);

    const title = this.scene.add
      .text(0, -120, "Join Room", {
        fontFamily: "Arial",
        fontSize: "44px",
        color: "#2a1f15",
      })
      .setOrigin(0.5);

    const codeLabel = this.scene.add
      .text(0, -62, "Enter Room Code", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#3a2f20",
      })
      .setOrigin(0.5);

    this.codeField = this.scene.add
      .rectangle(0, -18, 380, 66, 0xf7edd8, 1)
      .setStrokeStyle(4, 0x8f6f43, 1);
    this.codeFieldText = this.scene.add
      .text(0, -18, "-", {
        fontFamily: "Courier New, monospace",
        fontSize: "38px",
        color: "#1f1f1f",
      })
      .setOrigin(0.5);

    this.errorText = this.scene.add
      .text(0, 28, "", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#8d2b2b",
      })
      .setOrigin(0.5);

    const joinBtn = this.createButton(-95, 105, "Join", () => this.submit());
    const cancelBtn = this.createButton(95, 105, "Cancel", () => this.close());

    this.container.add([
      overlay,
      panelShadow,
      panel,
      title,
      codeLabel,
      this.codeField,
      this.codeFieldText,
      this.errorText,
      joinBtn.bg,
      joinBtn.text,
      cancelBtn.bg,
      cancelBtn.text,
    ]);

    this.onKeyDown = (event) => {
      if (!this.container.visible) return;

      if (event.key === "Enter") {
        this.submit();
        return;
      }

      if (event.key === "Escape") {
        this.close();
        return;
      }

      if (event.key === "Backspace") {
        this.roomCode = this.roomCode.slice(0, -1);
        this.refreshField();
        return;
      }

      if (/^\d$/.test(event.key) && this.roomCode.length < 5) {
        this.roomCode += event.key;
        this.refreshField();
      }
    };

    this.scene.input.keyboard.on("keydown", this.onKeyDown);
    this.scene.events.once("shutdown", () => {
      this.scene.input.keyboard.off("keydown", this.onKeyDown);
    });
  }

  createButton(x, y, label, onClick) {
    const bw = 150, bh = 58;
    let isPressed = false;

    // 使用 plain Rectangle（非 Container）以避開 Phaser 3.90 巢狀容器輸入 bug。
    const bg = this.scene.add.rectangle(x, y, bw, bh, 0x6b5163, 1);
    bg.setOrigin(0.5);
    bg.setStrokeStyle(4, 0x2d2030, 1);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(-bw / 2, -bh / 2, bw, bh),
      Phaser.Geom.Rectangle.Contains
    );
    if (bg.input) bg.input.cursor = "pointer";

    const text = this.scene.add
      .text(x, y, label, {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#f0e4c4",
      })
      .setOrigin(0.5);

    bg.on("pointerover", () => { bg.setFillStyle(0x7a5f72); playButtonHoverSfx(this.scene); });
    bg.on("pointerout", () => {
      bg.setFillStyle(0x6b5163);
      if (isPressed) { isPressed = false; bg.y -= 2; text.y -= 2; }
    });
    bg.on("pointerdown", () => {
      if (isPressed) return;
      isPressed = true;
      bg.y += 2;
      text.y += 2;
    });
    bg.on("pointerup", () => {
      if (!isPressed) return;
      isPressed = false;
      bg.y -= 2;
      text.y -= 2;
      onClick();
    });
    bg.on("pointerupoutside", () => {
      if (!isPressed) return;
      isPressed = false;
      bg.y -= 2;
      text.y -= 2;
    });

    return { bg, text };
  }

  open() {
    this.roomCode = "";
    this.errorText.setText("");
    this.refreshField();
    this.container.setVisible(true);
  }

  close() {
    this.container.setVisible(false);
  }

  setError(message) {
    this.errorText.setText(message);
  }

  refreshField() {
    this.codeFieldText.setText(this.roomCode || "-");
  }

  submit() {
    this.onSubmit(this.roomCode.trim());
  }
}
