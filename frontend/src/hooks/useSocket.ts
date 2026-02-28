import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const WS_URL =
  typeof window !== "undefined" && window.location.protocol === "https:"
    ? `wss://${window.location.host}`
    : "ws://localhost:8080";

const RECONNECT_DELAY_MS = 2000;

export const useSocket = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { token } = useAuth();

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let active = true;

    const connect = () => {
      if (!active) return;

      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!active) return;

        if (token) {
          ws.send(JSON.stringify({ type: "auth", payload: { token } }));
        }

        setIsConnected(true);
        console.log("WebSocket connected");
      };

      ws.onclose = () => {
        if (!active) return;
        console.log("WebSocket closed. Reconnecting...");
        setIsConnected(false);
        socketRef.current = null;

        reconnectRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        if (!active) return;
        ws.close();
      };
    };

    connect();

    return () => {
      active = false;
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, []);

  // Return stable reference
  return isConnected ? socketRef.current : null;
};