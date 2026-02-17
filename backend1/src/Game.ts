import WebSocket from "ws";
import { Chess } from 'chess.js';
import { GAME_OVER, INIT_GAME, MOVE } from "./messages";

export class Game{
    public player1: WebSocket;
    public player2: WebSocket;
    private board: Chess;
    private startTime: Date;
    private moveCount = 0;

    constructor(player1: WebSocket, player2: WebSocket){
        this.player1 = player1;
        this.player2 = player2;

        this.board = new Chess();
        this.startTime = new Date();

        this.player1.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: "white"
            }
        }))
        this.player2.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: "black"
            }
        }))

    }

    makeMove(socket: WebSocket, move: {
        from: string;
        to: string;
    }){
        console.log("move received", move);
        //validate type of move using zod
        //validation here
        //is it this users move
        //is the move valid
        if(this.moveCount % 2 === 0 && socket !== this.player1){
            return;
        }
        if(this.moveCount % 2 === 1 && socket !== this.player2){
            return;
        }

        try{
            const result = this.board.move(move);
                if (!result) {
                    return;
                }

                this.moveCount++;
        }catch(e){
            console.log(e);
            return;
        }

        //check if the game is over
        if (this.board.isGameOver()) {
            // Send the game over message to both players
            this.player1.send(JSON.stringify({
                type: GAME_OVER,
                payload: {
                winner: this.board.turn() === "w" ? "black" : "white"
                }
            }))
            this.player2.send(JSON.stringify({
                type: GAME_OVER,
                payload: {
                winner: this.board.turn() === "w" ? "black" : "white"
                }
            }))
            return;
        }

        // Broadcast the move and updated board state to both players
        const boardState = this.board.board();
        const fen = this.board.fen();

        const payload = {
            move,
            board: boardState,
            fen,
        };

        try {
            this.player1.send(JSON.stringify({ type: MOVE, payload }));
        } catch (e) {
            console.warn('failed to send move to player1', e);
        }
        try {
            this.player2.send(JSON.stringify({ type: MOVE, payload }));
        } catch (e) {
            console.warn('failed to send move to player2', e);
        }
       // this.moveCount++;
    }
}
