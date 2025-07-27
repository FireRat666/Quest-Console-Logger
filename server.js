// A simple WebSocket server for logging
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

// Create a simple Express app. Render uses this for health checks.
const app = express();

// Serve static files from the 'public' directory
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.status(200).send('WebSocket Log Server is running.');
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Log client connected.');

  ws.on('message', (message) => {
    try {
      const messageString = message.toString();
      const logData = JSON.parse(messageString);

      // Validate the message structure before logging
      if (logData && logData.type === 'BanterLog' && logData.data) {
        const { timestamp, level, message, user } = logData.data;
        if (timestamp && level && message) {
          // Use the provided user identifier, or a default if it's missing.
          const userId = user || 'ANONYMOUS';
          // Log to the server's console (this becomes the system log on Render)
          console.log(`[${timestamp}] [${userId}] [${level.toUpperCase()}] ${message}`);
        } else {
          console.warn('Received malformed BanterLog data:', messageString);
        }
      }
    } catch (error) {
      console.error('Failed to process message:', message.toString(), error);
    }
  });

  ws.on('close', () => {
    console.log('Log client disconnected.');
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening for WebSocket connections on port ${PORT}`);
});
