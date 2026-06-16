# Last Game Foever

A 2-player co-op wave-survival game (Phaser 3 + Node.js + Socket.IO).
One player is the **Warrior**, the other is the **Mage**. Survive every wave together.

**Languages:** [English](#english) · [中文](#中文)

---

## English

### 1. Prerequisites
- Install **Node.js (LTS)** — this includes `node` and `npm`.

### 2. Install
```bash
cd "Last Game Foever"
npm install
```

### 3. Run the server
```bash
npm run dev
```
The server listens on port **3000** and serves the game. You should see:
```
Server listening on http://0.0.0.0:3000 (CORS: *)
```

### 4. Controls
- **Move**: `A` / `D`
- **Jump**: `W` or `Space`
- **Attack**: Left mouse click
- **Ultimate skill**: Right mouse click (Warrior: Berserk · Mage: Heal)

### 5. How to play together
1. Player 1 clicks **Play** to create a room — a 5-digit **room code** appears on the character-select screen.
2. Player 2 clicks **Join** and enters that room code.
3. Each player picks a side (Warrior / Mage) and presses **E** to Ready.
4. When both are ready, the game starts automatically.

---

### 6. Connecting across different networks

The host runs `npm run dev`; everyone else connects to the host's server. Pick the scenario that matches your setup.

#### A) Same computer (local testing)
Open the game in your browser at:
```
http://localhost:3000
```
You can open a second tab/window for the other player.

#### B) Same network (same Wi-Fi / router / LAN)
1. On the **host** machine, find its local IP address:
   - **macOS**: `ipconfig getifaddr en0` (Wi-Fi) — e.g. `192.168.1.23`
   - **Windows**: run `ipconfig`, look for the **IPv4 Address**
   - **Linux**: `hostname -I`
2. Make sure the host's firewall allows incoming connections on port **3000**.
3. Every player opens the game using the host's IP:
   ```
   http://<HOST_LAN_IP>:3000
   ```
   Example: `http://192.168.1.23:3000`
4. Create / Join the room as in section 5.

> Because the game is served from that same address, networking works automatically (same-origin) — no extra config needed.

#### C) Different networks (over the internet)
Players who are **not** on the same Wi-Fi need the host's server exposed to the internet. The easiest way is a tunnel such as **Cloudflare Tunnel (`cloudflared`)** or **ngrok**.

**Option 1 — Cloudflare Tunnel / `cloudflared` (recommended, free, no signup for quick tunnels):**
1. Install `cloudflared`:
   - **macOS**: `brew install cloudflared`
   - **Windows**: `winget install --id Cloudflare.cloudflared` (or download the `.exe` from Cloudflare)
   - **Linux**: download the binary from the [cloudflared releases](https://github.com/cloudflare/cloudflared/releases)
2. Start the game server: `npm run dev`
3. In another terminal, open a quick tunnel to port 3000:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
4. `cloudflared` prints a public URL, e.g.
   ```
   https://random-words-1234.trycloudflare.com
   ```
5. Share that URL with the other players. Everyone simply opens it in the browser:
   ```
   https://random-words-1234.trycloudflare.com
   ```
   The game connects automatically (same-origin) — Player 1 creates the room, Player 2 joins with the code.

> The quick-tunnel URL is temporary and changes every time you restart `cloudflared`; just re-share the new one. Keep the `cloudflared` terminal open while playing.

**Option 2 — ngrok (alternative, no router setup):**
1. Install [ngrok](https://ngrok.com/) and sign in once (`ngrok config add-authtoken <token>`).
2. Start the game server: `npm run dev`
3. In another terminal, expose port 3000:
   ```bash
   ngrok http 3000
   ```
4. ngrok prints a public URL, e.g. `https://abcd-1234.ngrok-free.app`.
5. Share that URL with the other players. Everyone simply opens:
   ```
   https://abcd-1234.ngrok-free.app
   ```
   The game connects automatically (same-origin).

**Option 3 — point the client at a separate server URL:**
If you open the game from one place but the server is somewhere else, append `?server=` to the URL:
```
http://localhost:3000/?server=https://random-words-1234.trycloudflare.com
```
The value is saved in the browser, so you only need it once.

**Option 4 — router port forwarding (advanced):**
1. Forward external port **3000** to the host machine's LAN IP on your router.
2. Find the host's public IP (e.g. search "what is my IP").
3. Players open `http://<PUBLIC_IP>:3000`.
> Port forwarding exposes your machine to the internet — only use it on a trusted network and turn it off when done.

### 7. Configuration (optional)
The server reads these environment variables:
- `PORT` — server port (default `3000`)
- `HOST` — bind address (default `0.0.0.0`, i.e. all interfaces)
- `CORS_ORIGIN` — allowed origin (default `*`)

Example:
```bash
PORT=4000 npm run dev
```

### 8. Troubleshooting
- **"Room not found"**: the joining player must connect to the **same server** as the host (same LAN IP / same ngrok URL).
- **Can't connect over LAN**: the host's firewall is probably blocking port 3000 — allow it.
- **Tunnel URL changed**: free `cloudflared` quick-tunnel and ngrok URLs change on every restart; re-share the new URL.
- **Reset a saved server URL**: open the game with `?server=` empty, or clear the browser's local storage.

---

## 中文

一款雙人合作的波次生存遊戲（Phaser 3 + Node.js + Socket.IO）。
一位玩家是**戰士**，另一位是**法師**，攜手撐過每一波敵人。

**語言：** [English](#english) · [中文](#中文)

### 1. 事前準備
- 安裝 **Node.js（LTS 版）**，會一併附帶 `node` 與 `npm`。

### 2. 安裝相依套件
```bash
cd "Last Game Foever"
npm install
```

### 3. 啟動伺服器
```bash
npm run dev
```
伺服器會在 **3000** 連接埠上提供遊戲，你應該會看到：
```
Server listening on http://0.0.0.0:3000 (CORS: *)
```

### 4. 操作方式
- **移動**：`A` / `D`
- **跳躍**：`W` 或 `空白鍵`
- **攻擊**：滑鼠左鍵
- **大招**：滑鼠右鍵（戰士：狂暴 · 法師：治療）

### 5. 一起遊玩的步驟
1. 玩家 1 點 **Play** 建立房間，角色選擇畫面會顯示 5 位數的**房間代碼**。
2. 玩家 2 點 **Join** 並輸入該房間代碼。
3. 兩位玩家各自選邊（戰士 / 法師），按 **E** 準備。
4. 雙方都準備好後，遊戲會自動開始。

---

### 6. 在不同網路環境下連線

由主機端執行 `npm run dev`，其他人連到主機的伺服器。請依你的情況選擇對應方式。

#### A）同一台電腦（本機測試）
在瀏覽器開啟：
```
http://localhost:3000
```
可以再開第二個分頁／視窗給另一位玩家。

#### B）同一個網路（同一個 Wi-Fi／路由器／區域網路）
1. 在**主機**電腦上查出它的區域網路 IP：
   - **macOS**：`ipconfig getifaddr en0`（Wi-Fi）——例如 `192.168.1.23`
   - **Windows**：執行 `ipconfig`，找 **IPv4 位址**
   - **Linux**：`hostname -I`
2. 確認主機的防火牆允許 **3000** 連接埠的連入連線。
3. 每位玩家用主機的 IP 開啟遊戲：
   ```
   http://<主機區網IP>:3000
   ```
   例如：`http://192.168.1.23:3000`
4. 依第 5 節建立／加入房間。

> 因為遊戲就是從這個位址提供的，連線會自動運作（同源），不需要額外設定。

#### C）不同網路（透過網際網路）
若玩家**不在**同一個 Wi-Fi，就需要把主機的伺服器公開到網際網路。最簡單的方式是使用 **Cloudflare Tunnel（`cloudflared`）** 或 **ngrok** 這類通道工具。

**做法 1 — Cloudflare Tunnel / `cloudflared`（推薦，免費，快速通道免註冊）：**
1. 安裝 `cloudflared`：
   - **macOS**：`brew install cloudflared`
   - **Windows**：`winget install --id Cloudflare.cloudflared`（或從 Cloudflare 下載 `.exe`）
   - **Linux**：到 [cloudflared releases](https://github.com/cloudflare/cloudflared/releases) 下載執行檔
2. 啟動遊戲伺服器：`npm run dev`
3. 另開一個終端機，對 3000 埠開一條快速通道：
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
4. `cloudflared` 會印出一個公開網址，例如：
   ```
   https://random-words-1234.trycloudflare.com
   ```
5. 把這個網址分享給其他玩家，大家直接在瀏覽器開啟：
   ```
   https://random-words-1234.trycloudflare.com
   ```
   遊戲會自動連線（同源）——玩家 1 建房，玩家 2 輸入代碼加入。

> 快速通道網址是臨時的，每次重啟 `cloudflared` 都會變，重新分享新網址即可。遊玩期間請保持 `cloudflared` 的終端機開著。

**做法 2 — ngrok（替代方案，免動路由器）：**
1. 安裝 [ngrok](https://ngrok.com/) 並登入一次（`ngrok config add-authtoken <你的token>`）。
2. 啟動遊戲伺服器：`npm run dev`
3. 另開一個終端機，把 3000 埠公開：
   ```bash
   ngrok http 3000
   ```
4. ngrok 會給一個公開網址，例如 `https://abcd-1234.ngrok-free.app`。
5. 把這個網址分享給其他玩家，大家直接開啟：
   ```
   https://abcd-1234.ngrok-free.app
   ```
   遊戲會自動連線（同源）。

**做法 3 — 讓客戶端指向另一個伺服器網址：**
如果你開遊戲的位置和伺服器不同，可在網址後面加上 `?server=`：
```
http://localhost:3000/?server=https://random-words-1234.trycloudflare.com
```
這個值會存在瀏覽器裡，所以只需要輸入一次。

**做法 4 — 路由器連接埠轉發（進階）：**
1. 在路由器上把對外的 **3000** 埠轉發到主機的區網 IP。
2. 查出主機的對外公開 IP（例如搜尋「what is my IP」）。
3. 玩家開啟 `http://<公開IP>:3000`。
> 連接埠轉發會把你的電腦暴露在網際網路上，請只在信任的網路使用，用完記得關閉。

### 7. 進階設定（選用）
伺服器會讀取下列環境變數：
- `PORT` — 伺服器連接埠（預設 `3000`）
- `HOST` — 綁定位址（預設 `0.0.0.0`，即所有網卡）
- `CORS_ORIGIN` — 允許的來源（預設 `*`）

範例：
```bash
PORT=4000 npm run dev
```

### 8. 疑難排解
- **顯示「Room not found」**：加入的玩家必須連到和主機**同一個伺服器**（相同的區網 IP／相同的 ngrok 網址）。
- **區網連不上**：通常是主機防火牆擋了 3000 埠，請開放它。
- **通道網址變了**：免費的 `cloudflared` 快速通道與 ngrok 網址每次重啟都會變，請重新分享新網址。
- **想清除已儲存的伺服器網址**：用空的 `?server=` 開啟遊戲，或清除瀏覽器的 local storage。
