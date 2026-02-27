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
    <div className="min-h-screen flex justify-center items-center bg-[#0a0a0a] font-sans selection:bg-emerald-500/30">
      <div className="flex flex-col lg:flex-row gap-12 max-w-6xl w-full justify-center px-6 lg:items-start items-center">

        {/* BOARD AREA */}
        <div className="flex flex-col w-full max-w-[512px] shrink-0">

          {/* Captured Black Pieces */}
          <div className="flex gap-1 mb-2 h-6 items-center">
            {capturedBlack.map((piece, i) => (
              <img
                key={i}
                src={`/pieces/b${piece.toUpperCase()}.webp`}
                className="w-5 h-5 opacity-90"
              />
            ))}
            {materialDiff > 0 && (
              <span className="text-emerald-400 font-bold ml-2 text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">
                +{materialDiff}
              </span>
            )}
          </div>

          {/* TURN INFO HEADER directly attached to the board */}
          {myColor && (
            <div className="flex items-center justify-between bg-white/5 border border-white/10 border-b-0 rounded-t-xl px-4 py-3 backdrop-blur-md">
              <div className="text-sm font-medium text-gray-300">
                You are <span className="font-bold text-white capitalize">{myColor}</span>
              </div>

              <div className={`text-xs px-3 py-1.5 rounded-md font-bold uppercase tracking-wider ${gameResult
                ? (gameResult.winner === myColor
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : gameResult.result === "abandoned"
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20")
                : (isMyTurn ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-gray-400 border border-white/5")
                }`}>
                {gameResult ? (
                  gameResult.result === "abandoned" ? "⚠️ Opponent Left" :
                    gameResult.result === "checkmate" ? (gameResult.winner === myColor ? "🏆 You Won!" : "💀 You Lost") :
                      "🤝 Draw"
                ) : (
                  isMyTurn ? "♟ Your turn" : "⏳ Opponent's turn"
                )}
              </div>
            </div>
          )}

          <div className={`w-[512px] h-[512px] border border-white/10 bg-[#16181C] relative ${myColor ? "rounded-b-xl" : "rounded-xl"} overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]`}>
            <ChessBoard
              socket={socket}
              board={board}
              myColor={myColor ?? "white"}
              isMyTurn={isMyTurn}
              chess={chess}
            />
          </div>

          {/* Captured White Pieces */}
          <div className="flex gap-1 mt-2 h-6 items-center">
            {capturedWhite.map((piece, i) => (
              <img
                key={i}
                src={`/pieces/w${piece.toUpperCase()}.webp`}
                className="w-5 h-5 opacity-90"
              />
            ))}
            {materialDiff < 0 && (
              <span className="text-emerald-400 font-bold ml-2 text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">
                +{Math.abs(materialDiff)}
              </span>
            )}
          </div>
        </div>

        {/* MOVE PANEL aligned top */}
        <div className={`w-full lg:w-[320px] shrink-0 bg-[#16181C] border border-white/10 rounded-2xl p-0 overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${myColor ? "mt-[32px]" : "mt-0"}`} style={{ height: myColor ? "557px" : "512px" }}>

          <div className="text-sm font-bold uppercase tracking-wide bg-white/5 border-b border-white/5 px-6 py-4 text-white/80 shrink-0 flex items-center justify-between">
            <span>Move History</span>
            <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">{moveHistory.length} moves</span>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="flex flex-col text-[13px] leading-relaxed">
              {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                const whiteMove = moveHistory[i * 2];
                const blackMove = moveHistory[i * 2 + 1];
                const isLatestWhite = i * 2 === moveHistory.length - 1;
                const isLatestBlack = i * 2 + 1 === moveHistory.length - 1;

                return (
                  <div key={i} className={`flex border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.01]" : "bg-transparent"} hover:bg-white/[0.04] transition-colors`}>
                    <div className="w-12 py-2.5 text-center text-gray-500 font-mono border-r border-white/5 bg-black/10 select-none flex items-center justify-center text-xs">
                      {i + 1}
                    </div>

                    <div className={`flex-1 flex items-center py-2.5 px-4 font-mono ${isLatestWhite ? "bg-emerald-500/10 text-emerald-400 font-semibold" : "text-gray-300"}`}>
                      {whiteMove ? `${whiteMove.from} → ${whiteMove.to}` : ""}
                    </div>

                    <div className={`flex-1 flex items-center py-2.5 px-4 font-mono border-l border-white/5 border-dashed ${isLatestBlack ? "bg-emerald-500/10 text-emerald-400 font-semibold shadow-inner" : "text-gray-300"}`}>
                      {blackMove ? `${blackMove.from} → ${blackMove.to}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};