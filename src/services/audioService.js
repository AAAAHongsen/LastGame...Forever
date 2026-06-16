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

let bgmVolume = 0.2;
let sfxVolume = 0.3;
let bgmSound = null;
let lastPlayerHurtSfxAt = 0;

const ENEMY_DEAD_SFX_DELAY_MS = 500;
const PLAYER_HURT_SFX_COOLDOWN_MS = 1000;

function playSfx(scene, key) {
  if (!scene?.sound) return;
  scene.sound.play(key, { volume: sfxVolume });
}

export function preloadAudio(scene) {
  scene.load.audio(AUDIO_KEYS.bgm, "Assets/Sounds/BG-sound.mp3.mp3");
  scene.load.audio(AUDIO_KEYS.buttonHover, "Assets/Sounds/btn-sound.mp3");
  scene.load.audio(AUDIO_KEYS.warriorAtk, "Assets/Sounds/warrior-atk.mp3");
  scene.load.audio(AUDIO_KEYS.warriorSkill, "Assets/Sounds/warrior-skill.mp3");
  scene.load.audio(AUDIO_KEYS.mageAtk, "Assets/Sounds/mage-atk.mp3");
  scene.load.audio(AUDIO_KEYS.mageSkill, "Assets/Sounds/mage-skill.mp3");
  scene.load.audio(AUDIO_KEYS.lose, "Assets/Sounds/lose.mp3");
  scene.load.audio(AUDIO_KEYS.win, "Assets/Sounds/win.mp3");
  scene.load.audio(AUDIO_KEYS.waveScene, "Assets/Sounds/wavescene.mp3");
  scene.load.audio(AUDIO_KEYS.enemyDead, "Assets/Sounds/enemies-dead.mp3");
  scene.load.audio(AUDIO_KEYS.playerHurt, "Assets/Sounds/player-hurt.mp3");
}

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

export function playWinSfx(scene) {
  playSfx(scene, AUDIO_KEYS.win);
}

export function playWaveSceneSfx(scene) {
  playSfx(scene, AUDIO_KEYS.waveScene);
}

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

export function playPlayerHurtSfx(scene) {
  if (!scene?.sound) return;
  const now = scene.time?.now ?? performance.now();
  if (now - lastPlayerHurtSfxAt < PLAYER_HURT_SFX_COOLDOWN_MS) return;
  lastPlayerHurtSfxAt = now;
  playSfx(scene, AUDIO_KEYS.playerHurt);
}

export function setBgmVolume(value) {
  bgmVolume = Phaser.Math.Clamp(value, 0, 1);
  if (bgmSound) {
    bgmSound.setVolume(bgmVolume);
  }
}

export function setSfxVolume(value) {
  sfxVolume = Phaser.Math.Clamp(value, 0, 1);
}

export function getAudioVolumes() {
  return { bgmVolume, sfxVolume };
}
