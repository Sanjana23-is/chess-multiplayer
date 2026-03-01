import { useEffect, useState } from "react";

export const ChessClock = ({
    time,
    isActive,
    color,
}: {
    time: number;
    isActive: boolean;
    color: "white" | "black";
}) => {
    const [displayTime, setDisplayTime] = useState(time);

    // Sync with prop when it changes (from server)
    useEffect(() => {
        setDisplayTime(time);
    }, [time]);

    // Tick locally when active
    useEffect(() => {
        if (!isActive || displayTime <= 0) return;

        const interval = setInterval(() => {
            setDisplayTime((prev) => Math.max(0, prev - 100)); // Tick every 100ms for smoothness
        }, 100);

        return () => clearInterval(interval);
    }, [isActive, displayTime]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        // Show tenths of a second if under 10 seconds
        if (ms > 0 && ms < 10000) {
            const tenths = Math.floor((ms % 1000) / 100);
            return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${tenths}`;
        }

        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    const isLowTime = displayTime > 0 && displayTime <= 10000;
    const isZero = displayTime <= 0;

    return (
        <div
            className={`
        px-2 py-1 sm:px-4 sm:py-2 rounded-lg font-mono text-sm sm:text-xl font-bold transition-all duration-300 flex items-center shadow-sm dark:shadow-inner border backdrop-blur-md origin-right
        ${isActive ? "bg-white/70 border-white/80 dark:bg-white/10 dark:border-transparent scale-105" : "bg-white/30 border-white/40 dark:bg-white/5 dark:border-transparent opacity-70"}
        ${isLowTime && isActive ? "text-red-600 dark:text-red-400 animate-pulse bg-red-100/50 border-red-200/50 dark:bg-red-500/10 dark:border-transparent" : ""}
        ${isZero ? "text-red-700 bg-red-200/50 border-red-300/50 dark:text-red-500 dark:bg-red-500/20 dark:border-transparent" : ""}
        ${!isLowTime && !isZero ? (isActive ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-gray-300") : ""}
      `}
        >
            <span className={`mr-1 sm:mr-2 text-[10px] sm:text-sm uppercase tracking-widest font-black ${isActive ? "text-neutral-400 dark:text-gray-500 opacity-100" : "opacity-50"}`}>{color}</span>
            {formatTime(displayTime)}
        </div>
    );
};
