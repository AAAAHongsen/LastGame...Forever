/**
 * Game Over 偵測與覆蓋層生命週期。
 * 多人重開需透過 socket 握手等待雙方玩家。
 */
import { leaveActiveRoom } from "./socketService.js";
import { closeGameOverUi, resetGameRun, returnToFrontPageFromGame } from "./gameRunReset.js";
import { GameOverModal } from "../ui/GameOverModal.js";
import { playLoseSfx } from "./audioService.js";
import { isMultiplayerScene } from "./multiplayerSession.js";

export function isGameOverOpen(scene) {
  return Boolean(scene?._gameOverOpen);
}

export function buildGameSessionFromScene(scene) {
  return {
    roomCode: scene?.roomCode ?? "",
    isTestRoom: Boolean(scene?.isTestRoom),
    playerNumber: scene?.playerNumber ?? null,
    selections: scene?.selections ?? null,
  };
}

/** @returns {boolean} 是否應觸發 Game Over */
export function shouldTriggerGameOver(scene) {
  if (!scene || isGameOverOpen(scene)) return false;
  const h = scene.hud?.health;
  if (!h) return false;
  return (h.p1 ?? 1) <= 0 || (h.p2 ?? 1) <= 0;
}

function handleGameOverEnd(scene) {
  leaveActiveRoom();
  closeGameOverUi(scene);

  // 避免從 GameScene 呼叫 scene.start() — Phaser 3.90 InputPlugin 關閉時會崩潰。
  // 改為休眠 GameScene、啟動 FrontPage，再從 FrontPage.create 停止 GameScene。
  setTimeout(() => {
    returnToFrontPageFromGame(scene);
  }, 100);
}

/** 等待雙方玩家都按下 Restart 後才重置本局。 */
function bindMultiplayerRestartHandshake(scene) {
  if (scene._restartHandshakeBound) return;

  scene._restartHandshakeBound = true;
  const socket = scene.socket;

  const onStatus = (msg) => {
    const me = scene.playerNumber;
    if (!(me === 1 || me === 2)) return;
    const meReady = Boolean(msg?.ready?.[me]);
    if (meReady) {
      scene.gameOverModal?.showWaitingRestart?.();
    }
  };

  const onGo = () => {
    closeGameOverUi(scene);
    resetGameRun(scene);
    scene._restartHandshakeBound = false;
    socket.off("gameOverRestartStatus", onStatus);
    socket.off("gameOverRestartGo", onGo);
  };

  socket.on("gameOverRestartStatus", onStatus);
  socket.on("gameOverRestartGo", onGo);
}

function handleGameOverRestart(scene) {
  if (!isMultiplayerScene(scene) || !scene?.socket) {
    closeGameOverUi(scene);
    resetGameRun(scene);
    return;
  }

  bindMultiplayerRestartHandshake(scene);
  scene.gameOverModal?.showWaitingRestart?.();
  scene.socket.emit("gameOverRestartReady");
}

/** 在當前遊戲畫面上顯示 Game Over UI。 */
export function openGameOverOverlay(scene) {
  if (!scene || isGameOverOpen(scene)) return;

  scene._gameOverOpen = true;
  scene._gameOverFrozen = true;

  playLoseSfx(scene);

  scene.gameOverModal = new GameOverModal(scene, {
    onEnd: () => handleGameOverEnd(scene),
    onRestart: () => handleGameOverRestart(scene),
  });
}

export function checkAndOpenGameOver(scene) {
  if (!shouldTriggerGameOver(scene)) return false;
  openGameOverOverlay(scene);
  return true;
}
