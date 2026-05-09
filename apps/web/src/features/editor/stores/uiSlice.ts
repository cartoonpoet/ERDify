// apps/web/src/features/editor/stores/uiSlice.ts
import type { StateCreator } from "zustand";
import type { EditorState } from "./useEditorStore";

export interface UISlice {
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  popoverPos: { x: number; y: number } | null;
  searchOpen: boolean;
  hiddenSchemas: Set<string>;
  schemaFilterExpanded: boolean;
  groupViewEnabled: boolean;
  setSelectedEntity: (id: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;
  setPopoverPos: (pos: { x: number; y: number } | null) => void;
  setSearchOpen: (open: boolean) => void;
  toggleSchemaVisibility: (schema: string) => void;
  setSchemaFilterExpanded: (expanded: boolean) => void;
  setGroupViewEnabled: (enabled: boolean) => void;
}

export const createUISlice: StateCreator<EditorState, [], [], UISlice> = (set) => ({
  selectedEntityId: null,
  selectedRelationshipId: null,
  popoverPos: null,
  searchOpen: false,
  hiddenSchemas: new Set<string>(),
  schemaFilterExpanded: true,
  groupViewEnabled: true,

  setSelectedEntity: (id) => set({ selectedEntityId: id, selectedRelationshipId: null, popoverPos: null }),
  setSelectedRelationship: (id) => set({ selectedRelationshipId: id, selectedEntityId: null }),
  setPopoverPos: (pos) => set({ popoverPos: pos }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  toggleSchemaVisibility: (schema) =>
    set((state) => {
      const next = new Set(state.hiddenSchemas);
      if (next.has(schema)) next.delete(schema);
      else next.add(schema);
      return { hiddenSchemas: next };
    }),
  setSchemaFilterExpanded: (expanded) => set({ schemaFilterExpanded: expanded }),
  setGroupViewEnabled: (enabled) => set({ groupViewEnabled: enabled }),
});
