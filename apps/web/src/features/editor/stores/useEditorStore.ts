import { create } from "zustand";
import type { Node, NodeChange } from "@xyflow/react";
import { applyNodeChanges } from "@xyflow/react";
import type { DiagramDocument, DiagramEntity } from "@erdify/domain";

export type EditableTableNodeType = Node<
  { entity: DiagramEntity; collaboratorColor?: string },
  "editableTable"
>;

export interface Collaborator {
  userId: string;
  email: string;
  color: string;
  selectedEntityId: string | null;
}

function docToNodes(doc: DiagramDocument, collaborators: Collaborator[] = []): EditableTableNodeType[] {
  return doc.entities.map((entity) => {
    const collab = collaborators.find((c) => c.selectedEntityId === entity.id);
    return {
      id: entity.id,
      type: "editableTable" as const,
      position: doc.layout.entityPositions[entity.id] ?? { x: 0, y: 0 },
      data: { entity, ...(collab ? { collaboratorColor: collab.color } : {}) },
    };
  });
}

function updateNodes(
  prevDoc: DiagramDocument,
  nextDoc: DiagramDocument,
  prevNodes: EditableTableNodeType[],
  collaborators: Collaborator[]
): EditableTableNodeType[] {
  const prevEntityMap = new Map(prevDoc.entities.map((e) => [e.id, e]));
  const prevNodeMap = new Map(prevNodes.map((n) => [n.id, n]));

  return nextDoc.entities.map((entity) => {
    const prevNode = prevNodeMap.get(entity.id);
    const prevEntity = prevEntityMap.get(entity.id);
    const collab = collaborators.find((c) => c.selectedEntityId === entity.id);
    const collaboratorColor = collab?.color;

    const entitySame = prevEntity === entity;
    const positionSame =
      prevDoc.layout.entityPositions[entity.id] === nextDoc.layout.entityPositions[entity.id];
    const collabSame = prevNode?.data.collaboratorColor === collaboratorColor;

    if (prevNode && entitySame && positionSame && collabSame) {
      return prevNode;
    }

    return {
      id: entity.id,
      type: "editableTable" as const,
      position: nextDoc.layout.entityPositions[entity.id] ?? { x: 0, y: 0 },
      data: { entity, ...(collaboratorColor ? { collaboratorColor } : {}) },
    };
  });
}

interface EditorState {
  document: DiagramDocument | null;
  nodes: EditableTableNodeType[];
  isDirty: boolean;
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  popoverPos: { x: number; y: number } | null;
  collaborators: Collaborator[];

  setDocument: (doc: DiagramDocument) => void;
  applyCommand: (fn: (doc: DiagramDocument) => DiagramDocument) => void;
  applyNodeChanges: (changes: NodeChange<EditableTableNodeType>[]) => void;
  setSelectedEntity: (id: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;
  setPopoverPos: (pos: { x: number; y: number } | null) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
  clearDirty: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: null,
  nodes: [],
  isDirty: false,
  selectedEntityId: null,
  selectedRelationshipId: null,
  popoverPos: null,
  collaborators: [],

  setDocument: (doc) =>
    set((state) => ({
      document: doc,
      nodes: docToNodes(doc, state.collaborators),
      isDirty: false,
    })),

  applyCommand: (fn) => {
    const { document, nodes, collaborators } = get();
    if (!document) return;
    const next = fn(document);
    set({ document: next, nodes: updateNodes(document, next, nodes, collaborators), isDirty: true });
  },

  applyNodeChanges: (changes) => {
    const { nodes } = get();
    set({ nodes: applyNodeChanges(changes, nodes) });
  },

  setSelectedEntity: (id) => set({ selectedEntityId: id, selectedRelationshipId: null, popoverPos: null }),

  setSelectedRelationship: (id) => set({ selectedRelationshipId: id, selectedEntityId: null }),

  setPopoverPos: (pos) => set({ popoverPos: pos }),

  setCollaborators: (collaborators) =>
    set((state) => ({
      collaborators,
      nodes: state.document
        ? updateNodes(state.document, state.document, state.nodes, collaborators)
        : state.nodes,
    })),

  clearDirty: () => set({ isDirty: false }),
}));
