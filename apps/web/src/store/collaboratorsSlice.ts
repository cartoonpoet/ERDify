// apps/web/src/features/editor/stores/collaboratorsSlice.ts
import type { StateCreator } from "zustand";
import type { Collaborator } from "./editor-store.types";
import { updateNodes } from "./editor-store.helpers";
import type { EditorState } from "./editor-store.types";

export interface CollaboratorsSlice {
  collaborators: Collaborator[];
  setCollaborators: (collaborators: Collaborator[]) => void;
}

export const createCollaboratorsSlice: StateCreator<EditorState, [], [], CollaboratorsSlice> = (set) => ({
  collaborators: [],
  setCollaborators: (collaborators) =>
    set((state) => ({
      collaborators,
      nodes: state.document
        ? updateNodes(state.document, state.document, state.nodes, collaborators)
        : state.nodes,
    })),
});
