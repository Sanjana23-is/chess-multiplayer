import { Button } from "../components/Button";
import { ChessBoard } from "../components/ChessBoard";
import { useSocket } from "../hooks/useSocket";
import { useEffect, useState } from "react";

export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";
import { Chess } from "chess.js";

type GameResult = {
  result: "checkmate" | "stalemate" | "draw";
  winner: "white" | "black" | null;
} | null;

export const Game = () => {
  const socket = useSocket();
  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [started, setStarted] = useState(false);
  const [myColor, setMyColor] = useState<"white" | "black" | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult>(null);

  // Derived: is it currently this player's turn?
  const isMyTurn =
    gameResult === null &&  // no moves allowed once game is over
    myColor !== null &&
    ((chess.turn() === "w" && myColor === "white") ||
      (chess.turn() === "b" && myColor === "black"));

  // Reset game state only when the socket disconnects (goes to null).
  useEffect(() => {
    if (socket !== null) return;
    const freshChess = new Chess();
    setChess(freshChess);
    setBoard(freshChess.board());
    setStarted(false);
    setMyColor(null);
    setWaiting(false);
    setGameResult(null);
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
          setGameResult(null);
          setMyColor(message.payload.color as "white" | "black");
          break;
        }
        case MOVE: {
          const payload = message.payload;
          if (payload?.fen) {
            const newChess = new Chess(payload.fen);
            setChess(newChess);
            setBoard(newChess.board());
          } else if (payload?.board) {
            setBoard(payload.board);
          }
          break;
        }
        case GAME_OVER: {
          const payload = message.payload;
          // Update board to final position if included
          if (payload?.fen) {
            const finalChess = new Chess(payload.fen);
            setChess(finalChess);
            setBoard(finalChess.board());
          }
          setGameResult({
            result: payload.result,
            winner: payload.winner ?? null,
          });
          break;
        }
      }
    };
    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket]);

  if (!socket) return <div>Connecting to server...</div>;

  // Turn indicator
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

  // Game-over result label
  const resultHeading = gameResult
    ? gameResult.result === "checkmate"
      ? gameResult.winner === myColor
        ? "🏆 You won!"
        : "💀 You lost"
      : gameResult.result === "stalemate"
        ? "🤝 Stalemate"
        : "🤝 Draw"
    : null;

  return (
    <div className="relative min-h-screen flex justify-center items-center bg-[#0e1117] overflow-hidden">

      {/* Soft spotlight glow */}
      <div className="absolute w-225 h-225 bg-emerald-900/20 rounded-full blur-3xl z-0" />

      <div className="relative pt-12 max-w-6xl w-full z-10">
        <div className="grid grid-cols-6 gap-16 w-full">

          {/* Chess Board */}
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

            {/* Game-over overlay card */}
            {gameResult && (
              <div className="mb-6 w-full text-center bg-white/10 border border-white/20 rounded-2xl p-6">
                <div className="text-3xl font-bold text-white mb-2">
                  {resultHeading}
                </div>
                {gameResult.result === "checkmate" && gameResult.winner && (
                  <div className="text-sm text-gray-400 mb-4">
                    <span className="capitalize font-semibold text-white">{gameResult.winner}</span> wins by checkmate
                  </div>
                )}
                {(gameResult.result === "stalemate" || gameResult.result === "draw") && (
                  <div className="text-sm text-gray-400 mb-4 capitalize">
                    {gameResult.result}
                  </div>
                )}
                <Button
                  onClick={() => {
                    if (waiting) return;
                    setWaiting(true);
                    setGameResult(null);
                    setStarted(false);
                    socket?.send(JSON.stringify({ type: INIT_GAME }));
                  }}
                >
                  {waiting ? "Finding opponent…" : "Play Again"}
                </Button>
              </div>
            )}

            {/* Turn indicator (only while playing) */}
            {started && !gameResult && (
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

            {/* Play button (pre-game) */}
            <div className="pt-6 w-full flex justify-center">
              {!started && !gameResult && (
                <Button
                  onClick={() => {
                    if (waiting) return;
                    setWaiting(true);
                    socket?.send(JSON.stringify({ type: INIT_GAME }));
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
