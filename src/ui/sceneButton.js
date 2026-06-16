import { playButtonHoverSfx } from "../services/audioService.js";

/**
 * 世界座標按鈕：紫色矩形 + 標籤，點擊區與矩形完全一致。
 * 使用 plain Rectangle（非 Container/Zone）以避開 Phaser 3.90 輸入 bug。
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
