function getGameScene() {
  if (typeof window === "undefined") return null;
  const game = window.__phaserGame;
  if (!game?.scene) return null;
  return game.scene.getScene("GameScene") ?? null;
}

/** Resolve "1" or "2" → player entry in scene.players (index 0 or 1). */
function resolvePlayerEntry(scene, playerNum) {
  const idx = Number(playerNum) - 1;
  return scene?.players?.[idx] ?? null;
}

function printHudDebugHelp() {
  const msg = [
    "【GameScene HUD + 玩家數值】Debug API（須在 GameScene 執行中）：",
    "",
    "  ── 血量 / 能量 ──",
    "  hudDebug.setHealth(1, 50)        // 玩家 1 目前血量",
    "  hudDebug.setHealth(2, 50)        // 玩家 2 目前血量",
    "  hudDebug.setMaxHp(1, 180)        // 玩家 1 最大血量（同時補滿至新上限）",
    "  hudDebug.setMaxHp(2, 150)        // 玩家 2 最大血量",
    "  hudDebug.setEnergy(20)           // 共用能量",
    "  hudDebug.setEnergyMax(50)",
    "  hudDebug.setOrbs(1, 3)           // 玩家 1 能量球",
    "  hudDebug.setOrbs(2, 3)",
    "",
    "  ── 攻擊力 ──",
    "  hudDebug.setAttack(1, 20)        // 玩家 1 攻擊力（立即生效）",
    "  hudDebug.setAttack(2, 25)        // 玩家 2 攻擊力",
    "  hudDebug.getAttack(1)            // 查看玩家 1 目前攻擊力",
    "",
    "  ── 快速預設（套用 wave 數值）──",
    "  hudDebug.applyWaveStats(4)       // 套用 wave 4 玩家數值（含特殊規則）",
    "",
    "  ── 測試房間 ──",
    "  hudDebug.showWin()               // 顯示勝利畫面（僅 room 00001）",
    "",
    "  hudDebug.help()",
  ].join("\n");
  // eslint-disable-next-line no-console
  console.log(msg);
  return msg;
}

export function installHudDevTools(scene) {
  if (!scene?.hud) return;

  const hud = scene.hud;

  if (typeof window !== "undefined") {
    const debug = {
      // ── HP ──────────────────────────────────────────────────────────────
      setHealth: (player, value) => {
        hud.setHealth(player, value);
        // eslint-disable-next-line no-console
        console.log(`[hudDebug] P${player} HP → ${value}`);
      },
      setMaxHp: (player, max) => {
        hud.setHealthMax(player, max);
        // Also update current HP proportionally (clamp to new max)
        const roleKey = player === 2 || player === "2" ? "p2" : "p1";
        const cur = Math.min(Number(hud.health?.[roleKey] ?? 0), max);
        hud.setHealth(player, cur);
        // Update entry combat max
        const entry = resolvePlayerEntry(scene, player);
        if (entry) {
          if (!entry.combat) entry.combat = {};
          entry.combat._waveMaxHp = max;
        }
        // eslint-disable-next-line no-console
        console.log(`[hudDebug] P${player} maxHP → ${max}, curHP → ${cur}`);
      },
      // Legacy alias
      setHealthMax: (player, max) => debug.setMaxHp(player, max),

      // ── Energy ──────────────────────────────────────────────────────────
      setEnergy: (value) => hud.setEnergy(value),
      setEnergyMax: (max) => hud.setEnergyMax(max),
      setOrbs: (player, count) => hud.setOrbs(player, count),

      // ── Attack ──────────────────────────────────────────────────────────
      setAttack: (player, value) => {
        const entry = resolvePlayerEntry(scene, player);
        if (!entry) {
          // eslint-disable-next-line no-console
          console.warn(`[hudDebug] 找不到 Player ${player} entry`);
          return;
        }
        if (!entry.combat) entry.combat = {};
        entry.combat._waveAttack = Number(value);
        // eslint-disable-next-line no-console
        console.log(`[hudDebug] P${player}(${entry.type}) 攻擊力 → ${value}`);
      },
      getAttack: (player) => {
        const entry = resolvePlayerEntry(scene, player);
        if (!entry) return null;
        const v = entry.combat?._waveAttack ?? "(base)";
        // eslint-disable-next-line no-console
        console.log(`[hudDebug] P${player}(${entry.type}) 攻擊力 = ${v}`);
        return v;
      },

      // ── Quick wave preset ───────────────────────────────────────────────
      applyWaveStats: (waveNum) => {
        const wm = scene.waveManager;
        if (!wm) {
          // eslint-disable-next-line no-console
          console.warn("[hudDebug] waveManager 不存在，請先進入 GameScene");
          return;
        }
        wm._applyPlayerStats(wm._getWaveCfg(waveNum), waveNum);
        // eslint-disable-next-line no-console
        console.log(`[hudDebug] 套用 wave ${waveNum} 玩家數值`);
      },

      showWin: () => {
        if (!scene.isTestRoom) {
          // eslint-disable-next-line no-console
          console.warn("[hudDebug] showWin() 僅限測試房間 (room 00001)");
          return;
        }
        scene.showWinScreen?.();
        // eslint-disable-next-line no-console
        console.log("[hudDebug] 顯示 Win 畫面");
      },

      getScene: () => getGameScene(),
      help: () => printHudDebugHelp(),
    };

    window.hudDebug = debug;
    window.testHudHelp = debug.help;
  }

  scene.events.once("shutdown", () => {
    if (typeof window !== "undefined") {
      delete window.hudDebug;
      delete window.testHudHelp;
    }
  });

  // eslint-disable-next-line no-console
  console.log(
    "%c[HUD]%c 已載入 — 輸入 hudDebug.help() 查看所有指令",
    "color:#7fb8e8;font-weight:bold",
    "color:inherit"
  );
}
