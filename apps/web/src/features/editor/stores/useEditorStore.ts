import { create } from "zustand";
import type { DiagramDocument } from "@erdify/domain";
import type { TableNodeType } from "@erdify/erd-ui";
import { applyNodeChanges } from "@xyflow/react";
import type { NodeChange } from "@xyflow/react";

export interface Collaborator {
  userId: string;
  email: string;
  color: string;
  selectedEntityId: string | null;
}

function docToNodes(doc: DiagramDocument, collaborators: Collaborator[] = []): TableNodeType[] {
  return doc.entities.map((entity) => {
    const collab = collaborators.find((c) => c.selectedEntityId === entity.id);
    return {
      id: entity.id,
      type: "table" as const,
      position: doc.layout.entityPositions[entity.id] ?? { x: 0, y: 0 },
      data: { entity, ...(collab ? { collaboratorColor: collab.color } : {}) },
    };
  });
}

interface EditorState {
  document: DiagramDocument | null;
  nodes: TableNodeType[];
  isDirty: boolean;
  selectedEntityId: string | null;
  collaborators: Collaborator[];

  setDocument: (doc: DiagramDocument) => void;
  applyCommand: (fn: (doc: DiagramDocument) => DiagramDocument) => void;
  applyNodeChanges: (changes: NodeChange<TableNodeType>[]) => void;
  setSelectedEntity: (id: string | null) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
  clearDirty: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: null,
  nodes: [],
  isDirty: false,
  selectedEntityId: null,
  collaborators: [],

  setDocument: (doc) =>
    set((state) => ({
      document: doc,
      nodes: docToNodes(doc, state.collaborators),
      isDirty: false,
    })),

  applyCommand: (fn) => {
    const { document, collaborators } = get();
    if (!document) return;
    const next = fn(document);
    set({ document: next, nodes: docToNodes(next, collaborators), isDirty: true });
  },

  applyNodeChanges: (changes) => {
    const { nodes } = get();
    set({ nodes: applyNodeChanges(changes, nodes) });
  },

  setSelectedEntity: (id) => set({ selectedEntityId: id }),

  setCollaborators: (collaborators) =>
    set((state) => ({
      collaborators,
      nodes: state.document ? docToNodes(state.document, collaborators) : state.nodes,
    })),

  clearDirty: () => set({ isDirty: false }),
}));
