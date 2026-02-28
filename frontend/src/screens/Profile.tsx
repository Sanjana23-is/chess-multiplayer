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
        return <div className="min-h-screen bg-neutral-800 flex justify-center items-center text-white">Loading...</div>;
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-8 font-sans selection:bg-emerald-500/30">

            {/* Navigation */}
            <nav className="mb-12 flex justify-between items-center max-w-5xl mx-auto">
                <Link to="/" className="flex items-center gap-3 select-none hover:opacity-80 transition">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <svg className="w-5 h-5 text-[#0a0a0a]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9 7h6zM5 10l2-2 3 2v6H5zM14 10l3-2 2 2v6h-5zM5 18h14v3H5z" /></svg>
                    </div>
                    <span className="text-2xl font-bold font-outfit tracking-tight text-white">Project Chess</span>
                </Link>
                <button onClick={() => { logout(); navigate("/"); }} className="text-sm px-4 py-2 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition">
                    Logout
                </button>
            </nav>

            <main className="max-w-5xl mx-auto space-y-12">
                {/* Profile Header */}
                <section className="bg-neutral-900/50 border border-white/10 p-8 rounded-2xl flex items-center justify-between backdrop-blur-sm">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2">{user.name}</h1>
                        <p className="text-zinc-400">{user.email}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-uppercase text-xs font-bold text-zinc-500 tracking-widest mb-1">RATING</p>
                        <p className="text-5xl font-black text-emerald-400">{user.rating}</p>
                    </div>
                </section>

                {/* Game History */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-4">Recent Games</h2>

                    {games.length === 0 ? (
                        <p className="text-zinc-500 italic">No games played yet. Go play a match!</p>
                    ) : (
                        <div className="bg-neutral-900/50 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-black/40 text-zinc-400 text-xs uppercase tracking-wider">
                                        <th className="py-4 px-6 font-medium">Result</th>
                                        <th className="py-4 px-6 font-medium">Players</th>
                                        <th className="py-4 px-6 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {games.map(game => {
                                        const isWhite = game.whitePlayerId === user.id;
                                        const myColor = isWhite ? 'white' : 'black';
                                        const opponent = isWhite ? (game.blackPlayer || { name: 'Guest', rating: '?' }) : (game.whitePlayer || { name: 'Guest', rating: '?' });

                                        let resultText = "In Progress";
                                        let resultColor = "text-yellow-500";

                                        if (game.status === "FINISHED") {
                                            if (game.result === "draw" || game.result === "stalemate" || game.result === "draw_agreed") {
                                                resultText = "Draw";
                                                resultColor = "text-zinc-400";
                                            } else if (game.winner === myColor) {
                                                resultText = "Won";
                                                resultColor = "text-emerald-400";
                                            } else {
                                                resultText = "Lost";
                                                resultColor = "text-red-400";
                                            }
                                        }

                                        return (
                                            <tr key={game.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="py-4 px-6">
                                                    <span className={`font-bold ${resultColor}`}>{resultText}</span>
                                                    {game.result && <span className="text-xs text-zinc-500 ml-2">({game.result})</span>}
                                                </td>
                                                <td className="py-4 px-6 flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-sm ${isWhite ? 'bg-zinc-200' : 'bg-zinc-800 border border-zinc-600'}`} title={`Played as ${myColor}`} />
                                                    <span className="font-medium">vs {opponent.name}</span>
                                                    <span className="text-xs text-zinc-500 ml-1">({opponent.rating})</span>
                                                </td>
                                                <td className="py-4 px-6 text-sm text-zinc-400">
                                                    {new Date(game.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>

        </div>
    );
};
