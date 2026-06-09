import { leaveActiveRoom } from "./socketService.js";
import { closeGameOverUi, resetGameRun, returnToFrontPageFromGame } from "./gameRunReset.js";
import { GameOverModal } from "../ui/GameOverModal.js";

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

/** @returns {boolean} */
export function shouldTriggerGameOver(scene) {
  if (!scene || isGameOverOpen(scene)) return false;
  const h = scene.hud?.health;
  if (!h) return false;
  return (h.p1 ?? 1) <= 0 || (h.p2 ?? 1) <= 0;
}

function handleGameOverEnd(scene) {
  leaveActiveRoom();
  closeGameOverUi(scene);

  // Avoid scene.start() from GameScene — Phaser 3.90 InputPlugin crashes on shutdown.
  // Sleep GameScene, launch FrontPage, then stop GameScene from FrontPage.create.
  setTimeout(() => {
    returnToFrontPageFromGame(scene);
  }, 100);
}

function handleGameOverRestart(scene) {
  const isMultiplayer = Boolean(scene?.roomCode && (scene?.playerNumber === 1 || scene?.playerNumber === 2));
  if (!isMultiplayer || !scene?.socket) {
    closeGameOverUi(scene);
    resetGameRun(scene);
    return;
  }

  // Multiplayer: wait until both players press Restart.
  if (!scene._restartHandshakeBound) {
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
  scene.gameOverModal?.showWaitingRestart?.();
  scene.socket.emit("gameOverRestartReady");
}

/** Show in-scene Game Over UI over the current game view. */
export function openGameOverOverlay(scene) {
  if (!scene || isGameOverOpen(scene)) return;

  scene._gameOverOpen = true;
  scene._gameOverFrozen = true;

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
