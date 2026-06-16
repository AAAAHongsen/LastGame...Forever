/**
 * 多人選角 socket 綁定。
 * 雙方就緒時由房主／伺服器驅動倒數與 startGame。
 */

export function bindCharacterSelectNetwork(scene) {
  import("../services/socketService.js").then(({ ensureSocket }) => {
    const socket = ensureSocket();
    scene.socket = socket;

    const onRoomState = (state) => {
      if (!state || state.code !== scene.roomCode) return;
      scene.roomState = state;

      const p1 = state.players?.[1] ?? null;
      const p2 = state.players?.[2] ?? null;

      scene.playerState[1].joined = Boolean(p1);
      scene.playerState[2].joined = Boolean(p2);
      scene.playerState[1].selected = p1?.selectedSide ?? null;
      scene.playerState[2].selected = p2?.selectedSide ?? null;
      scene.playerState[1].ready = Boolean(p1?.ready);
      scene.playerState[2].ready = Boolean(p2?.ready);
      scene.refreshUI();
    };

    const onStartGame = ({ code }) => {
      if (code !== scene.roomCode) return;
      scene.hideCountdown();
      scene.scene.start("IntroVideoScene", {
        roomCode: scene.roomCode,
        playerNumber: scene.playerNumber,
        selections: {
          1: scene.playerState[1].selected,
          2: scene.playerState[2].selected,
        },
      });
    };

    const onStartCountdown = ({ code, startAt, durationMs }) => {
      if (code !== scene.roomCode) return;
      scene.startCountdown(startAt, durationMs);
    };

    const onCountdownCancelled = ({ code }) => {
      if (code !== scene.roomCode) return;
      scene.hideCountdown();
    };

    socket.on("roomState", onRoomState);
    socket.on("startCountdown", onStartCountdown);
    socket.on("countdownCancelled", onCountdownCancelled);
    socket.on("startGame", onStartGame);

    socket.emit("getRoomState", { code: scene.roomCode });

    scene.events.once("shutdown", () => {
      socket.off("roomState", onRoomState);
      socket.off("startCountdown", onStartCountdown);
      socket.off("countdownCancelled", onCountdownCancelled);
      socket.off("startGame", onStartGame);
    });
  });
}
