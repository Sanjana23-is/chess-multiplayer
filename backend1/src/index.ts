import { WebSocketServer } from 'ws';
import { GameManager } from './GameManager';

import http from 'http';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });
const PORT = Number(process.env.PORT || 8080);
server.listen(PORT, () => console.log(`Server (HTTP+WS) started on port ${PORT}`));
 
const gameManager = new GameManager();

// Triggered whenever a new client connects
wss.on('connection', function connection(ws) {
  gameManager.addUser(ws);
});