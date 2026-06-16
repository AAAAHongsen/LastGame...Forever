/** 玩家攻擊判定 — 戰士近戰幀與法師火球碰撞。 */
import { arcadeBodiesOverlap, pickGroupMember } from "../enemy-system/combat/collision.js";
import { findEnemyBySprite } from "../enemy-system/combat/targeting.js";
import { getPlayerClassBaseAttack } from "./config/playerStats.js";
import { damageEnemyEntry } from "./damageEnemy.js";
import { resolvePlayerAttackDamage } from "./resolvePlayerAttack.js";

const SOLDIER_ATTACK_ANIM = "soldier-attack01";
const SOLDIER_HIT_FRAMES = [2, 3, 4];


function getSoldierAttackHitbox(entry) {
  const sprite = entry?.sprite;
  const body = sprite?.body;
  if (!body) return null;

  const visual = entry?.visual ?? sprite;
  const facingLeft = Boolean(visual?.flipX);
  const fd = facingLeft ? -1 : 1;
  const w = 36;
  const h = 28;
  const cy = body.top + (body.height - h) * 0.35;
  const cx = fd > 0 ? body.right : body.left - w;
  return new Phaser.Geom.Rectangle(cx, cy, w, h);
}

function soldierHitboxOverlapsEnemy(entry, enemySprite) {
  const hit = getSoldierAttackHitbox(entry);
  const hurt = enemySprite?.body;
  if (!hit || !hurt) return false;
  return Phaser.Geom.Rectangle.Overlaps(
    hit,
    new Phaser.Geom.Rectangle(hurt.x, hurt.y, hurt.width, hurt.height)
  );
}

function resolveFireballDamage(fb, owner, scene) {
  const stored = fb?.getData?.("damage");
  if (Number.isFinite(stored) && stored > 0) return Math.round(stored);
  if (owner) return resolvePlayerAttackDamage(owner, scene);
  return getPlayerClassBaseAttack("mage");
}

function getEnemyBodyCenterX(sprite) {
  const body = sprite?.body;
  if (body) return body.x + body.width * 0.5;
  return sprite?.x ?? 0;
}

/**
 * 接觸即傷害；火球直飛直到越過敵人水平中心（紅線）後銷毀。
 */
function registerFireballHit(scene, fb, enemy) {
  const owner = fb.getData?.("owner") ?? scene.getControlledEntry?.() ?? null;
  const damage = resolveFireballDamage(fb, owner, scene);

  const movingRight = (fb.body?.velocity?.x ?? 0) >= 0;
  fb.setData("hitConsumed", true);
  fb.setData("impactTravel", true);
  fb.setData("impactCenterX", getEnemyBodyCenterX(enemy.sprite));
  fb.setData("impactMovingRight", movingRight);

  damageEnemyEntry(scene, enemy, damage, { source: "mage-fireball", player: owner });
}

/** 命中後：火球直飛至越過敵人中心 X 再銷毀。 */
function updateFireballImpactTravel(scene) {
  for (const fb of scene.fireballs?.getChildren?.() ?? []) {
    if (!fb?.active || !fb.getData?.("impactTravel")) continue;

    const centerX = fb.getData("impactCenterX");
    const movingRight = fb.getData("impactMovingRight");
    const passed = movingRight ? fb.x >= centerX : fb.x <= centerX;
    if (passed) fb.destroy();
  }
}

function tryRegisterFireballHit(scene, fb, enemy) {
  if (!fb?.active || fb.getData?.("hitConsumed")) return false;
  if (!enemy?.sprite?.active || enemy.dead || enemy.dying) return false;
  if (!arcadeBodiesOverlap(fb, enemy.sprite)) return false;

  registerFireballHit(scene, fb, enemy);
  return true;
}

function updateFireballHits(scene) {
  updateFireballImpactTravel(scene);

  const fireballs = scene.fireballs?.getChildren?.() ?? [];
  if (!fireballs.length) return;

  const enemies = scene.enemyManager?.enemies ?? [];
  if (!enemies.length) return;

  for (const fb of fireballs) {
    if (!fb?.active || fb.getData?.("hitConsumed")) continue;

    for (const enemy of enemies) {
      if (enemy.dead || enemy.dying || enemy.type?.startsWith?.("fx-")) continue;
      if (tryRegisterFireballHit(scene, fb, enemy)) break;
    }
  }
}

function trySoldierMeleeHits(scene, entry) {
  if (!entry?.attackHitEnemies) entry.attackHitEnemies = new Set();
  const damage = resolvePlayerAttackDamage(entry, scene);

  for (const enemy of scene.enemyManager?.enemies ?? []) {
    if (enemy.dead || enemy.dying || enemy.type?.startsWith?.("fx-")) continue;
    if (!enemy.sprite?.active) continue;
    if (entry.attackHitEnemies.has(enemy)) continue;
    if (!soldierHitboxOverlapsEnemy(entry, enemy.sprite)) continue;

    entry.attackHitEnemies.add(enemy);
    damageEnemyEntry(scene, enemy, damage, { source: "soldier-melee", player: entry });
  }
}

export function onPlayerAttackStarted(scene, entry) {
  if (!entry || entry.type !== "soldier") return;

  entry.attackHitEnemies = new Set();
  const visual = entry.visual ?? entry.sprite;
  if (!visual?.anims) return;

  const onFrame = (_anim, frame) => {
    if (visual.anims.currentAnim?.key !== SOLDIER_ATTACK_ANIM) return;
    if (!SOLDIER_HIT_FRAMES.includes(frame.index)) return;
    trySoldierMeleeHits(scene, entry);
  };

  visual.on("animationupdate", onFrame);
  visual.once(`animationcomplete-${SOLDIER_ATTACK_ANIM}`, () => {
    visual.off("animationupdate", onFrame);
    entry.attackHitEnemies = null;
  });
}

function bindFireballEnemyOverlap(scene) {
  const fireballs = scene.fireballs;
  const enemyGroup = scene.enemyPhysicsGroup;
  if (!fireballs || !enemyGroup) return false;

  const collider = scene.physics.add.overlap(fireballs, enemyGroup, (a, b) => {
    const fb = pickGroupMember(fireballs, a, b);
    const enemySprite = pickGroupMember(enemyGroup, a, b);
    if (!fb?.active || !enemySprite?.active) return;

    const enemy = findEnemyBySprite(scene, enemySprite);
    if (!enemy) return;

    tryRegisterFireballHit(scene, fb, enemy);
  });

  if (scene.playerCombat) {
    scene.playerCombat._fireballOverlapCollider = collider;
  }
  return true;
}

export function initPlayerCombat(scene) {
  if (!scene.playerCombat) scene.playerCombat = {};

  if (!scene.playerCombat._fireballOverlap && scene.fireballs && scene.enemyPhysicsGroup) {
    scene.playerCombat._fireballOverlap = bindFireballEnemyOverlap(scene);
  }
  scene.playerCombat.initialized = true;
}

export function updatePlayerCombat(scene) {
  updateFireballHits(scene);

  for (const entry of scene.players ?? []) {
    if (entry.type !== "soldier" || !entry.isAttacking) continue;
    const anim = entry.visual?.anims?.currentAnim?.key;
    if (anim !== SOLDIER_ATTACK_ANIM) continue;
    const frame = entry.visual.anims.currentFrame?.index;
    if (SOLDIER_HIT_FRAMES.includes(frame)) {
      trySoldierMeleeHits(scene, entry);
    }
  }
}
