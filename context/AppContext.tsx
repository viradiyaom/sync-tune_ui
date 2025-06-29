"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
} from "react";
import { Socket } from "socket.io-client";
import io from "socket.io-client";

type AppContextType = {
  socket: any;
  connected: boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const socket = useRef<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.current = io(SOCKET_URL);

    socket.current.emit("connect-server");
    socket.current.on("connected-server", () => {
      setConnected(true);
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  return (
    <AppContext.Provider value={{ socket, connected }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
