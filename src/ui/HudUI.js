import { BASE_WIDTH } from "../config/constants.js";

const clampInt = (n, min, max) => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
};

const clampNumber = (n, min, max) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
};

export class HudUI {
  constructor(scene) {
    this.scene = scene;

    this.wave = 1;

    // Defaults from spec
    this.healthMax = { p1: 100, p2: 70 };
    this.health = { p1: 100, p2: 70 };
    this.energyMax = 50;
    this.energy = 50;
    this._energyRegenEvent = null;
    this.orbsMax = 5;
    this.orbs = { p1: 0, p2: 0 };

    this.build();
  }

  build() {
    const s = this.scene;

    this.root = s.add.container(0, 0).setDepth(200).setScrollFactor(0);
    this.gfx = s.add.graphics().setDepth(200).setScrollFactor(0);
    this.root.add(this.gfx);

    // Layout tuned to match reference screenshot proportions.
    const topY = 8;
    const sidePad = 18;
    const barsY = topY + 30;
    const energyY = barsY + 26;
    const orbsY = energyY + 22;

    const nameStyle = {
      fontFamily: "Arial",
      fontSize: "26px",
      color: "#f4e6bf",
    };
    const waveStyle = {
      fontFamily: "Arial",
      fontSize: "32px",
      color: "#f4e6bf",
    };

    this.p1NameText = s.add
      .text(sidePad, topY, "Player1", nameStyle)
      .setOrigin(0, 0);

    this.p2NameText = s.add
      .text(BASE_WIDTH - sidePad, topY, "Player2", nameStyle)
      .setOrigin(1, 0);

    this.waveText = s.add
      .text(BASE_WIDTH / 2, topY, "Wave1", waveStyle)
      .setOrigin(0.5, 0);

    const hpBarH = 14;
    const hpBarW = 260;
    const hpTextY = barsY + hpBarH + 3;
    const energyYAdj  = hpTextY + 13;
    const orbsYAdj    = energyYAdj + 22;

    this.layout = {
      topY,
      sidePad,
      barsY,
      energyY: energyYAdj,
      orbsY: orbsYAdj,
      // Health bars (solid fill, boss-style)
      hpBarW,
      hpBarH,
      hpTextY,
      // Energy bar (shared)
      energyBarW: BASE_WIDTH - sidePad * 2,
      energyBarH: 10,
      energySegmentGap: 1,
      energyPadding: 2,
      // Orbs
      orbR: 8,
      orbGap: 6,
    };

    const hpNumStyle = {
      fontFamily: "Courier New, monospace",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    };

    this.p1HpText = s.add.text(sidePad, hpTextY, "100/100", hpNumStyle).setOrigin(0, 0);
    this.p2HpText = s.add.text(BASE_WIDTH - sidePad, hpTextY, "70/70", hpNumStyle).setOrigin(1, 0);

    this.root.add([
      this.p1NameText,
      this.p2NameText,
      this.waveText,
      this.p1HpText,
      this.p2HpText,
    ]);

    // Energy regen: +1 per second, capped at energyMax.
    // Avoid redraw when already full.
    if (!this._energyRegenEvent && s?.time?.addEvent) {
      this._energyRegenEvent = s.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          const max = Math.max(1, Math.round(Number(this.energyMax) || 1));
          const cur = Math.max(0, Math.round(Number(this.energy) || 0));
          if (cur >= max) return;
          this.energy = Math.min(max, cur + 1);
          this.redraw();
        },
      });
    }

    this.refreshAllInstant();
  }

  refreshAllInstant() {
    this.waveText.setText(`Wave${this.wave}`);
    this.redraw();
  }

  _refreshHpText() {
    const c1 = Math.round(this.health.p1);
    const m1 = Math.round(this.healthMax.p1);
    const c2 = Math.round(this.health.p2);
    const m2 = Math.round(this.healthMax.p2);
    if (this.p1HpText) this.p1HpText.setText(`${c1}/${m1}`);
    if (this.p2HpText) this.p2HpText.setText(`${c2}/${m2}`);
  }

  redraw() {
    const g = this.gfx;
    const {
      sidePad,
      barsY,
      energyY,
      orbsY,
      hpBarW,
      hpBarH,
      energyBarW,
      energyBarH,
      energySegmentGap,
      energyPadding,
      orbR,
      orbGap,
    } = this.layout;

    g.clear();

    const black  = 0x000000;
    const yellow = 0xf1d44f;
    const blue   = 0x1e88e5;
    const emptyDark = 0x1b1b1b;

    // ── Solid-fill boss-style HP bars ─────────────────────────────────────
    const drawHpBar = (x, y, alignRight, current, max) => {
      const pct = max > 0 ? clampNumber(current / max, 0, 1) : 0;
      const left = alignRight ? x - hpBarW : x;

      // Background
      g.fillStyle(emptyDark, 0.85);
      g.fillRoundedRect(left, y, hpBarW, hpBarH, 3);

      // Coloured fill (green → yellow → red)
      if (pct > 0) {
        const fillColor = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xeeaa11 : 0xe53935;
        g.fillStyle(fillColor, 1);
        g.fillRoundedRect(left + 1, y + 1, Math.max(2, (hpBarW - 2) * pct), hpBarH - 2, 2);
      }

      // Border
      g.lineStyle(2, black, 1);
      g.strokeRoundedRect(left, y, hpBarW, hpBarH, 3);
    };

    // Left: Player1, Right: Player2
    drawHpBar(sidePad, barsY, false, this.health.p1, this.healthMax.p1);
    drawHpBar(BASE_WIDTH - sidePad, barsY, true, this.health.p2, this.healthMax.p2);
    this._refreshHpText();

    // Energy bar (shared, full width, segmented like HP: max increases => more cells)
    const energyLeft = (BASE_WIDTH - energyBarW) / 2;
    g.lineStyle(2, black, 1);
    g.strokeRect(energyLeft, energyY, energyBarW, energyBarH);

    const eMax = Math.max(1, Math.round(Number(this.energyMax) || 1));
    const eCur = clampInt(this.energy, 0, eMax);
    const segCount = clampInt(eMax, 1, 200);

    const innerEW = energyBarW - energyPadding * 2;
    const innerEH = energyBarH - energyPadding * 2;
    const segW = (innerEW - (segCount - 1) * energySegmentGap) / segCount;
    const segY = energyY + energyPadding;
    let segX = energyLeft + energyPadding;

    for (let i = 0; i < segCount; i += 1) {
      // Empty segment background
      g.fillStyle(emptyDark, 1);
      g.fillRect(segX, segY, segW, innerEH);

      // Filled part (1 energy per cell)
      if (i < eCur) {
        g.fillStyle(yellow, 1);
        g.fillRect(segX, segY, segW, innerEH);
      }

      // Cell border
      g.lineStyle(2, black, 1);
      g.strokeRect(segX, segY, segW, innerEH);

      segX += segW + energySegmentGap;
    }

    // Orbs (5 circles each side)
    const drawOrbs = (x, y, alignRight, filledCount) => {
      const filled = clampInt(filledCount, 0, this.orbsMax);
      const totalW = this.orbsMax * (orbR * 2) + (this.orbsMax - 1) * orbGap;
      let startX = alignRight ? x - totalW : x;
      const cy = y + orbR;

      for (let i = 0; i < this.orbsMax; i += 1) {
        const cx = startX + orbR + i * (orbR * 2 + orbGap);
        g.lineStyle(2, black, 1);
        g.strokeCircle(cx, cy, orbR);
        if (i < filled) {
          g.fillStyle(blue, 1);
          g.fillCircle(cx, cy, orbR - 2);
        }
      }
    };

    drawOrbs(sidePad, orbsY, false, this.orbs.p1);
    drawOrbs(BASE_WIDTH - sidePad, orbsY, true, this.orbs.p2);
  }

  setWave(waveNumber) {
    this.wave = Math.max(1, clampInt(waveNumber, 1, 999));
    this.waveText.setText(`Wave${this.wave}`);
  }

  setNames({ player1Name, player2Name, p1Name, p2Name, knightName, mageName } = {}) {
    // Preferred: player1/player2 (also accept p1/p2). Back-compat: knight/mage.
    const left = player1Name ?? p1Name ?? knightName;
    const right = player2Name ?? p2Name ?? mageName;
    if (typeof left === "string") this.p1NameText.setText(left);
    if (typeof right === "string") this.p2NameText.setText(right);
  }

  _normalizePlayerKey(key) {
    if (key === 1 || key === "1" || key === "p1" || key === "player1" || key === "left" || key === "knight") return "p1";
    if (key === 2 || key === "2" || key === "p2" || key === "player2" || key === "right" || key === "mage") return "p2";
    return null;
  }

  setHealthMax(player, max) {
    const role = this._normalizePlayerKey(player);
    if (!role) return;
    const m = Math.max(1, Math.round(Number(max) || 1));
    this.healthMax[role] = m;
    this.health[role] = Math.min(this.health[role], m);
    this.redraw();
  }

  setHealth(player, current) {
    const role = this._normalizePlayerKey(player);
    if (!role) return;
    const m = this.healthMax[role];
    const next = Math.max(0, Math.min(m, Math.round(Number(current) || 0)));
    this.health[role] = next;
    this.redraw();
  }

  setEnergyMax(max) {
    const m = Math.max(1, Math.round(Number(max) || 1));
    this.energyMax = m;
    this.energy = Math.min(this.energy, m);
    this.redraw();
  }

  setEnergy(current) {
    const m = this.energyMax;
    const next = Math.max(0, Math.min(m, Math.round(Number(current) || 0)));
    this.energy = next;
    this.redraw();
  }

  setOrbs(role, count) {
    const r = this._normalizePlayerKey(role);
    if (!r) return;
    const next = clampInt(count, 0, this.orbsMax);
    this.orbs[r] = next;
    this.redraw();
  }

  destroy() {
    if (this._energyRegenEvent) {
      this._energyRegenEvent.remove(false);
      this._energyRegenEvent = null;
    }
    // Scene shutdown destroys display objects — only clear refs to avoid double-destroy.
    this.root = null;
    this.gfx = null;
    this.p1NameText = null;
    this.p2NameText = null;
    this.waveText = null;
    this.p1HpText = null;
    this.p2HpText = null;
  }
}

