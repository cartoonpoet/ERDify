import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import * as Automerge from "@automerge/automerge";
import type { DiagramDocument } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { Collaborator } from "../stores/useEditorStore";
import { applyDiff } from "../utils/collaboration-diff";

export type { Collaborator };

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export const useRealtimeCollaboration = (diagramId: string) => {
  const amDocRef = useRef<Automerge.Doc<DiagramDocument> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isRemoteRef = useRef(false);

  const setDocument = useEditorStore((s) => s.setDocument);
  const setCollaborators = useEditorStore((s) => s.setCollaborators);

  useEffect(() => {
    if (!diagramId) return;

    const socket = io(`${API_BASE}/collaboration`, {
      withCredentials: true, // httpOnly 쿠키 자동 첨부
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", { diagramId });
    });

    socket.on("am:init", (bytes: number[]) => {
      const serverDoc = Automerge.load<DiagramDocument>(Uint8Array.from(bytes));

      // If there are unsaved local changes (e.g. from an import that happened before
      // the WebSocket was ready, or during a reconnect), do NOT overwrite them.
      // Instead, re-apply the local diff on top of the fresh server state and re-emit.
      const { isDirty, document: localDoc } = useEditorStore.getState();
      if (isDirty && localDoc) {
        const baseDoc = amDocRef.current
          ? (JSON.parse(JSON.stringify(amDocRef.current)) as DiagramDocument)
          : (JSON.parse(JSON.stringify(serverDoc)) as DiagramDocument);

        const mergedDoc = Automerge.change(serverDoc, (draft) => {
          applyDiff(draft as DiagramDocument, baseDoc, localDoc);
        });
        const pendingChange = Automerge.getLastLocalChange(mergedDoc);
        amDocRef.current = mergedDoc;
        if (pendingChange) {
          socket.emit("am:change", Array.from(pendingChange));
        }
        // Keep the existing local store state (don't call setDocument)
        return;
      }

      amDocRef.current = serverDoc;
      isRemoteRef.current = true;
      setDocument(JSON.parse(JSON.stringify(serverDoc)) as DiagramDocument);
      isRemoteRef.current = false;
    });

    socket.on("am:change", (change: number[]) => {
      if (!amDocRef.current) return;
      const [newDoc] = Automerge.applyChanges(amDocRef.current, [Uint8Array.from(change)]);
      amDocRef.current = newDoc;
      // Preserve dirty flag: if we had unsaved local changes, the merged Automerge doc
      // already includes them (via CRDT merge), but setDocument would clear isDirty and
      // stop autosave from persisting them to the DB.
      const wasDirty = useEditorStore.getState().isDirty;
      isRemoteRef.current = true;
      setDocument(JSON.parse(JSON.stringify(newDoc)) as DiagramDocument);
      isRemoteRef.current = false;
      if (wasDirty) {
        useEditorStore.setState({ isDirty: true });
      }
    });

    socket.on("presence:state", (presence: Collaborator[]) => {
      setCollaborators(presence);
    });

    const unsubDoc = useEditorStore.subscribe((state, prevState) => {
      if (state.document === prevState.document) return; // nodes-only change (drag move) — skip
      const newDoc = state.document;
      const prevDoc = prevState.document;
      if (isRemoteRef.current || !newDoc || !prevDoc || !amDocRef.current || !socket.connected) return;

      const newAmDoc = Automerge.change(amDocRef.current, (draft) => {
        applyDiff(draft as DiagramDocument, prevDoc, newDoc);
      });

      const change = Automerge.getLastLocalChange(newAmDoc);
      if (change) {
        amDocRef.current = newAmDoc;
        socket.emit("am:change", Array.from(change));
      }
    });

    const unsubPresence = useEditorStore.subscribe((state, prevState) => {
      if (state.selectedEntityId !== prevState.selectedEntityId && socket.connected) {
        socket.emit("presence:update", { selectedEntityId: state.selectedEntityId });
      }
    });

    return () => {
      unsubDoc();
      unsubPresence();
      socket.disconnect();
      socketRef.current = null;
      amDocRef.current = null;
      setCollaborators([]);
    };
  }, [diagramId, setDocument, setCollaborators]);
};
