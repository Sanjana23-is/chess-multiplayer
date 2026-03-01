import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

interface GameHistory {
    id: string;
    status: string;
    result: string | null;
    winner: "white" | "black" | null;
    whiteTime: number;
    blackTime: number;
    createdAt: string;
    whitePlayerId: string | null;
    blackPlayerId: string | null;
    whitePlayer: { id: string; name: string; rating: number } | null;
    blackPlayer: { id: string; name: string; rating: number } | null;
}

export const Profile = () => {
    const { user, token, logout, loading } = useAuth();
    const navigate = useNavigate();
    const [games, setGames] = useState<GameHistory[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            navigate("/login");
            return;
        }

        if (token && user) {
            fetch("http://localhost:8080/api/auth/me/games", {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.games) {
                        setGames(data.games);
                    }
                })
                .catch(err => console.error("Failed to fetch games", err))
                .finally(() => setFetching(false));
        }
    }, [user, token, loading, navigate]);

    if (loading || fetching) {
        return <div className="min-h-screen text-neutral-900 dark:text-white flex justify-center items-center transition-colors duration-300">Loading...</div>;
    }

    if (!user) return null;

    return (
        <div className="relative min-h-screen flex flex-col text-neutral-900 dark:text-zinc-100 p-4 sm:p-6 md:p-8 font-sans selection:bg-emerald-500/30 overflow-x-hidden transition-colors duration-300">
            {/* Abstract Background Blobs - Light Mode */}
            <div className="dark:hidden absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] bg-blue-300/10 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-multiply" />
            <div className="dark:hidden absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] bg-rose-200/20 rounded-full blur-[150px] pointer-events-none z-0 mix-blend-multiply" />

            {/* Abstract Background Blobs - Dark Mode */}
            <div className="hidden dark:block absolute top-[10%] left-[-5%] w-[40%] h-[50%] rounded-full bg-gradient-to-r from-cyan-900 to-blue-900 opacity-[0.1] blur-[100px] pointer-events-none z-0" />
            <div className="hidden dark:block absolute bottom-[-10%] right-[-5%] w-[55%] h-[65%] rounded-full bg-gradient-to-l from-emerald-800 to-rose-900 opacity-[0.1] blur-[120px] pointer-events-none z-0" />

            {/* Navigation */}
            <nav className="flex-none relative z-10 mb-6 md:mb-8 flex justify-between items-center w-full max-w-5xl mx-auto">
                <Link to="/" className="flex items-center gap-3 select-none hover:opacity-80 transition group">
                    <div className="w-10 h-10 bg-emerald-500 dark:bg-gradient-to-br dark:from-emerald-400 dark:to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-5 h-5 text-white dark:text-[#0a0a0a]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9 7h6zM5 10l2-2 3 2v6H5zM14 10l3-2 2 2v6h-5zM5 18h14v3H5z" /></svg>
                    </div>
                    <span className="text-2xl font-bold font-outfit tracking-tight text-neutral-900 dark:text-white">Project Chess</span>
                </Link>
                <div className="flex items-center gap-4">
                    <button onClick={() => { logout(); navigate("/"); }} className="text-sm px-4 py-2 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition font-medium shadow-sm">
                        Logout
                    </button>
                </div>
            </nav>

            <main className="flex-1 relative z-10 w-full max-w-5xl mx-auto flex flex-col gap-6 md:gap-8 pb-8">
                {/* Profile Header */}
                <section className="flex-none bg-white/60 dark:bg-white/[0.02] border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between backdrop-blur-xl dark:backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-2xl transition-all duration-300 gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">{user.name}</h1>
                        <p className="text-neutral-500 dark:text-zinc-400 font-medium">{user.email}</p>
                    </div>
                    <div className="text-left md:text-right bg-white/50 dark:bg-black/40 px-6 py-4 rounded-xl border border-white/60 dark:border-white/5 shadow-inner backdrop-blur-md">
                        <div className="flex items-center md:justify-end gap-1.5 mb-1">
                            <p className="uppercase text-[11px] font-black text-emerald-800 dark:text-zinc-500 tracking-[0.2em]">Current Rating</p>
                            <span
                                title="Elo is a global chess rating system. You gain points by winning, and lose points by losing, based on your opponent's skill level."
                                className="cursor-help w-3 h-3 rounded-full border border-emerald-800 dark:border-zinc-500 flex items-center justify-center text-[8px] font-bold text-emerald-800 dark:text-zinc-500 hover:bg-emerald-800 hover:text-white dark:hover:bg-zinc-500 dark:hover:text-black transition-colors"
                            >?</span>
                        </div>
                        <p className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400">{user.rating}</p>
                    </div>
                </section>

                {/* Game History */}
                <section className="flex-1 flex flex-col min-h-0 bg-transparent">
                    <h2 className="flex-none text-2xl font-bold mb-4 text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-white/10 pb-3">Recent Games</h2>

                    {games.length === 0 ? (
                        <div className="bg-white/60 dark:bg-white/[0.02] border border-white/50 dark:border-white/10 rounded-2xl p-12 text-center shadow-sm backdrop-blur-xl">
                            <p className="text-neutral-500 dark:text-zinc-500 font-medium text-lg">No games played yet. <Link to="/" className="text-emerald-600 dark:text-emerald-400 hover:underline">Go play a match!</Link></p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 bg-white/60 dark:bg-white/[0.02] border border-white/50 dark:border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl dark:backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-2xl transition-all duration-300">
                            <div className="flex-1 overflow-x-auto overflow-y-auto">
                                <table className="w-full text-left border-collapse min-w-[600px] relative">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-emerald-50/90 dark:bg-[#0f1115]/90 backdrop-blur-lg text-neutral-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider border-b border-white/60 dark:border-white/5 shadow-sm">
                                            <th className="py-4 px-6 font-bold">Result</th>
                                            <th className="py-4 px-6 font-bold">Opponent</th>
                                            <th className="py-4 px-6 font-bold text-right">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/50 dark:divide-white/5 text-sm">
                                        {games.map(game => {
                                            const isWhite = game.whitePlayerId === user.id;
                                            const myColor = isWhite ? 'white' : 'black';
                                            const opponent = isWhite ? (game.blackPlayer || { name: 'Guest', rating: '?' }) : (game.whitePlayer || { name: 'Guest', rating: '?' });

                                            let resultText = "In Progress";
                                            let resultColor = "text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20";

                                            if (game.status === "FINISHED") {
                                                if (game.result === "draw" || game.result === "stalemate" || game.result === "draw_agreed") {
                                                    resultText = "Draw";
                                                    resultColor = "text-neutral-600 dark:text-zinc-400 bg-white/60 dark:bg-white/5 border-white/80 dark:border-white/10";
                                                } else if (game.winner === myColor) {
                                                    resultText = "Victory";
                                                    resultColor = "text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20";
                                                } else {
                                                    resultText = "Defeat";
                                                    resultColor = "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20";
                                                }
                                            }

                                            return (
                                                <tr key={game.id} className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors group">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2.5 py-1 rounded-md font-bold text-xs border ${resultColor} shadow-sm`}>{resultText}</span>
                                                            {game.result && <span className="text-[11px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wide">({game.result.replace('_', ' ')})</span>}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-3.5 h-3.5 rounded shadow-sm ${isWhite ? 'bg-white border border-neutral-300 dark:border-zinc-300' : 'bg-neutral-800 border border-neutral-900 dark:border-zinc-600'}`} title={`Played as ${myColor}`} />
                                                            <span className="font-bold text-neutral-900 dark:text-zinc-200">{opponent.name}</span>
                                                            <span className="text-[11px] font-bold text-neutral-400 dark:text-zinc-500 bg-white/60 dark:bg-white/5 px-2 py-0.5 rounded-full border border-white/80 dark:border-white/5">{opponent.rating} Elo</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm font-medium text-neutral-500 dark:text-zinc-400 text-right">
                                                        {new Date(game.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>
            </main>

        </div>
    );
};
