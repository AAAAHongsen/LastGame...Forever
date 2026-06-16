/** 遊戲內設定視窗覆蓋層（任意場景按 ESC 開啟）。 */
import { SettingsModal } from "../ui/SettingsModal.js";

export function isSettingsOpen(scene) {
  return Boolean(scene?.settingsModal);
}

export function openSettingsOverlay(scene, returnSceneKey) {
  if (!scene || isSettingsOpen(scene)) return;

  scene._settingsReturnKey = returnSceneKey ?? scene.scene?.key ?? "FrontPageScene";
  scene._settingsFrozen = returnSceneKey === "GameScene";

  scene.settingsModal = new SettingsModal(scene, {
    onClose: () => closeSettingsOverlay(scene),
  });

  if (!scene._settingsModalUpdateHook) {
    scene._settingsModalUpdateHook = () => {
      scene.settingsModal?.update?.();
    };
    scene.events.on("update", scene._settingsModalUpdateHook);
    scene.events.once("shutdown", () => {
      scene.events.off("update", scene._settingsModalUpdateHook);
      scene._settingsModalUpdateHook = null;
    });
  }
}

export function closeSettingsOverlay(scene) {
  if (!scene?.settingsModal) return;

  scene.settingsModal.destroy();
  scene.settingsModal = null;
  scene._settingsFrozen = false;
  scene._settingsReturnKey = null;
}
