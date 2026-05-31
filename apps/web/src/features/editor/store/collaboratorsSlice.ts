// apps/web/src/features/editor/stores/collaboratorsSlice.ts
import type { StateCreator } from "zustand";
import type { Collaborator } from "./editor-store.types";
import { updateNodes } from "./editor-store.helpers";
import type { EditorState } from "./editor-store.types";

export interface CollaboratorsSlice {
  collaborators: Collaborator[];
  setCollaborators: (collaborators: Collaborator[]) => void;
  /** 실시간 협업(웹소켓) 연결 여부. 연결 중엔 협업 레이어가 지속성을 담당하므로 HTTP 자동저장을 끈다. */
  isCollaborating: boolean;
  setCollaborating: (value: boolean) => void;
}

export const createCollaboratorsSlice: StateCreator<EditorState, [], [], CollaboratorsSlice> = (set) => ({
  collaborators: [],
  isCollaborating: false,
  setCollaborating: (value) => set({ isCollaborating: value }),
  setCollaborators: (collaborators) =>
    set((state) => ({
      collaborators,
      nodes: state.document
        ? updateNodes(state.document, state.document, state.nodes, collaborators)
        : state.nodes,
    })),
});
