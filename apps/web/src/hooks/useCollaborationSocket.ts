import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { RefObject } from "react";
import type { Collaborator } from "@/store/useEditorStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface CollaborationSocketHandlers {
  onInit: (bytes: number[]) => void | Promise<void>;
  onChange: (change: number[]) => void | Promise<void>;
  onPresenceState: (presence: Collaborator[]) => void;
  onOutgoingChange: (socket: Socket) => () => void;
  onDisconnect: () => void;
}

export const useCollaborationSocket = (
  diagramId: string,
  handlers: CollaborationSocketHandlers
): RefObject<Socket | null> => {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!diagramId) return;

    const socket = io(`${API_BASE}/collaboration`, {
      withCredentials: true,
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join", { diagramId }));
    socket.on("am:init", (bytes: number[]) => handlersRef.current.onInit(bytes));
    socket.on("am:change", (change: number[]) => handlersRef.current.onChange(change));
    socket.on("presence:state", (presence: Collaborator[]) => handlersRef.current.onPresenceState(presence));

    const unsubOutgoing = handlersRef.current.onOutgoingChange(socket);

    return () => {
      unsubOutgoing();
      socket.disconnect();
      socketRef.current = null;
      handlersRef.current.onDisconnect();
    };
  }, [diagramId]);

  return socketRef;
};
