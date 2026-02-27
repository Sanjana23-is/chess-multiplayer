import { useCallback, useEffect, useRef } from "react";

export type SoundType = "move" | "capture" | "check" | "game-start" | "game-end";

export const useAudio = () => {
    const audioRefs = useRef<Record<SoundType, HTMLAudioElement | null>>({
        move: null,
        capture: null,
        check: null,
        "game-start": null,
        "game-end": null,
    });

    const isMuted = useRef(false);

    useEffect(() => {
        // Preload audio files
        audioRefs.current.move = new Audio("/sounds/move.mp3");
        audioRefs.current.capture = new Audio("/sounds/capture.mp3");
        audioRefs.current.check = new Audio("/sounds/check.mp3");
        audioRefs.current["game-start"] = new Audio("/sounds/game-start.mp3");
        audioRefs.current["game-end"] = new Audio("/sounds/game-end.mp3");

        // Preload volume
        Object.values(audioRefs.current).forEach((audio) => {
            if (audio) {
                audio.volume = 0.5; // Default volume
            }
        });
    }, []);

    const playSound = useCallback((type: SoundType) => {
        if (isMuted.current) return;

        const audio = audioRefs.current[type];
        if (audio) {
            // Reset time to allow overlapping plays of the same sound
            audio.currentTime = 0;
            audio.play().catch((e) => {
                // Autoplay policies might block this if user hasn't interacted
                console.warn("Audio play blocked, waiting for user interaction.", e);
            });
        }
    }, []);

    const toggleMute = useCallback(() => {
        isMuted.current = !isMuted.current;
        return isMuted.current;
    }, []);

    return { playSound, toggleMute, isMuted };
};
