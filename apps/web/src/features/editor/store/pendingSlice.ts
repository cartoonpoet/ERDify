// apps/web/src/features/editor/stores/pendingSlice.ts
import type { StateCreator } from "zustand";
import type { EditorState, PendingConnection, PendingRelDelete } from "./editor-store.types";

export interface PendingSlice {
  pendingConnection: PendingConnection | null;
  pendingRelDelete: PendingRelDelete | null;
  setPendingConnection: (p: PendingConnection | null) => void;
  setPendingRelDelete: (p: PendingRelDelete | null) => void;
}

export const createPendingSlice: StateCreator<EditorState, [], [], PendingSlice> = (set) => ({
  pendingConnection: null,
  pendingRelDelete: null,
  setPendingConnection: (p) => set({ pendingConnection: p }),
  setPendingRelDelete: (p) => set({ pendingRelDelete: p }),
});
