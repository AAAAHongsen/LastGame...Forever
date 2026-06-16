/**
 * 各波完整定義。
 * players: { soldier, mage } — 各職業 hp／attack。
 * enemies: [{ type, count, hp, damage }] — 敵人清單
 * bossThresholds: [{ bossType, hpBelow, spawns:[{type,count}], once:true }] — Boss 召喚門檻
 */
export const WAVE_CONFIG = [
  {
    wave: 1,
    tutorial: true,
    players: {
      soldier: { hp: 100, attack: 5 },
      mage:    { hp: 70,  attack: 10 },
    },
    enemies: [
      { type: "mushroom", count: 5, hp: 5,  damage: 1 },
    ],
    bossThresholds: [],
  },
  {
    wave: 2,
    preWaveModal: true,
    players: {
      soldier: { hp: 120, attack: 10 },
      mage:    { hp: 90,  attack: 15 },
    },
    enemies: [
      { type: "bat",      count: 3, hp: 25, damage: 10 },
      { type: "mushroom", count: 5, hp: 20, damage: 5  },
    ],
    bossThresholds: [],
  },
  {
    wave: 3,
    preWaveModal: true,
    players: {
      soldier: { hp: 150, attack: 15 },
      mage:    { hp: 120, attack: 20 },
    },
    enemies: [
      { type: "flyBoss",  count: 1, hp: 200, damage: 25 },
      { type: "bat",      count: 3, hp: 25,  damage: 10 },
      { type: "mushroom", count: 5, hp: 20,  damage: 5  },
    ],
    bossThresholds: [
      {
        bossType: "flyBoss",
        hpBelow: 50,
        spawns: [
          { type: "bat",      count: 5 },
          { type: "mushroom", count: 3 },
        ],
        once: true,
      },
    ],
  },
  {
    wave: 4,
    preWaveModal: true,
    players: {
      soldier: { hp: 180, attack: 15 },
      mage:    { hp: 150, attack: 20 },
    },
    // 第 4 波特殊規則
    specialRules: {
      warriorNoCost:         true,   // 戰士攻擊不耗能量
      warriorSkillInvincible: true,  // 戰士大招期間雙方無敵
      mageHealBonus:         0.30,   // 法師治療恢復 30% 最大 HP
    },
    enemies: [
      { type: "bat",      count: 5, hp: 30, damage: 20 },
      { type: "mushroom", count: 5, hp: 25, damage: 10 },
      { type: "skeleton", count: 3, hp: 50, damage: 15 },
    ],
    bossThresholds: [],
  },
  {
    wave: 5,
    preWaveModal: true,
    players: {
      soldier: { hp: 230, attack: 20 },
      mage:    { hp: 200, attack: 25 },
    },
    // 第 5 波沿用第 4 波特殊規則。
    specialRules: {
      warriorNoCost:         true,   // 戰士攻擊不耗能量
      warriorSkillInvincible: true,  // 戰士大招期間雙方無敵
      mageHealBonus:         0.30,   // 法師治療恢復 30% 最大 HP
    },
    enemies: [
      { type: "groundBoss", count: 1, hp: 500, damage: 40 },
      { type: "bat",        count: 3, hp: 45,  damage: 20 },
      { type: "mushroom",   count: 3, hp: 30,  damage: 10 },
      { type: "skeleton",   count: 3, hp: 70,  damage: 15 },
    ],
    bossThresholds: [
      {
        bossType: "groundBoss",
        hpBelow: 50,
        spawns: [
          { type: "bat",      count: 3 },
          { type: "mushroom", count: 3 },
        ],
        once: true,
        tag: "groundBoss_50",
      },
      {
        bossType: "groundBoss",
        hpBelow: 25,
        spawns: [
          { type: "bat",      count: 5 },
          { type: "mushroom", count: 3 },
        ],
        once: true,
        tag: "groundBoss_25",
      },
    ],
  },
];

export const TOTAL_WAVES = WAVE_CONFIG.length;

/** @returns {object|null} 波次設定或 null */
export function getWaveConfig(waveNumber) {
  return WAVE_CONFIG.find((w) => w.wave === waveNumber) ?? null;
}
