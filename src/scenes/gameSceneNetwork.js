/**
 * 多人玩家同步 — 變換廣播與遠端 action 處理。
 */
import { ensureSocket } from "../services/socketService.js";
import { isMultiplayerScene } from "../services/multiplayerSession.js";

export function setupMultiplayerPlayerSync(scene) {
  if (!isMultiplayerScene(scene)) return;

  const socket = ensureSocket();
  scene.socket = socket;

  scene.remoteTarget = null;
  scene.remoteLerp = 0.35;

  const onTransform = (msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.playerNumber === scene.playerNumber) return;
    if (!scene.remoteEntry) return;
    scene.remoteTarget = {
      x: Number(msg.x ?? scene.remoteEntry.sprite.x),
      y: Number(msg.y ?? scene.remoteEntry.sprite.y),
      vx: Number(msg.vx ?? 0),
      vy: Number(msg.vy ?? 0),
      flipX: Boolean(msg.flipX),
      animKey: typeof msg.animKey === "string" ? msg.animKey : null,
    };
  };

  const onPlayerAction = (msg) => {
    scene.handleRemotePlayerAction(msg);
  };
  const onPlayerResource = (msg) => {
    scene.handleRemotePlayerResource(msg);
  };
  const onLootCollected = (msg) => {
    scene.handleRemoteLootCollected(msg);
  };

  socket.on("playerTransform", onTransform);
  socket.on("playerAction", onPlayerAction);
  socket.on("playerResource", onPlayerResource);
  socket.on("waveLootCollected", onLootCollected);

  scene.transformTimer = scene.time.addEvent({
    delay: 50,
    loop: true,
    callback: () => {
      const entry = scene.getControlledEntry();
      const s = entry?.sprite;
      const v = entry?.visual ?? entry?.sprite;
      if (!s || !s.body) return;
      const animKey = v.anims?.currentAnim?.key ?? null;
      socket.emit("playerTransform", {
        x: s.x,
        y: s.y,
        vx: s.body.velocity.x,
        vy: s.body.velocity.y,
        flipX: Boolean(v.flipX),
        animKey,
      });
    },
  });

  scene.events.once("shutdown", () => {
    socket.off("playerTransform", onTransform);
    socket.off("playerAction", onPlayerAction);
    socket.off("playerResource", onPlayerResource);
    if (scene.transformTimer) {
      scene.transformTimer.remove(false);
      scene.transformTimer = null;
    }
  });
}
