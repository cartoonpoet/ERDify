// apps/web/src/features/editor/stores/useEditorStore.ts
import { create } from "zustand";
import type { EditorState } from "./editor-store.types";
import { createDiagramSlice } from "./diagramSlice";
import { createUISlice } from "./uiSlice";
import { createCollaboratorsSlice } from "./collaboratorsSlice";
import { createPendingSlice } from "./pendingSlice";

export type { EditorState } from "./editor-store.types";
export type {
  EditableTableNodeType,
  Collaborator,
  UnmatchedPkInput,
  PendingConnection,
  PendingRelDelete,
} from "./editor-store.types";

export const useEditorStore = create<EditorState>()((...a) => ({
  ...createDiagramSlice(...a),
  ...createUISlice(...a),
  ...createCollaboratorsSlice(...a),
  ...createPendingSlice(...a),
}));
