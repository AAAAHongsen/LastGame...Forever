import { BASE_WIDTH, BASE_HEIGHT } from "../config/constants.js";
import {
  getAudioVolumes,
  playButtonHoverSfx,
  setBgmVolume,
  setSfxVolume,
} from "../services/audioService.js";
import { createSceneButton } from "./sceneButton.js";

export class SettingsModal {
  constructor(scene, { onClose } = {}) {
    this.scene = scene;
    this.onClose = onClose;
    this._transitioning = false;
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

    const panel = s.add.rectangle(0, 0, 620, 430, 0xe8d5b5, 0.97).setStrokeStyle(6, 0x6e4a26, 1);

    const title = s.add
      .text(0, -143, "Settings", {
        fontFamily: "Arial",
        fontSize: "52px",
        color: "#2a1f15",
      })
      .setOrigin(0.5);

    const { bgmVolume, sfxVolume } = getAudioVolumes();
    const musicSlider = this.createSlider({
      y: -53,
      label: "Music",
      initial: bgmVolume,
      onChange: (value) => setBgmVolume(value),
    });
    const sfxSlider = this.createSlider({
      y: 27,
      label: "SFX",
      initial: sfxVolume,
      onChange: (value) => setSfxVolume(value),
    });

    const backBtn = createSceneButton(s, 0, 122, 220, 62, "Back", () => this.close());

    this.container.add([
      overlay,
      panel,
      title,
      ...musicSlider.parts,
      ...sfxSlider.parts,
      backBtn.bg,
      backBtn.text,
    ]);

    s.input.setTopOnly(true);

    this.escKey = s.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  createSlider({ y, label, initial, onChange }) {
    const s = this.scene;
    const labelX = -262;
    const trackX = -122;
    const width = 250;

    const labelText = s.add
      .text(labelX, y, label, {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#2a1f15",
      })
      .setOrigin(0, 0.5);

    const track = s.add.rectangle(trackX, y, width, 16, 0xb8a888, 1).setOrigin(0, 0.5);
    const fill = s.add.rectangle(trackX, y, width * initial, 16, 0x6b5163, 1).setOrigin(0, 0.5);
    const knob = s.add.circle(trackX + width * initial, y, 14, 0x2d2030, 1);

    const valueText = s.add
      .text(trackX + width + 45, y, `${Math.round(initial * 100)}%`, {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#2a1f15",
      })
      .setOrigin(0.5);

    const updateValue = (pointerX) => {
      const worldX = pointerX;
      const localTrackLeft = BASE_WIDTH / 2 + trackX;
      const localX = Phaser.Math.Clamp(worldX, localTrackLeft, localTrackLeft + width);
      const value = (localX - localTrackLeft) / width;
      knob.x = trackX + width * value;
      fill.width = width * value;
      valueText.setText(`${Math.round(value * 100)}%`);
      onChange(value);
    };

    track.setInteractive(
      new Phaser.Geom.Rectangle(0, -14, width, 28),
      Phaser.Geom.Rectangle.Contains
    );
    if (track.input) track.input.cursor = "pointer";

    track.on("pointerover", () => playButtonHoverSfx(s));
    track.on("pointerdown", (pointer) => updateValue(pointer.x));
    track.on("pointermove", (pointer) => {
      if (pointer.isDown) updateValue(pointer.x);
    });

    return { parts: [labelText, track, fill, knob, valueText] };
  }

  update() {
    if (this._transitioning) return;
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.close();
    }
  }

  close() {
    if (this._transitioning) return;
    this._transitioning = true;
    this.container?.each?.((child) => {
      if (child?.input) child.disableInteractive();
    });
    this.scene.input.setTopOnly(false);
    this.scene.game.events.once("poststep", () => {
      this.onClose?.();
    });
  }

  destroy() {
    if (this.escKey) {
      this.escKey.destroy?.();
      this.escKey = null;
    }
    this.container?.destroy?.(true);
    this.container = null;
    try {
      this.scene.input?.setTopOnly?.(false);
    } catch {
      /* ignore */
    }
  }
}
