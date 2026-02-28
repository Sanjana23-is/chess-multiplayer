import WebSocket from "ws";
import { Chess } from "chess.js";
import { ACCEPT_DRAW, GAME_OVER, INIT_GAME, MOVE, OFFER_DRAW, OPPONENT_DISCONNECTED, REJECT_DRAW, RESIGN, CHAT_MESSAGE } from "./messages";
import { prisma } from "./prisma"; // @ts-ignore - force TS Server refresh
import { calculateElo } from "./utils/elo";

export class Game {
    public player1: WebSocket; // white
    public player2: WebSocket; // black
    public id: string;

    private board: Chess;

    public whiteTime: number;
    public blackTime: number;
    private timer: NodeJS.Timeout | null = null;
    private lastMoveTime: number | null = null;

    // Draw offer tracking
    private drawOfferBy: "white" | "black" | null = null;
    public isFinished: boolean = false;

    public whitePlayerId: string | null;
    public blackPlayerId: string | null;

    constructor(
        player1: WebSocket,
        player2: WebSocket,
        id: string,
        fen?: string,
        whiteTime: number = 600000,
        blackTime: number = 600000,
        whitePlayerId: string | null = null,
        blackPlayerId: string | null = null
    ) {
        this.player1 = player1;
        this.player2 = player2;
        this.id = id;

        this.board = fen ? new Chess(fen) : new Chess();

        this.whiteTime = whiteTime;
        this.blackTime = blackTime;

        this.whitePlayerId = whitePlayerId;
        this.blackPlayerId = blackPlayerId;

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

    private async updateElo(winnerColor: "white" | "black" | null): Promise<{ whiteElo: number, blackElo: number } | null> {
        // Only update ratings if both players are authenticated users
        if (!this.whitePlayerId || !this.blackPlayerId) return null;

        try {
            const whiteUser = await prisma.user.findUnique({ where: { id: this.whitePlayerId } });
            const blackUser = await prisma.user.findUnique({ where: { id: this.blackPlayerId } });

            if (!whiteUser || !blackUser) return null;

            let resultForWhite: 1 | 0.5 | 0 = 0.5; // Draw default
            if (winnerColor === "white") resultForWhite = 1;
            else if (winnerColor === "black") resultForWhite = 0;

            const [newWhiteElo, newBlackElo] = calculateElo(whiteUser.rating, blackUser.rating, resultForWhite);

            await prisma.$transaction([
                prisma.user.update({ where: { id: this.whitePlayerId }, data: { rating: newWhiteElo } }),
                prisma.user.update({ where: { id: this.blackPlayerId }, data: { rating: newBlackElo } })
            ]);

            console.log(`[ELO] Game ${this.id}: White ${whiteUser.rating}->${newWhiteElo}, Black ${blackUser.rating}->${newBlackElo}`);
            return { whiteElo: newWhiteElo, blackElo: newBlackElo };
        } catch (err) {
            console.error("Failed to update Elo ratings:", err);
            return null;
        }
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
        if (this.isFinished) return;
        this.isFinished = true;

        if (this.timer) clearInterval(this.timer);

        let ratings = null;
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
            ratings = await this.updateElo(winnerColor);
        } catch (err) {
            console.error("Failed to update game timeout status:", err);
        }

        this.broadcast(GAME_OVER, {
            result: "timeout",
            winner: winnerColor,
            fen: this.board.fen(),
            board: this.board.board(),
            newRatings: ratings
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
            if (this.isFinished) return;
            this.isFinished = true;

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

            let ratings = null;
            try {
                await prisma.game.update({
                    where: { id: this.id },
                    data: {
                        status: "FINISHED",
                        result: gameResult,
                        winner,
                    },
                });
                ratings = await this.updateElo(winner);
            } catch (err) {
                console.error("Failed to update game status:", err);
            }

            this.broadcast(GAME_OVER, {
                result: gameResult,
                winner,
                fen,
                board: boardState,
                newRatings: ratings,
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
        if (this.isFinished) return;
        this.isFinished = true;

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

            // Assume the disconnected socket loses
            const winner = disconnectedSocket === this.player1 ? "black" : "white";
            await this.updateElo(winner);
        } catch (err) {
            console.error("Failed to mark abandoned:", err);
        }

        this.safeSend(opponent, OPPONENT_DISCONNECTED, {
            message: "Opponent disconnected",
        });
    }

    // ============================
    // Chat Features
    // ============================
    sendChat(socket: WebSocket, text: string) {
        const color = socket === this.player1 ? "white" : "black";

        // Broadcast the message back to both players
        this.broadcast(CHAT_MESSAGE, {
            sender: color,
            text
        });
    }

    // ============================
    // Resign & Draw Features
    // ============================
    async resign(socket: WebSocket) {
        if (this.isFinished) return;
        this.isFinished = true;

        if (this.timer) clearInterval(this.timer);

        const loserColor = socket === this.player1 ? "white" : "black";
        const winnerColor = loserColor === "white" ? "black" : "white";

        let ratings = null;
        try {
            await prisma.game.update({
                where: { id: this.id },
                data: {
                    status: "FINISHED",
                    result: "resignation",
                    winner: winnerColor,
                },
            });
            ratings = await this.updateElo(winnerColor);
        } catch (err) {
            console.error("Failed to commit resignation:", err);
        }

        this.broadcast(GAME_OVER, {
            result: "resignation",
            winner: winnerColor,
            fen: this.board.fen(),
            board: this.board.board(),
            newRatings: ratings
        });
    }

    offerDraw(socket: WebSocket) {
        const color = socket === this.player1 ? "white" : "black";
        this.drawOfferBy = color;

        const opponent = socket === this.player1 ? this.player2 : this.player1;
        this.safeSend(opponent, OFFER_DRAW, { proposer: color });
    }

    async acceptDraw(socket: WebSocket) {
        const color = socket === this.player1 ? "white" : "black";

        // Validate that there is an active offer from the OPPONENT
        if (this.drawOfferBy === color || this.drawOfferBy === null) {
            return;
        }

        if (this.isFinished) return;
        this.isFinished = true;

        if (this.timer) clearInterval(this.timer);

        let ratings = null;
        try {
            await prisma.game.update({
                where: { id: this.id },
                data: {
                    status: "FINISHED",
                    result: "draw_agreed",
                    winner: null,
                },
            });
            ratings = await this.updateElo(null); // Draw
        } catch (err) {
            console.error("Failed to commit agreed draw:", err);
        }

        this.broadcast(GAME_OVER, {
            result: "draw_agreed",
            winner: null,
            fen: this.board.fen(),
            board: this.board.board(),
            newRatings: ratings
        });
    }

    rejectDraw(socket: WebSocket) {
        this.drawOfferBy = null; // Clear the offer

        const opponent = socket === this.player1 ? this.player2 : this.player1;
        this.safeSend(opponent, REJECT_DRAW, { message: "Draw rejected" });
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