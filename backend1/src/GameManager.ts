import { WebSocket } from "ws";
import { INIT_GAME, MOVE, REJOIN_GAME, RESIGN, OFFER_DRAW, ACCEPT_DRAW, REJECT_DRAW, FIND_MATCH, CREATE_ROOM, JOIN_ROOM, ROOM_CREATED, ROOM_NOT_FOUND, ROOM_JOINED, CHAT_MESSAGE } from "./messages";
import { Game } from "./Game";
import { prisma } from "./prisma";

interface PrivateRoom {
  creator: WebSocket;
  time: number; // e.g. 600000 for 10 min
}

export class GameManager {
  private games: Map<string, Game>;
  /** Queue map. Key = Time in MS e.g. "600000", Value = Array of waiting WebSockets */
  private matchmakingQueues: Map<string, WebSocket[]>;
  /** Private rooms map. Key = Room Code e.g. "AX7B", Value = PrivateRoom obj */
  private privateRooms: Map<string, PrivateRoom>;
  private users: WebSocket[];

  constructor() {
    this.games = new Map();
    this.matchmakingQueues = new Map();
    this.privateRooms = new Map();
    this.users = [];
  }

  addUser(socket: WebSocket) {
    this.users.push(socket);
    this.addHandler(socket);

    socket.on("close", async () => {
      this.removeUser(socket);

      // Remove from matchmaking queues
      for (const [timeStr, queue] of this.matchmakingQueues.entries()) {
        const idx = queue.indexOf(socket);
        if (idx !== -1) {
          queue.splice(idx, 1);
        }
      }

      // Remove from private rooms
      for (const [code, room] of this.privateRooms.entries()) {
        if (room.creator === socket) {
          this.privateRooms.delete(code);
        }
      }

      // Find game by scanning values (small set, acceptable)
      for (const [gameId, game] of this.games.entries()) {
        if (game.player1 === socket || game.player2 === socket) {
          await game.handleDisconnect(socket);
          this.games.delete(gameId);
          break;
        }
      }
    });
  }

  removeUser(socket: WebSocket) {
    this.users = this.users.filter(user => user !== socket);
  }

  private addHandler(socket: WebSocket) {
    socket.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // ======================
        // PUBLIC MATCHMAKING
        // ======================
        if (message.type === FIND_MATCH) {
          const timeMs = message.payload?.time || 600000;
          const timeKey = timeMs.toString();

          // Get or create queue for this time control
          let queue = this.matchmakingQueues.get(timeKey);
          if (!queue) {
            queue = [];
            this.matchmakingQueues.set(timeKey, queue);
          }

          // Don't double queue the same socket
          if (!queue.includes(socket)) {
            queue.push(socket);
          }

          // If we have 2 players, start game!
          if (queue.length >= 2) {
            const player1 = queue.shift()!;
            const player2 = queue.shift()!;

            const dbGame = await prisma.game.create({
              data: {
                status: "ACTIVE",
                whitePlayer: "pending",
                blackPlayer: "new",
                whiteTime: timeMs,
                blackTime: timeMs
              },
            });

            const game = new Game(player1, player2, dbGame.id, undefined, timeMs, timeMs);
            this.games.set(dbGame.id, game);
          }
          return;
        }

        // ======================
        // PRIVATE ROOMS
        // ======================
        if (message.type === CREATE_ROOM) {
          const timeMs = message.payload?.time || 600000;
          // Generate 4 letter code
          const code = Math.random().toString(36).substring(2, 6).toUpperCase();
          this.privateRooms.set(code, { creator: socket, time: timeMs });

          socket.send(JSON.stringify({ type: ROOM_CREATED, payload: { code } }));
          return;
        }

        if (message.type === JOIN_ROOM) {
          const code = message.payload?.code?.toUpperCase();
          const room = this.privateRooms.get(code);

          if (!room || room.creator === socket) {
            socket.send(JSON.stringify({ type: ROOM_NOT_FOUND }));
            return;
          }

          const player1 = room.creator;
          const player2 = socket;
          const timeMs = room.time;

          // Room consumed
          this.privateRooms.delete(code);

          player1.send(JSON.stringify({ type: ROOM_JOINED }));
          player2.send(JSON.stringify({ type: ROOM_JOINED }));

          const dbGame = await prisma.game.create({
            data: {
              status: "ACTIVE",
              whitePlayer: "pending",
              blackPlayer: "new",
              whiteTime: timeMs,
              blackTime: timeMs
            },
          });

          const game = new Game(player1, player2, dbGame.id, undefined, timeMs, timeMs);
          this.games.set(dbGame.id, game);
          return;
        }

        // ======================
        // MOVE
        // ======================
        if (message.type === MOVE) {

          for (const game of this.games.values()) {
            if (game.player1 === socket || game.player2 === socket) {
              await game.makeMove(socket, message.payload);
              return;
            }
          }
        }

        // ======================
        // REJOIN GAME
        // ======================
        if (message.type === REJOIN_GAME) {

          const { gameId } = message.payload;

          let game = this.games.get(gameId);

          // Game already in memory
          if (game) {

            if (game.player1.readyState !== WebSocket.OPEN) {
              game.player1 = socket;
            } else if (game.player2.readyState !== WebSocket.OPEN) {
              game.player2 = socket;
            }

            socket.send(JSON.stringify({
              type: INIT_GAME,
              payload: {
                gameId,
                fen: game.getFen(),
                whiteTime: game.whiteTime,
                blackTime: game.blackTime,
              },
            }));

            return;
          }

          // Recover from DB
          const dbGame = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
              moves: {
                orderBy: { createdAt: "asc" },
              },
            },
          });

          if (!dbGame) return;
          if (dbGame.status === "FINISHED") return;

          const lastMove = dbGame.moves.at(-1);
          const fen = lastMove ? lastMove.fen : undefined;

          const recoveredGame = new Game(
            socket,
            socket,
            gameId,
            fen,
            dbGame.whiteTime,
            dbGame.blackTime
          );

          this.games.set(gameId, recoveredGame);
          return;
        }

        // ======================
        // RESIGN
        // ======================
        if (message.type === RESIGN) {
          for (const game of this.games.values()) {
            if (game.player1 === socket || game.player2 === socket) {
              await game.resign(socket);
              return;
            }
          }
        }

        // ======================
        // OFFER DRAW
        // ======================
        if (message.type === OFFER_DRAW) {
          for (const game of this.games.values()) {
            if (game.player1 === socket || game.player2 === socket) {
              game.offerDraw(socket);
              return;
            }
          }
        }

        // ======================
        // ACCEPT DRAW
        // ======================
        if (message.type === ACCEPT_DRAW) {
          for (const game of this.games.values()) {
            if (game.player1 === socket || game.player2 === socket) {
              await game.acceptDraw(socket);
              return;
            }
          }
        }

        // ======================
        // REJECT DRAW
        // ======================
        if (message.type === REJECT_DRAW) {
          for (const game of this.games.values()) {
            if (game.player1 === socket || game.player2 === socket) {
              game.rejectDraw(socket);
              return;
            }
          }
        }

        // ======================
        // CHAT MESSAGE
        // ======================
        if (message.type === CHAT_MESSAGE) {
          for (const game of this.games.values()) {
            if (game.player1 === socket || game.player2 === socket) {
              game.sendChat(socket, message.payload.text);
              return;
            }
          }
        }

      } catch (error) {
        console.error("Socket message handling error:", error);
      }
    });
  }
}