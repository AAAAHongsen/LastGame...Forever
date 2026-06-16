import { BASE_WIDTH, GROUND_SURFACE_Y } from "../constants.js";
import { createProjectile } from "../factories/createProjectile.js";

const GROUND_FIRE_OFFSETS = [-48, -24, 0, 24, 48];
const FIRE_DAMAGE_PER_S   = 20;

export function igniteGroundFires(scene, impactX, ownerEnemy, landY) {
  // 使用實際著陸 Y（來自平台 collider）或退回地面高度。
  const spawnY = Number.isFinite(landY) ? landY : GROUND_SURFACE_Y;

  for (const off of GROUND_FIRE_OFFSETS) {
    const gx = impactX + off;
    if (gx < 10 || gx > BASE_WIDTH - 10) continue;
    const g = scene.physics.add.sprite(gx, spawnY, "test-Grounded_fireball-sheet", 0);
    g.setDepth(8);  // depth 8，低於敵人(15)與玩家(40)，使火球顯示在上層
    g.setScale(3);
    g.setOrigin(0.5, 1);
    if (g.body) {
      g.body.setAllowGravity(false);
      g.body.setSize(14, 12, false);
    }
    g.setImmovable(true);
    g.anims.play("test-grounded_fire", true);
    // 火焰固定每秒 20 傷害，不受 Boss 攻擊數值影響。
    g.setData("fixedDamage", FIRE_DAMAGE_PER_S);
    if (ownerEnemy) g.setData("ownerEnemy", ownerEnemy);
    scene.projectileSystem.hazards.add(g);
    scene.time.delayedCall(5000, () => { if (g?.active) g.destroy(); });
  }
}

/**
 * 下落火球 — 著陸由 projectileSystem 平台 collider 處理（避免每 sprite collider 洩漏）。
 */
export function spawnFallingFireball(scene, { impactX, spawnY = 72, fallSpeed = 260, ownerEnemy } = {}) {
  const x = Number.isFinite(impactX) ? impactX : Phaser.Math.Between(40, BASE_WIDTH - 40);

  const s = createProjectile(scene, {
    x,
    y: spawnY,
    texture: "test-fall_fireball-sheet",
    scale: 3,
    depth: 8,       // depth 8，低於敵人(15)與玩家(40)
    kind: "fallFireball",
    velocityX: 0,
    velocityY: fallSpeed,
    bodyWidth: 10,
    bodyHeight: 24,
    bodyOffsetX: 3,
    bodyOffsetY: 4,
    animKey: "test-fall_fireball",
    flipX: false,
  });

  s.setData("onLand", (landX, landY) => igniteGroundFires(scene, landX, ownerEnemy, landY));
  if (ownerEnemy) s.setData("ownerEnemy", ownerEnemy);
  // 35% 機率穿透平台（65% 落在平台上）。
  s.setData("platformPassThrough", Math.random() < 0.35);

  s.once("animationcomplete-test-fall_fireball", () => {
    if (!s.active) return;
    s.anims.stop();
    s.setFrame(5);
  });

  s.setData("fallSpeed", fallSpeed);
  if (s.body) {
    s.body.setAllowGravity(false);
    s.body.setVelocity(0, fallSpeed);
    s.setVelocity(0, fallSpeed);
  }

  return s;
}

export function spawnGroundedFirePreview(scene, { x, y } = {}) {
  const fx = scene.add.sprite(x ?? 200, y ?? GROUND_SURFACE_Y, "test-Grounded_fireball-sheet", 0);
  fx.setDepth(20);
  fx.setScale(3);
  fx.setOrigin(0.5, 1);
  fx.anims.play("test-grounded_fire", true);
  return fx;
}
