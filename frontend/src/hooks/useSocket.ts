import { useEffect, useState } from "react";

const WS_URL = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? `wss://${window.location.host}` : 'ws://localhost:8080';

declare global {
  interface Window {
    __CHESS_WS?: WebSocket;
  }
}

export const useSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(() => {
    if (typeof window !== 'undefined' && window.__CHESS_WS) return window.__CHESS_WS;
    return null;
  });

  useEffect(() => {
    // read global directly to avoid stale closure lint warnings
    let ws = (typeof window !== 'undefined' && window.__CHESS_WS) ? window.__CHESS_WS : null;

    if (!ws) {
      ws = new WebSocket(WS_URL);
      if (typeof window !== 'undefined') window.__CHESS_WS = ws;
    }

    const handleOpen = () => setSocket(ws as WebSocket);
    const handleClose = () => {
      console.log('WebSocket closed');
      setSocket(null);
    };

    ws.addEventListener('open', handleOpen);
    ws.addEventListener('close', handleClose);

    const cleanup = () => {
      try {
        ws?.removeEventListener('open', handleOpen);
        ws?.removeEventListener('close', handleClose);
      } catch {
        /* ignored */
      }
    };

    const beforeUnload = () => {
      try {
        ws?.close();
        if (typeof window !== 'undefined') window.__CHESS_WS = undefined;
      } catch {
        /* ignored */
      }
    };

    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      cleanup();
    };
  }, []);

  return socket;
};
