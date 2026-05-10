// apps/web/src/features/editor/stores/diagramSlice.ts
import type { Edge, NodeChange } from "@xyflow/react";
import { applyNodeChanges as applyXyflowNodeChanges } from "@xyflow/react";
import type { DiagramDocument } from "@erdify/domain";
import type { StateCreator } from "zustand";
import type { EditableTableNodeType } from "./editor-store.types";
import { docToEdges, docToNodes, updateNodes } from "./editor-store.helpers";
import type { EditorState } from "./editor-store.types";

const HISTORY_LIMIT = 50;

export interface DiagramSlice {
  document: DiagramDocument | null;
  nodes: EditableTableNodeType[];
  edges: Edge[];
  isDirty: boolean;
  canEdit: boolean;
  history: DiagramDocument[];
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

  setDocument: (doc) =>
    set((state) => ({
      document: doc,
      nodes: docToNodes(doc, state.collaborators),
      edges: docToEdges(doc),
      isDirty: false,
      history: [],
    })),

  applyCommand: (fn) => {
    const { document, nodes, collaborators, edges, history } = get();
    if (!document) return;
    const next = fn(document);
    set({
      document: next,
      nodes: updateNodes(document, next, nodes, collaborators),
      edges: next.relationships !== document.relationships ? docToEdges(next) : edges,
      isDirty: true,
      history: [...history.slice(-(HISTORY_LIMIT - 1)), document],
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
    });
  },
});
