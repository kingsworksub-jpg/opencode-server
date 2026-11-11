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

// Root endpoint for browser check
app.get('/', (req, res) => {
  res.send('<html><body style="font-family:sans-serif;text-align:center;padding-top:50px;"><h1>OpenCode Bridge Server is Running</h1><p>This is the backend API bridge for the OpenCode Mobile App.</p></body></html>');
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
