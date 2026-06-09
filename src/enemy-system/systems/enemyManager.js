import { BASE_HEIGHT, BASE_WIDTH } from "../constants.js";
import { createFlyingEnemy } from "../factories/createFlyingEnemy.js";
import { createGroundEnemy } from "../factories/createGroundEnemy.js";
import { updateEnemyAI } from "../ai/index.js";
import { createEnemyState, ENEMY_STATE } from "../helpers/stateMachine.js";
import { destroyEnemy } from "../helpers/spriteCleanup.js";
import { getEnemyConfig } from "../registry/enemyRegistry.js";
import { getEnemyBaseStats } from "../../combat-stats/config/enemyBaseStats.js";
import { resolveEnemyMaxHp } from "../../combat-stats/resolveEnemyStats.js";
import { clearLootPickups } from "../../combat-stats/loot/lootManager.js";
import { isHostScene } from "../../services/netRole.js";

const KIND_CREATORS = {
  ground: createGroundEnemy,
  flying: createFlyingEnemy,
};

function ensureEnemyPhysicsGroup(scene) {
  if (!scene.enemyPhysicsGroup) {
    scene.enemyPhysicsGroup = scene.physics.add.group();
  }
  return scene.enemyPhysicsGroup;
}

function defaultSpawnPoint(scene) {
  const entry = scene.getControlledEntry?.();
  const sx = entry?.sprite?.x ?? BASE_WIDTH * 0.65;
  const sy = entry?.sprite?.y ?? BASE_HEIGHT * 0.55;
  return { x: Math.min(BASE_WIDTH - 80, sx + 140), y: Math.min(BASE_HEIGHT - 50, sy) };
}

export function initEnemyManager(scene) {
  scene.enemyManager = {
    enemies: [],
  };
  scene.testEnemies = scene.enemyManager.enemies;
  ensureEnemyPhysicsGroup(scene);
}

export function spawnEnemy(scene, type, x, y) {
  const config = getEnemyConfig(type);
  if (!config) {
    // eslint-disable-next-line no-console
    console.warn("[enemySystem] Unknown type:", type);
    return null;
  }

  const def = config.spawn ?? {};
  const fallback = defaultSpawnPoint(scene);
  const px = def.x ?? x ?? fallback.x;
  const py = def.y ?? y ?? fallback.y;

  const create = KIND_CREATORS[config.kind];
  if (!create) {
    console.warn("[enemySystem] Unknown kind:", config.kind);
    return null;
  }

  const sprite = create(scene, config, px, py);
  if (config.spawnOffset?.y) sprite.y += config.spawnOffset.y;

  ensureEnemyPhysicsGroup(scene);
  scene.enemyPhysicsGroup.add(sprite);

  // PhysicsGroup.add() can reset allowGravity — restore per kind.
  if (sprite.body) {
    if (config.kind === "flying") {
      sprite.body.setAllowGravity(false);
    } else if (config.physics?.allowGravity === true || config.kind === "ground") {
      sprite.body.setAllowGravity(true);
    }
  }

  const typeDefaults = getEnemyBaseStats(type);
  const hpMax = resolveEnemyMaxHp(type, config, scene);

  const sm = createEnemyState(ENEMY_STATE.IDLE);
  const enemy = {
    type,
    config,
    sprite,
    visual: sprite,
    state: sm.current,
    stateData: sm.data,
    facingDirection: 1,
    ai: { type: config.ai },
    hp: hpMax,
    hpMax,
    dead: false,
    drops: config.drops ?? typeDefaults.drops ?? "normal",
  };

  enemy.playAnim = (key) => {
    if (enemy.visual?.anims) enemy.visual.anims.play(key, true);
  };

  scene.enemyManager.enemies.push(enemy);
  return enemy;
}

export function clearEnemies(scene) {
  for (const e of scene.enemyManager?.enemies ?? []) {
    destroyEnemy(e);
  }
  scene.projectileSystem?.group?.clear?.(true, true);
  scene.projectileSystem?.hazards?.clear?.(true, true);
  scene.enemyManager.enemies = [];
  clearLootPickups(scene);
}

export function updateEnemies(scene, now) {
  // Host drives AI; client mirrors host transforms (positions/anim) instead of
  // running its own simulation, so both screens stay in sync.
  const host = isHostScene(scene);
  for (const enemy of scene.enemyManager?.enemies ?? []) {
    if (!enemy.sprite?.active) continue;
    if (enemy.dead || enemy.dying) continue;
    if (enemy.type?.startsWith?.("fx-")) continue;
    if (host) {
      updateEnemyAI(scene, enemy, now);
    } else {
      applyNetTransform(enemy);
    }
  }
}

/** Client-side: ease the enemy sprite toward the host's last-synced transform. */
function applyNetTransform(enemy) {
  const s = enemy.sprite;
  const t = enemy._netTarget;
  if (!s) return;

  // Keep the body kinematic so arcade physics never fights the synced position.
  if (s.body) {
    s.body.setAllowGravity(false);
    s.body.velocity.set(0, 0);
  }

  if (!t) return;

  const nx = Phaser.Math.Linear(s.x, t.x, 0.25);
  const ny = Phaser.Math.Linear(s.y, t.y, 0.25);
  if (s.body?.reset) s.body.reset(nx, ny);
  else s.setPosition(nx, ny);

  if (typeof t.fx === "boolean") s.setFlipX(t.fx);
  if (t.an && s.anims && s.anims.currentAnim?.key !== t.an) {
    s.anims.play(t.an, true);
  }
}
