/** 開場影片 — 可跳過；進入 GameScene 時恢復 BGM。 */
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
    // 保留音訊（勿傳 noAudio=true）以播放影片音效。
    this.load.video("intro-video", "Assets/video/StartVideo.mp4");
  }

  create() {
    // 播放開場時暫停背景音樂。
    pauseBgm();

    const video = this.add.video(BASE_WIDTH / 2, BASE_HEIGHT / 2, "intro-video");
    video.setDepth(0);

    // 須在貼圖存在後才貼合 canvas，否則縮放會依佔位尺寸計算導致影片放大。
    // 影片 1920×1080、canvas 1024×576 — 皆 16:9，可剛好填滿。
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

    // 跳過按鈕 — 右上角
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

    // 鍵盤跳過：監聽原生 DOM 以繞過 video 元素焦點攔截。
    this._skipKeyHandler = (e) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") goToGame();
    };
    window.addEventListener("keydown", this._skipKeyHandler);
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", this._skipKeyHandler);
    });
  }
}
