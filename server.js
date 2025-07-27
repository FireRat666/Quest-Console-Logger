// A simple WebSocket server for logging
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

// Create a simple Express app. Render uses this for health checks.
const app = express();
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

      // Log to the server's console (this becomes the system log on Render)
      // Example format: [2025-07-27T10:30:00.123Z] [INFO] This is a log message.
      console.log(`[${logData.data.timestamp}] [${logData.data.level.toUpperCase()}] ${logData.data.message}`);
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

