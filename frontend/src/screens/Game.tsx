import { ChessBoard } from "../components/ChessBoard";
import { useSocket } from "../hooks/useSocket";
import { useEffect, useState } from "react";
import { Chess } from "chess.js";

export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";
export const REJOIN_GAME = "rejoin_game";
export const OPPONENT_DISCONNECTED = "opponent_disconnected";

type GameResult = {
  result: "checkmate" | "stalemate" | "draw" | "abandoned";
  winner: "white" | "black" | null;
} | null;

type MoveHistoryItem = {
  from: string;
  to: string;
  piece: string;
  color: "w" | "b";
  captured?: string | null;
  promotion?: string | null;
};

export const Game = () => {
  const socket = useSocket();

  // Auto start game when socket connects
  useEffect(() => {
    if (!socket) return;
    socket.send(JSON.stringify({ type: INIT_GAME }));
  }, [socket]);

  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [myColor, setMyColor] = useState<"white" | "black" | null>(null);
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<string[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<string[]>([]);

  // ===============================
  // SOCKET MESSAGE HANDLER
  // ===============================
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      switch (message.type) {

        case INIT_GAME: {
          const fen = message.payload?.fen;
          const newChess = fen ? new Chess(fen) : new Chess();

          setChess(newChess);
          setBoard(newChess.board());
          setGameResult(null);
          setMoveHistory([]);
          setCapturedWhite([]);
          setCapturedBlack([]);

          if (message.payload?.color) {
            setMyColor(message.payload.color);
          }

          break;
        }

        case MOVE: {
          const payload = message.payload;

          if (payload?.fen) {
            const newChess = new Chess(payload.fen);
            setChess(newChess);
            setBoard(newChess.board());
          }

          if (payload?.move) {
            const move = payload.move;

            setMoveHistory(prev => [...prev, move]);

            if (move.captured) {
              if (move.color === "w") {
                setCapturedBlack(prev => [...prev, move.captured]);
              } else {
                setCapturedWhite(prev => [...prev, move.captured]);
              }
            }
          }

          break;
        }

        case GAME_OVER: {
          setGameResult({
            result: message.payload.result,
            winner: message.payload.winner ?? null,
          });
          break;
        }

        case OPPONENT_DISCONNECTED: {
          setGameResult({
            result: "abandoned",
            winner: myColor,
          });
          break;
        }
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, myColor]);

  if (!socket) return <div>Connecting...</div>;

  // ===============================
  // MATERIAL CALCULATION
  // ===============================
  const pieceValue: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
  };

  const whiteScore = capturedBlack.reduce(
    (sum, p) => sum + (pieceValue[p] ?? 0),
    0
  );

  const blackScore = capturedWhite.reduce(
    (sum, p) => sum + (pieceValue[p] ?? 0),
    0
  );

  const materialDiff = whiteScore - blackScore;

  // ===============================
  // TURN LOGIC
  // ===============================
  const isMyTurn =
    gameResult === null &&
    myColor !== null &&
    ((chess.turn() === "w" && myColor === "white") ||
     (chess.turn() === "b" && myColor === "black"));

  return (
    <div className="min-h-screen flex justify-center items-center bg-[#0e1117]">
      <div className="grid grid-cols-6 gap-16 max-w-6xl w-full">

        {/* BOARD AREA */}
        <div className="col-span-4 flex flex-col items-center">

          {/* Captured Black Pieces */}
          <div className="flex gap-1 mb-2 h-6 items-center">
            {capturedBlack.map((piece, i) => (
              <img
                key={i}
                src={`/pieces/b${piece.toUpperCase()}.webp`}
                className="w-6 h-6"
              />
            ))}
            {materialDiff > 0 && (
              <span className="text-green-400 ml-2 text-sm">
                +{materialDiff}
              </span>
            )}
          </div>

          {/* TURN INFO */}
          {myColor && (
            <div className="mb-4 text-center">
              <div className="text-sm text-white/70">
                You are <span className="font-bold">{myColor}</span>
              </div>

              <div className={isMyTurn ? "text-emerald-400 font-semibold" : "text-gray-400 font-semibold"}>
                {isMyTurn ? "♟ Your turn" : "⏳ Opponent's turn"}
              </div>
            </div>
          )}

          <ChessBoard
            socket={socket}
            board={board}
            myColor={myColor ?? "white"}
            isMyTurn={isMyTurn}
          />

          {/* Captured White Pieces */}
          <div className="flex gap-1 mt-2 h-6 items-center">
            {capturedWhite.map((piece, i) => (
              <img
                key={i}
                src={`/pieces/w${piece.toUpperCase()}.webp`}
                className="w-6 h-6"
              />
            ))}
            {materialDiff < 0 && (
              <span className="text-green-400 ml-2 text-sm">
                +{Math.abs(materialDiff)}
              </span>
            )}
          </div>
        </div>

        {/* MOVE PANEL */}
        <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">

          <div className="text-lg font-semibold mb-4 text-white/80">
            Moves
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 text-sm">
            {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
              const whiteMove = moveHistory[i * 2];
              const blackMove = moveHistory[i * 2 + 1];

              return (
                <div key={i} className="flex gap-4">
                  <span className="text-gray-400 w-6">
                    {i + 1}.
                  </span>

                  <span className="flex-1">
                    {whiteMove ? `${whiteMove.from} → ${whiteMove.to}` : ""}
                  </span>

                  <span className="flex-1">
                    {blackMove ? `${blackMove.from} → ${blackMove.to}` : ""}
                  </span>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};