import { WebSocket } from "ws";
import { INIT_GAME, MOVE } from "./messages";
import { Game } from "./Game";

export class GameManager {
    private games: Game[];
    private pendingUser: WebSocket | null;
    private users: WebSocket[];

    constructor() {
        this.games = [];
        this.pendingUser = null;
        this.users = [];
    }

    addUser(socket: WebSocket) {
        this.users.push(socket);
        this.addHandler(socket);

        // When this socket disconnects, clean up any pending state
        socket.on("close", () => {
            this.removeUser(socket);
            // If the disconnected socket was waiting for a partner, clear it
            if (this.pendingUser === socket) {
                console.log("Pending user disconnected — clearing pending slot");
                this.pendingUser = null;
            }
        });
    }

    removeUser(socket: WebSocket) {
        this.users = this.users.filter(user => user !== socket);
    }

    private addHandler(socket: WebSocket) {
        socket.on("message", (data) => {
            const message = JSON.parse(data.toString());

            if (message.type === INIT_GAME) {
                if (this.pendingUser && this.pendingUser !== socket) {
                    // Both sockets are alive — start the game
                    const game = new Game(this.pendingUser, socket);
                    this.games.push(game);
                    console.log("Game started:", this.pendingUser === socket ? "SAME" : "DIFFERENT", "sockets");
                    this.pendingUser = null;
                } else if (!this.pendingUser) {
                    // No one waiting — this socket becomes the pending player
                    this.pendingUser = socket;
                    console.log("Player waiting for opponent...");
                } else {
                    // pendingUser === socket: same socket sent INIT_GAME twice, ignore
                    console.warn("Ignored duplicate INIT_GAME from the same socket");
                }
            }

            if (message.type === MOVE) {
                const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                if (game) {
                    game.makeMove(socket, message.payload);
                }
            }
        });
    }
}