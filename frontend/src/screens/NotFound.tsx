import { useNavigate } from "react-router-dom";

export const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center px-4 font-sans animate-in fade-in duration-500">
            <div className="max-w-sm w-full text-center">

                {/* Big 404 */}
                <div className="relative mb-8 select-none">
                    <span className="text-[120px] font-black text-white/[0.04] leading-none block">404</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center ring-1 ring-emerald-500/20">
                            <svg className="w-8 h-8 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L9 7h6zM5 10l2-2 3 2v6H5zM14 10l3-2 2 2v6h-5zM5 18h14v3H5z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
                <p className="text-sm text-zinc-500 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/10 border border-white/[0.08] text-zinc-300 text-sm font-semibold rounded-xl transition-all"
                    >
                        Go back
                    </button>
                    <button
                        onClick={() => navigate("/")}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_16px_rgba(5,150,105,0.3)] hover:-translate-y-0.5"
                    >
                        Home
                    </button>
                </div>
            </div>
        </div>
    );
};
