import WebSocket from "ws";
import { Chess } from "chess.js";
import {
    GAME_OVER,
    INIT_GAME,
    MOVE,
    OPPONENT_DISCONNECTED,
} from "./messages";
import { prisma } from "./prisma";

export class Game {
    public player1: WebSocket; // white
    public player2: WebSocket; // black
    public id: string;

    private board: Chess;

    public whiteTime: number;
    public blackTime: number;
    private timer: NodeJS.Timeout | null = null;
    private lastMoveTime: number | null = null;

    constructor(
        player1: WebSocket,
        player2: WebSocket,
        id: string,
        fen?: string,
        whiteTime: number = 600000,
        blackTime: number = 600000
    ) {
        this.player1 = player1;
        this.player2 = player2;
        this.id = id;

        this.board = fen ? new Chess(fen) : new Chess();

        this.whiteTime = whiteTime;
        this.blackTime = blackTime;

        this.safeSend(this.player1, INIT_GAME, {
            color: "white",
            gameId: this.id,
            fen: this.board.fen(),
            whiteTime: this.whiteTime,
            blackTime: this.blackTime,
        });

        this.safeSend(this.player2, INIT_GAME, {
            color: "black",
            gameId: this.id,
            fen: this.board.fen(),
            whiteTime: this.whiteTime,
            blackTime: this.blackTime,
        });
    }

    public getFen(): string {
        return this.board.fen();
    }

    private startTimer() {
        this.lastMoveTime = Date.now();
        this.timer = setInterval(() => {
            const now = Date.now();
            const elapsed = now - (this.lastMoveTime ?? now);
            this.lastMoveTime = now;

            if (this.board.turn() === "w") {
                this.whiteTime -= elapsed;
                if (this.whiteTime <= 0) {
                    this.whiteTime = 0;
                    this.handleTimeout("black");
                }
            } else {
                this.blackTime -= elapsed;
                if (this.blackTime <= 0) {
                    this.blackTime = 0;
                    this.handleTimeout("white");
                }
            }
        }, 1000); // Check every second
    }

    private async handleTimeout(winnerColor: "white" | "black") {
        if (this.timer) clearInterval(this.timer);

        try {
            await prisma.game.update({
                where: { id: this.id },
                data: {
                    status: "FINISHED",
                    result: "timeout",
                    winner: winnerColor,
                    whiteTime: this.whiteTime,
                    blackTime: this.blackTime,
                },
            });
        } catch (err) {
            console.error("Failed to update game timeout status:", err);
        }

        this.broadcast(GAME_OVER, {
            result: "timeout",
            winner: winnerColor,
            fen: this.board.fen(),
            board: this.board.board(),
        });
    }

    async makeMove(
        socket: WebSocket,
        move: {
            from: string;
            to: string;
            promotion?: "q" | "r" | "b" | "n";
        }
    ) {
        // ============================
        // TURN VALIDATION (authoritative)
        // ============================
        const turn = this.board.turn();

        if (turn === "w" && socket !== this.player1) return;
        if (turn === "b" && socket !== this.player2) return;

        let result;

        try {
            const movePayload = move.promotion
                ? { from: move.from, to: move.to, promotion: move.promotion }
                : { from: move.from, to: move.to };

            result = this.board.move(movePayload);

            if (!result) return;
        } catch {
            return;
        }

        const fen = this.board.fen();
        const boardState = this.board.board();

        // ============================
        // Update Internal Time
        // ============================
        if (this.lastMoveTime) {
            const now = Date.now();
            const elapsed = now - this.lastMoveTime;

            // If it was white's turn, deduct from white's time
            if (turn === "w") {
                this.whiteTime -= elapsed;
            } else {
                this.blackTime -= elapsed;
            }
        }

        // Start the continuous timeout timer ONLY after the very first move is made.
        // Before the first move, no time expires.
        if (!this.timer) {
            this.startTimer();
        }

        // Reset lastMoveTime for the next player
        this.lastMoveTime = Date.now();

        // ============================
        // Persist Move (with promotion)
        // ============================
        try {
            await prisma.move.create({
                data: {
                    gameId: this.id,
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion ?? null,
                    fen,
                },
            });

            // Also update the game with the latest times
            await prisma.game.update({
                where: { id: this.id },
                data: {
                    whiteTime: Math.max(0, this.whiteTime),
                    blackTime: Math.max(0, this.blackTime),
                }
            });
        } catch (err) {
            console.error("Failed to persist move/time:", err);
        }

        // ============================
        // Check Game Over
        // ============================
        if (this.board.isGameOver()) {
            if (this.timer) clearInterval(this.timer);

            let gameResult: "checkmate" | "stalemate" | "draw";
            let winner: "white" | "black" | null = null;

            if (this.board.isCheckmate()) {
                gameResult = "checkmate";
                winner = this.board.turn() === "w" ? "black" : "white";
            } else if (this.board.isStalemate()) {
                gameResult = "stalemate";
            } else {
                gameResult = "draw";
            }

            try {
                await prisma.game.update({
                    where: { id: this.id },
                    data: {
                        status: "FINISHED",
                        result: gameResult,
                        winner,
                    },
                });
            } catch (err) {
                console.error("Failed to update game status:", err);
            }

            this.broadcast(GAME_OVER, {
                result: gameResult,
                winner,
                fen,
                board: boardState,
            });

            return;
        }

        // ============================
        // Broadcast Move
        // ============================
        this.broadcast(MOVE, {
            move: {
                from: result.from,
                to: result.to,
                piece: result.piece,
                color: result.color,
                captured: result.captured ?? null,
                promotion: result.promotion ?? null,
            },
            fen,
            board: boardState,
            whiteTime: this.whiteTime,
            blackTime: this.blackTime,
        });

    } // ✅ CLOSE makeMove PROPERLY


    async handleDisconnect(disconnectedSocket: WebSocket) {
        if (this.timer) clearInterval(this.timer);
        const opponent =
            disconnectedSocket === this.player1
                ? this.player2
                : this.player1;

        try {
            await prisma.game.update({
                where: { id: this.id },
                data: {
                    status: "FINISHED",
                    result: "abandoned",
                },
            });
        } catch (err) {
            console.error("Failed to mark abandoned:", err);
        }

        this.safeSend(opponent, OPPONENT_DISCONNECTED, {
            message: "Opponent disconnected",
        });
    }

    private broadcast(type: string, payload: any) {
        this.safeSend(this.player1, type, payload);
        this.safeSend(this.player2, type, payload);
    }

    private safeSend(socket: WebSocket, type: string, payload: any) {
        try {
            socket.send(JSON.stringify({ type, payload }));
        } catch {
            console.warn("Socket send failed");
        }
    }
}