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
  const [started, setStarted] = useState(false);
  const [myColor, setMyColor] = useState<"white" | "black" | null>(null);
  const [waiting, setWaiting] = useState(false); // true after clicking Play, before INIT_GAME received

  // Derived: is it currently this player's turn?
  const isMyTurn =
    myColor !== null &&
    ((chess.turn() === "w" && myColor === "white") ||
      (chess.turn() === "b" && myColor === "black"));

  // Reset game state only when the socket disconnects (goes to null).
  // We do NOT reset when a new socket appears — that caused the StrictMode bug
  // where mount1 socket sent INIT_GAME, then mount2 re-showed Play and sent it
  // again, pairing mount2 with mount1's closed socket (both ending up as black).
  useEffect(() => {
    if (socket !== null) return; // only act on disconnect
    const freshChess = new Chess();
    setChess(freshChess);
    setBoard(freshChess.board());
    setStarted(false);
    setMyColor(null);
    setWaiting(false);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: Event) => {
      const message = JSON.parse((event as MessageEvent).data);

      switch (message.type) {
        case INIT_GAME: {
          const newChess = new Chess();
          setChess(newChess);
          setBoard(newChess.board());
          setStarted(true);
          setWaiting(false);
          setMyColor(message.payload.color as "white" | "black");
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

  // Turn indicator text
  const turnLabel = !started
    ? "Waiting for opponent…"
    : isMyTurn
      ? "♟ Your turn"
      : "⏳ Opponent's turn";

  const turnColor = !started
    ? "text-gray-400"
    : isMyTurn
      ? "text-emerald-400"
      : "text-gray-400";

  return (
    <div className="relative min-h-screen flex justify-center items-center bg-[#0e1117] overflow-hidden">

      {/* Soft spotlight glow */}
      <div className="absolute w-225 h-225 bg-emerald-900/20 rounded-full blur-3xl z-0" />

      <div className="relative pt-12 max-w-6xl w-full z-10">
        <div className="grid grid-cols-6 gap-16 w-full">

          {/* Chess Board Section */}
          <div className="col-span-4 flex justify-center drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)]">
            <ChessBoard
              socket={socket}
              board={board}
              myColor={myColor ?? "white"}
              isMyTurn={isMyTurn}
            />
          </div>

          {/* Side Panel */}
          <div className="col-span-2 
                        bg-white/5 
                        backdrop-blur-2xl 
                        border border-white/10 
                        rounded-3xl 
                        shadow-[0_30px_80px_rgba(0,0,0,0.7)] 
                        flex flex-col 
                        items-center 
                        justify-start 
                        p-12">

            {/* Turn indicator */}
            {started && (
              <div className={`mb-6 text-lg font-semibold tracking-wide ${turnColor}`}>
                {turnLabel}
              </div>
            )}

            {/* Color badge */}
            {started && myColor && (
              <div className="mb-4 px-4 py-1 rounded-full text-sm font-medium border border-white/20 text-white/70">
                You are <span className={myColor === "white" ? "text-white font-bold" : "text-gray-400 font-bold"}>{myColor}</span>
              </div>
            )}

            <div className="pt-6 w-full flex justify-center">
              {!started && (
                <Button
                  onClick={() => {
                    if (waiting) return; // prevent duplicate sends
                    setWaiting(true);
                    socket?.send(
                      JSON.stringify({
                        type: INIT_GAME,
                      })
                    );
                  }}
                >
                  {waiting ? "Finding opponent…" : "Play"}
                </Button>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );

};
