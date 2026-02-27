import { WebSocket } from "ws";
import { INIT_GAME, MOVE, REJOIN_GAME } from "./messages";
import { Game } from "./Game";
import { prisma } from "./prisma";

export class GameManager {
  private games: Map<string, Game>;
  private pendingUser: WebSocket | null;
  private users: WebSocket[];

  constructor() {
    this.games = new Map();
    this.pendingUser = null;
    this.users = [];
  }

  addUser(socket: WebSocket) {
    this.users.push(socket);
    this.addHandler(socket);

    socket.on("close", async () => {
      this.removeUser(socket);

      if (this.pendingUser === socket) {
        this.pendingUser = null;
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
        // INIT GAME
        // ======================
        if (message.type === INIT_GAME) {

          if (this.pendingUser && this.pendingUser !== socket) {

            const dbGame = await prisma.game.create({
              data: {
                status: "ACTIVE",
                whitePlayer: "pending",
                blackPlayer: "new",
              },
            });

            const game = new Game(
              this.pendingUser,
              socket,
              dbGame.id
            );

            this.games.set(dbGame.id, game);
            this.pendingUser = null;
            return;
          }

          if (!this.pendingUser) {
            this.pendingUser = socket;
            return;
          }
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

      } catch (error) {
        console.error("Socket message handling error:", error);
      }
    });
  }
}