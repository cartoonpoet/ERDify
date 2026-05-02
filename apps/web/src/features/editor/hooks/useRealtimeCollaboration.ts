import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import * as Automerge from "@automerge/automerge";
import type { DiagramDocument, DiagramEntity, DiagramColumn, DiagramIndex } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { Collaborator } from "../stores/useEditorStore";
import { useAuthStore } from "../../../shared/stores/useAuthStore";

export type { Collaborator };

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

function applyColumnDiff(
  draftColumns: DiagramColumn[],
  prevColumns: DiagramColumn[],
  nextColumns: DiagramColumn[]
): void {
  const prevIds = new Set(prevColumns.map((c) => c.id));
  const nextIds = new Set(nextColumns.map((c) => c.id));

  for (let i = draftColumns.length - 1; i >= 0; i--) {
    const col = draftColumns[i];
    if (col && !nextIds.has(col.id)) draftColumns.splice(i, 1);
  }

  for (const col of nextColumns) {
    if (!prevIds.has(col.id)) draftColumns.push({ ...col });
  }

  for (const nextCol of nextColumns) {
    if (!prevIds.has(nextCol.id)) continue;
    const draftCol = draftColumns.find((c) => c.id === nextCol.id);
    if (!draftCol) continue;
    if (draftCol.name !== nextCol.name) draftCol.name = nextCol.name;
    if (draftCol.type !== nextCol.type) draftCol.type = nextCol.type;
    if (draftCol.nullable !== nextCol.nullable) draftCol.nullable = nextCol.nullable;
    if (draftCol.primaryKey !== nextCol.primaryKey) draftCol.primaryKey = nextCol.primaryKey;
    if (draftCol.unique !== nextCol.unique) draftCol.unique = nextCol.unique;
    if (draftCol.defaultValue !== nextCol.defaultValue) draftCol.defaultValue = nextCol.defaultValue;
    if (draftCol.comment !== nextCol.comment) draftCol.comment = nextCol.comment;
    if (draftCol.ordinal !== nextCol.ordinal) draftCol.ordinal = nextCol.ordinal;
  }
}

function applyDiff(
  draft: DiagramDocument,
  prev: DiagramDocument,
  next: DiagramDocument
): void {
  const prevEntityIds = new Set(prev.entities.map((e) => e.id));
  const nextEntityIds = new Set(next.entities.map((e) => e.id));
  const draftEntities = draft.entities as DiagramEntity[];

  for (let i = draftEntities.length - 1; i >= 0; i--) {
    const e = draftEntities[i];
    if (e && !nextEntityIds.has(e.id)) draftEntities.splice(i, 1);
  }

  for (const entity of next.entities) {
    if (!prevEntityIds.has(entity.id)) {
      draftEntities.push({ ...entity, columns: [...entity.columns] });
    }
  }

  for (const nextEntity of next.entities) {
    if (!prevEntityIds.has(nextEntity.id)) continue;
    const draftEntity = draftEntities.find((e) => e.id === nextEntity.id);
    if (!draftEntity) continue;

    if (draftEntity.name !== nextEntity.name) draftEntity.name = nextEntity.name;
    if (draftEntity.logicalName !== nextEntity.logicalName) draftEntity.logicalName = nextEntity.logicalName;
    if (draftEntity.comment !== nextEntity.comment) draftEntity.comment = nextEntity.comment;

    const prevCols = prev.entities.find((e) => e.id === nextEntity.id)?.columns ?? [];
    applyColumnDiff(draftEntity.columns as DiagramColumn[], prevCols, nextEntity.columns);
  }

  const positions = draft.layout.entityPositions as Record<string, { x: number; y: number }>;
  for (const [id, pos] of Object.entries(next.layout.entityPositions)) {
    const p = prev.layout.entityPositions[id];
    if (!p || p.x !== pos.x || p.y !== pos.y) positions[id] = pos;
  }
  for (const id of Object.keys(positions)) {
    if (!nextEntityIds.has(id)) delete positions[id];
  }

  const prevRelIds = new Set(prev.relationships.map((r) => r.id));
  const nextRelIds = new Set(next.relationships.map((r) => r.id));
  const draftRels = draft.relationships as DiagramDocument["relationships"];

  for (let i = draftRels.length - 1; i >= 0; i--) {
    const r = draftRels[i];
    if (r && !nextRelIds.has(r.id)) draftRels.splice(i, 1);
  }
  for (const rel of next.relationships) {
    if (!prevRelIds.has(rel.id)) draftRels.push({ ...rel });
  }

  const prevIdxIds = new Set(prev.indexes.map((i) => i.id));
  const nextIdxIds = new Set(next.indexes.map((i) => i.id));
  const draftIdxs = draft.indexes as DiagramIndex[];

  for (let i = draftIdxs.length - 1; i >= 0; i--) {
    const idx = draftIdxs[i];
    if (idx && !nextIdxIds.has(idx.id)) draftIdxs.splice(i, 1);
  }
  for (const idx of next.indexes) {
    if (!prevIdxIds.has(idx.id)) draftIdxs.push({ ...idx, columnIds: [...idx.columnIds] });
  }
  for (const nextIdx of next.indexes) {
    if (!prevIdxIds.has(nextIdx.id)) continue;
    const draftIdx = draftIdxs.find((i) => i.id === nextIdx.id);
    if (!draftIdx) continue;
    if (draftIdx.name !== nextIdx.name) draftIdx.name = nextIdx.name;
    if (draftIdx.unique !== nextIdx.unique) draftIdx.unique = nextIdx.unique;
    if (JSON.stringify(draftIdx.columnIds) !== JSON.stringify(nextIdx.columnIds)) {
      draftIdx.columnIds = [...nextIdx.columnIds];
    }
  }
}

export const useRealtimeCollaboration = (diagramId: string) => {
  const amDocRef = useRef<Automerge.Doc<DiagramDocument> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isRemoteRef = useRef(false);

  const token = useAuthStore((s) => s.token);
  const setDocument = useEditorStore((s) => s.setDocument);
  const setCollaborators = useEditorStore((s) => s.setCollaborators);

  useEffect(() => {
    if (!diagramId || !token) return;

    const socket = io(`${API_BASE}/collaboration`, {
      auth: { token: `Bearer ${token}` },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", { diagramId });
    });

    socket.on("am:init", (bytes: number[]) => {
      const doc = Automerge.load<DiagramDocument>(Uint8Array.from(bytes));
      amDocRef.current = doc;
      isRemoteRef.current = true;
      setDocument(JSON.parse(JSON.stringify(doc)) as DiagramDocument);
      isRemoteRef.current = false;
    });

    socket.on("am:change", (change: number[]) => {
      if (!amDocRef.current) return;
      const [newDoc] = Automerge.applyChanges(amDocRef.current, [Uint8Array.from(change)]);
      amDocRef.current = newDoc;
      isRemoteRef.current = true;
      setDocument(JSON.parse(JSON.stringify(newDoc)) as DiagramDocument);
      isRemoteRef.current = false;
    });

    socket.on("presence:state", (presence: Collaborator[]) => {
      setCollaborators(presence);
    });

    const unsubDoc = useEditorStore.subscribe((state, prevState) => {
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
  }, [diagramId, token, setDocument, setCollaborators]);
};
