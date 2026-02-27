import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { ChessBoard } from "../components/ChessBoard";
import { useState } from "react";
import { Chess } from "chess.js";

export const Landing = () => {
  const navigate = useNavigate();
  const [chess] = useState(new Chess());
  const board = chess.board();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 overflow-hidden">

      {/* Decorative blurred background shapes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-emerald-900/10 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 translate-y-1/2 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Navigation */}
      <nav className="relative w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-3 select-none">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-5 h-5 text-[#0a0a0a]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9 7h6zM5 10l2-2 3 2v6H5zM14 10l3-2 2 2v6h-5zM5 18h14v3H5z" /></svg>
          </div>
          <span className="text-2xl font-bold font-outfit tracking-tight text-white">Project Chess</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-16 pb-24 mt-8 lg:mt-0 z-10">

        {/* Left Column (Copy) */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold tracking-wide text-zinc-300 uppercase">Beta Access Live</span>
          </div>

          <h1 className="text-[3.5rem] md:text-[5rem] lg:text-[5.5rem] font-black font-outfit tracking-tighter leading-[1] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-8">
            Master the <br />
            board.
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 font-medium leading-relaxed mb-10 max-w-lg">
            Experience chess in its purest form. A distraction-free,
            blisteringly fast environment designed specifically for focus and performance.
          </p>

          <Button
            onClick={() => navigate("/game")}
            className="px-10 py-4"
          >
            Start Playing Now
            <svg className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
        </div>

        {/* Right Column (Preview Board) */}
        <div className="flex-1 w-full w-max-[500px] relative perspective-[1200px] flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[480px] xl:max-w-[540px] transition-transform duration-1000 ease-out hover:scale-[1.02] shadow-[0_30px_100px_rgba(0,0,0,0.6)] mix-blend-plus-lighter lg:mix-blend-normal">

            <div className="pointer-events-none select-none ring-1 ring-white/10 rounded-2xl overflow-hidden bg-[#16181C] relative">
              <ChessBoard
                board={board}
                socket={{} as WebSocket}
                myColor="white"
                isMyTurn={false}
              />
              {/* Fade Overlay to make it feel like a background element rather than interactive UI */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a]/80 via-[#0a0a0a]/20 to-transparent pointer-events-none" />
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};
