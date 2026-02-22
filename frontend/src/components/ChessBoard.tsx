import { useState } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { MOVE } from "../screens/Game";

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

  // Flip the board rows for the black player so their pieces are at the bottom
  const displayBoard = myColor === "black" ? [...board].reverse() : board;

  return (
    <div className="text-white-200">
      {displayBoard.map((row, i) => {
        // For black, columns are also reversed so a1 is bottom-left
        const displayRow = myColor === "black" ? [...row].reverse() : row;

        return (
          <div key={i} className="flex">
            {displayRow.map((square, j) => {
              // Compute original board indices to get correct square name
              const origRow = myColor === "black" ? 7 - i : i;
              const origCol = myColor === "black" ? 7 - j : j;
              const squareRepresentation = (String.fromCharCode(97 + origCol) +
                "" +
                (8 - origRow)) as Square;

              return (
                <div
                  onClick={() => {
                    if (!isMyTurn) return; // block moves when it's not our turn

                    if (!from) {
                      setFrom(squareRepresentation);
                    } else {
                      socket.send(
                        JSON.stringify({
                          type: MOVE,
                          payload: {
                            from,
                            to: squareRepresentation,
                          },
                        }),
                      );

                      setFrom(null);
                      console.log({
                        from,
                        to: squareRepresentation,
                      });
                    }
                  }}
                  key={j}
                  className={`w-16 h-16 ${(origRow + origCol) % 2 === 0
                      ? "bg-[#E8EFEA]"
                      : "bg-[#3E5F4A]"
                    } ${from === squareRepresentation
                      ? "ring-4 ring-yellow-400 ring-inset"
                      : ""
                    } ${!isMyTurn
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                    }`}
                >
                  <div className="w-full justify-center flex h-full">
                    <div className="h-full justify-center flex flex-col">
                      {square && (
                        <img
                          src={`/pieces/${square.color}${square.type.toUpperCase()}.webp`}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
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
