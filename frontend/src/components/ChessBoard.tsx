import { useState } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { MOVE } from "../screens/Game";

type PromotionPiece = "q" | "r" | "b" | "n";

export const ChessBoard = ({
  board,
  socket,
  myColor,
  isMyTurn,
}: {
  board: ({
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null)[][];
  socket: WebSocket;
  myColor: "white" | "black";
  isMyTurn: boolean;
}) => {
  const [from, setFrom] = useState<null | Square>(null);
  const [promotionMove, setPromotionMove] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const displayBoard = myColor === "black" ? [...board].reverse() : board;

  const isPromotionSquare = (
    fromSquare: Square,
    toSquare: Square,
  ): boolean => {
    const piece = board[8 - Number(fromSquare[1])][
      fromSquare.charCodeAt(0) - 97
    ];

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
        payload: {
          from: fromSquare,
          to: toSquare,
          promotion,
        },
      }),
    );
  };

  return (
    <div className="relative text-white-200">

      {/* Promotion Modal */}
      {promotionMove && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1f2b] p-6 rounded-xl flex gap-4">
            {(["q", "r", "b", "n"] as PromotionPiece[]).map((piece) => (
              <button
                key={piece}
                onClick={() => {
                  sendMove(promotionMove.from, promotionMove.to, piece);
                  setPromotionMove(null);
                  setFrom(null);
                }}
                className="w-16 h-16 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center"
              >
                <img
                  src={`/pieces/${myColor}${piece.toUpperCase()}.webp`}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {displayBoard.map((row, i) => {
        const displayRow = myColor === "black" ? [...row].reverse() : row;

        return (
          <div key={i} className="flex">
            {displayRow.map((square, j) => {
              const origRow = myColor === "black" ? 7 - i : i;
              const origCol = myColor === "black" ? 7 - j : j;

              const squareRepresentation = (
                String.fromCharCode(97 + origCol) +
                (8 - origRow)
              ) as Square;

              return (
                <div
                  key={j}
                  onClick={() => {
                    if (!isMyTurn) return;

                    if (!from) {
                      setFrom(squareRepresentation);
                    } else {
                      if (
                        isPromotionSquare(from, squareRepresentation)
                      ) {
                        setPromotionMove({
                          from,
                          to: squareRepresentation,
                        });
                      } else {
                        sendMove(from, squareRepresentation);
                      }

                      setFrom(null);
                    }
                  }}
                  className={`w-16 h-16 ${
                    (origRow + origCol) % 2 === 0
                      ? "bg-[#E8EFEA]"
                      : "bg-[#3E5F4A]"
                  } ${
                    from === squareRepresentation
                      ? "ring-4 ring-yellow-400 ring-inset"
                      : ""
                  } ${
                    !isMyTurn
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <div className="w-full h-full flex justify-center items-center">
                    {square && (
                      <img
                        src={`/pieces/${square.color}${square.type.toUpperCase()}.webp`}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};