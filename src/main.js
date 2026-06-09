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
    // Let CSS flexbox handle centering so Phaser never writes margin-left/top
    // on the canvas — that was causing getBoundingClientRect to be stale on boot.
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

// Expose for DevTools (F12 Console) debugging.
if (typeof window !== "undefined") {
  window.__phaserGame = game;
}

// ── Input-bounds fix ──────────────────────────────────────────────────────────
// Phaser caches canvas.getBoundingClientRect() during boot, before the browser
// has finished laying out the CSS-flexbox centering, so bounds.left is wrong
// (usually 0 instead of the actual left offset).  We re-read it after two
// requestAnimationFrame ticks — by then the browser has fully painted the
// centered canvas and getBoundingClientRect returns the correct offset.
const _refreshInputBounds = () =>
  requestAnimationFrame(() => game.input?.updateBounds?.());

// On boot: wait two RAF ticks for CSS layout to settle.
requestAnimationFrame(_refreshInputBounds);

// On every resize: Phaser adjusts canvas CSS size, browser re-centers via
// flexbox, then we re-read bounds once the paint is done.
game.scale.on("resize", _refreshInputBounds);
