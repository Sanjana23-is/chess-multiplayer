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
        <div className="relative min-h-screen w-full text-neutral-900 dark:text-zinc-100 overflow-hidden flex items-center justify-center font-sans tracking-wide transition-colors duration-300">

            {/* Abstract Background Blobs - Light Mode */}
            <div className="dark:hidden absolute bottom-[-10%] left-[-10%] w-[60%] h-[70%] rounded-full bg-gradient-to-r from-cyan-300 to-blue-300 opacity-20 blur-[100px] pointer-events-none mix-blend-multiply" />
            <div className="dark:hidden absolute top-[10%] left-[-5%] w-[40%] h-[50%] rounded-full bg-gradient-to-r from-pink-300 to-rose-300 opacity-20 blur-[100px] pointer-events-none mix-blend-multiply" />
            <div className="dark:hidden absolute top-[-5%] right-[-5%] w-[55%] h-[65%] rounded-full bg-gradient-to-l from-emerald-200 to-teal-200 opacity-20 blur-[120px] pointer-events-none mix-blend-multiply" />

            {/* Abstract Background Blobs - Dark Mode */}
            <div className="hidden dark:block absolute bottom-[-10%] left-[-10%] w-[60%] h-[70%] rounded-full bg-gradient-to-r from-emerald-900 to-indigo-900 opacity-[0.15] blur-[100px] pointer-events-none" />
            <div className="hidden dark:block absolute top-[10%] left-[-5%] w-[40%] h-[50%] rounded-full bg-gradient-to-r from-cyan-900 to-blue-900 opacity-[0.1] blur-[100px] pointer-events-none" />
            <div className="hidden dark:block absolute top-[-5%] right-[-5%] w-[55%] h-[65%] rounded-full bg-gradient-to-l from-emerald-800 to-rose-900 opacity-[0.1] blur-[120px] pointer-events-none" />

            {/* Form Container */}
            <div className="relative z-10 w-full max-w-[440px] mx-4 p-8 sm:p-10 bg-white/50 dark:bg-black/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-2xl rounded-[32px] border border-white/60 dark:border-white/10 backdrop-blur-xl dark:backdrop-blur-xl transition-all duration-300">
                <h2 className="text-[28px] font-extrabold text-neutral-900 dark:text-white text-center mb-1.5 tracking-tight transition-colors">
                    Welcome Back
                </h2>
                <p className="text-[14px] font-medium text-neutral-500 dark:text-zinc-400 text-center mb-8 transition-colors">
                    Sign in to your account to continue
                </p>

                <form className="space-y-6" onSubmit={handleLogin}>
                    {error && (
                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm font-semibold text-center shadow-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[13px] font-bold text-neutral-700 dark:text-zinc-300 mb-2 px-1 tracking-wide transition-colors">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full px-4 py-3.5 bg-white/50 dark:bg-black/40 border border-white/60 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500/50 transition-all font-medium text-[14px] shadow-sm transform hover:-translate-y-0.5"
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-bold text-neutral-700 dark:text-zinc-300 mb-2 px-1 tracking-wide transition-colors">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full px-4 py-3.5 bg-white/50 dark:bg-black/40 border border-white/60 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500/50 transition-all font-medium text-[14px] shadow-sm transform hover:-translate-y-0.5"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 mt-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white dark:text-[#0a0a0a] rounded-2xl font-bold text-[15px] transition-all duration-300 flex items-center justify-center disabled:opacity-70 shadow-lg shadow-emerald-500/20 transform hover:-translate-y-1 hover:shadow-emerald-500/30"
                    >
                        {isLoading ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                <div className="mt-8 text-center flex flex-col items-center gap-3">
                    <button type="button" className="text-[13px] font-semibold text-neutral-500 dark:text-zinc-500 hover:text-neutral-700 dark:hover:text-zinc-300 transition-colors">
                        Forgot your password?
                    </button>
                    <Link to="/register" className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                        Don't have an account? Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
};
