import { igniteGroundFires } from "../effects/fireball.js";
import { GROUND_SURFACE_Y } from "../constants.js";

// Fire on platforms is lifted 2 grid units (16 px) so it sits visually on the surface.
const PLATFORM_FIRE_Y_LIFT = 7;

function _landFireball(scene, proj) {
  if (!proj?.active) return;
  const onLand = proj.getData("onLand");
  const lx = proj.x;
  const bodyHalfH = (proj.body?.height ?? 24) / 2;
  // Raw landing y (centre → bottom of body + small margin).
  const rawLy = proj.y + bodyHalfH + 8;
  const isGround = rawLy >= GROUND_SURFACE_Y;
  // Platform fires are lifted upward; ground fires are capped at GROUND_SURFACE_Y.
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
    // Fire spread occupies impactX ± FIRE_HALF_SPAN px (5 offsets: -48,-24,0,+24,+48).
    const FIRE_HALF_SPAN = 48;

    scene.projectileSystem._platformCollider = scene.physics.add.collider(
      scene.projectileSystem.group,
      scene.platformBodies,
      // ── overlap callback ─────────────────────────────────────────────
      (proj) => {
        if (!proj?.active) return;
        const k = proj.getData?.("testProjKind");
        if (k === "fallFireball") {
          _landFireball(scene, proj);
          return;
        }
        proj.destroy();
      },
      // ── process callback ─────────────────────────────────────────────
      // Returns false to let the fireball pass through the body.
      //   • platformPassThrough=true  → skip ALL platforms (land at ground via updateProjectiles)
      //   • fire spread doesn't fit   → skip this platform, keep falling
      //   • fire spread fits          → resolve collision, land here
      (proj, platform) => {
        if (proj.getData?.("testProjKind") !== "fallFireball") return true;

        // 50 % random pass-through (skip every platform, caught at ground level).
        if (proj.getData("platformPassThrough")) return false;

        // Check whether all fire positions fit within this platform's width.
        const impactX = proj.x;
        const platHalfW = (platform.displayWidth ?? platform.width ?? 0) / 2;
        const platLeft  = platform.x - platHalfW;
        const platRight = platform.x + platHalfW;

        const fits = (impactX - FIRE_HALF_SPAN >= platLeft) &&
                     (impactX + FIRE_HALF_SPAN <= platRight);

        // If fire doesn't fit, pass through; fireball continues falling
        // until it lands on a wider platform or the ground.
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

    // Keep velocity applied (physics group may reset it).
    if (ch.body.velocity.y === 0 && ch.getData("fallSpeed")) {
      ch.setVelocity(0, ch.getData("fallSpeed"));
    }

    // Pass-through fireballs skip all platform colliders; catch them at ground level.
    // Use GROUND_SURFACE_Y minus a small margin so _landFireball's offset lands correctly.
    if (ch.getData("platformPassThrough") && ch.y + (ch.body?.height ?? 24) / 2 >= GROUND_SURFACE_Y) {
      _landFireball(scene, ch);
    }
  }
}
