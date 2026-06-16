/**
 * 敵人系統初始化與測試房除錯工具（enemyDebug.*）。
 */
import { preloadEnemyAssets } from "./assets/enemyAssets.js";
import { createEnemyAnimations } from "./assets/enemyAnimations.js";
import { findEnemyByType } from "./combat/targeting.js";
import { EFFECTS } from "./registry/effectRegistry.js";
import { initCombatSystem, rebuildPlayerOverlaps } from "./systems/combatSystem.js";
import { attachEnemySystemUpdate } from "./systems/updateLoop.js";
import { initProjectileSystem } from "./systems/projectileSystem.js";
import { clearEnemies, initEnemyManager, spawnEnemy } from "./systems/enemyManager.js";
import {
  playGorgonBeam,
  playGorgonMelee,
  playGorgonStomp,
  triggerBatAttack,
  triggerFlyBossAttack,
} from "./systems/bossActions.js";
import { initCombatStats } from "../combat-stats/initCombatStats.js";
import { createBossHpBar } from "./ui/BossHpBar.js";
import { getWaveConfig } from "../wave/waveConfig.js";
import { getSafeSpawnPoints, FLYING_ENEMY_TYPES } from "../wave/spawnHelpers.js";

export { preloadEnemyAssets, createEnemyAnimations };

/**
 * 測試房縮短 Gorgon 初始攻擊計時，生成後數秒內即攻擊而非等 30 秒。
 * 踐踏 → 生成 4 秒後發動，之後每 30 秒如常。
 * 雷射 → 首次失去 10% HP 時發動（邏輯不變）。
 * 近戰 → 立即可用（邏輯不變）。
 */
function _primeGorgonTimers(scene, enemy) {
  if (enemy?.type !== "groundBoss") return;
  const now = scene.time?.now ?? Date.now();
  const sd  = enemy.stateData;
  if (!sd) return;
  sd.gorgonNextStompAt = now + 4000;
  sd.gorgonLastHpPct   = 1.0;
  sd.gorgonNextMeleeAt = 0;
}

export function installEnemyDevTools(scene) {
  initProjectileSystem(scene);
  initCombatSystem(scene);
  initCombatStats(scene);
  initEnemyManager(scene);
  attachEnemySystemUpdate(scene);

  scene.spawnEnemy = (type, x, y) => spawnEnemy(scene, type, x, y);
  scene.spawnTestEnemy = scene.spawnEnemy;

  scene.spawnEffect = (kind, x, y) => {
    const fx = EFFECTS[kind]?.(scene, { x, y });
    if (!fx) {
      // eslint-disable-next-line no-console — 略過主控台警告
      console.warn("[enemySystem] Unknown effect:", kind);
      return null;
    }
    scene.enemyManager.enemies.push({ type: `fx-${kind}`, sprite: fx, visual: fx });
    return fx;
  };
  scene.spawnTestEffect = scene.spawnEffect;

  scene.clearEnemies = () => clearEnemies(scene);
  scene.clearTestEnemies = scene.clearEnemies;

  scene.playTestEnemyAnim = (enemyEntry, animKey) => {
    enemyEntry?.playAnim?.(animKey);
  };

  scene.rebuildTestEnemyPlayerOverlaps = () => rebuildPlayerOverlaps(scene);

  if (typeof window !== "undefined") {
    /** 依波次編號生成該波所有怪物並套用正確數值。 */
    const spawnWave = (waveNum) => {
      const cfg = getWaveConfig(waveNum);
      if (!cfg) { console.warn(`[enemyDebug] No config for wave ${waveNum}`); return; } // eslint-disable-line no-console
      let idCounter = 0;
      for (const group of cfg.enemies ?? []) {
        const isFlying = FLYING_ENEMY_TYPES.has(group.type);
        const positions = getSafeSpawnPoints(scene, group.count, isFlying);
        for (let i = 0; i < group.count; i += 1) {
          const pos   = positions[i] ?? positions[0];
          const enemy = spawnEnemy(scene, group.type, pos.x, pos.y);
          if (!enemy) continue;
          enemy.hp         = group.hp;
          enemy.hpMax      = group.hp;
          enemy._waveDamage = group.damage;
          enemy._waveId    = `dbg_w${waveNum}_${++idCounter}`;
          createBossHpBar(scene, enemy);
          _primeGorgonTimers(scene, enemy);
        }
      }
      scene.combatSystem?.rebuildPlayerOverlaps?.();
      // eslint-disable-next-line no-console — 略過主控台警告
      console.log(`[enemyDebug] Spawned wave ${waveNum} monsters`);
    };

    const debug = {
      spawn: (type, x, y) => {
        const e = spawnEnemy(scene, type, x, y);
        if (e) {
          createBossHpBar(scene, e);
          _primeGorgonTimers(scene, e);
        }
        return e;
      },
      spawnWave,
      effect: (kind, x, y) => scene.spawnEffect(kind, x, y),
      clear: () => clearEnemies(scene),
      attack: {
        bat:         () => { const e = findEnemyByType(scene, "bat");         if (!e) { console.warn("[enemyDebug] No bat in scene"); return; }         triggerBatAttack(scene, e); },        // eslint-disable-line no-console
        flyBoss:     () => { const e = findEnemyByType(scene, "flyBoss");     if (!e) { console.warn("[enemyDebug] No flyBoss in scene"); return; }     triggerFlyBossAttack(scene, e); },  // eslint-disable-line no-console
        gorgonStomp: () => { const e = findEnemyByType(scene, "groundBoss"); if (!e) { console.warn("[enemyDebug] No groundBoss in scene"); return; } playGorgonStomp(scene, e); },        // eslint-disable-line no-console
        gorgonBeam:  () => { const e = findEnemyByType(scene, "groundBoss"); if (!e) { console.warn("[enemyDebug] No groundBoss in scene"); return; } playGorgonBeam(scene, e); },         // eslint-disable-line no-console
        gorgonMelee: () => { const e = findEnemyByType(scene, "groundBoss"); if (!e) { console.warn("[enemyDebug] No groundBoss in scene"); return; } playGorgonMelee(scene, e); },        // eslint-disable-line no-console
      },
      help: () => printEnemyDebugHelp(),
      mushroomTrace: (on = true) => {
        window.__mushroomAttackDebug = Boolean(on);
        // eslint-disable-next-line no-console — 略過主控台警告
        console.log(`[mushroom-attack] trace ${on ? "ON" : "OFF"}`);
        return on;
      },
      skeletonTrace: (on = true) => {
        window.__skeletonAttackDebug = Boolean(on);
        // eslint-disable-next-line no-console — 略過主控台警告
        console.log(`[skeleton-attack] trace ${on ? "ON" : "OFF"}`);
        return on;
      },
    };

    window.enemyDebug = debug;

    // 舊版別名
    window.spawnTestEnemy   = debug.spawn;
    window.spawnTestEffect  = debug.effect;
    window.clearTestEnemies = debug.clear;
    window.testBatAttack        = debug.attack.bat;
    window.testFlyBossAttack    = debug.attack.flyBoss;
    window.testGorgonStomp      = debug.attack.gorgonStomp;
    window.testGorgonBeam       = debug.attack.gorgonBeam;
    window.testGorgonMelee      = debug.attack.gorgonMelee;
    window.testEnemyHelp        = debug.help;
  }

  scene.events.once("shutdown", () => {
    clearEnemies(scene);
    if (scene._enemySystemUpdateHandler) {
      scene.events.off("update", scene._enemySystemUpdateHandler);
    }
    if (typeof window !== "undefined") {
      delete window.enemyDebug;
      delete window.spawnTestEnemy;
      delete window.spawnTestEffect;
      delete window.clearTestEnemies;
      delete window.testBatAttack;
      delete window.testFlyBossAttack;
      delete window.testGorgonStomp;
      delete window.testGorgonBeam;
      delete window.testGorgonMelee;
      delete window.testEnemyHelp;
    }
  });

  // eslint-disable-next-line no-console — 略過主控台警告
  console.log(
    "%c[Enemy System]%c 已載入 — 輸入 enemyDebug.help() 或 testEnemyHelp()",
    "color:#7fd491;font-weight:bold",
    "color:inherit"
  );
}

function printEnemyDebugHelp() {
  const msg = [
    "【測試房】enemyDebug API：",
    "",
    "  ── 生成 ──",
    "  enemyDebug.spawn('mushroom')           // 單隻，無 wave 數值",
    "  enemyDebug.spawn('bat')",
    "  enemyDebug.spawn('skeleton')",
    "  enemyDebug.spawn('flyBoss')            // 自動顯示血條",
    "  enemyDebug.spawn('groundBoss')",
    "",
    "  enemyDebug.spawnWave(1)               // 生成 wave N 全部怪物（含正確血量/攻擊力）",
    "  enemyDebug.spawnWave(3)               // 例如 wave 3：flyBoss + bat + mushroom",
    "  enemyDebug.spawnWave(5)               // 第 5 波：groundBoss + bat + mushroom + skeleton",
    "",
    "  enemyDebug.effect('soundWave'|'lightBall'|'fallFireball' ...)",
    "",
    "  ── 攻擊測試 ──",
    "  enemyDebug.attack.bat()",
    "  enemyDebug.attack.flyBoss()",
    "  enemyDebug.attack.gorgonStomp()        // 落焰：平台也會生火，每秒 15 傷",
    "  enemyDebug.attack.gorgonBeam()         // 雷射：持續 5 秒，每秒 20 傷",
    "  enemyDebug.attack.gorgonMelee()        // 近戰尾打：180px 內，40 傷",
    "  enemyDebug.clear()",
    "",
    "  enemyDebug.mushroomTrace(true)  // 蘑菇攻擊 hitbox / 傷害 trace",
    "  enemyDebug.skeletonTrace(true)  // 骷髏攻擊 hitbox / 傷害 trace",
    "",
    "（舊指令 spawnTestEnemy / testBatAttack 等仍可用）",
    "",
    "  ── HUD / 玩家數值調試 ──",
    "  hudDebug.setHealth(1, 50)              // 玩家 1 目前血量",
    "  hudDebug.setMaxHp(1, 180)             // 玩家 1 最大血量",
    "  hudDebug.setAttack(1, 20)             // 玩家 1 攻擊力（立即生效）",
    "  hudDebug.getAttack(1)                 // 查看攻擊力",
    "  hudDebug.setOrbs(1, 3)",
    "  hudDebug.applyWaveStats(4)            // 一次套用 wave 4 全部玩家數值",
    "  hudDebug.help()",
  ].join("\n");
  // eslint-disable-next-line no-console — 略過主控台警告
  console.log(msg);
  return msg;
}
