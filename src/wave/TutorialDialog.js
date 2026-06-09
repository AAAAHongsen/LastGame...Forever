import { BASE_WIDTH, BASE_HEIGHT } from "../config/constants.js";

const PAGES = [
  "Left click to attack, right click to ULT skill\nWarrior : Berserk  /  Mage : Healing",
  "Attacking consumes mana.\nYou and your partner share\nthe same mana pool.",
  "Remember, this is a co-op game.",
  "Now, work together and\ndefeat the monsters!!!",
];

const WAITING_TEXT = "Waiting for your partner...";

export class TutorialDialog {
  constructor(scene, { onLocalDone } = {}) {
    this.scene = scene;
    this.onLocalDone = onLocalDone;
    this._page = 0;
    this._done = false;       // local reading done
    this._destroyed = false;
    this._waiting = false;    // showing "waiting" screen
    this._clickKey = null;
    this._blinkTimer = null;
    this.build();
    this._bindInput();
  }

  build() {
    const s = this.scene;
    this.container = s.add.container(BASE_WIDTH / 2, BASE_HEIGHT / 2);
    this.container.setDepth(600).setScrollFactor(0);

    const overlay = s.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000000, 0.55);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(-BASE_WIDTH / 2, -BASE_HEIGHT / 2, BASE_WIDTH, BASE_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    // Click intentionally disabled — Space key only.

    const panelW = 640;
    const panelH = 260;
    const panel = s.add.rectangle(0, 40, panelW, panelH, 0xe8d5b5, 0.97)
      .setStrokeStyle(6, 0x6e4a26, 1);

    this._bodyText = s.add
      .text(0, 28, PAGES[0], {
        fontFamily: "Courier New, monospace",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#2a1f15",
        align: "center",
        wordWrap: { width: panelW - 60 },
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    this._hintText = s.add
      .text(0, 142, "[ Space to continue ]", {
        fontFamily: "Courier New, monospace",
        fontSize: "15px",
        color: "#6e4a26",
      })
      .setOrigin(0.5);

    this._pageText = s.add
      .text(290, -60, "1 / 4", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#6e4a26",
      })
      .setOrigin(1, 0.5);

    this.container.add([overlay, panel, this._bodyText, this._hintText, this._pageText]);

    // Manual blink via timer (avoids Phaser tween lifecycle crashes on destroy)
    this._blinkTimer = s.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        if (this._destroyed || !this._hintText?.active) return;
        this._hintText.alpha = this._hintText.alpha > 0.5 ? 0.2 : 0.85;
      },
    });
  }

  _bindInput() {
    const s = this.scene;
    this._clickKey = s.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    s.input.setTopOnly(true);
  }

  update() {
    if (this._done || this._destroyed) return;
    if (this._clickKey && Phaser.Input.Keyboard.JustDown(this._clickKey)) {
      this._handleClick();
    }
  }

  _handleClick() {
    if (this._done || this._destroyed || this._waiting) return;
    this._page += 1;
    if (this._page >= PAGES.length) {
      this._localDone();
      return;
    }
    this._bodyText.setText(PAGES[this._page]);
    this._pageText.setText(`${this._page + 1} / ${PAGES.length}`);
  }

  _localDone() {
    this._done = true;
    this.onLocalDone?.();
  }

  /** Called by WaveManager when this player finished but partner hasn't yet. */
  showWaiting() {
    if (this._destroyed) return;
    if (this._waiting) return;
    this._waiting = true;

    // Stop blink timer cleanly
    if (this._blinkTimer) {
      this._blinkTimer.remove(false);
      this._blinkTimer = null;
    }

    if (this._bodyText?.active) {
      this._bodyText.setText(WAITING_TEXT);
      this._bodyText.setStyle({
        fontFamily: "Courier New, monospace",
        fontSize: "26px",
        fontStyle: "bold",
        color: "#2a1f15",
        align: "center",
      });
    }
    if (this._hintText?.active)  this._hintText.setAlpha(0);
    if (this._pageText?.active)  this._pageText.setAlpha(0);

    // Gentle pulse on body text
    if (this._bodyText?.active) {
      this._waitTimer = this.scene.time.addEvent({
        delay: 700,
        loop: true,
        callback: () => {
          if (this._destroyed || !this._bodyText?.active) return;
          this._bodyText.alpha = this._bodyText.alpha > 0.7 ? 0.4 : 1;
        },
      });
    }
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._blinkTimer) {
      this._blinkTimer.remove(false);
      this._blinkTimer = null;
    }
    if (this._waitTimer) {
      this._waitTimer.remove(false);
      this._waitTimer = null;
    }
    if (this._clickKey) {
      this._clickKey.destroy?.();
      this._clickKey = null;
    }
    try { this.scene.input?.setTopOnly?.(false); } catch { /* ignore */ }
    this.container?.destroy(true);
    this.container = null;
    this._bodyText = null;
    this._hintText = null;
    this._pageText = null;
  }
}
