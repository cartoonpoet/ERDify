import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { RefObject } from "react";
import type { Collaborator } from "@/features/editor/store/useEditorStore";
import { base64ToBytes, bytesToBase64 } from "@/shared/utils/base64";

const SOCKET_ORIGIN = import.meta.env.PROD
  ? window.location.origin
  : (() => {
      const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";
      try { return new URL(raw).origin; } catch { return "http://localhost:4000"; }
    })();

// 숫자 배열은 원래 크기의 약 3.6배라 base64(약 1.33배)로 주고받는다(#143). 서버는 join에 encoding: "base64"를
// 보낸 소켓에만 base64로 보내고, 예전 서버는 숫자 배열로 보낸다.
type AutomergePayload = string | number[];

const toBytes = (payload: AutomergePayload): Uint8Array =>
  typeof payload === "string" ? base64ToBytes(payload) : Uint8Array.from(payload);

// am:init을 base64로 받은 소켓 = base64를 아는 서버. 예전 서버는 받은 변경을 그대로 다른 탭에 전달하므로
// 이걸 확인하기 전에 base64로 보내면 예전 웹 탭이 변경을 읽지 못한다.
const base64Sockets = new WeakSet<Socket>();

export const emitChange = (socket: Socket, change: Uint8Array): void => {
  socket.emit("am:change", base64Sockets.has(socket) ? bytesToBase64(change) : Array.from(change));
};

export interface CollaborationSocketHandlers {
  onInit: (bytes: Uint8Array) => void | Promise<void>;
  onChange: (change: Uint8Array) => void | Promise<void>;
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

    socket.on("connect", () => socket.emit("join", { diagramId, encoding: "base64" }));
    socket.on("am:init", (bytes: AutomergePayload) => {
      if (typeof bytes === "string") base64Sockets.add(socket);
      else base64Sockets.delete(socket);
      return handlersRef.current.onInit(toBytes(bytes));
    });
    socket.on("am:change", (change: AutomergePayload) => handlersRef.current.onChange(toBytes(change)));
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
