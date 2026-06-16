/**
 * 中央音效服務 — BGM 生命週期與 SFX 播放。
 * 設定視窗的音量滑桿會呼叫 setBgmVolume / setSfxVolume。
 */

/** Phaser 快取鍵（穩定識別碼，非檔案路徑）。 */
const AUDIO_KEYS = {
  bgm: "bgm-main",
  buttonHover: "sfx-button-hover",
  warriorAtk: "sfx-warrior-atk",
  warriorSkill: "sfx-warrior-skill",
  mageAtk: "sfx-mage-atk",
  mageSkill: "sfx-mage-skill",
  lose: "sfx-lose",
  win: "sfx-win",
  waveScene: "sfx-wave-scene",
  enemyDead: "sfx-enemy-dead",
  playerHurt: "sfx-player-hurt",
};

/** preloadAudio 用的資源路徑 — 順序固定以確保載入可預期。 */
const AUDIO_PATHS = [
  [AUDIO_KEYS.bgm, "Assets/Sounds/BG-sound.mp3.mp3"],
  [AUDIO_KEYS.buttonHover, "Assets/Sounds/btn-sound.mp3"],
  [AUDIO_KEYS.warriorAtk, "Assets/Sounds/warrior-atk.mp3"],
  [AUDIO_KEYS.warriorSkill, "Assets/Sounds/warrior-skill.mp3"],
  [AUDIO_KEYS.mageAtk, "Assets/Sounds/mage-atk.mp3"],
  [AUDIO_KEYS.mageSkill, "Assets/Sounds/mage-skill.mp3"],
  [AUDIO_KEYS.lose, "Assets/Sounds/lose.mp3"],
  [AUDIO_KEYS.win, "Assets/Sounds/win.mp3"],
  [AUDIO_KEYS.waveScene, "Assets/Sounds/wavescene.mp3"],
  [AUDIO_KEYS.enemyDead, "Assets/Sounds/enemies-dead.mp3"],
  [AUDIO_KEYS.playerHurt, "Assets/Sounds/player-hurt.mp3"],
];

let bgmVolume = 0.2;
let sfxVolume = 0.3;
let bgmSound = null;
let lastPlayerHurtSfxAt = 0;

const ENEMY_DEAD_SFX_DELAY_MS = 300;
const PLAYER_HURT_SFX_COOLDOWN_MS = 1000;

function playSfx(scene, key) {
  if (!scene?.sound) return;
  scene.sound.play(key, { volume: sfxVolume });
}

export function preloadAudio(scene) {
  for (const [key, path] of AUDIO_PATHS) {
    scene.load.audio(key, path);
  }
}

// ── 背景音樂（BGM）──────────────────────────────────────────────────────────

export function ensureBgm(scene) {
  if (bgmSound && bgmSound.isPlaying) return;
  bgmSound = scene.sound.add(AUDIO_KEYS.bgm, {
    loop: true,
    volume: bgmVolume,
  });
  bgmSound.play();
}

export function pauseBgm() {
  if (bgmSound && bgmSound.isPlaying) bgmSound.pause();
}

export function resumeBgm(scene) {
  if (bgmSound && bgmSound.isPaused) {
    bgmSound.resume();
    return;
  }
  if (scene) ensureBgm(scene);
}

export function setBgmVolume(value) {
  bgmVolume = Phaser.Math.Clamp(value, 0, 1);
  if (bgmSound) {
    bgmSound.setVolume(bgmVolume);
  }
}

// ── 音效（SFX）──────────────────────────────────────────────────────────────

export function playButtonHoverSfx(scene) {
  playSfx(scene, AUDIO_KEYS.buttonHover);
}

export function playWarriorAtkSfx(scene) {
  playSfx(scene, AUDIO_KEYS.warriorAtk);
}

export function playWarriorSkillSfx(scene) {
  playSfx(scene, AUDIO_KEYS.warriorSkill);
}

export function playMageAtkSfx(scene) {
  playSfx(scene, AUDIO_KEYS.mageAtk);
}

export function playMageSkillSfx(scene) {
  playSfx(scene, AUDIO_KEYS.mageSkill);
}

export function playLoseSfx(scene) {
  playSfx(scene, AUDIO_KEYS.lose);
}

/** 勝利畫面：停止 BGM，只播放勝利音效。 */
export function playWinSfx(scene) {
  pauseBgm();
  playSfx(scene, AUDIO_KEYS.win);
}

export function playWaveSceneSfx(scene) {
  playSfx(scene, AUDIO_KEYS.waveScene);
}

/** 延遲播放，讓死亡音效與震動動畫對齊。 */
export function playEnemyDeadSfx(scene, delayMs = ENEMY_DEAD_SFX_DELAY_MS) {
  if (!scene?.sound) return;
  if (delayMs > 0 && scene.time) {
    scene.time.delayedCall(delayMs, () => {
      if (scene?.sound) playSfx(scene, AUDIO_KEYS.enemyDead);
    });
    return;
  }
  playSfx(scene, AUDIO_KEYS.enemyDead);
}

/** 防抖 — 每次受傷連續判定只播一次（例如站在火裡）。 */
export function playPlayerHurtSfx(scene) {
  if (!scene?.sound) return;
  const now = scene.time?.now ?? performance.now();
  if (now - lastPlayerHurtSfxAt < PLAYER_HURT_SFX_COOLDOWN_MS) return;
  lastPlayerHurtSfxAt = now;
  playSfx(scene, AUDIO_KEYS.playerHurt);
}

export function setSfxVolume(value) {
  sfxVolume = Phaser.Math.Clamp(value, 0, 1);
}

export function getAudioVolumes() {
  return { bgmVolume, sfxVolume };
}
