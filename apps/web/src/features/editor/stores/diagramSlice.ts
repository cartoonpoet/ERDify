// apps/web/src/features/editor/stores/diagramSlice.ts
import type { Edge, NodeChange } from "@xyflow/react";
import { applyNodeChanges } from "@xyflow/react";
import type { DiagramDocument } from "@erdify/domain";
import type { StateCreator } from "zustand";
import type { EditableTableNodeType } from "./editor-store.types";
import { docToEdges, docToNodes, updateNodes } from "./editor-store.helpers";
import type { EditorState } from "./useEditorStore";

export interface DiagramSlice {
  document: DiagramDocument | null;
  nodes: EditableTableNodeType[];
  edges: Edge[];
  isDirty: boolean;
  canEdit: boolean;
  setDocument: (doc: DiagramDocument) => void;
  applyCommand: (fn: (doc: DiagramDocument) => DiagramDocument) => void;
  applyNodeChanges: (changes: NodeChange<EditableTableNodeType>[]) => void;
  setCanEdit: (canEdit: boolean) => void;
  clearDirty: () => void;
}

export const createDiagramSlice: StateCreator<EditorState, [], [], DiagramSlice> = (set, get) => ({
  document: null,
  nodes: [],
  edges: [],
  isDirty: false,
  canEdit: false,

  setDocument: (doc) =>
    set((state) => ({
      document: doc,
      nodes: docToNodes(doc, state.collaborators),
      edges: docToEdges(doc),
      isDirty: false,
    })),

  applyCommand: (fn) => {
    const { document, nodes, collaborators, edges } = get();
    if (!document) return;
    const next = fn(document);
    set({
      document: next,
      nodes: updateNodes(document, next, nodes, collaborators),
      edges: next.relationships !== document.relationships ? docToEdges(next) : edges,
      isDirty: true,
    });
  },

  applyNodeChanges: (changes) => {
    const { nodes } = get();
    set({ nodes: applyNodeChanges(changes, nodes) });
  },

  setCanEdit: (canEdit) => set({ canEdit }),
  clearDirty: () => set({ isDirty: false }),
});
