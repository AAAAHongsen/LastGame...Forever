const BOSS_TYPES = new Set(["flyBoss", "groundBoss"]);

/** 各 Boss 血條尺寸（寬 × 高）。 */
const BAR_SIZES = {
  flyBoss:    { w: 200, h: 12 },
  groundBoss: { w: 160, h: 10 },   // 0.8× 預設尺寸
};
const BAR_SIZE_DEFAULT = { w: 200, h: 12 };

/**
 * 各 Boss 血條相對 sprite 原點的偏移。
 * groundBoss 使用 setOrigin(0.5, 1)，s.y 在腳底。
 *   幀 128px × 縮放 3.6 = 高 461px → 頭部在 s.y - 461。
 *   y 設約 -480 以顯示在頭頂上方。
 * flyBoss 使用 setOrigin(0.5, 0.5)，s.y 在視覺中心。
 *   幀約 96px × 縮放 2 = 高約 192px → 頭部在 s.y - 96。
 */
const OFFSETS = {
  flyBoss:    { x:   0, y:  -90 },
  groundBoss: { x: -45, y: -310 },
};

/**
 * 為 Boss 敵人建立 HP 血條並掛載為 enemy._hpBar。
 * @param {Phaser.Scene} scene 場景
 * @param {object} enemy — 來自 enemyManager 的敵人 entry
 */
export function createBossHpBar(scene, enemy) {
  if (!BOSS_TYPES.has(enemy.type)) return;
  destroyBossHpBar(enemy); // 清除既有血條

  const { w, h } = BAR_SIZES[enemy.type] ?? BAR_SIZE_DEFAULT;
  const depth = (enemy.visual?.depth ?? enemy.sprite?.depth ?? 20) + 5;

  const bg = scene.add.graphics().setDepth(depth);
  bg.fillStyle(0x000000, 0.65);
  bg.fillRoundedRect(-w / 2 - 2, -2, w + 4, h + 4, 4);

  const fill = scene.add.graphics().setDepth(depth + 1);

  const pctText = scene.add
    .text(w / 2 + 8, h / 2, "100%", {
      fontFamily: "Courier New, monospace",
      fontSize:   "11px",
      fontStyle:  "bold",
      color:      "#ffffff",
      stroke:     "#000000",
      strokeThickness: 2,
    })
    .setOrigin(0, 0.5)
    .setDepth(depth + 2);

  enemy._hpBar = { bg, fill, pctText, w, h };
  _redrawFill(enemy);
  _repositionBar(enemy);
}

/**
 * 每幀更新 Boss HP 血條位置與填充。
 * enemy._hpBar 為 null 時也可安全呼叫。
 */
export function updateBossHpBar(enemy) {
  const bar = enemy?._hpBar;
  if (!bar || !enemy.sprite?.active) return;
  _repositionBar(enemy);
  _redrawFill(enemy);
}

/**
 * 從場景移除 HP 血條。
 */
export function destroyBossHpBar(enemy) {
  const bar = enemy?._hpBar;
  if (!bar) return;
  bar.bg?.destroy?.();
  bar.fill?.destroy?.();
  bar.pctText?.destroy?.();
  enemy._hpBar = null;
}

/**
 * 更新場景中所有 Boss HP 血條。
 * 應每幀從 GameScene.update 呼叫（在凍結 guard 之前），
 * 使房主與客戶端血條都會更新。
 */
export function updateAllBossHpBars(scene) {
  for (const enemy of scene.enemyManager?.enemies ?? []) {
    if (!enemy._hpBar) continue;
    if (enemy.dead && !enemy.dying) {
      destroyBossHpBar(enemy);
      continue;
    }
    updateBossHpBar(enemy);
  }
}

// ── 內部 ────────────────────────────────────────────────────────────────────

function _repositionBar(enemy) {
  const bar  = enemy._hpBar;
  const s    = enemy.sprite;
  const off  = OFFSETS[enemy.type] ?? { x: 0, y: -80 };
  const { w, h } = bar;
  const bx   = s.x + off.x;
  const by   = s.y + off.y;

  bar.bg.setPosition(bx, by);
  bar.fill.setPosition(bx, by);
  bar.pctText.setPosition(bx + w / 2 + 8, by + h / 2);
}

function _redrawFill(enemy) {
  const bar = enemy._hpBar;
  const { w, h } = bar;
  const pct = Math.max(0, Math.min(1, (enemy.hp ?? 0) / (enemy.hpMax || 1)));
  const color = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xeeaa11 : 0xee3333;

  bar.fill.clear();
  if (pct > 0) {
    bar.fill.fillStyle(color, 1);
    bar.fill.fillRoundedRect(-w / 2, 0, w * pct, h, 3);
  }

  bar.pctText.setText(`${Math.round(pct * 100)}%`);
}
