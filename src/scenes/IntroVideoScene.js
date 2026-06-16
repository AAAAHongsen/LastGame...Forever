import { BASE_WIDTH, BASE_HEIGHT } from "../config/constants.js";
import { pauseBgm, resumeBgm } from "../services/audioService.js";

export class IntroVideoScene extends Phaser.Scene {
  constructor() {
    super("IntroVideoScene");
  }

  init(data) {
    this.gameData = data ?? {};
  }

  preload() {
    // Keep audio (do NOT pass noAudio=true) so the clip's sound plays.
    this.load.video("intro-video", "Assets/video/StartVideo.mp4");
  }

  create() {
    // Pause background music while the intro plays.
    pauseBgm();

    const video = this.add.video(BASE_WIDTH / 2, BASE_HEIGHT / 2, "intro-video");
    video.setDepth(0);

    // Fit to canvas only AFTER the texture exists, otherwise the scale factor
    // is computed against a placeholder size and the video appears blown up.
    // Video is 1920×1080, canvas 1024×576 — both 16:9, so it fills exactly.
    const fit = () => video.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    video.on("created", fit);
    video.on("playing", fit);
    fit();

    video.play(false);

    const goToGame = () => {
      if (this._gone) return;
      this._gone = true;
      video.stop();
      resumeBgm(this);
      this.scene.start("GameScene", this.gameData);
    };

    video.on("complete", goToGame);

    // Skip button — top-right corner
    const PAD = 16;
    const BTN_W = 110;
    const BTN_H = 36;
    const bx = BASE_WIDTH - PAD - BTN_W / 2;
    const by = PAD + BTN_H / 2;

    const btnBg = this.add.rectangle(bx, by, BTN_W, BTN_H, 0x000000, 0.55)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(bx, by, "Skip  ▶▶", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(11);

    btnBg.on("pointerover", () => btnBg.setFillStyle(0x333333, 0.75));
    btnBg.on("pointerout",  () => btnBg.setFillStyle(0x000000, 0.55));
    btnBg.on("pointerup",   goToGame);

    // Keyboard skip: listen on the native DOM to bypass video-element focus capture.
    this._skipKeyHandler = (e) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") goToGame();
    };
    window.addEventListener("keydown", this._skipKeyHandler);
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", this._skipKeyHandler);
    });
  }
}
