import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("http://localhost:8080/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Login failed");
            } else {
                login(data.token, data.user);
                navigate("/");
            }
        } catch (err) {
            setError("An error occurred during login.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full text-neutral-900 dark:text-zinc-100 overflow-hidden flex items-center justify-center font-sans tracking-wide transition-colors duration-300 animate-in fade-in duration-500">

            {/* Subtle dot-grid background for depth */}
            <div className="dark:hidden absolute inset-0 bg-[radial-gradient(#00000012_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
            <div className="hidden dark:block absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

            {/* Background accent blobs */}
            <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[70%] rounded-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/5 blur-[120px] pointer-events-none" />
            <div className="absolute top-[-5%] right-[-5%] w-[55%] h-[65%] rounded-full bg-gradient-to-l from-blue-500/8 to-purple-500/5 blur-[130px] pointer-events-none" />

            {/* Form Container */}
            <div className="relative z-10 w-full max-w-[420px] mx-4 p-8 sm:p-10 bg-white dark:bg-[#13161C] shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-2xl border border-neutral-200/80 dark:border-white/[0.06] transition-all duration-300">
                {/* Logo */}
                <div className="flex items-center gap-2.5 justify-center mb-7">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9 7h6zM5 10l2-2 3 2v6H5zM14 10l3-2 2 2v6h-5zM5 18h14v3H5z" /></svg>
                    </div>
                    <span className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">Project Chess</span>
                </div>

                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white text-center mb-1.5 tracking-tight">
                    Welcome back
                </h2>
                <p className="text-sm text-neutral-500 dark:text-zinc-500 text-center mb-7">
                    Sign in to continue playing
                </p>

                <form className="space-y-6" onSubmit={handleLogin}>
                    {error && (
                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm font-semibold text-center shadow-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 bg-neutral-50 dark:bg-[#0D1017] border border-neutral-200 dark:border-white/[0.07] rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all text-sm font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-neutral-50 dark:bg-[#0D1017] border border-neutral-200 dark:border-white/[0.07] rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 mt-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center disabled:opacity-60 shadow-[0_4px_16px_rgba(5,150,105,0.35)] hover:shadow-[0_8px_24px_rgba(5,150,105,0.45)] hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Signing in...</span>
                        ) : "Sign In"}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-white/[0.06] text-center">
                    <p className="text-sm text-neutral-500 dark:text-zinc-500">
                        New here?{" "}
                        <Link to="/register" className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors">
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
