/** 波前數值摘要覆蓋層 — 每波開始前顯示，含特殊規則。 */
import { BASE_WIDTH, BASE_HEIGHT } from "../config/constants.js";
import { playButtonHoverSfx } from "../services/audioService.js";

const LABEL = { fontFamily: "Arial", fontSize: "20px", color: "#2a1f15" };
const VAL   = { fontFamily: "Courier New, monospace", fontSize: "20px", fontStyle: "bold", color: "#2a1f15" };
const NOTE  = { fontFamily: "Courier New, monospace", fontSize: "15px", fontStyle: "italic", color: "#5a3a1a" };
const TITLE_STYLE = {
  fontFamily: "Courier New, monospace",
  fontSize: "52px",
  fontStyle: "bold",
  color: "#2a1f15",
};

export class PreWaveModal {
  constructor(scene, { waveNum, cfg, onContinue } = {}) {
    this.scene = scene;
    this.onContinue = onContinue;
    this._done = false;
    this.build(waveNum, cfg);
  }

  build(waveNum, cfg) {
    const s = this.scene;
    this.container = s.add.container(BASE_WIDTH / 2, BASE_HEIGHT / 2);
    this.container.setDepth(600).setScrollFactor(0);

    const overlay = s.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000000, 0.55);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(-BASE_WIDTH / 2, -BASE_HEIGHT / 2, BASE_WIDTH, BASE_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );

    const rows       = this._buildRows(cfg, s);
    const noteLines  = this._buildNotes(cfg);
    const statRowH   = 34;
    const noteRowH   = 24;
    const contentH   = rows.length * statRowH + noteLines.length * noteRowH;
    const panelW     = 600;
    const panelH     = Math.max(340, 100 + contentH + 100);
    const panel = s.add.rectangle(0, 0, panelW, panelH, 0xe8d5b5, 0.97)
      .setStrokeStyle(6, 0x6e4a26, 1);

    const title = s.add.text(0, -(panelH / 2) + 42, `Wave ${waveNum}`, TITLE_STYLE).setOrigin(0.5);

    // 數值列
    const parts = [];
    const topY = -(panelH / 2) + 100;

    rows.forEach((row, i) => {
      const y = topY + i * statRowH;
      parts.push(
        s.add.text(-260, y, row.label, LABEL).setOrigin(0, 0.5),
        s.add.text( 260, y, row.value, VAL  ).setOrigin(1, 0.5)
      );
    });

    // 特殊規則說明（斜體、置中）
    const notesStartY = topY + rows.length * statRowH + 10;
    noteLines.forEach((line, i) => {
      parts.push(
        s.add.text(0, notesStartY + i * noteRowH, line, NOTE).setOrigin(0.5, 0)
      );
    });

    // 繼續按鈕
    const btnY = panelH / 2 - 44;
    const btnBg = s.add.rectangle(0, btnY, 220, 56, 0x6b5163, 0.95).setStrokeStyle(4, 0x2d2030);
    btnBg.setInteractive(
      new Phaser.Geom.Rectangle(-110, -28, 220, 56),
      Phaser.Geom.Rectangle.Contains
    );
    if (btnBg.input) btnBg.input.cursor = "pointer";

    const btnLabel = s.add
      .text(0, btnY, "Continue", {
        fontFamily: "Courier New, monospace",
        fontSize: "30px",
        fontStyle: "bold",
        color: "#d8bb4a",
      })
      .setOrigin(0.5);

    btnBg.on("pointerover", () => { btnBg.setFillStyle(0x7a5f72); playButtonHoverSfx(s); });
    btnBg.on("pointerout",  () => btnBg.setFillStyle(0x6b5163));
    btnBg.on("pointerup",   () => this._onContinue());

    this.container.add([overlay, panel, title, ...parts, btnBg, btnLabel]);
    s.input.setTopOnly(true);
  }

  _buildRows(cfg, s) {
    const rows = [];
    const scene = s;

    // 取得本波各職業玩家數值
    const soldierStats = cfg?.players?.soldier;
    const mageStats    = cfg?.players?.mage;

    if (soldierStats) {
      rows.push({ label: "⚔  Warrior  HP",     value: String(soldierStats.hp) });
      rows.push({ label: "⚔  Warrior  ATK",    value: String(soldierStats.attack) });
    }
    if (mageStats) {
      rows.push({ label: "✦  Mage  HP",         value: String(mageStats.hp) });
      rows.push({ label: "✦  Mage  ATK",        value: String(mageStats.attack) });
    }

    return rows;
  }

  _buildNotes(cfg) {
    const notes = [];
    const sr = cfg?.specialRules;
    if (!sr) return notes;
    if (sr.warriorNoCost)  notes.push("★  Warrior attacks cost no energy.");
    if (sr.mageHealBonus)  notes.push(`★  Mage healing restores ${Math.round(sr.mageHealBonus * 100)}% HP.`);
    return notes;
  }

  _onContinue() {
    if (this._done) return;
    this._done = true;
    this.destroy();
    this.onContinue?.();
  }

  destroy() {
    this._done = true;
    try { this.scene.input.setTopOnly(false); } catch { /* 略過 */ }
    this.container?.destroy(true);
    this.container = null;
  }
}
