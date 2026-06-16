/** Phaser 啟動設定、場景註冊，以及 canvas 輸入邊界修正。 */
import { BASE_WIDTH, BASE_HEIGHT } from "./config/constants.js";
import { installRoomLifecycleHooks } from "./services/socketService.js";
import { FrontPageScene } from "./scenes/FrontPageScene.js";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene.js";
import { IntroVideoScene } from "./scenes/IntroVideoScene.js";
import { GameScene } from "./scenes/GameScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  pixelArt: true,
  antialias: false,
  render: {
    roundPixels: true,
  },
  backgroundColor: "#101414",
  scale: {
    mode: Phaser.Scale.FIT,
    // 由 CSS flexbox 負責置中，避免 Phaser 在 canvas 上寫入 margin-left/top
    // —— 那會導致啟動時 getBoundingClientRect 讀到過期數值。
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 800 },
      debug: false,
    },
  },
  scene: [FrontPageScene, CharacterSelectScene, IntroVideoScene, GameScene],
};

const game = new Phaser.Game(config);

installRoomLifecycleHooks();

// 供 DevTools（F12 主控台）除錯使用。
if (typeof window !== "undefined") {
  window.__phaserGame = game;
}

// ── 輸入邊界修正 ──────────────────────────────────────────────────────────
// Phaser 在啟動時快取 canvas.getBoundingClientRect()，此時瀏覽器尚未完成
// CSS flexbox 置中排版，bounds.left 會錯（通常是 0 而非實際左偏移）。
// 我們在兩次 requestAnimationFrame 後重新讀取 —— 此時瀏覽器已繪製置中 canvas，
// getBoundingClientRect 會回傳正確偏移。
const _refreshInputBounds = () =>
  requestAnimationFrame(() => game.input?.updateBounds?.());

// 啟動時：等兩次 RAF，讓 CSS 排版穩定。
requestAnimationFrame(_refreshInputBounds);

// 每次 resize：Phaser 調整 canvas CSS 尺寸，瀏覽器以 flexbox 重新置中，
// 繪製完成後我們再重新讀取邊界。
game.scale.on("resize", _refreshInputBounds);
