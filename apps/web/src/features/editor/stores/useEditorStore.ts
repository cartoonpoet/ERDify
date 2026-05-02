import { create } from "zustand";
import type { Node, NodeChange, Edge } from "@xyflow/react";
import { applyNodeChanges, MarkerType } from "@xyflow/react";
import type { DiagramDocument, DiagramEntity } from "@erdify/domain";

export type UnmatchedPkInput = {
  pkColId: string;
  pkColName: string;
  pkColType: string;
  suggestedName: string;
};

export type PendingConnection = {
  sourceEntityId: string;
  targetEntityId: string;
  autoMatchedCols: Array<{ fkColId: string; pkColId: string }>;
  unmatchedPks: UnmatchedPkInput[];
};

export type PendingRelDelete = {
  relId: string;
  srcEntityId: string;
  fkColIds: string[];
  fkColNames: string[];
};

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

const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "#6366f1",
  width: 16,
  height: 16,
} as const;

function docToEdges(doc: DiagramDocument): Edge[] {
  return doc.relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceEntityId,
    target: rel.targetEntityId,
    type: "cardinality" as const,
    markerEnd: EDGE_MARKER,
    data: { cardinality: rel.cardinality, identifying: rel.identifying },
  }));
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
  edges: Edge[];
  isDirty: boolean;
  canEdit: boolean;
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  popoverPos: { x: number; y: number } | null;
  collaborators: Collaborator[];
  pendingConnection: PendingConnection | null;
  pendingRelDelete: PendingRelDelete | null;

  setDocument: (doc: DiagramDocument) => void;
  applyCommand: (fn: (doc: DiagramDocument) => DiagramDocument) => void;
  applyNodeChanges: (changes: NodeChange<EditableTableNodeType>[]) => void;
  setCanEdit: (canEdit: boolean) => void;
  setSelectedEntity: (id: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;
  setPopoverPos: (pos: { x: number; y: number } | null) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
  clearDirty: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  setPendingConnection: (p: PendingConnection | null) => void;
  setPendingRelDelete: (p: PendingRelDelete | null) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: null,
  nodes: [],
  edges: [],
  isDirty: false,
  canEdit: false,
  selectedEntityId: null,
  selectedRelationshipId: null,
  popoverPos: null,
  collaborators: [],
  pendingConnection: null,
  pendingRelDelete: null,

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

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  setPendingConnection: (p) => set({ pendingConnection: p }),
  setPendingRelDelete: (p) => set({ pendingRelDelete: p }),
}));
