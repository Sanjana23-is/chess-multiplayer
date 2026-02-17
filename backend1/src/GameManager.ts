import {WebSocket} from "ws";
import { INIT_GAME, MOVE } from "./messages";
import { Game } from "./Game";

export class GameManager{
    private games: Game[];//variable game of type game array
    private pendingUser: WebSocket | null;//user currently waiting to be connected
    private users: WebSocket[];//list of currently active user playing game
    
    constructor(){
        this.games = [];
        this.pendingUser = null;
        this.users = [];
    }

    addUser(socket: WebSocket){
        this.users.push(socket);
        this.addHandler(socket);
    }

    removeUser(socket: WebSocket){
        // remove from active users
        this.users = this.users.filter(user => user !== socket);

        // clear pending slot if this user was waiting
        if (this.pendingUser === socket) this.pendingUser = null;

        // remove any game that contains this socket
        const idx = this.games.findIndex(g => g.player1 === socket || g.player2 === socket);
        if (idx !== -1) {
            const [removed] = this.games.splice(idx, 1);
            console.log('Removed game due to disconnect');
            try {
                const other = removed.player1 === socket ? removed.player2 : removed.player1;
                other.send(JSON.stringify({ type: 'game_over', payload: { reason: 'opponent_disconnected' } }));
            } catch (e) {
                /* ignore */
            }
        }
    }

    private addHandler(socket: WebSocket){
        socket.on("message", (data) => {
            let message: any;
            try {
                message = JSON.parse(data.toString());
            } catch (err) {
                console.warn('invalid json from client', err);
                return;
            }

            if (message.type === INIT_GAME) {
                if (this.pendingUser) {
                    // start a new game
                    const game = new Game(this.pendingUser, socket);
                    this.games.push(game);
                    this.pendingUser = null;
                } else {
                    this.pendingUser = socket;
                }
                return;
            }

            if (message.type === MOVE) {
                const payload = message.payload;
                if (!payload || typeof payload.from !== 'string' || typeof payload.to !== 'string') {
                    console.warn('invalid move payload', payload);
                    return;
                }

                const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                if (game) {
                    game.makeMove(socket, payload);
                }
                return;
            }
        });

        socket.on('close', () => this.removeUser(socket));
    }
}