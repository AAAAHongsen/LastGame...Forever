/** 敵人投射物群組、危害區與越界清理。 */
import { igniteGroundFires } from "../effects/fireball.js";
import { GROUND_SURFACE_Y } from "../constants.js";

// 平台上火焰上移 2 格（16 px）以視覺貼合表面。
const PLATFORM_FIRE_Y_LIFT = 7;

function _landFireball(scene, proj) {
  if (!proj?.active) return;
  const onLand = proj.getData("onLand");
  const lx = proj.x;
  const bodyHalfH = (proj.body?.height ?? 24) / 2;
  // 原始著陸 y（中心 → body 底 + 小邊距）。
  const rawLy = proj.y + bodyHalfH + 8;
  const isGround = rawLy >= GROUND_SURFACE_Y;
  // 平台火焰上移；地面火焰上限為 GROUND_SURFACE_Y。
  const ly = isGround
    ? GROUND_SURFACE_Y
    : rawLy - PLATFORM_FIRE_Y_LIFT;
  if (typeof onLand === "function") onLand(lx, ly);
  else igniteGroundFires(scene, lx, undefined, ly);
  proj.destroy();
}

export function initProjectileSystem(scene) {
  if (!scene.projectileSystem) {
    scene.projectileSystem = {
      group: scene.physics.add.group({ allowGravity: false }),
      hazards: scene.physics.add.group({ allowGravity: false }),
    };
  }

  if (!scene.projectileSystem._platformCollider && scene.platformBodies) {
    // 火焰範圍佔 impactX ± FIRE_HALF_SPAN px（5 偏移：-48,-24,0,+24,+48）。
    const FIRE_HALF_SPAN = 48;

    scene.projectileSystem._platformCollider = scene.physics.add.collider(
      scene.projectileSystem.group,
      scene.platformBodies,
      // ── overlap 回呼 ─────────────────────────────────────────────
      (proj) => {
        if (!proj?.active) return;
        const k = proj.getData?.("testProjKind");
        if (k === "fallFireball") {
          _landFireball(scene, proj);
          return;
        }
        proj.destroy();
      },
      // ── process 回呼 ─────────────────────────────────────────────
      // 回傳 false 讓火球穿過 body。
      //   • platformPassThrough=true → 略過所有平台（經 updateProjectiles 著陸地面）
      //   • 火焰範圍放不下 → 略過此平台，繼續下落
      //   • 火焰範圍放得下 → 解析碰撞，在此著陸
      (proj, platform) => {
        if (proj.getData?.("testProjKind") !== "fallFireball") return true;

        // 50% 隨機穿透（略過所有平台，在地面層攔截）。
        if (proj.getData("platformPassThrough")) return false;

        // 檢查所有火焰位置是否都在此平台寬度內。
        const impactX = proj.x;
        const platHalfW = (platform.displayWidth ?? platform.width ?? 0) / 2;
        const platLeft  = platform.x - platHalfW;
        const platRight = platform.x + platHalfW;

        const fits = (impactX - FIRE_HALF_SPAN >= platLeft) &&
                     (impactX + FIRE_HALF_SPAN <= platRight);

        // 若放不下則穿過；火球繼續下落
        // 直到落在更寬平台或地面。
        return fits;
      }
    );
  }

  scene.testProjectiles = scene.projectileSystem.group;
  scene.testHazards = scene.projectileSystem.hazards;
}

export function updateProjectiles(scene) {
  const group = scene.projectileSystem?.group;
  if (!group) return;

  for (const ch of group.getChildren()) {
    if (!ch?.active) continue;
    if (ch.getData("testProjKind") !== "fallFireball") continue;
    if (!ch.body) continue;

    // 保持速度（物理群組可能重置）。
    if (ch.body.velocity.y === 0 && ch.getData("fallSpeed")) {
      ch.setVelocity(0, ch.getData("fallSpeed"));
    }

    // 穿透火球略過所有平台 collider；在地面層攔截。
    // 使用 GROUND_SURFACE_Y 減小邊距，使 _landFireball 偏移著陸正確。
    if (ch.getData("platformPassThrough") && ch.y + (ch.body?.height ?? 24) / 2 >= GROUND_SURFACE_Y) {
      _landFireball(scene, ch);
    }
  }
}
