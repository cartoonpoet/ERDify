// apps/web/src/features/editor/stores/diagramSlice.ts
import type { Edge, NodeChange } from "@xyflow/react";
import { applyNodeChanges as applyXyflowNodeChanges } from "@xyflow/react";
import type { DiagramDocument, DiagramIndex } from "@erdify/domain";
import type { StateCreator } from "zustand";
import type { EditableTableNodeType } from "./editor-store.types";
import { docToEdges, docToNodes, updateNodes } from "./editor-store.helpers";
import type { EditorState } from "./editor-store.types";
import { getSchemasFromDocument } from "@/shared/utils/schema-colors";

const HISTORY_LIMIT = 50;

function computeFkColumnIds(doc: DiagramDocument): Set<string> {
  return new Set(
    doc.relationships.flatMap((r) => [...r.sourceColumnIds, ...r.targetColumnIds])
  );
}

function computeIndexesByEntityId(doc: DiagramDocument): Map<string, DiagramIndex[]> {
  const map = new Map<string, DiagramIndex[]>();
  for (const idx of doc.indexes) {
    const existing = map.get(idx.entityId);
    if (existing) {
      existing.push(idx);
    } else {
      map.set(idx.entityId, [idx]);
    }
  }
  return map;
}

export interface DiagramSlice {
  document: DiagramDocument | null;
  nodes: EditableTableNodeType[];
  edges: Edge[];
  isDirty: boolean;
  canEdit: boolean;
  history: DiagramDocument[];
  fkColumnIds: Set<string>;
  indexesByEntityId: Map<string, DiagramIndex[]>;
  allSchemas: string[];
  setDocument: (doc: DiagramDocument) => void;
  applyCommand: (fn: (doc: DiagramDocument) => DiagramDocument) => void;
  applyNodeChanges: (changes: NodeChange<EditableTableNodeType>[]) => void;
  setCanEdit: (canEdit: boolean) => void;
  clearDirty: () => void;
  undo: () => void;
}

export const createDiagramSlice: StateCreator<EditorState, [], [], DiagramSlice> = (set, get) => ({
  document: null,
  nodes: [],
  edges: [],
  isDirty: false,
  canEdit: false,
  history: [],
  fkColumnIds: new Set(),
  indexesByEntityId: new Map(),
  allSchemas: [],

  setDocument: (doc) =>
    set((state) => ({
      document: doc,
      nodes: docToNodes(doc, state.collaborators),
      edges: docToEdges(doc),
      isDirty: false,
      history: [],
      fkColumnIds: computeFkColumnIds(doc),
      indexesByEntityId: computeIndexesByEntityId(doc),
      allSchemas: getSchemasFromDocument(doc.entities),
    })),

  applyCommand: (fn) => {
    const { document, nodes, collaborators, edges, history, fkColumnIds, indexesByEntityId, allSchemas } = get();
    if (!document) return;
    const next = fn(document);

    const relationshipsChanged = next.relationships !== document.relationships;
    const indexesChanged = next.indexes !== document.indexes;
    const entitiesChanged = next.entities !== document.entities;

    set({
      document: next,
      nodes: updateNodes(document, next, nodes, collaborators),
      edges: relationshipsChanged ? docToEdges(next) : edges,
      isDirty: true,
      history: [...history.slice(-(HISTORY_LIMIT - 1)), document],
      fkColumnIds: relationshipsChanged ? computeFkColumnIds(next) : fkColumnIds,
      indexesByEntityId: indexesChanged ? computeIndexesByEntityId(next) : indexesByEntityId,
      allSchemas: entitiesChanged ? getSchemasFromDocument(next.entities) : allSchemas,
    });
  },

  applyNodeChanges: (changes) => {
    const { nodes } = get();
    set({ nodes: applyXyflowNodeChanges(changes, nodes) });
  },

  setCanEdit: (canEdit) => set({ canEdit }),
  clearDirty: () => set({ isDirty: false }),

  undo: () => {
    const { history, collaborators } = get();
    const prev = history[history.length - 1];
    if (!prev) return;
    set({
      document: prev,
      nodes: docToNodes(prev, collaborators),
      edges: docToEdges(prev),
      isDirty: true,
      history: history.slice(0, -1),
      fkColumnIds: computeFkColumnIds(prev),
      indexesByEntityId: computeIndexesByEntityId(prev),
      allSchemas: getSchemasFromDocument(prev.entities),
    });
  },
});
