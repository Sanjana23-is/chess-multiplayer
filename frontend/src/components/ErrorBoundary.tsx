import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[ErrorBoundary] Caught:", error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center px-4 font-sans">
                    <div className="max-w-md w-full text-center">
                        {/* Icon */}
                        <div className="mx-auto mb-6 w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center ring-1 ring-red-500/20">
                            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                        <p className="text-zinc-400 text-sm mb-2">
                            The app ran into an unexpected error. This has been logged.
                        </p>
                        {this.state.error && (
                            <p className="text-xs text-red-400/70 mb-6 font-mono bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 break-all">
                                {this.state.error.message}
                            </p>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold rounded-xl transition-all"
                            >
                                Try again
                            </button>
                            <button
                                onClick={() => { window.location.href = "/"; }}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_16px_rgba(5,150,105,0.3)]"
                            >
                                Go home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
