import { create } from "zustand";
import type { DiagramDocument } from "@erdify/domain";

interface EditorState {
  document: DiagramDocument | null;
  isDirty: boolean;
  selectedEntityId: string | null;

  setDocument: (doc: DiagramDocument) => void;
  applyCommand: (fn: (doc: DiagramDocument) => DiagramDocument) => void;
  setSelectedEntity: (id: string | null) => void;
  clearDirty: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: null,
  isDirty: false,
  selectedEntityId: null,

  setDocument: (doc) => set({ document: doc, isDirty: false }),

  applyCommand: (fn) => {
    const { document } = get();
    if (!document) return;
    set({ document: fn(document), isDirty: true });
  },

  setSelectedEntity: (id) => set({ selectedEntityId: id }),

  clearDirty: () => set({ isDirty: false })
}));
