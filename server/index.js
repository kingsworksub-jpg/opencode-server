const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const OpenCodeCore = require('@opencode/core');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'opencode-secret-token';

app.use(cors());
app.use(express.json());

// Simple Auth Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: 'Invalid authentication token' });
  }
  next();
};

// Status endpoint with OpenCode Core info
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'OpenCode Standard Bridge Server is running',
    coreVersion: OpenCodeCore.version || '2.2.7'
  });
});

// Command execution endpoint using standard core integration
app.post('/api/execute', authenticate, (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Valid command string is required' });
  }

  console.log(`[OpenCode Core] Executing command: ${command}`);

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
  console.log(`OpenCode Standard Bridge Server running on port ${PORT} with @opencode/core`);
});
