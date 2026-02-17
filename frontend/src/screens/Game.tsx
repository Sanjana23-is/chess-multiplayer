//import { useEffect } from "react";
import { Button } from "../components/Button";
import { ChessBoard } from "../components/ChessBoard";
import { useSocket } from "../hooks/useSocket";
import { useEffect, useState } from "react";

//TODO: Move together, there's code repetition between here and landing page
export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";
import { Chess } from "chess.js";

export const Game = () => {
  const socket = useSocket();
  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: Event) => {
      const message = JSON.parse((event as MessageEvent).data);

      switch (message.type) {
        case INIT_GAME: {
          // handle init game — create fresh authoritative chess instance
          const newChess = new Chess();
          setChess(newChess);
          setBoard(newChess.board());
          break;
        }
        case MOVE: {
          // authoritative update from server — require fen or board
          const payload = message.payload;
          if (payload?.fen) {
            const newChess = new Chess(payload.fen);
            setChess(newChess);
            setBoard(newChess.board());
          } else if (payload?.board) {
            setBoard(payload.board);
          } else {
            console.warn("MOVE received without fen/board payload");
          }

          break;
        }
        case GAME_OVER: {
          //handle game over
          console.log("game over");
          break;
        }
      }
    };
    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket]);

  if (!socket) return <div>Connecting to server...</div>;

  return (
    <div className="justify-center flex">
      <div className="pt-8  max-w-5xl w-full">
        <div className="grid grid-cols-8 gap-4 w-full">
          {/* Chess Board Section */}
          <div className="col-span-4 w-full flex justify-center">
            <ChessBoard socket={socket} board={board} />
          </div>

          {/* Play Button Section */}
          <div className="col-span-2 bg-slate-900 w-full flex justify-center">
            <div className="pt-8">
              <Button
                onClick={() => {
                  socket?.send(
                    JSON.stringify({
                      type: INIT_GAME,
                    }),
                  );
                }}
              >
                Play
              </Button>
            </div>
            //
          </div>
        </div>
      </div>
    </div>
  );
};
