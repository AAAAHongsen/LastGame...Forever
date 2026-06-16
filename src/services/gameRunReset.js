/** 本局重置、重開，以及返回首頁。 */
import { clearEnemies } from "../enemy-system/systems/enemyManager.js";
import { clearLootPickups } from "../combat-stats/loot/lootManager.js";
import { WaveManager } from "../wave/WaveManager.js";
import { getDefaultMaxHpForClass } from "../combat-stats/config/playerStats.js";
import { getLocalPlayerIndex } from "./multiplayerSession.js";
import { PLAYER_SPAWN_POINTS } from "../scenes/playerSetup.js";

function playIdleAnim(entry) {
  const v = entry?.visual;
  if (!v?.anims) return;
  const key = entry.type === "mage" ? "mage-run-idle" : "soldier-idle";
  v.anims.play(key, true);
}

// ── 局內重置（Game Over → Restart）──────────────────────────────────────

function clearWaveUiOverlays(scene) {
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
}

function clearCombatWorld(scene) {
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
}

function resetPlayersToSpawn(scene) {
  for (let i = 0; i < (scene.players?.length ?? 0); i += 1) {
    const entry = scene.players[i];
    const spawn = PLAYER_SPAWN_POINTS[i] ?? PLAYER_SPAWN_POINTS[0];
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
      if (entry.combat) delete entry.combat._waveAttack;
      playIdleAnim(entry);
    }
  }
}

function resetHudAndWaveRules(scene) {
  const p1Type = scene.players?.[0]?.type ?? "soldier";
  const p2Type = scene.players?.[1]?.type ?? "mage";
  const p1DefaultHp = getDefaultMaxHpForClass(p1Type);
  const p2DefaultHp = getDefaultMaxHpForClass(p2Type);
  scene.hud?.setHealthMax(1, p1DefaultHp);
  scene.hud?.setHealth(1, p1DefaultHp);
  scene.hud?.setHealthMax(2, p2DefaultHp);
  scene.hud?.setHealth(2, p2DefaultHp);
  scene.hud?.setEnergy(50);
  scene.hud?.setOrbs(1, 0);
  scene.hud?.setOrbs(2, 0);
  scene.hud?.setWave?.(1);

  const localIndex = getLocalPlayerIndex(scene);
  scene.activePlayerIndex = localIndex;
  const local = scene.players?.[localIndex];
  if (local?.sprite && scene.playerController) {
    scene.playerController.setPlayer(local.sprite);
  }
  scene.updateActiveControlText?.();

  scene._waveWarriorNoCost = false;
  scene._waveWarriorSkillInvincible = false;
  scene._waveMageHealBonus = 0;
}

function restartWaveFromBeginning(scene) {
  scene._gameOverFrozen = false;
  scene.waveManager = new WaveManager(scene);
  scene.waveManager.start();
}

/** 在不停止場景的情況下重置進行中的 GameScene（避開 Phaser 3.90 關閉 bug）。 */
export function resetGameRun(scene) {
  scene._restartHandshakeBound = false;
  clearWaveUiOverlays(scene);
  clearCombatWorld(scene);
  resetPlayersToSpawn(scene);
  resetHudAndWaveRules(scene);
  restartWaveFromBeginning(scene);
}

export function closeGameOverUi(scene) {
  scene.gameOverModal?.destroy?.();
  scene.gameOverModal = null;
  scene._gameOverOpen = false;
  scene._gameOverFrozen = false;
  try {
    scene.input?.setTopOnly?.(false);
  } catch {
    /* 略過 */
  }
}

// ── GameScene 關閉輔助 ──────────────────────────────────────────────────────

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
    /* 略過 */
  }
}

/** Phaser 3.90：stop 前先清空顯示列表，避免關閉時讀到 undefined 槽位。 */
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
 * 手動拆解後停止 GameScene（用於 CharacterSelect／選單 — 非 End 按鈕）。
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

// ── 選單場景輸入恢復 ───────────────────────────────────────────────────────

/** GameScene 卸載後，重新啟用選單／選角場景的指標輸入。 */
export function ensureMenuInput(scene) {
  if (!scene?.input) return;
  scene.input.enabled = true;
  scene.input.setTopOnly(false);
  try {
    scene.input.resetPointers?.();
  } catch {
    /* 略過 */
  }
  const gameInput = scene.game?.input;
  if (gameInput) {
    gameInput.enabled = true;
    try {
      gameInput.resetPointers?.();
    } catch {
      /* 略過 */
    }
  }
}

// ── 場景導航 ────────────────────────────────────────────────────────────────

/**
 * @param {Phaser.Scene} hostScene 宿主場景
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
      // End 之後 GameScene 仍處休眠 — 勿在此 stop（會破壞全域輸入）。
      if (sm.isActive("CharacterSelectScene") || sm.isSleeping("CharacterSelectScene")) {
        sm.stop("CharacterSelectScene");
      }
    }
  });
}

/** 離開 GameScene：休眠並顯示 FrontPage。GameScene 稍後由 safeStopGameScene 停止。 */
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
