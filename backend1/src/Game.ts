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

    constructor(
        player1: WebSocket,
        player2: WebSocket,
        id: string,
        fen?: string
    ) {
        this.player1 = player1;
        this.player2 = player2;
        this.id = id;

        this.board = fen ? new Chess(fen) : new Chess();

        this.safeSend(this.player1, INIT_GAME, {
            color: "white",
            gameId: this.id,
            fen: this.board.fen(),
        });

        this.safeSend(this.player2, INIT_GAME, {
            color: "black",
            gameId: this.id,
            fen: this.board.fen(),
        });
    }

    public getFen(): string {
        return this.board.fen();
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
        } catch (err) {
            console.error("Failed to persist move:", err);
        }

        // ============================
        // Check Game Over
        // ============================
        if (this.board.isGameOver()) {
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
        });

    } // ✅ CLOSE makeMove PROPERLY


    async handleDisconnect(disconnectedSocket: WebSocket) {
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