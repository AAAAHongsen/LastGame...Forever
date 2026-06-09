import { playButtonHoverSfx } from "../services/audioService.js";

/**
 * World-space button: purple rect + label, hit box matches the rect exactly.
 * Uses a plain Rectangle (not Container/Zone) to avoid Phaser 3.90 input bugs.
 */
export function createSceneButton(scene, x, y, width, height, label, onClick) {
  const bg = scene.add.rectangle(x, y, width, height, 0x6b5163, 0.95);
  bg.setOrigin(0.5);
  bg.setStrokeStyle(4, 0x2d2030);
  bg.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains
  );
  if (bg.input) bg.input.cursor = "pointer";

  const text = scene.add
    .text(x, y, label, {
      fontFamily: "Arial",
      fontSize: "34px",
      color: "#f0e4c4",
    })
    .setOrigin(0.5);

  bg.on("pointerover", () => {
    bg.setFillStyle(0x7a5f72);
    playButtonHoverSfx(scene);
  });
  bg.on("pointerout", () => bg.setFillStyle(0x6b5163));
  bg.on("pointerup", () => onClick());

  return { bg, text };
}
