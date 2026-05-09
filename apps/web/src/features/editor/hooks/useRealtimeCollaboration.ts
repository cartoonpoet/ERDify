import { useRef } from "react";
import * as Automerge from "@automerge/automerge";
import type { Socket } from "socket.io-client";
import type { DiagramDocument } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { Collaborator } from "../stores/useEditorStore";
import { applyDiff } from "../utils/collaboration-diff";
import { useCollaborationSocket } from "./useCollaborationSocket";
import { usePresence } from "./usePresence";

export type { Collaborator };

export const useRealtimeCollaboration = (diagramId: string) => {
  const amDocRef = useRef<Automerge.Doc<DiagramDocument> | null>(null);
  const isRemoteRef = useRef(false);

  const setDocument = useEditorStore((s) => s.setDocument);
  const setCollaborators = useEditorStore((s) => s.setCollaborators);

  const socketRef = useCollaborationSocket(diagramId, {
    onInit: (bytes) => {
      const serverDoc = Automerge.load<DiagramDocument>(Uint8Array.from(bytes));
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
        if (pendingChange && socketRef.current?.connected) {
          socketRef.current.emit("am:change", Array.from(pendingChange));
        }
        return;
      }
      amDocRef.current = serverDoc;
      isRemoteRef.current = true;
      setDocument(JSON.parse(JSON.stringify(serverDoc)) as DiagramDocument);
      isRemoteRef.current = false;
    },

    onChange: (change) => {
      if (!amDocRef.current) return;
      const [newDoc] = Automerge.applyChanges(amDocRef.current, [Uint8Array.from(change)]);
      amDocRef.current = newDoc;
      const wasDirty = useEditorStore.getState().isDirty;
      isRemoteRef.current = true;
      setDocument(JSON.parse(JSON.stringify(newDoc)) as DiagramDocument);
      isRemoteRef.current = false;
      if (wasDirty) useEditorStore.setState({ isDirty: true });
    },

    onPresenceState: (presence) => setCollaborators(presence),

    onOutgoingChange: (socket: Socket) =>
      useEditorStore.subscribe((state, prevState) => {
        if (state.document === prevState.document) return;
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
      }),

    onDisconnect: () => {
      amDocRef.current = null;
      setCollaborators([]);
    },
  });

  usePresence(socketRef);
};
