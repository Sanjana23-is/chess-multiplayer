import { ChessBoard } from "../components/ChessBoard";
import { useSocket } from "../hooks/useSocket";
import { useEffect, useState, useRef } from "react";
import { Chess } from "chess.js";
import { ChessClock } from "../components/ChessClock";
import { useLocation, useNavigate } from "react-router-dom";
import { useAudio } from "../hooks/useAudio";
import { useAuth } from "../context/AuthContext";

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
export const CHAT_MESSAGE = "chat_message";

type ChatMessageItem = {
  sender: "white" | "black";
  text: string;
};

type GameResult = {
  result: "checkmate" | "stalemate" | "draw" | "abandoned" | "timeout" | "resignation" | "draw_agreed";
  winner: "white" | "black" | null;
  newRating?: number;
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
  const { user, updateUser } = useAuth();
  const { playSound, toggleMute, isMuted } = useAudio();
  const [mutedUi, setMutedUi] = useState(isMuted.current);

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
  }, [socket, location.state, navigate]);

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

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

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
          setChatMessages([]);

          if (message.payload?.color) {
            setMyColor(message.payload.color);
            // Play start sound only when we are fully assigned to a game
            playSound("game-start");
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
              playSound("capture");
            } else {
              playSound("move");
            }

            // After applying move, see if the next state is check
            if (payload.fen) {
              const checkTest = new Chess(payload.fen);
              if (checkTest.inCheck()) {
                playSound("check");
              }
            }
          }

          break;
        }

        case GAME_OVER: {
          let updatedRating: number | undefined;

          if (message.payload.newRatings && user && myColor) {
            updatedRating = myColor === "white"
              ? message.payload.newRatings.whiteElo
              : message.payload.newRatings.blackElo;

            if (updatedRating !== undefined && updatedRating !== user.rating) {
              updateUser({ ...user, rating: updatedRating });
            }
          }

          setGameResult({
            result: message.payload.result,
            winner: message.payload.winner ?? null,
            newRating: updatedRating
          });
          setDrawOfferReceived(false);
          playSound("game-end");
          break;
        }

        case OPPONENT_DISCONNECTED: {
          let updatedRating: number | undefined;

          if (message.payload.newRatings && user && myColor) {
            updatedRating = myColor === "white"
              ? message.payload.newRatings.whiteElo
              : message.payload.newRatings.blackElo;

            if (updatedRating !== undefined && updatedRating !== user.rating) {
              updateUser({ ...user, rating: updatedRating });
            }
          }

          setGameResult({
            result: "abandoned",
            winner: myColor,
            newRating: updatedRating
          });
          setDrawOfferReceived(false);
          playSound("game-end");
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

        case CHAT_MESSAGE: {
          setChatMessages(prev => [...prev, message.payload]);
          if (!isChatOpenRef.current) {
            setUnreadChatCount(prev => prev + 1);
          }
          break;
        }
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, myColor, playSound, navigate]);

  if (!socket) return <div className="min-h-screen flex justify-center items-center bg-neutral-50 dark:bg-[#0a0a0a] text-neutral-900 dark:text-white transition-colors duration-300">Connecting...</div>;

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
    <div className="relative min-h-screen w-full flex justify-center items-start text-neutral-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/30 transition-colors duration-300 overflow-x-hidden">

      {/* Abstract Background Blobs - Light Mode */}
      <div className="dark:hidden absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] bg-blue-300/10 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-multiply" />
      <div className="dark:hidden absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] bg-rose-200/20 rounded-full blur-[150px] pointer-events-none z-0 mix-blend-multiply" />

      {/* Abstract Background Blobs - Dark Mode */}
      <div className="hidden dark:block absolute top-[10%] left-[-5%] w-[40%] h-[50%] rounded-full bg-gradient-to-r from-cyan-900 to-blue-900 opacity-[0.1] blur-[100px] pointer-events-none z-0" />
      <div className="hidden dark:block absolute bottom-[-10%] right-[-5%] w-[55%] h-[65%] rounded-full bg-gradient-to-l from-emerald-800 to-rose-900 opacity-[0.1] blur-[120px] pointer-events-none z-0" />

      {/* Top Left Controls */}
      <div className="absolute top-6 left-6 flex items-center gap-3 z-50">
        <button
          onClick={() => {
            const isNowMuted = toggleMute();
            setMutedUi(isNowMuted);
          }}
          className="p-3 bg-white hover:bg-neutral-50 dark:bg-white/5 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-2 font-bold text-sm shadow-sm"
        >
          <span>{mutedUi ? "🔇" : "🔊"}</span>
          <span className="hidden sm:inline">{mutedUi ? "Muted" : "Sound On"}</span>
        </button>
      </div>



      <div className="relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-12 w-full max-w-6xl justify-center px-4 sm:px-6 items-center lg:items-center py-4 sm:py-8">

        {/* BOARD AREA (Center Column) */}
        <div className="flex flex-col w-full max-w-[512px] shrink-0">

          {/* Opponent Clock (Mobile Fallback - Top) */}
          {myColor && (
            <div className="flex lg:hidden justify-end mb-3 w-full">
              <ChessClock
                time={myColor === "white" ? blackTime : whiteTime}
                isActive={!isMyTurn && gameResult === null && moveHistory.length > 0}
                color={myColor === "white" ? "black" : "white"}
              />
            </div>
          )}

          {/* TURN INFO HEADER separated from the board */}
          {myColor && (
            <div className="flex items-center justify-between bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 rounded-xl px-4 py-3 mb-3 backdrop-blur-xl dark:backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-none transition-all">
              <div className="text-sm font-medium text-neutral-600 dark:text-gray-300">
                You are <span className="font-bold text-neutral-900 dark:text-white capitalize">{myColor}</span>
              </div>

              <div className={`text-xs px-3 py-1.5 rounded-md font-bold uppercase tracking-wider ${gameResult
                ? (gameResult.winner === myColor
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                  : gameResult.result === "abandoned"
                    ? "bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20"
                    : gameResult.result === "draw_agreed" || gameResult.result === "draw" || gameResult.result === "stalemate"
                      ? "bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                      : "bg-red-100 text-red-700 border border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20")
                : (isMyTurn ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-neutral-100 text-neutral-500 border border-neutral-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/5")
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

          {/* Captured Black Pieces (Top of the board) */}
          <div className="flex gap-1 mb-1.5 h-6 items-center overflow-hidden px-1">
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
              <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-2 text-xs bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-transparent px-1.5 py-0.5 rounded shadow-sm">
                +{materialDiff}
              </span>
            )}
          </div>

          <div className="relative z-10 mt-1 w-full max-w-[512px]">
            {/* Desktop Timers (Floating Left) */}
            {myColor && (
              <div className="hidden lg:flex absolute right-[100%] top-0 bottom-0 pr-6 flex-col justify-between items-end pointer-events-none w-[180px]">
                <div className="pointer-events-auto">
                  <ChessClock
                    time={myColor === "white" ? blackTime : whiteTime}
                    isActive={!isMyTurn && gameResult === null && moveHistory.length > 0}
                    color={myColor === "white" ? "black" : "white"}
                  />
                </div>
                <div className="pointer-events-auto">
                  <ChessClock
                    time={myColor === "white" ? whiteTime : blackTime}
                    isActive={isMyTurn && gameResult === null && moveHistory.length > 0}
                    color={myColor}
                  />
                </div>
              </div>
            )}

            <div className={`w-full aspect-square border border-white/60 dark:border-white/10 bg-white/60 dark:bg-black/20 backdrop-blur-md relative flex items-center justify-center rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all`}>
              <ChessBoard
                socket={socket}
                board={board}
                myColor={myColor ?? "white"}
                isMyTurn={isMyTurn}
                chess={chess}
              />

              {/* Matchmaking / Waiting Overlay */}
              {!myColor && !gameResult && (
                <div className="absolute inset-0 bg-white/90 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-40 transition-colors">
                  {roomError ? (
                    <div className="text-center animate-in fade-in zoom-in duration-300">
                      <div className="text-4xl mb-4">⚠️</div>
                      <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Error</h3>
                      <p className="text-neutral-600 dark:text-gray-400">{roomError}</p>
                      <p className="text-sm text-neutral-500 dark:text-gray-500 mt-4">Returning to lobby...</p>
                    </div>
                  ) : inviteCode ? (
                    <div className="text-center animate-in fade-in zoom-in duration-500">
                      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border border-emerald-300 dark:border-emerald-500/30 animate-ping"></div>
                        <div className="text-2xl">🔗</div>
                      </div>
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Private Room Created</h3>
                      <p className="text-neutral-600 dark:text-gray-400 text-sm mb-6">Share this code with your friend</p>
                      <div className="bg-neutral-50 dark:bg-black/50 border border-neutral-200 dark:border-white/10 px-8 py-4 rounded-xl font-mono text-4xl text-emerald-600 dark:text-emerald-400 font-bold tracking-[0.2em] shadow-inner mb-6 mx-auto inline-block">
                        {inviteCode}
                      </div>
                      <div className="flex justify-center flex-col items-center">
                        <div className="flex h-1.5 w-1.5 relative mb-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 dark:bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 dark:bg-emerald-500"></span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-gray-500 uppercase tracking-widest font-semibold">Waiting for them to join...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center animate-in fade-in zoom-in duration-500">
                      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 dark:border-blue-400 animate-spin"></div>
                        <div className="text-2xl">🔍</div>
                      </div>
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Finding Opponent</h3>
                      <p className="text-neutral-600 dark:text-gray-400 text-sm max-w-[250px] mx-auto leading-relaxed">
                        Searching for a player seeking a match with the same time control...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Game Over Modal Overlay */}
              {gameResult && (
                <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in duration-300 transition-colors">
                  <div className="bg-white/70 dark:bg-black/40 p-8 rounded-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-2xl flex flex-col items-center text-center max-w-[80%] backdrop-blur-xl dark:backdrop-blur-md">

                    {/* Icon */}
                    <div className="text-5xl mb-4 drop-shadow-lg">
                      {gameResult.result === "abandoned" ? "🏆" :
                        gameResult.result === "timeout" ? (gameResult.winner === myColor ? "🏆" : "⏳") :
                          gameResult.result === "resignation" ? (gameResult.winner === myColor ? "🏆" : "🏳️") :
                            gameResult.result === "checkmate" ? (gameResult.winner === myColor ? "🏆" : "💀") :
                              "🤝"}
                    </div>

                    <h2 className={`text-3xl font-black mb-2 tracking-tight ${gameResult.winner === myColor || gameResult.result === "abandoned" ? "text-emerald-600 dark:text-emerald-400" :
                      gameResult.result === "draw" || gameResult.result === "draw_agreed" || gameResult.result === "stalemate" ? "text-blue-600 dark:text-blue-400" : "text-neutral-900 dark:text-white"
                      }`}>
                      {gameResult.result === "abandoned" ? "You Won!" :
                        gameResult.result === "timeout" ? (gameResult.winner === myColor ? "You Won!" : "Time's Up!") :
                          gameResult.result === "resignation" ? (gameResult.winner === myColor ? "You Won!" : "You Resigned") :
                            gameResult.result === "checkmate" ? (gameResult.winner === myColor ? "You Won!" : "Game Over") :
                              "It's a Draw"}
                    </h2>

                    {/* Subtitle */}
                    <p className="text-neutral-500 dark:text-gray-400 text-sm mb-4">
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

                    {/* Rating Changes */}
                    {gameResult.newRating !== undefined && user && (
                      <div className="mb-8 flex items-center justify-center gap-3">
                        <span className="text-neutral-500 dark:text-gray-500 font-bold uppercase text-xs tracking-widest">New Rating</span>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white">{gameResult.newRating}</span>
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full border shadow-sm ${gameResult.newRating > user.rating ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/20 dark:border-transparent dark:text-emerald-400" : gameResult.newRating < user.rating ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-500/20 dark:border-transparent dark:text-red-400" : "bg-neutral-100 border-neutral-200 text-neutral-600 dark:bg-gray-500/20 dark:border-transparent dark:text-gray-400"}`}>
                          {gameResult.newRating > user.rating ? "+" : ""}{gameResult.newRating - user.rating}
                        </span>
                      </div>
                    )}

                    {!gameResult.newRating && <div className="mb-4"></div>}

                    {/* Play Again Button */}
                    <button
                      onClick={() => {
                        navigate("/");
                      }}
                      className="group relative px-8 py-3 w-full font-bold text-white rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-gradient-to-br dark:from-emerald-500 dark:to-emerald-600 dark:hover:from-emerald-400 dark:hover:to-emerald-500 shadow-lg shadow-emerald-600/20 dark:shadow-[0_0_20px_rgba(16,185,129,0.3)] dark:hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Back to Lobby
                    </button>

                  </div>
                </div>
              )}

              {/* Draw Offer Modal */}
              {drawOfferReceived && (
                <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-md flex items-center justify-center z-40 transition-colors">
                  <div className="bg-white/70 dark:bg-[#1e2430] p-6 rounded-2xl border border-white/50 dark:border-blue-500/30 shadow-xl dark:shadow-2xl flex flex-col items-center text-center max-w-[80%] backdrop-blur-xl">
                    <div className="text-3xl mb-3">🤝</div>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Draw Offered</h3>
                    <p className="text-sm text-neutral-500 dark:text-gray-400 mb-6">Your opponent has offered a draw.</p>

                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => {
                          socket.send(JSON.stringify({ type: REJECT_DRAW }));
                          setDrawOfferReceived(false);
                        }}
                        className="flex-1 py-2 px-4 rounded-xl font-bold bg-white/50 hover:bg-white/80 text-neutral-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white transition-colors border border-white/60 dark:border-white/10 shadow-sm"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => {
                          socket.send(JSON.stringify({ type: ACCEPT_DRAW }));
                          setDrawOfferReceived(false);
                        }}
                        className="flex-1 py-2 px-4 rounded-xl font-bold bg-blue-50/70 hover:bg-blue-100/80 text-blue-700 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-blue-400 transition-colors border border-blue-200/50 dark:border-blue-500/30 shadow-sm"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Captured White Pieces (Bottom of the board) */}
          <div className="flex gap-1 mt-2.5 h-6 items-center overflow-hidden px-1">
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
              <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-2 text-xs bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-transparent px-1.5 py-0.5 rounded shadow-sm">
                +{Math.abs(materialDiff)}
              </span>
            )}
          </div>


          {/* Player Clock (Mobile Fallback - Bottom) */}
          {myColor && (
            <div className="flex lg:hidden justify-end mt-2 w-full">
              <ChessClock
                time={myColor === "white" ? whiteTime : blackTime}
                isActive={isMyTurn && gameResult === null && moveHistory.length > 0}
                color={myColor}
              />
            </div>
          )}

          {/* Toast Notification for Rejected Draw */}
          {showDrawRejectedToast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-md z-50 animate-in slide-in-from-bottom flex items-center gap-2">
              <span>✕</span> Your draw offer was declined.
            </div>
          )}

        </div>

        {/* MOVE PANEL & ACTION BUTTONS */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col h-auto min-h-[300px] lg:min-h-[512px] self-stretch justify-between py-2">

          <div className="bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 rounded-3xl p-0 overflow-hidden flex flex-col backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.4)] flex-1 min-h-[150px] transition-all">
            <div className="text-sm font-bold uppercase tracking-wide bg-white/5 dark:bg-white/[0.02] border-b border-white/10 dark:border-white/5 px-4 py-3 text-neutral-300 dark:text-gray-300 shrink-0 flex items-center justify-between transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <span>Move History</span>
              <span className="text-[10px] bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-bold">{moveHistory.length} moves</span>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
              <div className="flex flex-col text-[13px] leading-relaxed">
                {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                  const whiteMove = moveHistory[i * 2];
                  const blackMove = moveHistory[i * 2 + 1];
                  const isLatestWhite = i * 2 === moveHistory.length - 1;
                  const isLatestBlack = i * 2 + 1 === moveHistory.length - 1;

                  return (
                    <div key={i} className={`flex border-b border-white/10 dark:border-white/5 ${i % 2 === 0 ? "bg-white/5 dark:bg-white/[0.02]" : "bg-transparent"} hover:bg-white/10 dark:hover:bg-white/[0.06] transition-colors`}>
                      <div className="w-10 py-1.5 text-center text-neutral-500 font-mono border-r border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/20 select-none flex items-center justify-center text-xs font-bold shadow-inner">
                        {i + 1}
                      </div>

                      <div className={`flex-1 flex items-center py-1.5 px-3 font-mono font-medium ${isLatestWhite ? "bg-emerald-500/20 text-emerald-400 font-bold shadow-inner" : "text-neutral-300 dark:text-gray-300"}`}>
                        {whiteMove ? `${whiteMove.from} → ${whiteMove.to}` : ""}
                      </div>

                      <div className={`flex-1 flex items-center py-1.5 px-3 font-mono font-medium border-l border-white/10 dark:border-white/5 border-dashed ${isLatestBlack ? "bg-emerald-500/20 text-emerald-400 font-bold shadow-inner" : "text-neutral-300 dark:text-gray-300"}`}>
                        {blackMove ? `${blackMove.from} → ${blackMove.to}` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons & Chat Toggle */}
          {myColor && gameResult === null && (
            <div className="flex flex-col gap-3 mt-4">
              {!isChatOpen && (
                <button
                  onClick={() => {
                    setIsChatOpen(true);
                    setUnreadChatCount(0);
                  }}
                  className="w-full bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-white/5 text-neutral-600 hover:text-neutral-900 dark:text-gray-400 dark:hover:text-white border border-white/60 dark:border-white/10 transition-all rounded-xl py-3 text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm backdrop-blur-md"
                >
                  <span>💬</span> Open Chat
                  {unreadChatCount > 0 && (
                    <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs normal-case tracking-normal">
                      {unreadChatCount} new
                    </span>
                  )}
                </button>
              )}

              {/* CHAT PANEL */}
              {isChatOpen && (
                <div className="bg-white/60 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl flex flex-col backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex-1 min-h-[250px] overflow-hidden transition-colors relative">
                  <div className="flex items-center justify-between bg-white/40 dark:bg-white/5 border-b border-white/60 dark:border-white/5 px-6 py-3 shadow-inner">
                    <span className="text-sm font-bold uppercase tracking-wide text-neutral-600 dark:text-white/80">Live Chat</span>
                    <button onClick={() => setIsChatOpen(false)} className="text-neutral-500 hover:text-neutral-800 dark:text-gray-400 dark:hover:text-white text-xl leading-none px-2">&times;</button>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent min-h-[150px]">
                    {chatMessages.length === 0 ? (
                      <div className="m-auto text-xs font-medium text-neutral-400 dark:text-gray-500 italic">Say hi to your opponent!</div>
                    ) : (
                      chatMessages.map((msg, idx) => {
                        const isMe = msg.sender === myColor;
                        return (
                          <div key={idx} className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] shadow-sm font-medium ${isMe ? 'bg-emerald-600 dark:bg-emerald-600 text-white self-end rounded-tr-sm' : 'bg-white/50 dark:bg-white/[0.05] text-neutral-800 dark:text-gray-200 self-start rounded-tl-sm border border-white/60 dark:border-white/5 backdrop-blur-md'}`}>
                            {msg.text}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input Area */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!chatInput.trim()) return;
                      socket.send(JSON.stringify({ type: CHAT_MESSAGE, payload: { text: chatInput.trim() } }));
                      setChatInput("");
                    }}
                    className="p-3 bg-black/20 dark:bg-black/40 border-t border-white/10 dark:border-white/5 flex gap-2 transition-colors shadow-inner"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/10 dark:bg-black/40 border border-white/20 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-white dark:text-white placeholder-neutral-400 dark:placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner backdrop-blur-md"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-bold transition-colors shadow-sm"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to resign?")) {
                      socket.send(JSON.stringify({ type: RESIGN }));
                    }
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-red-500/10 text-neutral-300 hover:text-red-400 dark:text-gray-400 dark:hover:text-red-400 border border-white/10 hover:border-red-300 dark:border-white/5 dark:hover:border-red-500/30 transition-all rounded-xl py-3 text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-md"
                >
                  <span>🏳️</span> Resign
                </button>

                <button
                  onClick={() => {
                    socket.send(JSON.stringify({ type: OFFER_DRAW }));
                    alert("Draw offer sent to opponent.");
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-blue-500/10 text-neutral-300 hover:text-blue-400 dark:text-gray-400 dark:hover:text-blue-400 border border-white/10 hover:border-blue-300 dark:border-white/5 dark:hover:border-blue-500/30 transition-all rounded-xl py-3 text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-md"
                >
                  <span>🤝</span> Offer Draw
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};