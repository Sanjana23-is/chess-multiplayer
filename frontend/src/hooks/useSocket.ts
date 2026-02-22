import { useEffect, useState } from "react";

const WS_URL = (typeof window !== 'undefined' && window.location.protocol === 'https:')
  ? `wss://${window.location.host}`
  : 'ws://localhost:8080';

const RECONNECT_DELAY_MS = 2000;

export const useSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isCleaning = false; // set to true when the component unmounts

    const connect = () => {
      ws = new WebSocket(WS_URL);

      ws.addEventListener('open', () => {
        if (!isCleaning) setSocket(ws);
      });

      ws.addEventListener('close', () => {
        if (isCleaning) return; // don't reconnect on intentional cleanup
        setSocket(null);
        // Auto-reconnect after a short delay
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      });

      ws.addEventListener('error', () => {
        // Let the 'close' event handle reconnection
      });
    };

    connect();

    // Cleanup: close the socket and cancel any pending reconnect
    return () => {
      isCleaning = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
      setSocket(null);
    };
  }, []);

  return socket;
};
