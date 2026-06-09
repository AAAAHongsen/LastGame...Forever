import { pickGroupMember } from "../combat/collision.js";
import { damagePlayerEntry } from "../combat/damage.js";
import { getPlayers } from "../combat/targeting.js";
import { resolveEnemyAttackDamageFromEntry } from "../../combat-stats/resolveEnemyAttack.js";

export function initCombatSystem(scene) {
  if (!scene.combatSystem) scene.combatSystem = {};
  scene.combatSystem.rebuildPlayerOverlaps = () => rebuildPlayerOverlaps(scene);
  scene.rebuildTestEnemyPlayerOverlaps = scene.combatSystem.rebuildPlayerOverlaps;
}

export function rebuildPlayerOverlaps(scene) {
  const group = scene.projectileSystem?.group;
  const hazards = scene.projectileSystem?.hazards;
  if (!group || !hazards) return;

  if (scene.combatSystem._overlaps) {
    for (const o of scene.combatSystem._overlaps) o?.destroy?.();
  }
  scene.combatSystem._overlaps = [];

  for (const p of getPlayers(scene)) {
    if (!p?.sprite) continue;

    scene.combatSystem._overlaps.push(
      scene.physics.add.overlap(group, p.sprite, (o1, o2) => {
        const proj = pickGroupMember(group, o1, o2);
        const other = proj === o1 ? o2 : o1;
        if (!proj?.active || other !== p.sprite) return;
        const kind = proj.getData?.("testProjKind");
        // Look up the owning enemy entry for wave-accurate damage
        const ownerEnemy = proj.getData?.("ownerEnemy");
        const baseDmg = ownerEnemy
          ? resolveEnemyAttackDamageFromEntry(ownerEnemy)
          : null;
        if (kind === "lightBall") {
          proj.setData("suppressShards", true);
          damagePlayerEntry(scene, p, baseDmg ?? 12);
          proj.destroy();
          return;
        }
        if (kind === "lightShard") {
          damagePlayerEntry(scene, p, baseDmg != null ? Math.round(baseDmg * 0.5) : 8);
          proj.destroy();
          return;
        }
        if (kind === "soundWave") {
          damagePlayerEntry(scene, p, baseDmg ?? 6);
          proj.destroy();
          return;
        }
        damagePlayerEntry(scene, p, baseDmg ?? 8);
        proj.destroy();
      })
    );

    scene.combatSystem._overlaps.push(
      scene.physics.add.overlap(hazards, p.sprite, (o1, o2) => {
        const hz = pickGroupMember(hazards, o1, o2);
        const other = hz === o1 ? o2 : o1;
        if (!hz?.active || other !== p.sprite) return;
        const lastMap = hz.getData("lastDmgMap") ?? {};
        const pid = p.sprite;
        const t = scene.time?.now ?? 0;
        if (t - (lastMap[pid] ?? 0) < 1000) return;
        lastMap[pid] = t;
        hz.setData("lastDmgMap", lastMap);
        // fixedDamage overrides owner-enemy damage (used for fire=20/s, laser=20/s).
        const fixedDmg    = hz.getData?.("fixedDamage");
        const ownerEnemy  = hz.getData?.("ownerEnemy");
        const dmg = fixedDmg != null
          ? fixedDmg
          : (ownerEnemy ? resolveEnemyAttackDamageFromEntry(ownerEnemy) : 10);
        damagePlayerEntry(scene, p, dmg);
      })
    );
  }

  if (scene._testProjectileOverlaps) {
    scene._testProjectileOverlaps = scene.combatSystem._overlaps;
  }
}
