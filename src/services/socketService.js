/** Socket.IO 用戶端單例 — 房間生命週期與伺服器 URL 持久化。 */
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
  // 移除尾端斜線，避免路徑解析時意外出現雙斜線。
  return trimmed.replace(/\/+$/, "");
}

function resolveServerUrl() {
  if (typeof window === "undefined") return "";
  const fromGlobal = normalizeServerUrl(window.__LGF_SERVER_URL ?? "");
  if (fromGlobal) return fromGlobal;

  // 方便的一次性覆寫：?server=https://xxxx.ngrok-free.app
  try {
    const qs = new URLSearchParams(window.location.search);
    const fromQuery = normalizeServerUrl(qs.get("server") ?? "");
    if (fromQuery) {
      window.localStorage?.setItem?.(SERVER_URL_STORAGE_KEY, fromQuery);
      return fromQuery;
    }
  } catch {
    /* 略過 */
  }

  const fromStorage = normalizeServerUrl(window.localStorage?.getItem?.(SERVER_URL_STORAGE_KEY) ?? "");
  if (fromStorage) return fromStorage;

  // 空字串 = 同源（直接從伺服器 URL 開啟遊戲時建議使用）。
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
    // 允許 polling 後援以適應受限網路；仍優先使用 websocket。
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

/** 離開目前多人房間，但不中斷 socket 連線。 */
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

