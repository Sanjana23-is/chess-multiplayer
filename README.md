# ♟️ Project Chess — Real-Time Multiplayer Chess

A full-stack, real-time multiplayer chess platform built from scratch. Players can compete in rated matches, play with friends via private rooms, and track their Elo rating over time.

![Landing Page](./docs/landing.png)

---

## 🎮 Live Demo

> *Coming soon — deployment in progress*

---

## ✨ Features

| Feature | Details |
|---|---|
| ⚡ **Real-time gameplay** | WebSocket-based moves with instant board updates |
| 🔍 **Matchmaking** | Auto-matchmaking queue by time control (Rapid / Blitz / Bullet) |
| 🏠 **Private rooms** | Create a room, share a 4-letter code, play with a friend |
| 📈 **Elo rating system** | Ratings update after every game (win/loss/draw) |
| ⏱️ **Time controls** | Per-player countdown clocks — 10 min, 3 min, 1 min |
| 💬 **In-game chat** | Real-time chat between players during a game |
| 🏳️ **Resign & draw** | Offer, accept, or reject draw; resign at any time |
| 📜 **Move history** | Full game move log with piece notation |
| 👤 **User profiles** | Account creation, JWT auth, game history |
| 🔒 **Security** | Rate limiting on auth routes, protected route guards, bcrypt passwords |

---

## 🛠️ Tech Stack

### Frontend
![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![chess.js](https://img.shields.io/badge/chess.js-000000?style=flat)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat&logo=express&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket_(ws)-010101?style=flat)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│         React Frontend          │
│  (Vite + TypeScript + Tailwind) │
└────────────┬───────────┬────────┘
             │ REST API  │ WebSocket
             │ (auth)    │ (game events)
             ▼           ▼
┌─────────────────────────────────┐
│       Node.js + Express 5       │
│  ┌───────────┐ ┌─────────────┐  │
│  │ AuthRouter│ │ GameManager │  │
│  │  (HTTP)   │ │   (WS)      │  │
│  └───────────┘ └──────┬──────┘  │
└─────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  PostgreSQL via      │
              │  Prisma ORM          │
              │  (users, games,      │
              │   moves, ratings)    │
              └─────────────────────┘
```

**WebSocket message flow:**
1. Client connects → sends `AUTH` (JWT token)
2. Client sends `FIND_MATCH` → backend queues by time control
3. When 2 players match → backend sends `INIT_GAME` to both → game begins
4. Moves, chat, resign, draw offers all flow over the same WS connection

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### 1. Clone the repository
```bash
git clone https://github.com/Sanjana23-is/chess-multiplayer.git
cd chess-multiplayer
```

### 2. Set up the backend
```bash
cd backend1

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and set DATABASE_URL and JWT_SECRET

# Run Prisma migrations
npx prisma migrate dev

# Start the backend (port 8080)
npx ts-node ./src/index.ts
```

### 3. Set up the frontend
```bash
cd frontend

# Install dependencies
npm install

# Start the dev server (port 5173)
npm run dev
```

### 4. Open the app
Navigate to **http://localhost:5173**, register an account, and start playing!

---

### Environment Variables

Create `backend1/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/chess"
JWT_SECRET="your-secret-key-here"
```

---

## 📸 Screenshots

### Landing Page
![Landing Page](./docs/landing.png)

### Game Board
![Active Game](./docs/game.png)

---

## 🔐 Security Features

- 🔑 **JWT authentication** — 7-day tokens signed with a secret key
- 🔒 **Password hashing** — bcrypt with salt rounds
- 🚦 **Rate limiting** — max 10 login attempts / 15 min, 5 registrations / hour per IP
- 🛡️ **Protected routes** — unauthenticated users redirected to `/login`
- 🚫 **Input validation** — required field checks on all endpoints

---

## 📁 Project Structure

```
chess-multiplayer/
├── frontend/               # React + Vite frontend
│   └── src/
│       ├── components/     # ChessBoard, ChessClock, ErrorBoundary, PrivateRoute
│       ├── context/        # AuthContext
│       ├── hooks/          # useSocket, useAudio
│       └── screens/        # Landing, Game, Login, Register, Profile, NotFound
│
└── backend1/               # Node.js + Express backend
    └── src/
        ├── GameManager.ts  # WebSocket handler, matchmaking, room management
        ├── Game.ts         # Game state, move validation, Elo calculation
        ├── auth.ts         # JWT auth + REST endpoints
        ├── messages.ts     # WebSocket message type constants
        └── prisma/         # Database schema & migrations
```

---

## 🎯 How It Works

### Matchmaking
Players join a queue for their chosen time control. When two players are in the queue simultaneously, a game is created in the database and both receive an `INIT_GAME` message assigning them colors.

### Elo Rating
After each game, both players' ratings are updated using the standard Elo formula:
```
Expected = 1 / (1 + 10^((opponentRating - playerRating) / 400))
NewRating = OldRating + K * (Actual - Expected)
```
K-factor: 32 (standard)

### Move Validation
All moves are validated server-side using `chess.js`. The backend maintains the authoritative game state — clients cannot submit illegal moves.

---

## 🤝 Contributing

Pull requests welcome! Please open an issue first for major changes.

---

## 📄 License

MIT
