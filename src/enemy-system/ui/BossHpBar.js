const BOSS_TYPES = new Set(["flyBoss", "groundBoss"]);

/** Per-boss bar dimensions (width × height). */
const BAR_SIZES = {
  flyBoss:    { w: 200, h: 12 },
  groundBoss: { w: 160, h: 10 },   // 0.8× the default size
};
const BAR_SIZE_DEFAULT = { w: 200, h: 12 };

/**
 * Per-boss bar offsets relative to sprite origin.
 * groundBoss uses setOrigin(0.5, 1) so s.y is at the feet.
 *   Frame 128px × scale 3.6 = 461px tall → head at s.y - 461.
 *   Set y to ~-480 to clear above the head.
 * flyBoss uses setOrigin(0.5, 0.5) so s.y is the visual centre.
 *   Frame ~96px × scale 2 = ~192px tall → head at s.y - 96.
 */
const OFFSETS = {
  flyBoss:    { x:   0, y:  -90 },
  groundBoss: { x: -45, y: -310 },
};

/**
 * Create an HP bar for a boss enemy and attach it as enemy._hpBar.
 * @param {Phaser.Scene} scene
 * @param {object} enemy  – enemy entry from enemyManager
 */
export function createBossHpBar(scene, enemy) {
  if (!BOSS_TYPES.has(enemy.type)) return;
  destroyBossHpBar(enemy); // clean up any prior bar

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
 * Update the position and fill of a boss HP bar each frame.
 * Safe to call even when enemy._hpBar is null.
 */
export function updateBossHpBar(enemy) {
  const bar = enemy?._hpBar;
  if (!bar || !enemy.sprite?.active) return;
  _repositionBar(enemy);
  _redrawFill(enemy);
}

/**
 * Remove the HP bar from the scene.
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
 * Update all boss HP bars in a scene.
 * Should be called every frame from GameScene.update (before the frozen guard)
 * so bars update on both host and client.
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

// ── internals ────────────────────────────────────────────────────────────────

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
