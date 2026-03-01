import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const WS_URL =
  typeof window !== "undefined" && window.location.protocol === "https:"
    ? `wss://${window.location.host}`
    : "ws://localhost:8080";

const RECONNECT_DELAY_MS = 2000;

export const useSocket = () => {
  // Store the socket in state (not just a ref) so React re-renders consumers
  // when the socket instance changes (critical for StrictMode double-mount).
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    let active = true;

    const connect = () => {
      if (!active) return;

      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (!active) {
          ws.close();
          return;
        }

        if (token) {
          ws.send(JSON.stringify({ type: "auth", payload: { token } }));
        }

        // Setting socket in state triggers a re-render in all consumers,
        // so effects that depend on the socket (like FIND_MATCH) correctly
        // re-run with the new WebSocket instance.
        setSocket(ws);
        console.log("WebSocket connected");
      };

      ws.onclose = () => {
        if (!active) return;
        console.log("WebSocket closed. Reconnecting...");
        setSocket(null);

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
      // Null out state immediately so consumers (Game.tsx) know the socket
      // is gone and don't try to send on the old closed socket.
      setSocket(null);
      // Close the current socket if there is one. The onclose handler will
      // guard against calling setSocket again since active=false.
      // We find it via the state setter callback to avoid a stale closure.
      setSocket(prev => {
        if (prev && prev.readyState < WebSocket.CLOSING) {
          prev.close();
        }
        return null;
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return socket;
};