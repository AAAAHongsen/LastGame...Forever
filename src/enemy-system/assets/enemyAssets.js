/** 預載所有敵人／Boss／特效 spritesheet。 */
export function preloadEnemyAssets(scene) {
  const E = "Assets/enenmies";
  const FX = "Assets/effects";

  const sheets = [
    ["test-mushroom-run", `${E}/Forest-enemies/Mushroom with VFX/Mushroom-Run.png`, 80, 64],
    ["test-mushroom-idle", `${E}/Forest-enemies/Mushroom with VFX/Mushroom-Idle.png`, 64, 64],
    ["test-mushroom-attack", `${E}/Forest-enemies/Mushroom with VFX/Mushroom-Attack.png`, 80, 64],
    ["test-bat-run", `${E}/Bat-enemies/Bat with VFX/Bat-Run.png`, 64, 64],
    ["test-bat-idle", `${E}/Bat-enemies/Bat with VFX/Bat-IdleFly.png`, 64, 64],
    ["test-bat-attack", `${E}/Bat-enemies/Bat with VFX/Bat-Attack2.png`, 64, 64],
    ["test-skeleton-walk", `${E}/Skeletons-enemies/Skeleton_White/Skeleton_With_VFX/Skeleton_01_White_Walk.png`, 96, 64],
    ["test-skeleton-idle", `${E}/Skeletons-enemies/Skeleton_White/Skeleton_With_VFX/Skeleton_01_White_Idle.png`, 96, 64],
    ["test-skeleton-attack", `${E}/Skeletons-enemies/Skeleton_White/Skeleton_With_VFX/Skeleton_01_White_Attack2.png`, 96, 64],
    ["test-flyboss-fly", `${E}/fly-boss-enemies/SpriteSheet/fly_SpriteSheet.png`, 192, 112],
    ["test-flyboss-idle-ground", `${E}/fly-boss-enemies/SpriteSheet/idle_SpriteSheet.png`, 192, 112],
    ["test-flyboss-atk-ground", `${E}/fly-boss-enemies/SpriteSheet/atk_SpriteSheet.png`, 192, 112],
    ["test-gorgon-idle", `${E}/ground-boss-enemies/Gorgon_1/Idle_2.png`, 128, 128],
    ["test-gorgon-stomp", `${E}/ground-boss-enemies/Gorgon_1/Attack_1.png`, 154, 128],
    ["test-gorgon-melee", `${E}/ground-boss-enemies/Gorgon_1/Attack_2.png`, 128, 128],
    ["test-gorgon-beam", `${E}/ground-boss-enemies/Gorgon_1/Attack_3.png`, 256, 128],
    ["test-gorgon-summon", `${E}/ground-boss-enemies/Gorgon_1/Special.png`, 128, 128],
    ["test-lightball-sheet", `${FX}/lightball/lightball_spritesheet.png`, 16, 16],
    ["test-lightball-boom-sheet", `${FX}/lightball/lightballboom_spritesheet.png`, 16, 16],
    ["test-laser-sheet", `${FX}/lasershot/LaserShot.png`, 64, 64],
    ["test-fall_fireball-sheet", `${FX}/fallfireball/fall_fireball.png`, 16, 32],
    ["test-Grounded_fireball-sheet", `${FX}/Grounded_fireball/Grounded_fireball.png`, 16, 16],
    ["test-soundattack-fx", `${FX}/soundattack/soundattack_effect.png`, 16, 32],
  ];

  for (const [key, url, fw, fh] of sheets) {
    scene.load.spritesheet(key, url, { frameWidth: fw, frameHeight: fh });
  }
}
