import { BASE_WIDTH, BASE_HEIGHT } from "../config/constants.js";

export class WinScreen {
  constructor(scene) {
    this.scene = scene;
    this._timers = [];
    this.build();
  }

  build() {
    const s = this.scene;

    // Vignette mask that grows from edges inward
    this._vignette = s.add.graphics();
    this._vignette.setDepth(900).setScrollFactor(0);
    this._vignette.fillStyle(0x000000, 1);
    this._vignette.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    this._vignette.setAlpha(0);

    // Animate vignette via timer to avoid tween lifecycle crash after scene teardown.
    const start = s.time.now;
    const total = 3000;
    const timer = s.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!this._vignette?.active) return;
        const t = Phaser.Math.Clamp((s.time.now - start) / total, 0, 1);
        this._vignette.setAlpha(t * t); // ease-in style
        if (t >= 1) {
          timer.remove(false);
          this._showText();
        }
      },
    });
    this._timers.push(timer);
  }

  _showText() {
    const s = this.scene;

    const text = s.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT / 2, "YOU WIN!!!!", {
        fontFamily: "Courier New, monospace",
        fontSize: "90px",
        fontStyle: "bold",
        color: "#d8bb4a",
        stroke: "#5a3a00",
        strokeThickness: 6,
        shadow: {
          offsetX: 4,
          offsetY: 4,
          color: "#5a3a00",
          blur: 0,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(950)
      .setScrollFactor(0)
      .setAlpha(0);

    const start = s.time.now;
    const total = 800;
    const timer = s.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!text?.active) return;
        const t = Phaser.Math.Clamp((s.time.now - start) / total, 0, 1);
        text.setAlpha(t);
        if (t >= 1) {
          timer.remove(false);
        }
      },
    });
    this._timers.push(timer);
  }

  destroy() {
    for (const t of this._timers ?? []) {
      t?.remove?.(false);
    }
    this._timers = [];
    this._vignette?.destroy?.();
    this._vignette = null;
  }
}
