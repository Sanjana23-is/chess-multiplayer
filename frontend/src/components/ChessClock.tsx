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
        px-4 py-2 rounded-lg font-mono text-xl font-bold transition-all duration-300 flex items-center shadow-inner mt-2
        ${isActive ? "bg-white/10 scale-105" : "bg-white/5 opacity-70"}
        ${isLowTime && isActive ? "text-red-400 animate-pulse bg-red-500/10" : ""}
        ${isZero ? "text-red-500 bg-red-500/20" : ""}
        ${!isLowTime && !isZero ? (color === "white" ? "text-white" : "text-gray-300") : ""}
      `}
        >
            <span className="mr-2 text-sm opacity-50 uppercase tracking-widest">{color}</span>
            {formatTime(displayTime)}
        </div>
    );
};
