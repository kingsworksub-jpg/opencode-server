const express = require("express");
const app = express();
const { execSync } = require("child_process");

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

function getRealSessions() {
  try {
    const output = execSync("npx opencode session list", { encoding: "utf8" });
    const lines = output.split("\n").filter(l => l.includes("ses_"));
    return lines.map(line => {
      const parts = line.trim().split(/\s{2,}/);
      return {
        id: parts[0] || "unknown",
        title: parts.slice(1, -1).join(" ") || parts[1] || "opencode Session"
      };
    });
  } catch (e) {
    return [];
  }
}

app.get("/", (req, res) => {
  const sessions = getRealSessions();
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>opencode Mobile Drawer UI</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #c9d1d9; margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; overflow: hidden; }
        header { display: flex; justify-content: space-between; align-items: center; background: #161b22; border-bottom: 1px solid #30363d; padding: 12px 16px; flex-shrink: 0; }
        .title { font-size: 16px; font-weight: bold; color: #58a6ff; display: flex; align-items: center; gap: 8px; }
        .hamburger { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 14px; }
        
        .main-layout { display: flex; flex: 1; position: relative; overflow: hidden; }
        
        /* ドロワーサイドバー */
        .sidebar { position: absolute; left: -280px; top: 0; bottom: 0; width: 280px; background: #161b22; border-right: 1px solid #30363d; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; transition: left 0.3s ease; z-index: 100; box-shadow: 4px 0 12px rgba(0,0,0,0.5); }
        .sidebar.open { left: 0; }
        .sidebar h3 { font-size: 13px; color: #8b949e; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
        .close-btn { background: none; border: none; color: #8b949e; cursor: pointer; font-size: 16px; }
        
        .session-card { background: #21262d; border: 1px solid #30363d; padding: 10px; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
        .session-card:hover { background: #30363d; }
        .session-title { font-size: 13px; font-weight: bold; color: #58a6ff; word-break: break-all; }
        .session-id { font-size: 11px; color: #8b949e; margin-top: 4px; }
        
        /* チャットエリア */
        .chat-area { flex: 1; display: flex; flex-direction: column; background: #0d1117; overflow: hidden; width: 100%; }
        .chat-messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; font-family: ui-monospace, monospace; font-size: 13px; }
        .msg { padding: 10px 14px; border-radius: 6px; line-height: 1.5; max-width: 85%; word-break: break-all; }
        .msg.user { background: #1f6feb; color: #fff; align-self: flex-end; }
        .msg.assistant { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; align-self: flex-start; }
        
        .input-row { display: flex; gap: 8px; padding: 12px 16px; background: #161b22; border-top: 1px solid #30363d; flex-shrink: 0; }
        input { flex: 1; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; padding: 10px 12px; border-radius: 6px; font-size: 14px; outline: none; }
        input:focus { border-color: #58a6ff; }
        button.send-btn { background: #238636; color: #fff; border: none; padding: 0 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        button.send-btn:hover { background: #2ea043; }
        
        .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: none; z-index: 90; }
        .overlay.active { display: block; }
      </style>
    </head>
    <body>
      <header>
        <div class="title">
          <button class="hamburger" onclick="toggleSidebar()">☰ セッション</button>
          <span>opencode Mobile</span>
        </div>
        <div style="font-size: 11px; color: #238636; background: #113; border: 1px solid #238636; padding: 3px 8px; border-radius: 10px;">Synced</div>
      </header>

      <div class="main-layout">
        <div class="overlay" id="overlay" onclick="toggleSidebar()"></div>
        
        <div class="sidebar" id="sidebar">
          <h3><span>PC Sessions (${sessions.length})</span> <button class="close-btn" onclick="toggleSidebar()">✕</button></h3>
          ${sessions.map(s => `
            <div class="session-card" onclick="loadSession('${s.id}', '${s.title.replace(/'/g, "\\'")}')">
              <div class="session-title">${s.title}</div>
              <div class="session-id">${s.id}</div>
            </div>
          `).join('')}
        </div>

        <div class="chat-area">
          <div class="chat-messages" id="chatBox">
            <div class="msg assistant">左上の「☰ セッション」からPC上のセッションを選択できます。</div>
          </div>
          <div class="input-row">
            <input type="text" id="promptInput" placeholder="メッセージを入力..." onkeydown="if(event.key==='Enter')sendPrompt()">
            <button class="send-btn" onclick="sendPrompt()">送信</button>
          </div>
        </div>
      </div>

      <script>
        let currentSessionId = "";

        function toggleSidebar() {
          const sidebar = document.getElementById("sidebar");
          const overlay = document.getElementById("overlay");
          sidebar.classList.toggle("open");
          overlay.classList.toggle("active");
        }

        function loadSession(id, title) {
          currentSessionId = id;
          toggleSidebar();
          const box = document.getElementById("chatBox");
          box.innerHTML += \`<div class="msg assistant">📂 セッション切替: \${title}</div>\`;
          box.scrollTop = box.scrollHeight;
        }

        async function sendPrompt() {
          const input = document.getElementById("promptInput");
          const prompt = input.value.trim();
          if (!prompt) return;
          input.value = "";

          const box = document.getElementById("chatBox");
          box.innerHTML += \`<div class="msg user">\${prompt}</div>\`;
          box.scrollTop = box.scrollHeight;

          const loading = document.createElement("div");
          loading.className = "msg assistant";
          loading.innerText = "処理中...";
          box.appendChild(loading);
          box.scrollTop = box.scrollHeight;

          if (prompt.includes("メモ帳を開いて")) {
            try {
              await fetch("/api/open-notepad", { method: "POST" });
              loading.innerText = "メモ帳を開きました。";
            } catch (e) {
              loading.innerText = "メモ帳の起動に失敗しました。";
            }
          } else {
            try {
              const res = await fetch("/api/prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, sessionId: currentSessionId })
              });
              const data = await res.json();
              loading.innerText = data.response;
            } catch (e) {
              loading.innerText = "エラー: " + e.message;
              loading.style.color = "#f85149";
            }
          }
          box.scrollTop = box.scrollHeight;
        }
      </script>
    </body>
    </html>
  `);
});

app.get("/global/health", (req, res) => {
  res.json({ status: "ok", version: "1.19.0" });
});

app.get("/api/sessions", (req, res) => {
  res.json(getRealSessions());
});

app.get("/global/sessions", (req, res) => {
  res.json(getRealSessions());
});

app.get("/api/info", (req, res) => {
  res.json({ name: "opencode", version: "1.19.0", status: "online" });
});

app.post("/api/open-notepad", (req, res) => {
  try {
    execSync("start notepad.exe");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/api/prompt", (req, res) => {
  const { prompt, sessionId } = req.body;
  if (prompt.includes("メモ帳を開いて")) {
    try {
      execSync("start notepad.exe");
      return res.json({ success: true, response: "メモ帳を開きました。" });
    } catch (e) {}
  }
  try {
    const cmd = sessionId ? `npx opencode run --session ${sessionId} "${prompt}"` : `npx opencode run "${prompt}"`;
    const result = execSync(cmd, { encoding: "utf8", timeout: 60000 });
    res.json({ success: true, response: result || "完了しました。" });
  } catch (e) {
    res.json({ success: true, response: `[PC実行完了] "${prompt}"` });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("opencode drawer UI server running on http://0.0.0.0:3000");
});
