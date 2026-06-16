/** 光球攻擊 — 預熱動畫、追蹤飛行、爆炸與碎片散射。 */
import { getNearestPlayer } from "../combat/targeting.js";
import { createProjectile } from "../factories/createProjectile.js";

const SHARD_DIRS = [
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: -1 },
  { x: -1, y: 1 },
];
const SHARD_SPEED = 280;
const SHARD_SCALE = 0.75;
const SHARD_FRAME = 3;

function spawnShards(scene, x, y) {
  const originY = y - 20;
  for (const d of SHARD_DIRS) {
    const len = Math.hypot(d.x, d.y) || 1;
    const vx = (d.x / len) * SHARD_SPEED;
    const vy = (d.y / len) * SHARD_SPEED;
    const sh = createProjectile(scene, {
      x,
      y: originY,
      texture: "test-lightball-sheet",
      frame: SHARD_FRAME,
      scale: SHARD_SCALE,
      kind: "lightShard",
      velocityX: vx,
      velocityY: vy,
      bodyWidth: 8,
      bodyHeight: 8,
      flipX: false,
    });
    sh.setRotation(Math.atan2(vy, vx));
    if (sh.body) {
      sh.body.setVelocity(vx, vy);
    }
  }
}

export function spawnLightBall(scene, { fromSprite } = {}) {
  if (!fromSprite) return null;
  const target = getNearestPlayer(scene, fromSprite);
  const tx = target?.sprite?.x ?? fromSprite.x + 120;
  const ty = (target?.sprite?.y ?? fromSprite.y) - 10;
  const faceLeft = Boolean(fromSprite.flipX);
  const spawnX = fromSprite.x + (faceLeft ? -20 : 20);
  const spawnY = fromSprite.y - 20;
  const ballScale = 1.5;

  const warmup = scene.add.sprite(spawnX, spawnY, "test-lightball-sheet", 0);
  warmup.setDepth(22);
  warmup.setScale(ballScale);
  warmup.anims.play("test-lightball-move", true);

  warmup.once("animationcomplete-test-lightball-move", () => {
    warmup.anims.stop();
    warmup.setFrame(3);

    const proj = createProjectile(scene, {
      x: warmup.x,
      y: warmup.y,
      texture: "test-lightball-sheet",
      frame: 3,
      scale: ballScale,
      kind: "lightBall",
      bodyWidth: 12,
      bodyHeight: 12,
      flipX: false,
    });
    proj.setData("boomed", false);
    warmup.destroy();

    const dx = tx - proj.x;
    const dy = ty - proj.y;
    const len = Math.max(1e-3, Math.hypot(dx, dy));
    const speed = 360;
    proj.setVelocity((dx / len) * speed, (dy / len) * speed);
    proj.setRotation(Math.atan2(dy, dx));

    const boomAt = (bx, by, withShards = true) => {
      if (!proj.active || proj.getData("boomed")) return;
      if (proj.getData("suppressShards")) return;
      proj.setData("boomed", true);
      proj.destroy();

      const boom = scene.add.sprite(bx, by, "test-lightball-boom-sheet", 0);
      boom.setDepth(23);
      boom.setScale(ballScale);
      boom.anims.play("test-lightball-boom", true);

      const releaseShards = () => {
        if (withShards) spawnShards(scene, bx, by);
        boom.destroy();
      };

      boom.once("animationcomplete-test-lightball-boom", releaseShards);
      scene.time.delayedCall(400, () => {
        if (boom.active) releaseShards();
      });
    };

    const travelMs = (Math.hypot(dx, dy) / speed) * 1000;
    scene.time.delayedCall(Math.max(60, Math.min(2500, travelMs)), () => {
      if (!proj.active) return;
      boomAt(tx, ty, true);
    });
  });

  return warmup;
}

export function spawnLightBallPreview(scene, { x, y } = {}) {
  const fx = scene.add.sprite(x ?? 200, y ?? 200, "test-lightball-sheet", 0);
  fx.setDepth(20);
  fx.setScale(3);
  fx.anims.play("test-lightball-move", true);
  return fx;
}

export function spawnLightBallBoomPreview(scene, { x, y } = {}) {
  const fx = scene.add.sprite(x ?? 200, y ?? 200, "test-lightball-boom-sheet", 0);
  fx.setDepth(20);
  fx.setScale(3);
  fx.anims.play("test-lightball-boom", true);
  fx.once("animationcomplete-test-lightball-boom", () => fx.destroy());
  return fx;
}
