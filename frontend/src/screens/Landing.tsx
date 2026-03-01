import { useNavigate, Link } from "react-router-dom";
import { ChessBoard } from "../components/ChessBoard";
import { useState } from "react";
import { Chess } from "chess.js";
import { useAuth } from "../context/AuthContext";

export const Landing = () => {
    const navigate = useNavigate();
    const [chess] = useState(new Chess());
    const board = chess.board();
    const { user, logout } = useAuth();

    const [activeTab, setActiveTab] = useState<"online" | "friend">("online");
    const [joinCode, setJoinCode] = useState("");

    return (
        <div className="relative min-h-screen text-neutral-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 overflow-x-hidden transition-colors duration-300 animate-in fade-in duration-500">

            {/* Decorative blurred background shapes - Light Mode */}
            <div className="dark:hidden absolute top-[10%] left-[5%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-multiply" />
            <div className="dark:hidden absolute bottom-[10%] right-[5%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-rose-300/10 rounded-full blur-[150px] pointer-events-none z-0 mix-blend-multiply" />

            {/* Decorative blurred background shapes - Dark Mode */}
            <div className="hidden dark:block absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-emerald-900/10 rounded-full blur-[150px] pointer-events-none z-0" />
            <div className="hidden dark:block absolute bottom-0 right-1/4 translate-x-1/2 translate-y-1/2 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none z-0" />

            {/* Navigation */}
            <nav className="relative w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3 select-none">
                    <div className="w-10 h-10 bg-emerald-500 dark:bg-gradient-to-br dark:from-emerald-400 dark:to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <svg className="w-5 h-5 text-white dark:text-[#0a0a0a]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9 7h6zM5 10l2-2 3 2v6H5zM14 10l3-2 2 2v6h-5zM5 18h14v3H5z" /></svg>
                    </div>
                    <span className="text-2xl font-bold font-outfit tracking-tight text-neutral-900 dark:text-white">Project Chess</span>
                </div>

                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <Link to="/profile" className="flex items-center gap-2.5 group" title="View Profile">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-200 dark:border-emerald-500/30 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/40 transition-colors shadow-sm">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-neutral-700 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors hidden sm:block">
                                    {user.name}
                                </span>
                            </Link>
                            <button onClick={logout} className="text-sm px-4 py-2 border border-neutral-300 dark:border-white/20 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 transition text-neutral-700 dark:text-white">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm px-4 py-2 font-medium text-neutral-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition">Login</Link>
                            <Link to="/register" className="text-sm px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition font-medium">Register</Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16 z-10 overflow-y-auto py-4 sm:py-6">

                {/* Left Column (Copy) */}
                <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/50 dark:bg-white/5 border border-emerald-100 dark:border-white/10 mb-8 backdrop-blur-md">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-semibold tracking-wide text-emerald-800 dark:text-zinc-300 uppercase">Beta Access Live</span>
                    </div>

                    <h1 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-black font-outfit tracking-tighter leading-[1] text-neutral-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:to-white/60 mb-3 mt-1">
                        Master the <br />
                        board.
                    </h1>

                    <p className="text-sm md:text-base text-neutral-600 dark:text-zinc-400 font-medium leading-relaxed mb-5 max-w-lg">
                        Experience chess in its purest form. A distraction-free,
                        blisteringly fast environment designed specifically for focus and performance.
                    </p>

                    <div className="w-full max-w-md bg-white/60 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-2xl p-4 backdrop-blur-xl dark:backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-2xl">
                        {/* TABS */}
                        <div className="flex gap-2 mb-3 p-1 bg-white/40 dark:bg-black/40 rounded-xl border border-white/60 dark:border-white/5 shadow-inner">
                            <button
                                onClick={() => setActiveTab("online")}
                                className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === "online" ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"}`}
                            >
                                Play Online
                            </button>
                            <button
                                onClick={() => setActiveTab("friend")}
                                className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === "friend" ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"}`}
                            >
                                Play a Friend
                            </button>
                        </div>

                        {/* TAB CONTENT */}
                        {activeTab === "online" ? (
                            <div className="flex flex-col gap-2">
                                <button onClick={() => navigate("/game", { state: { mode: "matchmaking", time: 600000 } })} className="w-full py-3 flex items-center px-4 bg-white/50 hover:bg-white/80 dark:bg-[#202228] dark:hover:bg-[#2A2C33] text-neutral-900 dark:text-white rounded-xl font-bold transition-all border border-white/40 dark:border-transparent shadow-sm">
                                    <span className="text-lg mr-2">🐢</span> 10 min Rapid
                                </button>
                                <button onClick={() => navigate("/game", { state: { mode: "matchmaking", time: 180000 } })} className="w-full py-3 flex items-center px-4 bg-white/50 hover:bg-white/80 dark:bg-[#202228] dark:hover:bg-[#2A2C33] text-neutral-900 dark:text-white rounded-xl font-bold transition-all border border-white/40 dark:border-transparent shadow-sm">
                                    <span className="text-lg mr-2">⚡</span> 3 min Blitz
                                </button>
                                <button onClick={() => navigate("/game", { state: { mode: "matchmaking", time: 60000 } })} className="w-full py-3 flex items-center px-4 bg-white/50 hover:bg-white/80 dark:bg-[#202228] dark:hover:bg-[#2A2C33] text-neutral-900 dark:text-white rounded-xl font-bold transition-all border border-white/40 dark:border-transparent shadow-sm">
                                    <span className="text-lg mr-2">🚀</span> 1 min Bullet
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-neutral-500 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">Create a Room</label>
                                    <button onClick={() => navigate("/game", { state: { mode: "create_private", time: 600000 } })} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/20">
                                        Create Private Room
                                    </button>
                                </div>

                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-neutral-200 dark:border-white/10"></div>
                                    <span className="flex-shrink-0 mx-4 text-neutral-400 dark:text-gray-500 text-xs font-medium uppercase">Or</span>
                                    <div className="flex-grow border-t border-neutral-200 dark:border-white/10"></div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-neutral-500 dark:text-gray-500 uppercase tracking-wider mb-1.5 block">Join a Room</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Enter 4-letter code"
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                            maxLength={4}
                                            className="w-full bg-white/50 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-gray-600 font-mono focus:outline-none focus:border-emerald-500/50 dark:focus:border-emerald-500/50 transition-all uppercase shadow-inner"
                                        />
                                        <button
                                            onClick={() => {
                                                if (joinCode.length === 4) navigate("/game", { state: { mode: "join_private", roomId: joinCode } });
                                            }}
                                            className="px-5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black text-sm font-bold rounded-xl hover:bg-neutral-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                            disabled={joinCode.length !== 4}
                                        >
                                            Join
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column (Preview Board) */}
                <div className="flex-1 w-full hidden md:flex justify-center lg:justify-end items-center">
                    <div className="group relative w-full max-w-[380px] lg:max-w-[460px] xl:max-w-[500px] transition-all duration-500 ease-out hover:scale-[1.02]">

                        {/* Ambient glow behind the board */}
                        <div className="absolute -inset-4 bg-emerald-500/10 dark:bg-emerald-400/8 rounded-3xl blur-2xl group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-400/15 transition-all duration-500 pointer-events-none" />

                        <div className="pointer-events-none select-none relative z-10 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.6)] ring-1 ring-neutral-200 dark:ring-white/10 group-hover:shadow-[0_30px_80px_rgba(16,185,129,0.15)] dark:group-hover:shadow-[0_30px_80px_rgba(16,185,129,0.12)] group-hover:ring-emerald-400/50 transition-all duration-500 bg-white dark:bg-black/20">
                            <ChessBoard
                                board={board}
                                socket={{} as WebSocket}
                                myColor="white"
                                isMyTurn={false}
                            />
                            {/* Subtle bottom fade so the board blends into the page naturally */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/40 dark:to-[#0E1014]/50 pointer-events-none" />
                        </div>

                    </div>
                </div>

            </main>
        </div>
    );
};
