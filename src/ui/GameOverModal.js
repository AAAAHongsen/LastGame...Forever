/** 全螢幕 Game Over UI，含 End／Restart 操作。 */
import { BASE_WIDTH, BASE_HEIGHT } from "../config/constants.js";
import { createSceneButton } from "./sceneButton.js";

export class GameOverModal {
  constructor(scene, { onEnd, onRestart } = {}) {
    this.scene = scene;
    this.onEnd = onEnd;
    this.onRestart = onRestart;
    this._transitioning = false;
    this._waiting = false;
    this.build();
  }

  build() {
    const s = this.scene;
    this.container = s.add.container(BASE_WIDTH / 2, BASE_HEIGHT / 2);
    this.container.setDepth(500).setScrollFactor(0);

    const overlay = s.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000000, 0.45);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(-BASE_WIDTH / 2, -BASE_HEIGHT / 2, BASE_WIDTH, BASE_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );

    const panelW = 540;
    const panelH = 400;
    const panel = s.add.rectangle(0, 0, panelW, panelH, 0xe8d5b5, 0.97).setStrokeStyle(6, 0x6e4a26, 1);

    const title = s.add
      .text(0, -118, "Game Over", {
        fontFamily: "Arial",
        fontSize: "52px",
        color: "#2a1f15",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const message = s.add
      .text(0, -28, "這是一款合作遊戲，\n配合好默契重新出發吧！", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#2a1f15",
        align: "center",
        lineSpacing: 10,
      })
      .setOrigin(0.5);
    this.messageText = message;

    const btnY = 118;
    const btnW = 200;
    const btnH = 58;
    const gap = 28;

    const endBtn = createSceneButton(s, -btnW / 2 - gap / 2, btnY, btnW, btnH, "End", () =>
      this._handleEnd()
    );
    const restartBtn = createSceneButton(s, btnW / 2 + gap / 2, btnY, btnW, btnH, "Restart", () =>
      this._handleRestart()
    );
    this.restartBtn = restartBtn;

    this.container.add([
      overlay,
      panel,
      title,
      message,
      endBtn.bg,
      endBtn.text,
      restartBtn.bg,
      restartBtn.text,
    ]);

    s.input.setTopOnly(true);
  }

  _scheduleAction(run) {
    if (this._transitioning) return;
    this._transitioning = true;
    this.container?.each?.((child) => {
      if (child?.input) child.disableInteractive();
    });
    try {
      this.scene.input?.setTopOnly?.(false);
    } catch {
      /* 略過 */
    }
    setTimeout(run, 50);
  }

  _handleEnd() {
    this._scheduleAction(() => {
      this.onEnd?.();
    });
  }

  _handleRestart() {
    if (this._waiting) return;
    this._scheduleAction(() => {
      this.onRestart?.();
    });
  }

  showWaitingRestart() {
    this._waiting = true;
    this._transitioning = false;
    this.messageText?.setText?.("Waiting for your partner to restart...");
    // 覆蓋層置頂並停用重開按鈕，避免重複 emit。
    this.restartBtn?.bg?.disableInteractive?.();
    this.restartBtn?.bg?.setFillStyle?.(0x4c3a48, 0.95);
    this.restartBtn?.text?.setColor?.("#c7b89e");
    try {
      this.scene.input?.setTopOnly?.(true);
    } catch {
      /* 略過 */
    }
  }

  destroy() {
    try {
      this.scene.input?.setTopOnly?.(false);
    } catch {
      /* 略過 */
    }
    this.container?.destroy?.(true);
    this.container = null;
  }
}
