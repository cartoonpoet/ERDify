import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { RefObject } from "react";
import type { Collaborator } from "@/store/useEditorStore";

const SOCKET_ORIGIN = (() => {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";
  try { return new URL(raw).origin; } catch { return "http://localhost:4000"; }
})();

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

    const socket = io(`${SOCKET_ORIGIN}/collaboration`, {
      withCredentials: true,
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => { console.log("[socket] connected, joining", diagramId); socket.emit("join", { diagramId }); });
    socket.on("connect_error", (err) => console.error("[socket] connect_error", err.message));
    socket.on("disconnect", (reason) => console.warn("[socket] disconnect", reason));
    socket.on("error", (err) => console.error("[socket] error", err));
    socket.on("am:init", (bytes: number[]) => { console.log("[socket] am:init", bytes.length, "bytes"); handlersRef.current.onInit(bytes); });
    socket.on("am:change", (change: number[]) => handlersRef.current.onChange(change));
    socket.on("presence:state", (presence: Collaborator[]) => { console.log("[socket] presence:state", presence); handlersRef.current.onPresenceState(presence); });

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
