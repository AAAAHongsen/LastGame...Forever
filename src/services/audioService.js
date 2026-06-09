const AUDIO_KEYS = {
  bgm: "bgm-main",
  buttonHover: "sfx-button-hover",
};

let bgmVolume = 0.2;
let sfxVolume = 0.3;
let bgmSound = null;

export function preloadAudio(scene) {
  scene.load.audio(AUDIO_KEYS.bgm, "Assets/Sounds/BG-sound.mp3.mp3");
  scene.load.audio(AUDIO_KEYS.buttonHover, "Assets/Sounds/btn-sound.mp3");
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
  scene.sound.play(AUDIO_KEYS.buttonHover, { volume: sfxVolume });
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
