import { ChessBoard } from "../components/ChessBoard";
import { useSocket } from "../hooks/useSocket";
import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { ChessClock } from "../components/ChessClock";
import { useLocation, useNavigate } from "react-router-dom";

export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";
export const REJOIN_GAME = "rejoin_game";
export const OPPONENT_DISCONNECTED = "opponent_disconnected";
export const RESIGN = "resign";
export const OFFER_DRAW = "offer_draw";
export const ACCEPT_DRAW = "accept_draw";
export const REJECT_DRAW = "reject_draw";

export const FIND_MATCH = "find_match";
export const CREATE_ROOM = "create_room";
export const JOIN_ROOM = "join_room";
export const ROOM_CREATED = "room_created";
export const ROOM_JOINED = "room_joined";
export const ROOM_NOT_FOUND = "room_not_found";

type GameResult = {
  result: "checkmate" | "stalemate" | "draw" | "abandoned" | "timeout" | "resignation" | "draw_agreed";
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
  const location = useLocation();
  const navigate = useNavigate();

  // Auto start/find game when socket connects based on routing state
  useEffect(() => {
    if (!socket) return;

    const state = location.state as { mode?: string, time?: number, roomId?: string } | null;

    if (state?.mode === "matchmaking") {
      socket.send(JSON.stringify({ type: FIND_MATCH, payload: { time: state.time || 600000 } }));
    } else if (state?.mode === "create_private") {
      socket.send(JSON.stringify({ type: CREATE_ROOM, payload: { time: state.time || 600000 } }));
    } else if (state?.mode === "join_private") {
      socket.send(JSON.stringify({ type: JOIN_ROOM, payload: { code: state.roomId } }));
    } else {
      // Fallback to auto-matchmaking standard game if directly navigated
      socket.send(JSON.stringify({ type: FIND_MATCH, payload: { time: 600000 } }));
    }
  }, [socket, location.state]);

  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [myColor, setMyColor] = useState<"white" | "black" | null>(null);
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<string[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<string[]>([]);

  // Room State
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Draw State
  const [drawOfferReceived, setDrawOfferReceived] = useState(false);
  const [showDrawRejectedToast, setShowDrawRejectedToast] = useState(false);

  // Clocks state
  const [whiteTime, setWhiteTime] = useState<number>(600000); // 10 minutes default
  const [blackTime, setBlackTime] = useState<number>(600000);

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
          setDrawOfferReceived(false);
          setInviteCode(null);
          setRoomError(null);

          if (message.payload?.color) {
            setMyColor(message.payload.color);
          }

          if (message.payload?.whiteTime !== undefined) {
            setWhiteTime(message.payload.whiteTime);
          }
          if (message.payload?.blackTime !== undefined) {
            setBlackTime(message.payload.blackTime);
          }

          break;
        }

        case ROOM_CREATED: {
          setInviteCode(message.payload.code);
          break;
        }

        case ROOM_NOT_FOUND: {
          setRoomError("Room not found or already full.");
          setTimeout(() => navigate("/"), 3000); // Send back to lobby
          break;
        }

        case MOVE: {
          const payload = message.payload;

          if (payload?.fen) {
            const newChess = new Chess(payload.fen);
            setChess(newChess);
            setBoard(newChess.board());
          }

          if (payload?.whiteTime !== undefined) {
            setWhiteTime(payload.whiteTime);
          }
          if (payload?.blackTime !== undefined) {
            setBlackTime(payload.blackTime);
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
          setDrawOfferReceived(false);
          break;
        }

        case OPPONENT_DISCONNECTED: {
          setGameResult({
            result: "abandoned",
            winner: myColor,
          });
          setDrawOfferReceived(false);
          break;
        }

        case OFFER_DRAW: {
          setDrawOfferReceived(true);
          break;
        }

        case REJECT_DRAW: {
          setShowDrawRejectedToast(true);
          setTimeout(() => setShowDrawRejectedToast(false), 3000);
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
    <div className="min-h-screen flex justify-center items-center bg-[#0a0a0a] font-sans selection:bg-emerald-500/30 py-8">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 w-full justify-center px-6 items-start lg:items-center">

        {/* BOARD AREA */}
        <div className="flex flex-col w-full max-w-[512px] shrink-0">

          {/* Captured Black Pieces */}
          <div className="flex gap-1 mb-2 h-6 items-center overflow-hidden">
            {capturedBlack.map((piece, i) => (
              <div key={i} className="w-5 h-full flex items-center justify-center">
                <img
                  src={`/pieces/b${piece.toUpperCase()}.webp`}
                  className="w-full h-full object-contain opacity-90 drop-shadow-sm"
                  alt={`Captured ${piece}`}
                />
              </div>
            ))}
            {materialDiff > 0 && (
              <span className="text-emerald-400 font-bold ml-2 text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">
                +{materialDiff}
              </span>
            )}
          </div>

          {/* Opponent Clock (Top) */}
          {myColor && (
            <div className="flex justify-end mb-2 w-full">
              <ChessClock
                time={myColor === "white" ? blackTime : whiteTime}
                isActive={!isMyTurn && gameResult === null && moveHistory.length > 0}
                color={myColor === "white" ? "black" : "white"}
              />
            </div>
          )}

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
                    : gameResult.result === "draw_agreed" || gameResult.result === "draw" || gameResult.result === "stalemate"
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20")
                : (isMyTurn ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-gray-400 border border-white/5")
                }`}>
                {gameResult ? (
                  gameResult.result === "abandoned" ? "⚠️ Opponent Left" :
                    gameResult.result === "timeout" ? (gameResult.winner === myColor ? "⏱ You Won by Timeout!" : "⏳ You Lost by Timeout") :
                      gameResult.result === "resignation" ? (gameResult.winner === myColor ? "🏆 Won by Resignation" : "🏳️ You Resigned") :
                        gameResult.result === "checkmate" ? (gameResult.winner === myColor ? "🏆 You Won!" : "💀 You Lost") :
                          "🤝 Draw"
                ) : (
                  isMyTurn ? "♟ Your turn" : "⏳ Opponent's turn"
                )}
              </div>
            </div>
          )}

          <div className={`w-[512px] h-[512px] border border-white/10 bg-[#16181C] relative flex items-center justify-center ${myColor ? "rounded-b-xl" : "rounded-xl"} overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]`}>
            <ChessBoard
              socket={socket}
              board={board}
              myColor={myColor ?? "white"}
              isMyTurn={isMyTurn}
              chess={chess}
            />

            {/* Matchmaking / Waiting Overlay */}
            {!myColor && !gameResult && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-40">
                {roomError ? (
                  <div className="text-center animate-in fade-in zoom-in duration-300">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-red-400 mb-2">Error</h3>
                    <p className="text-gray-400">{roomError}</p>
                    <p className="text-sm text-gray-500 mt-4">Returning to lobby...</p>
                  </div>
                ) : inviteCode ? (
                  <div className="text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping"></div>
                      <div className="text-2xl">🔗</div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Private Room Created</h3>
                    <p className="text-gray-400 text-sm mb-6">Share this code with your friend</p>
                    <div className="bg-black/50 border border-white/10 px-8 py-4 rounded-xl font-mono text-4xl text-emerald-400 font-bold tracking-[0.2em] shadow-inner mb-6 mx-auto inline-block">
                      {inviteCode}
                    </div>
                    <div className="flex justify-center flex-col items-center">
                      <div className="flex h-1.5 w-1.5 relative mb-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Waiting for them to join...</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full border-t-2 border-blue-400 animate-spin"></div>
                      <div className="text-2xl">🔍</div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Finding Opponent</h3>
                    <p className="text-gray-400 text-sm max-w-[250px] mx-auto leading-relaxed">
                      Searching for a player seeking a match with the same time control...
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Game Over Modal Overlay */}
            {gameResult && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in duration-300">
                <div className="bg-[#16181C]/90 p-8 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center text-center max-w-[80%] backdrop-blur-md">

                  {/* Icon */}
                  <div className="text-5xl mb-4 drop-shadow-lg">
                    {gameResult.result === "abandoned" ? "🏆" :
                      gameResult.result === "timeout" ? (gameResult.winner === myColor ? "🏆" : "⏳") :
                        gameResult.result === "resignation" ? (gameResult.winner === myColor ? "🏆" : "🏳️") :
                          gameResult.result === "checkmate" ? (gameResult.winner === myColor ? "🏆" : "💀") :
                            "🤝"}
                  </div>

                  <h2 className={`text-3xl font-black mb-2 tracking-tight ${gameResult.winner === myColor || gameResult.result === "abandoned" ? "text-emerald-400" :
                    gameResult.result === "draw" || gameResult.result === "draw_agreed" || gameResult.result === "stalemate" ? "text-blue-400" : "text-white"
                    }`}>
                    {gameResult.result === "abandoned" ? "You Won!" :
                      gameResult.result === "timeout" ? (gameResult.winner === myColor ? "You Won!" : "Time's Up!") :
                        gameResult.result === "resignation" ? (gameResult.winner === myColor ? "You Won!" : "You Resigned") :
                          gameResult.result === "checkmate" ? (gameResult.winner === myColor ? "You Won!" : "Game Over") :
                            "It's a Draw"}
                  </h2>

                  {/* Subtitle */}
                  <p className="text-gray-400 text-sm mb-8">
                    {gameResult.result === "checkmate" && gameResult.winner === myColor ? "Brilliant checkmate." :
                      gameResult.result === "checkmate" && gameResult.winner !== myColor ? "You were checkmated by the opponent." :
                        gameResult.result === "timeout" && gameResult.winner === myColor ? "Your opponent ran out of time." :
                          gameResult.result === "timeout" && gameResult.winner !== myColor ? "You ran out of time." :
                            gameResult.result === "resignation" && gameResult.winner === myColor ? "Your opponent has resigned." :
                              gameResult.result === "resignation" && gameResult.winner !== myColor ? "You conceded the match." :
                                gameResult.result === "abandoned" ? "Your opponent abandoned the match." :
                                  gameResult.result === "draw_agreed" ? "A draw was agreed upon by mutual consent." :
                                    "The game ended in a stalemate or agreed draw."}
                  </p>

                  {/* Play Again Button */}
                  <button
                    onClick={() => {
                      navigate("/");
                    }}
                    className="group relative px-8 py-3 w-full font-bold text-white rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Back to Lobby
                  </button>

                </div>
              </div>
            )}

            {/* Draw Offer Modal */}
            {drawOfferReceived && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40">
                <div className="bg-[#1e2430] p-6 rounded-2xl border border-blue-500/30 shadow-2xl flex flex-col items-center text-center max-w-[80%]">
                  <div className="text-3xl mb-3">🤝</div>
                  <h3 className="text-xl font-bold text-white mb-2">Draw Offered</h3>
                  <p className="text-sm text-gray-400 mb-6">Your opponent has offered a draw.</p>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => {
                        socket.send(JSON.stringify({ type: REJECT_DRAW }));
                        setDrawOfferReceived(false);
                      }}
                      className="flex-1 py-2 px-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => {
                        socket.send(JSON.stringify({ type: ACCEPT_DRAW }));
                        setDrawOfferReceived(false);
                      }}
                      className="flex-1 py-2 px-4 rounded-xl font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors border border-blue-500/30"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Captured White Pieces */}
          <div className="flex gap-1 mt-2 h-6 items-center overflow-hidden">
            {capturedWhite.map((piece, i) => (
              <div key={i} className="w-5 h-full flex items-center justify-center">
                <img
                  src={`/pieces/w${piece.toUpperCase()}.webp`}
                  className="w-full h-full object-contain opacity-90 drop-shadow-sm"
                  alt={`Captured ${piece}`}
                />
              </div>
            ))}
            {materialDiff < 0 && (
              <span className="text-emerald-400 font-bold ml-2 text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">
                +{Math.abs(materialDiff)}
              </span>
            )}
          </div>

          {/* Player Clock (Bottom) */}
          {myColor && (
            <div className="flex justify-end mt-2 w-full">
              <ChessClock
                time={myColor === "white" ? whiteTime : blackTime}
                isActive={isMyTurn && gameResult === null && moveHistory.length > 0}
                color={myColor}
              />
            </div>
          )}
          {/* Toast Notification for Rejected Draw */}
          {showDrawRejectedToast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-medium shadow-lg backdrop-blur-md z-50 animate-in slide-in-from-bottom flex items-center gap-2">
              <span>✕</span> Your draw offer was declined.
            </div>
          )}

        </div>

        {/* MOVE PANEL & ACTION BUTTONS */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col h-[512px] lg:h-auto self-stretch justify-center">

          <div className="bg-[#16181C] border border-white/10 rounded-2xl p-0 overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex-1 min-h-[400px]">
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

          {/* Action Buttons */}
          {myColor && gameResult === null && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to resign?")) {
                    socket.send(JSON.stringify({ type: RESIGN }));
                  }
                }}
                className="flex-1 bg-[#16181C] hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all rounded-xl py-3 text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2"
              >
                <span>🏳️</span> Resign
              </button>

              <button
                onClick={() => {
                  socket.send(JSON.stringify({ type: OFFER_DRAW }));
                  alert("Draw offer sent to opponent.");
                }}
                className="flex-1 bg-[#16181C] hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 border border-white/10 hover:border-blue-500/30 transition-all rounded-xl py-3 text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2"
              >
                <span>🤝</span> Offer Draw
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};