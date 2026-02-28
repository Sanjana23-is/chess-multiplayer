import { WebSocketServer } from 'ws';
import { GameManager } from './GameManager';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { authRouter } from './auth';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);

app.get('/health', (req, res) => {
  res.send('ok');
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = Number(process.env.PORT || 8080);
server.listen(PORT, () => console.log(`Server (HTTP+WS) started on port ${PORT}`));

const gameManager = new GameManager();

// Triggered whenever a new client connects
wss.on('connection', function connection(ws) {
  gameManager.addUser(ws);
});