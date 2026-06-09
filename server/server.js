import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const app = express();
const server = http.createServer(app);
const corsOrigin = process.env.CORS_ORIGIN?.trim() || "*";
const io = new Server(server, {
  cors: { origin: corsOrigin },
});

app.use(express.static(projectRoot));

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRoomCode(existing) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    let code = "";
    for (let i = 0; i < 5; i += 1) code += String(randomInt(0, 9));
    if (!existing.has(code)) return code;
  }
  // Fallback (extremely unlikely): time-based last 5 digits
  const fallback = String(Date.now()).slice(-5);
  return existing.has(fallback) ? "00000" : fallback;
}

/**
 * rooms: code -> {
 *   createdAt: number,
 *   players: Map<socketId, { playerNumber: 1|2, selectedSide: "left"|"right"|null, ready: boolean }>,
 *   countdown: { startAt: number, timeout: NodeJS.Timeout } | null
 * }
 */
const rooms = new Map();

function getRoomPublicState(code) {
  const room = rooms.get(code);
  if (!room) return null;
  const byNum = { 1: null, 2: null };
  for (const p of room.players.values()) {
    byNum[p.playerNumber] = { selectedSide: p.selectedSide, ready: p.ready };
  }
  return {
    code,
    players: byNum,
  };
}

function broadcastRoomState(code) {
  const state = getRoomPublicState(code);
  if (!state) return;
  io.to(code).emit("roomState", state);
}

function cleanupRoomIfEmpty(code) {
  const room = rooms.get(code);
  if (!room) return;
  if (room.countdown?.timeout) clearTimeout(room.countdown.timeout);
  room.waveTutorialReady = {};
  if (room.players.size === 0) rooms.delete(code);
}

function pruneDisconnectedPlayers(room) {
  for (const socketId of [...room.players.keys()]) {
    if (!io.sockets.sockets.has(socketId)) {
      room.players.delete(socketId);
    }
  }
}

function removePlayerFromRoom(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;

  const playerNumber = socket.data.playerNumber;
  room.players.delete(socket.id);
  socket.leave(code);
  socket.data.roomCode = null;
  socket.data.playerNumber = null;

  cancelCountdown(code);
  if (playerNumber != null) {
    socket.to(code).emit("playerLeft", { playerNumber });
  }
  broadcastRoomState(code);
  cleanupRoomIfEmpty(code);
}

function cancelCountdown(code) {
  const room = rooms.get(code);
  if (!room?.countdown) return;
  if (room.countdown.timeout) clearTimeout(room.countdown.timeout);
  room.countdown = null;
  io.to(code).emit("countdownCancelled", { code });
}

function startCountdownIfNeeded(code) {
  const room = rooms.get(code);
  if (!room || room.countdown) return;
  const startAt = Date.now() + 5000;
  const timeout = setTimeout(() => {
    // If someone unreadied during the countdown, don't start.
    const state = getRoomPublicState(code);
    const allReady = Boolean(state?.players?.[1]?.ready && state?.players?.[2]?.ready);
    if (!allReady) {
      cancelCountdown(code);
      return;
    }
    io.to(code).emit("startGame", { code });
    room.countdown = null;
  }, 5000);
  room.countdown = { startAt, timeout };
  io.to(code).emit("startCountdown", { code, startAt, durationMs: 5000 });
}

io.on("connection", (socket) => {
  socket.data.roomCode = null;
  socket.data.playerNumber = null;

  socket.on("createRoom", () => {
    removePlayerFromRoom(socket);
    const code = generateRoomCode(rooms);
    const room = {
      createdAt: Date.now(),
      players: new Map(),
      countdown: null,
      waveTutorialReady: {},
    };
    rooms.set(code, room);

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerNumber = 1;
    room.players.set(socket.id, { playerNumber: 1, selectedSide: null, ready: false });

    socket.emit("roomJoined", { code, playerNumber: 1 });
    broadcastRoomState(code);
  });

  socket.on("joinRoom", ({ code } = {}) => {
    if (typeof code !== "string" || !code.trim()) {
      socket.emit("joinRejected", { reason: "Invalid code" });
      return;
    }

    const normalized = code.trim();
    const normalized5Early =
      normalized === "1" ? "00001" : normalized.padStart(5, "0");

    if (socket.data.roomCode && socket.data.roomCode !== normalized5Early) {
      removePlayerFromRoom(socket);
    }

    // Allow single-player "test room" join with code "1".
    // If it doesn't exist, create it as a real room so the rest of the flow works.
    if (normalized === "1" && !rooms.has("00001")) {
      const room = {
        createdAt: Date.now(),
        players: new Map(),
        countdown: null,
        waveTutorialReady: {},
      };
      rooms.set("00001", room);
    }

    const normalized5 =
      normalized === "1" ? "00001" : normalized.padStart(5, "0");

    if (!/^\d{5}$/.test(normalized5)) {
      socket.emit("joinRejected", { reason: "Invalid code" });
      return;
    }

    const room = rooms.get(normalized5);
    if (!room) {
      socket.emit("joinRejected", { reason: "Room not found" });
      return;
    }

    pruneDisconnectedPlayers(room);

    // Test room is single-client debug: new join replaces stale sessions (e.g. after refresh).
    if (normalized5 === "00001") {
      for (const socketId of [...room.players.keys()]) {
        const existing = io.sockets.sockets.get(socketId);
        if (existing) removePlayerFromRoom(existing);
      }
    }

    const taken = new Set([...room.players.values()].map((p) => p.playerNumber));
    if (taken.has(1) && taken.has(2)) {
      socket.emit("joinRejected", { reason: "Room is full" });
      return;
    }

    const playerNumber = taken.has(1) ? 2 : 1;
    socket.join(normalized5);
    socket.data.roomCode = normalized5;
    socket.data.playerNumber = playerNumber;
    room.players.set(socket.id, { playerNumber, selectedSide: null, ready: false });

    socket.emit("roomJoined", { code: normalized5, playerNumber });
    socket.to(normalized5).emit("playerJoined", { playerNumber });
    broadcastRoomState(normalized5);
  });

  socket.on("getRoomState", ({ code } = {}) => {
    const roomCode = typeof code === "string" ? code.trim() : "";
    if (!roomCode) return;
    const state = getRoomPublicState(roomCode);
    if (!state) return;
    socket.emit("roomState", state);
  });

  socket.on("setSelection", ({ selectedSide } = {}) => {
    const code = socket.data.roomCode;
    const room = code ? rooms.get(code) : null;
    if (!room) return;
    const p = room.players.get(socket.id);
    if (!p) return;
    if (selectedSide !== "left" && selectedSide !== "right" && selectedSide !== null) return;
    p.selectedSide = selectedSide;
    p.ready = false;
    cancelCountdown(code);
    broadcastRoomState(code);
  });

  socket.on("setReady", ({ ready } = {}) => {
    const code = socket.data.roomCode;
    const room = code ? rooms.get(code) : null;
    if (!room) return;
    const p = room.players.get(socket.id);
    if (!p) return;

    const isReady = Boolean(ready);
    if (isReady && !p.selectedSide) return;
    p.ready = isReady;
    broadcastRoomState(code);

    const state = getRoomPublicState(code);
    const allReady = Boolean(state?.players?.[1]?.ready && state?.players?.[2]?.ready);
    if (allReady) startCountdownIfNeeded(code);
    else cancelCountdown(code);
  });

  // Very low-latency LAN sync: each client publishes its own transform frequently.
  socket.on("playerTransform", (payload) => {
    const code = socket.data.roomCode;
    if (!code) return;
    const pn = socket.data.playerNumber;
    if (pn !== 1 && pn !== 2) return;
    socket.to(code).emit("playerTransform", { playerNumber: pn, ...payload });
  });

  // One-shot gameplay events (attacks / specials) must be synced separately
  // from transform snapshots so effects spawn on both clients at the same time.
  socket.on("playerAction", (payload) => {
    const code = socket.data.roomCode;
    if (!code) return;
    const pn = socket.data.playerNumber;
    if (pn !== 1 && pn !== 2) return;
    socket.to(code).emit("playerAction", { playerNumber: pn, ...payload });
  });

  // HUD resources (energy/orbs) sync from action owner to partner.
  socket.on("playerResource", (payload) => {
    const code = socket.data.roomCode;
    if (!code) return;
    const pn = socket.data.playerNumber;
    if (pn !== 1 && pn !== 2) return;
    socket.to(code).emit("playerResource", { playerNumber: pn, ...payload });
  });

  // GameOver restart handshake: both players must confirm restart.
  socket.on("gameOverRestartReady", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const pn = socket.data.playerNumber;
    if (pn !== 1 && pn !== 2) return;
    const room = rooms.get(code);
    if (!room) return;
    if (!room.gameOverRestartReady) room.gameOverRestartReady = { 1: false, 2: false };
    room.gameOverRestartReady[pn] = true;

    io.to(code).emit("gameOverRestartStatus", { ready: room.gameOverRestartReady });
    if (room.gameOverRestartReady[1] && room.gameOverRestartReady[2]) {
      io.to(code).emit("gameOverRestartGo");
      room.gameOverRestartReady = { 1: false, 2: false };
    }
  });

  // ─── Wave sync events ────────────────────────────────────────────────
  // Host (player1) sends these; server relays to the other client.
  const WAVE_RELAY_HOST_ONLY = [
    "waveState",
    "waveSpawn",
    "waveEnemyDamage",
    "waveEnemyDeath",
    "waveEnemyDieFx",
    "waveBossSummon",
    "wavePlayerStats",
    "waveSyncHp",
    "waveLootSpawn",
  ];
  for (const evt of WAVE_RELAY_HOST_ONLY) {
    socket.on(evt, (payload) => {
      const code = socket.data.roomCode;
      if (!code) return;
      if (socket.data.playerNumber !== 1) return; // only host relays
      const room = rooms.get(code);
      // Reset tutorial-ready state when a new tutorial wave starts.
      if (evt === "waveState" && payload?.state === "tutorial" && Number.isFinite(payload?.wave)) {
        const w = Number(payload.wave);
        if (room) room.waveTutorialReady[w] = { 1: false, 2: false };
        io.to(code).emit("waveTutorialStatus", {
          wave: w,
          ready: room?.waveTutorialReady?.[w] ?? { 1: false, 2: false },
        });
      }
      socket.to(code).emit(evt, payload);
    });
  }

  // waveLootCollected: either player notifies the other that a ball was collected.
  // This lets the host suppress its duplicate grant for the same ball.
  socket.on("waveLootCollected", (payload) => {
    const code = socket.data.roomCode;
    if (!code) return;
    const pn = socket.data.playerNumber;
    if (pn !== 1 && pn !== 2) return;
    socket.to(code).emit("waveLootCollected", { playerNumber: pn, ...payload });
  });

  // waveTutorialReady: server stores status and broadcasts authoritative map.
  socket.on("waveTutorialReady", ({ wave } = {}) => {
    const code = socket.data.roomCode;
    if (!code) return;
    const pn = socket.data.playerNumber;
    if (pn !== 1 && pn !== 2) return;
    const w = Number(wave);
    if (!Number.isFinite(w) || w <= 0) return;

    const room = rooms.get(code);
    if (!room) return;
    if (!room.waveTutorialReady) room.waveTutorialReady = {};
    if (!room.waveTutorialReady[w]) room.waveTutorialReady[w] = { 1: false, 2: false };
    room.waveTutorialReady[w][pn] = true;

    io.to(code).emit("waveTutorialStatus", {
      wave: w,
      ready: room.waveTutorialReady[w],
    });
  });

  socket.on("leaveRoom", () => {
    removePlayerFromRoom(socket);
  });

  socket.on("disconnect", () => {
    removePlayerFromRoom(socket);
  });
});

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT} (CORS: ${corsOrigin})`);
});

