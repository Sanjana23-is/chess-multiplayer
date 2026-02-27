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
  chess: Chess;
}) => {
  const [from, setFrom] = useState<null | Square>(null);
  const [promotionMove, setPromotionMove] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const displayBoard = myColor === "black" ? [...board].reverse() : board;

  const validMoves = from ? chess.moves({ square: from, verbose: true }) : [];
  const validTargetSquares = validMoves.map(m => m.to);

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
    <div className="relative w-full aspect-square max-w-full bg-[#16181C] p-1.5 md:p-2 rounded-xl border border-white/5">

      {promotionMove && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 rounded-2xl">
          <div className="bg-[#1e2430] py-6 px-8 rounded-2xl flex flex-col gap-4 border border-white/10">
            <h3 className="text-white text-center text-sm uppercase tracking-wider">
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
                  className="w-16 h-16 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center"
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
      <div className="w-full h-full flex flex-col">
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
                      ${isLightSquare ? "bg-[#e5e7da]" : "bg-[#6b8b4c]"}
                      ${!isMyTurn ? "cursor-not-allowed" : "cursor-pointer"}
                      ${isSelected ? "ring-inset ring-[4px] ring-black/30 z-10" : ""}
                      ${cornerRadius}
                    `}
                  >
                    {/* Selected Square Highlight */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#F5F682] opacity-40 mix-blend-multiply pointer-events-none" />
                    )}

                    {/* Valid Move Guidance Indicators */}
                    {isValidMove && !isCaptureMove && (
                      <div className="absolute w-[30%] h-[30%] bg-black/20 rounded-full pointer-events-none z-20" />
                    )}
                    {isValidMove && isCaptureMove && (
                      <div className="absolute w-[80%] h-[80%] border-[5px] border-black/20 rounded-full pointer-events-none z-20" />
                    )}

                    {/* Coordinate Labels */}
                    {screenCol === 0 && (
                      <span
                        className={`absolute top-0.5 md:top-1 left-1 md:left-1.5 text-[8px] md:text-[11px] font-bold select-none z-0 ${isLightSquare ? "text-[#6b8b4c]" : "text-[#e5e7da]"
                          }`}
                      >
                        {8 - origRow}
                      </span>
                    )}
                    {screenRow === 7 && (
                      <span
                        className={`absolute bottom-0 md:bottom-0.5 right-1 md:right-1.5 text-[8px] md:text-[11px] font-bold select-none z-0 ${isLightSquare ? "text-[#6b8b4c]" : "text-[#e5e7da]"
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
                        className="w-[85%] h-[85%] object-contain relative z-10 drop-shadow-sm pointer-events-none"
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