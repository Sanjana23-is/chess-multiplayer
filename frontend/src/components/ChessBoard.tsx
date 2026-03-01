import { useState } from "react";
import type { Color, PieceSymbol, Square, Chess } from "chess.js";
import { MOVE } from "../screens/Game";

type PromotionPiece = "q" | "r" | "b" | "n";

export const ChessBoard = ({
  board,
  socket,
  myColor,
  isMyTurn,
  chess,
}: {
  board: ({
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null)[][];
  socket: WebSocket;
  myColor: "white" | "black";
  isMyTurn: boolean;
  chess?: Chess;
}) => {
  const [from, setFrom] = useState<null | Square>(null);
  const [promotionMove, setPromotionMove] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const displayBoard = myColor === "black" ? [...board].reverse() : board;

  const validMoves = from && chess ? chess.moves({ square: from, verbose: true }) : [];
  const validTargetSquares = validMoves.map(m => m.to);

  let inCheckSquare: Square | null = null;
  if (chess && chess.isCheck()) {
    const turnColor = chess.turn();
    for (const row of board) {
      for (const piece of row) {
        if (piece && piece.type === "k" && piece.color === turnColor) {
          inCheckSquare = piece.square;
          break;
        }
      }
    }
  }

  const isPromotionSquare = (fromSquare: Square, toSquare: Square): boolean => {
    const piece =
      board[8 - Number(fromSquare[1])][fromSquare.charCodeAt(0) - 97];

    if (!piece || piece.type !== "p") return false;
    if (piece.color === "w" && toSquare[1] === "8") return true;
    if (piece.color === "b" && toSquare[1] === "1") return true;

    return false;
  };

  const sendMove = (
    fromSquare: Square,
    toSquare: Square,
    promotion?: PromotionPiece,
  ) => {
    socket.send(
      JSON.stringify({
        type: MOVE,
        payload: { from: fromSquare, to: toSquare, promotion },
      }),
    );
  };

  return (
    <div className="relative w-full aspect-square max-w-full bg-white/60 dark:bg-[#16181C] p-1.5 md:p-2 rounded-xl border border-white/50 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-300 backdrop-blur-xl dark:backdrop-blur-none">

      {promotionMove && (
        <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-50 rounded-2xl transition-colors">
          <div className="bg-white/70 dark:bg-[#1e2430] py-6 px-8 rounded-2xl flex flex-col gap-4 border border-white/50 dark:border-white/10 shadow-xl backdrop-blur-xl">
            <h3 className="text-neutral-900 dark:text-white text-center text-sm font-bold uppercase tracking-wider">
              Promote to
            </h3>
            <div className="flex gap-4">
              {(["q", "r", "b", "n"] as PromotionPiece[]).map((piece) => (
                <button
                  key={piece}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMove(promotionMove.from, promotionMove.to, piece);
                    setPromotionMove(null);
                    setFrom(null);
                  }}
                  className="w-16 h-16 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-white/60 dark:border-transparent rounded-xl flex items-center justify-center transition-all shadow-sm"
                >
                  <img
                    src={`/pieces/${myColor}${piece.toUpperCase()}.webp`}
                    className="w-[80%] h-[80%] object-contain"
                    alt=""
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="w-full h-full flex flex-col border border-white/80 dark:border-white/10 rounded-[8px] overflow-hidden shadow-inner">
        {displayBoard.map((row, i) => {
          const displayRow = myColor === "black" ? [...row].reverse() : row;

          return (
            <div key={i} className="flex-1 flex w-full">
              {displayRow.map((square, j) => {
                const origRow = myColor === "black" ? 7 - i : i;
                const origCol = myColor === "black" ? 7 - j : j;

                const squareRepresentation = (
                  String.fromCharCode(97 + origCol) +
                  (8 - origRow)
                ) as Square;

                const isLightSquare = (origRow + origCol) % 2 === 0;
                const isSelected = from === squareRepresentation;
                const isValidMove = validTargetSquares.includes(squareRepresentation);
                const isCaptureMove = isValidMove && square;
                const isInCheck = inCheckSquare === squareRepresentation;

                // Visual row/col relative to screen (not internal chessboard state)
                const screenRow = i;
                const screenCol = j;

                let cornerRadius = "";
                if (screenRow === 7 && screenCol === 0) cornerRadius = "rounded-bl-[6px] md:rounded-bl-[8px]";
                if (screenRow === 7 && screenCol === 7) cornerRadius = "rounded-br-[6px] md:rounded-br-[8px]";
                if (screenRow === 0 && screenCol === 0) cornerRadius = "rounded-tl-[6px] md:rounded-tl-[8px]";
                if (screenRow === 0 && screenCol === 7) cornerRadius = "rounded-tr-[6px] md:rounded-tr-[8px]";

                return (
                  <div
                    key={j}
                    onClick={() => {
                      if (!isMyTurn) return;

                      // If we click empty square or enemy piece but have no 'from' piece selected, ignore
                      if (!from && (!square || square.color !== myColor[0])) return;

                      if (!from) {
                        setFrom(squareRepresentation);
                      } else {
                        // Change selection if clicking another one of our own pieces
                        if (square && square.color === myColor[0]) {
                          setFrom(squareRepresentation);
                          return;
                        }

                        // Send move only if it's a legally valid target
                        if (isValidMove) {
                          if (isPromotionSquare(from, squareRepresentation)) {
                            setPromotionMove({ from, to: squareRepresentation });
                          } else {
                            sendMove(from, squareRepresentation);
                          }
                        }

                        setFrom(null);
                      }
                    }}
                    className={`
                      flex-1 h-full flex items-center justify-center relative
                      ${isLightSquare ? "bg-[#f2f4e8] dark:bg-[#e5e7da]" : "bg-[#7ba356] dark:bg-[#6b8b4c]"}
                      ${!isMyTurn ? "cursor-not-allowed" : "cursor-pointer"}
                      ${isSelected ? "ring-inset ring-[4px] ring-black/20 dark:ring-black/30 z-10" : ""}
                      ${cornerRadius}
                      transition-colors duration-300
                    `}
                  >
                    {/* In Check Highlight */}
                    {isInCheck && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,0,0,0.6)_0%,rgba(180,0,0,0)_80%)] dark:bg-[radial-gradient(circle,rgba(255,0,0,0.8)_0%,rgba(180,0,0,0)_80%)] opacity-80 mix-blend-multiply pointer-events-none z-10" />
                    )}

                    {/* Selected Square Highlight */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#F5F682] opacity-50 dark:opacity-40 mix-blend-multiply dark:mix-blend-multiply pointer-events-none" />
                    )}

                    {/* Valid Move Guidance Indicators */}
                    {isValidMove && !isCaptureMove && (
                      <div className="absolute w-[30%] h-[30%] bg-black/20 dark:bg-black/30 rounded-full pointer-events-none z-20" />
                    )}
                    {isValidMove && isCaptureMove && (
                      <div className="absolute w-[85%] h-[85%] border-[6px] border-black/20 dark:border-black/30 rounded-full pointer-events-none z-20" />
                    )}

                    {/* Coordinate Labels */}
                    {screenCol === 0 && (
                      <span
                        className={`absolute top-0.5 md:top-1 left-1 md:left-1.5 text-[8px] md:text-[11px] font-bold select-none z-0 transition-colors ${isLightSquare ? "text-[#7ba356] dark:text-[#6b8b4c]" : "text-[#f2f4e8] dark:text-[#e5e7da]"
                          }`}
                      >
                        {8 - origRow}
                      </span>
                    )}
                    {screenRow === 7 && (
                      <span
                        className={`absolute bottom-0 md:bottom-0.5 right-1 md:right-1.5 text-[8px] md:text-[11px] font-bold select-none z-0 transition-colors ${isLightSquare ? "text-[#7ba356] dark:text-[#6b8b4c]" : "text-[#f2f4e8] dark:text-[#e5e7da]"
                          }`}
                      >
                        {String.fromCharCode(97 + origCol)}
                      </span>
                    )}

                    {/* Piece Image */}
                    {square && (
                      <img
                        src={`/pieces/${square.color}${square.type.toUpperCase()}.webp`}
                        alt=""
                        className="w-[85%] h-[85%] object-contain relative z-10 drop-shadow-md dark:drop-shadow-sm pointer-events-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};