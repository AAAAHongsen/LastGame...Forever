import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";

let socket = null;
const SERVER_URL_STORAGE_KEY = "lgf_server_url";

export function getSocket() {
  return socket;
}

function normalizeServerUrl(url) {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  // Remove trailing slash to avoid accidental double slash in path resolution.
  return trimmed.replace(/\/+$/, "");
}

function resolveServerUrl() {
  if (typeof window === "undefined") return "";
  const fromGlobal = normalizeServerUrl(window.__LGF_SERVER_URL ?? "");
  if (fromGlobal) return fromGlobal;

  // Convenient one-off override: ?server=https://xxxx.ngrok-free.app
  try {
    const qs = new URLSearchParams(window.location.search);
    const fromQuery = normalizeServerUrl(qs.get("server") ?? "");
    if (fromQuery) {
      window.localStorage?.setItem?.(SERVER_URL_STORAGE_KEY, fromQuery);
      return fromQuery;
    }
  } catch {
    /* ignore */
  }

  const fromStorage = normalizeServerUrl(window.localStorage?.getItem?.(SERVER_URL_STORAGE_KEY) ?? "");
  if (fromStorage) return fromStorage;

  // Empty string = same-origin (recommended when opening game from server URL directly).
  return "";
}

export function setSocketServerUrl(url) {
  if (typeof window === "undefined") return;
  const normalized = normalizeServerUrl(url);
  if (!normalized) {
    window.localStorage?.removeItem?.(SERVER_URL_STORAGE_KEY);
    return;
  }
  window.localStorage?.setItem?.(SERVER_URL_STORAGE_KEY, normalized);
}

export function getSocketServerUrl() {
  return resolveServerUrl();
}

export function ensureSocket() {
  if (socket) return socket;
  const serverUrl = resolveServerUrl();
  socket = io(serverUrl || undefined, {
    // Allow polling fallback for restrictive networks; websocket still preferred.
    transports: ["websocket", "polling"],
    upgrade: true,
    reconnection: true,
    reconnectionDelayMax: 800,
  });
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}

/** Leave the current multiplayer room without tearing down the socket connection. */
export function leaveActiveRoom() {
  const s = getSocket();
  if (!s) return;

  const emitLeave = () => {
    if (s.connected) s.emit("leaveRoom");
  };

  if (s.connected) {
    emitLeave();
    return;
  }

  s.once("connect", emitLeave);
}

export function installRoomLifecycleHooks() {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeunload", () => {
    const s = getSocket();
    if (s?.connected) s.emit("leaveRoom");
  });
}

