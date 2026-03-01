import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const WS_URL =
  typeof window !== "undefined" && window.location.protocol === "https:"
    ? `wss://${window.location.host}`
    : "ws://localhost:8080";

const RECONNECT_DELAY_MS = 2000;

export const useSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);
  const { token } = useAuth();

  useEffect(() => {
    // Mark this effect instance as active
    activeRef.current = true;

    const connect = () => {
      if (!activeRef.current) return;

      // Tear down any existing socket before creating a new one
      if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
        // Remove handlers so the onclose doesn't trigger reconnect
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      }
      wsRef.current = null;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!activeRef.current || wsRef.current !== ws) {
          // This socket is stale — close it silently
          ws.onclose = null;
          ws.close();
          return;
        }

        if (token) {
          ws.send(JSON.stringify({ type: "auth", payload: { token } }));
        }

        setSocket(ws);
        console.log("[useSocket] Connected");
      };

      ws.onclose = () => {
        if (!activeRef.current || wsRef.current !== ws) return;

        console.log("[useSocket] Closed — scheduling reconnect");
        wsRef.current = null;
        setSocket(null);

        reconnectRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        if (wsRef.current === ws) {
          ws.close();
        }
      };
    };

    connect();

    return () => {
      // Signal that this effect instance is no longer valid
      activeRef.current = false;

      // Cancel any pending reconnect timer
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }

      // Close and discard the current socket
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null; // prevent onclose from triggering reconnect
        ws.onerror = null;
        ws.onopen = null;
        ws.close();
        wsRef.current = null;
      }

      setSocket(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return socket;
};