import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import * as Y from "yjs";
import { useEditorStore } from "../stores/useEditorStore";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import type { DiagramDocument } from "@erdify/domain";

export interface Collaborator {
  userId: string;
  color: string;
  selectedEntityId: string | null;
}

export interface UseRealtimeCollaborationResult {
  collaborators: Collaborator[];
  isConnected: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export function useRealtimeCollaboration(diagramId: string): UseRealtimeCollaborationResult {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const prevDocRef = useRef<string | null>(null);  // moved up here with other refs

  const token = useAuthStore((s) => s.token);
  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);

  // Connect once per diagramId+token combination
  useEffect(() => {
    if (!diagramId || !token) return;

    const ydoc = ydocRef.current;
    const sharedContent = ydoc.getMap<string>("content");

    const socket = io(`${API_BASE}/collaboration`, {
      auth: { token: `Bearer ${token}` },
      transports: ["websocket"]
    });
    socketRef.current = socket;

    function applyYjsUpdate(update: Uint8Array) {
      Y.applyUpdate(ydoc, update);
      const data = sharedContent.get("data");
      if (data) {
        // Synchronously mark prevDocRef so the document-change effect skips the emit
        prevDocRef.current = data;
        setDocument(JSON.parse(data) as DiagramDocument);
      }
    }

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join", { diagramId });
    });
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("yjs:sync", applyYjsUpdate);
    socket.on("yjs:update", applyYjsUpdate);
    socket.on("presence:state", (presence: Collaborator[]) => setCollaborators(presence));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [diagramId, token, setDocument]);

  // Send local document changes as Yjs updates
  useEffect(() => {
    if (!document || !socketRef.current?.connected) return;

    const ydoc = ydocRef.current;
    const sharedContent = ydoc.getMap<string>("content");
    const newData = JSON.stringify(document);

    if (prevDocRef.current === newData) return;
    prevDocRef.current = newData;

    const stateBefore = Y.encodeStateVector(ydoc);
    ydoc.transact(() => {
      sharedContent.set("data", newData);
    });
    const update = Y.encodeStateAsUpdate(ydoc, stateBefore);
    socketRef.current.emit("yjs:update", update);
  }, [document]);

  // Send presence updates when selection changes
  useEffect(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("presence:update", { selectedEntityId });
  }, [selectedEntityId]);

  return { collaborators, isConnected };
}
