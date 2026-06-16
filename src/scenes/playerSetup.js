/**
 * GameScene 用的玩家角色資源、動畫與生成工廠。
 */

/** 預設出生點 — 索引 0 = P1，索引 1 = P2。 */
export const PLAYER_SPAWN_POINTS = Object.freeze([
  { x: 120, y: -80 },
  { x: 220, y: -120 },
]);

/** 選角面板側邊 → 遊戲內職業 id。 */
export function selectionToPlayerType(selection) {
  return selection === "right" ? "mage" : "soldier";
}

/** 玩家職業 id 的 HUD 顯示名稱。 */
export function classHudLabel(type) {
  return type === "mage" ? "Mage" : "Warrior";
}

export function preloadGameBackgroundAssets(scene) {
  const layers = [
    "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 1.png",
    "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 2.png",
    "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 3.png",
    "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 4.png",
    "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 5.png",
  ];
  layers.forEach((path, i) => {
    scene.load.image(`bg-layer-${i + 1}`, path);
  });
  scene.load.image(
    "floor-tiles-1",
    "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/Floor Tiles1.png"
  );
  scene.load.image(
    "other-tiles-2",
    "Assets/Platform/GandalfHardcore-Platformer/GandalfHardcore FREE Platformer Assets/Other Tiles2.png"
  );
}

export function preloadPlayerCharacterAssets(scene) {
  scene.load.spritesheet(
    "soldier-walk-sheet",
    "Assets/character/solider-character/Soldier/Soldier-Walk.png",
    { frameWidth: 100, frameHeight: 100 }
  );
  scene.load.spritesheet(
    "soldier-attack01-sheet",
    "Assets/character/solider-character/Soldier/Soldier-Attack01.png",
    { frameWidth: 100, frameHeight: 100 }
  );
  scene.load.spritesheet(
    "mage-run-sheet",
    "Assets/character/Mage-character/Run/Run_script.png",
    { frameWidth: 32, frameHeight: 32 }
  );
  scene.load.spritesheet(
    "mage-attack-mighty-sheet",
    "Assets/character/Mage-character/Attack/StaffMighty/AttackMighty_script.png",
    { frameWidth: 32, frameHeight: 32 }
  );
  scene.load.spritesheet(
    "mage-charge-mighty-sheet",
    "Assets/character/Mage-character/AttackCharge/StaffMighty/ChargeMighty.png",
    { frameWidth: 32, frameHeight: 32 }
  );
  scene.load.spritesheet("heal-green-sheet", "Assets/effects/heal/Heal-Green.png", {
    frameWidth: 16,
    frameHeight: 32,
  });
  scene.load.spritesheet("wild-sheet", "Assets/effects/wild/wild.png", {
    frameWidth: 16,
    frameHeight: 32,
  });
  for (let i = 0; i <= 60; i += 1) {
    scene.load.image(`fireball-${i}`, `Assets/effects/fireball/1_${i}.png`);
  }
}

export function createPlayerAnimations(scene) {
  if (!scene.anims.exists("soldier-idle")) {
    scene.anims.create({
      key: "soldier-idle",
      frames: [{ key: "soldier-walk-sheet", frame: 0 }],
      frameRate: 1,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("soldier-walk")) {
    scene.anims.create({
      key: "soldier-walk",
      frames: scene.anims.generateFrameNumbers("soldier-walk-sheet", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("soldier-attack01")) {
    scene.anims.create({
      key: "soldier-attack01",
      frames: scene.anims.generateFrameNumbers("soldier-attack01-sheet", { start: 0, end: 5 }),
      frameRate: 12,
      repeat: 0,
    });
  }
  if (!scene.anims.exists("mage-run")) {
    scene.anims.create({
      key: "mage-run",
      frames: scene.anims.generateFrameNumbers("mage-run-sheet", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("mage-run-idle")) {
    scene.anims.create({
      key: "mage-run-idle",
      frames: [{ key: "mage-run-sheet", frame: 2 }],
      frameRate: 1,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("mage-attack-mighty")) {
    scene.anims.create({
      key: "mage-attack-mighty",
      frames: scene.anims.generateFrameNumbers("mage-attack-mighty-sheet", { start: 0, end: 5 }),
      frameRate: 12,
      repeat: 0,
    });
  }
  if (!scene.anims.exists("mage-charge-mighty")) {
    scene.anims.create({
      key: "mage-charge-mighty",
      frames: scene.anims.generateFrameNumbers("mage-charge-mighty-sheet", { start: 0, end: 5 }),
      frameRate: 12,
      repeat: 0,
    });
  }
  if (!scene.anims.exists("heal-green")) {
    scene.anims.create({
      key: "heal-green",
      frames: scene.anims.generateFrameNumbers("heal-green-sheet", { start: 0, end: 5 }),
      frameRate: 12,
      repeat: 0,
    });
  }
  if (!scene.anims.exists("wild-rage")) {
    scene.anims.create({
      key: "wild-rage",
      frames: scene.anims.generateFrameNumbers("wild-sheet", { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1,
    });
  }
}

export function createSoldierCharacter(scene, x, y, platformBodies) {
  const soldier = scene.physics.add.sprite(x, y, "soldier-walk-sheet", 0);
  soldier.setScale(2);
  soldier.setCollideWorldBounds(true);
  soldier.setDepth(40);
  soldier.body.setSize(7, 18, true);
  soldier.body.setOffset(46, 39);
  soldier.setBounce(0.02);
  soldier.anims.play("soldier-idle");
  scene.physics.add.collider(soldier, platformBodies);
  return { body: soldier, visual: soldier };
}

export function createMageCharacter(scene, x, y, platformBodies) {
  const body = scene.physics.add.sprite(x, y, "platform-body");
  body.setAlpha(0.001);
  body.setDisplaySize(8, 8);
  body.setOrigin(0.5, 1);
  body.setCollideWorldBounds(true);
  body.setDepth(40);
  body.body.setSize(7, 15, true);
  body.body.setOffset(-2, -11);
  body.setBounce(0.02);
  scene.physics.add.collider(body, platformBodies);

  const visual = scene.add.sprite(x, y, "mage-run-sheet", 2);
  visual.setScale(2.3);
  visual.setOrigin(0.5, 1);
  visual.setDepth(41);
  visual.anims.play("mage-run-idle");
  return { body, visual };
}

/** 建立 scene.players 用的玩家 entry 物件。 */
export function buildPlayerEntry(parts, type) {
  return {
    sprite: parts.body,
    visual: parts.visual,
    type,
    isAttacking: false,
    gravityLocked: false,
  };
}
