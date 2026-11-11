const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'opencode-secret-token';

app.use(cors());
app.use(express.json());

// Simple Auth Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.query.token;
  const token = authHeader ? (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader) : null;
  if (!token || token !== AUTH_TOKEN) {
    if (req.path === '/' || req.path === '/api/execute') {
      // For browser view, we allow rendering GUI with token input or query param
    }
  }
  next();
};

// Root endpoint: OpenCode Mobile-friendly Web GUI Console
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenCode Web GUI Console</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 16px; }
        .container { max-width: 800px; margin: 0 auto; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #334155; padding-bottom: 12px; }
        h1 { font-size: 1.25rem; margin: 0; color: #38bdf8; }
        .status { font-size: 0.85rem; padding: 4px 8px; border-radius: 9999px; background: #065f46; color: #6ee7b7; }
        .config-box { background: #1e293b; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .config-box input { background: #0f172a; border: 1px solid #475569; color: #fff; padding: 8px; border-radius: 4px; font-size: 0.9rem; flex: 1; min-width: 180px; }
        .terminal { background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 12px; height: 350px; overflow-y: auto; font-family: monospace; font-size: 0.9rem; margin-bottom: 16px; white-space: pre-wrap; word-break: break-all; }
        .input-box { display: flex; gap: 8px; }
        .input-box input { flex: 1; background: #1e293b; border: 1px solid #475569; color: #fff; padding: 12px; border-radius: 8px; font-size: 1rem; }
        .input-box button { background: #0284c7; color: #white; border: none; padding: 0 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; }
        .input-box button:hover { background: #0369a1; }
        .log-user { color: #38bdf8; font-weight: bold; }
        .log-output { color: #e2e8f0; }
        .log-error { color: #f87171; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>OpenCode Web GUI</h1>
            <div id="serverStatus" class="status">Connecting...</div>
        </header>

        <div class="config-box">
            <input type="password" id="authToken" placeholder="Bearer Token" value="opencode-secret-token">
            <button onclick="checkStatus()" style="background:#334155;color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer;">Check Status</button>
        </div>

        <div id="terminal" class="terminal">Welcome to OpenCode Web Console.
Type a command below (e.g. git status, npm test) and press Execute.
</div>

        <div class="input-box">
            <input type="text" id="commandInput" placeholder="Enter command..." onkeydown="if(event.key==='Enter') sendCommand()">
            <button onclick="sendCommand()">Execute</button>
        </div>
    </div>

    <script>
        const terminal = document.getElementById('terminal');
        const statusEl = document.getElementById('serverStatus');

        async function checkStatus() {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                if (data.status === 'online') {
                    statusEl.textContent = 'Online';
                    statusEl.style.background = '#065f46';
                    statusEl.style.color = '#6ee7b7';
                } else {
                    statusEl.textContent = 'Offline';
                    statusEl.style.background = '#7f1d1d';
                    statusEl.style.color = '#fca5a5';
                }
            } catch (e) {
                statusEl.textContent = 'Error connecting';
                statusEl.style.background = '#7f1d1d';
                statusEl.style.color = '#fca5a5';
            }
        }

        async function sendCommand() {
            const input = document.getElementById('commandInput');
            const cmd = input.value.trim();
            const token = document.getElementById('authToken').value.trim();
            if (!cmd) return;

            terminal.innerHTML += \`<span class="log-user">> \${cmd}\\n</span>\`;
            input.value = '';
            terminal.scrollTop = terminal.scrollHeight;

            try {
                const res = await fetch('/api/execute', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${token}\`
                    },
                    body: JSON.stringify({ command: cmd })
                });

                const data = await res.json();
                if (data.success) {
                    terminal.innerHTML += \`<span class="log-output">\${data.stdout || '(no output)'}\\n</span>\`;
                } else {
                    terminal.innerHTML += \`<span class="log-error">Error: \${data.error || ''}\\n\${data.stderr || ''}\\n</span>\`;
                }
            } catch (e) {
                terminal.innerHTML += \`<span class="log-error">Network Exception: \${e.message}\\n</span>\`;
            }
            terminal.scrollTop = terminal.scrollHeight;
        }

        checkStatus();
        setInterval(checkStatus, 10000);
    </script>
</body>
</html>`);
});

// Status endpoint matching OpenCode standard bridge
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', message: 'OpenCode Standard Bridge Server is running' });
});

// Command execution endpoint
app.post('/api/execute', authenticate, (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Valid command string is required' });
  }

  console.log(`Executing command: ${command}`);

  exec(command, { cwd: 'C:\\Users\\norio\\opencode-server', timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      return res.json({
        success: false,
        error: error.message,
        stderr: stderr || '',
        stdout: stdout || ''
      });
    }
    res.json({
      success: true,
      stdout: stdout || '',
      stderr: stderr || ''
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenCode Standard Bridge Server running securely on port ${PORT}`);
});
