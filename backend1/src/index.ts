import { WebSocketServer } from 'ws';
import { GameManager } from './GameManager';
import express from 'express';
import http from 'http';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authRouter } from './auth';

// ── Security: Warn loudly if JWT_SECRET is not set in the environment ──────────
if (!process.env.JWT_SECRET) {
  console.warn(
    '\n⚠️  WARNING: JWT_SECRET environment variable is not set!\n' +
    '   Using the insecure hardcoded fallback. Set JWT_SECRET in your .env file before deploying.\n'
  );
}

const app = express();

app.use(cors());
app.use(express.json());

// ── Rate Limiting ──────────────────────────────────────────────────────────────
// Limit login attempts: max 10 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Limit registration: max 5 accounts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP. Please try again later.' },
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);

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