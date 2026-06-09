import { clearEnemies } from "../enemy-system/systems/enemyManager.js";
import { clearLootPickups } from "../combat-stats/loot/lootManager.js";
import { WaveManager } from "../wave/WaveManager.js";

const SPAWN_POINTS = [
  { x: 120, y: -80 },
  { x: 220, y: -120 },
];

function defaultHpForType(type) {
  return type === "mage" ? 70 : 100;
}

function playIdleAnim(entry) {
  const v = entry?.visual;
  if (!v?.anims) return;
  const key = entry.type === "mage" ? "mage-run-idle" : "soldier-idle";
  v.anims.play(key, true);
}

/** Reset a live GameScene run without stopping the scene (avoids Phaser 3.90 shutdown bugs). */
export function resetGameRun(scene) {
  scene._restartHandshakeBound = false;
  // Reset wave manager before clearing enemies
  if (scene.waveManager) {
    scene.waveManager.destroy?.();
    scene.waveManager = null;
  }
  scene._tutorialDialog?.destroy?.();
  scene._tutorialDialog = null;
  scene._preWaveModal?.destroy?.();
  scene._preWaveModal = null;
  scene._winScreen?.destroy?.();
  scene._winScreen = null;

  clearEnemies(scene);
  clearLootPickups(scene);

  scene.fireballs?.clear?.(true, true);
  scene.projectileSystem?.group?.clear?.(true, true);
  scene.projectileSystem?.hazards?.clear?.(true, true);

  scene.wildEffect?.destroy?.();
  scene.wildEffect = null;
  scene.wildEffectOwner = null;
  scene.energyNoCostUntil = 0;
  scene.playersInvincibleUntil = 0;

  for (let i = 0; i < (scene.players?.length ?? 0); i += 1) {
    const entry = scene.players[i];
    const spawn = SPAWN_POINTS[i] ?? SPAWN_POINTS[0];
    const s = entry?.sprite;
    const v = entry?.visual;
    if (s) {
      s.setPosition(spawn.x, spawn.y);
      s.setVelocity(0, 0);
    }
    if (v) {
      v.x = spawn.x;
      v.y = spawn.y;
    }
    if (entry) {
      entry.isAttacking = false;
      entry.attackHitEnemies = null;
      entry.gravityLocked = false;
      // Clear wave-specific attack override so WaveManager re-applies wave 1 stats
      if (entry.combat) delete entry.combat._waveAttack;
      playIdleAnim(entry);
    }
  }

  const p1Type = scene.players?.[0]?.type ?? "soldier";
  const p2Type = scene.players?.[1]?.type ?? "mage";
  // Reset both max AND current HP so WaveManager's carry-over formula produces full HP.
  const p1DefaultHp = defaultHpForType(p1Type);
  const p2DefaultHp = defaultHpForType(p2Type);
  scene.hud?.setHealthMax(1, p1DefaultHp);
  scene.hud?.setHealth(1, p1DefaultHp);
  scene.hud?.setHealthMax(2, p2DefaultHp);
  scene.hud?.setHealth(2, p2DefaultHp);
  scene.hud?.setEnergy(50);
  scene.hud?.setOrbs(1, 0);
  scene.hud?.setOrbs(2, 0);
  scene.hud?.setWave?.(1);

  const isMultiplayer = Boolean(scene.roomCode && (scene.playerNumber === 1 || scene.playerNumber === 2));
  const localIndex = isMultiplayer ? (scene.playerNumber === 2 ? 1 : 0) : 0;
  scene.activePlayerIndex = localIndex;
  const local = scene.players?.[localIndex];
  if (local?.sprite && scene.playerController) {
    scene.playerController.setPlayer(local.sprite);
  }
  scene.updateActiveControlText?.();

  // Clear wave-specific special-rule flags
  scene._waveWarriorNoCost = false;
  scene._waveWarriorSkillInvincible = false;
  scene._waveMageHealBonus = 0;

  // Re-create wave manager and start from wave 1
  scene._gameOverFrozen = false;
  scene.waveManager = new WaveManager(scene);
  scene.waveManager.start();
}

export function closeGameOverUi(scene) {
  scene.gameOverModal?.destroy?.();
  scene.gameOverModal = null;
  scene._gameOverOpen = false;
  scene._gameOverFrozen = false;
  try {
    scene.input?.setTopOnly?.(false);
  } catch {
    /* ignore */
  }
}

function detachSceneUpdateHandlers(scene) {
  if (scene._enemySystemUpdateHandler) {
    scene.events.off("update", scene._enemySystemUpdateHandler);
    scene._enemySystemUpdateHandler = null;
  }
  if (scene._combatStatsUpdateHandler) {
    scene.events.off("update", scene._combatStatsUpdateHandler);
    scene._combatStatsUpdateHandler = null;
  }
  if (scene._settingsModalUpdateHook) {
    scene.events.off("update", scene._settingsModalUpdateHook);
    scene._settingsModalUpdateHook = null;
  }
}

function destroyPhysicsColliders(scene) {
  if (scene.combatSystem?._overlaps?.length) {
    for (const o of scene.combatSystem._overlaps) o?.destroy?.();
    scene.combatSystem._overlaps = [];
  }
  scene.playerCombat?._fireballOverlapCollider?.destroy?.();
  if (scene.playerCombat) scene.playerCombat._fireballOverlapCollider = null;
  scene.projectileSystem?._platformCollider?.destroy?.();
  if (scene.projectileSystem) scene.projectileSystem._platformCollider = null;
}

function detachSceneInput(scene) {
  scene.children?.each?.((ch) => {
    if (ch?.input) ch.disableInteractive();
  });
  try {
    scene.input.enabled = false;
    scene.input.setTopOnly(false);
    scene.input.resetPointers?.();
  } catch {
    /* ignore */
  }
}

/** Phaser 3.90: empty display list before stop to avoid shutdown reading undefined slots. */
function clearDisplayListSafely(scene) {
  const list = scene.children?.list;
  if (!list) return;
  while (list.length > 0) {
    const go = list[0];
    if (!go) {
      list.shift();
      continue;
    }
    go.destroy(true);
  }
}

/**
 * Stop GameScene after manual teardown (use from CharacterSelect / menu — not from End button).
 */
export function safeStopGameScene(sm) {
  if (!sm || typeof sm.get !== "function") return;
  if (!sm.isActive("GameScene") && !sm.isSleeping("GameScene")) return;

  const game = sm.get("GameScene");
  if (!game) return;

  closeGameOverUi(game);
  game.settingsModal?.destroy?.();
  game.settingsModal = null;
  detachSceneUpdateHandlers(game);
  destroyPhysicsColliders(game);
  detachSceneInput(game);
  game.hud?.destroy?.();
  game.hud = null;
  clearDisplayListSafely(game);

  sm.stop("GameScene");
}

/** Re-enable pointer input on menu / select scenes after GameScene is detached. */
export function ensureMenuInput(scene) {
  if (!scene?.input) return;
  scene.input.enabled = true;
  scene.input.setTopOnly(false);
  try {
    scene.input.resetPointers?.();
  } catch {
    /* ignore */
  }
  const gameInput = scene.game?.input;
  if (gameInput) {
    gameInput.enabled = true;
    try {
      gameInput.resetPointers?.();
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {Phaser.Scene} hostScene
 */
export function disposeBackgroundScenes(hostScene) {
  const sm = hostScene?.scene;
  const hostKey = hostScene?.scene?.key;
  if (!sm || !hostKey) return;

  hostScene.time.delayedCall(1, () => {
    if (hostKey === "CharacterSelectScene") {
      safeStopGameScene(sm);
      return;
    }

    if (hostKey === "FrontPageScene") {
      // After End, GameScene stays asleep — do NOT stop it here (breaks global input).
      if (sm.isActive("CharacterSelectScene") || sm.isSleeping("CharacterSelectScene")) {
        sm.stop("CharacterSelectScene");
      }
    }
  });
}

/**
 * Leave GameScene: sleep it, show FrontPage. GameScene is stopped later via safeStopGameScene.
 */
export function returnToFrontPageFromGame(scene) {
  const sm = scene?.scene;
  if (!sm || typeof sm.launch !== "function") return;

  detachSceneUpdateHandlers(scene);
  destroyPhysicsColliders(scene);
  detachSceneInput(scene);

  const menuKey = "FrontPageScene";

  if (sm.isSleeping(menuKey)) {
    sm.wake(menuKey);
  } else if (!sm.isActive(menuKey)) {
    sm.launch(menuKey);
  }
  sm.bringToTop(menuKey);

  if (sm.isActive("GameScene")) {
    sm.sleep("GameScene");
  }
}
