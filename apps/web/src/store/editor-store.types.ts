// apps/web/src/features/editor/stores/editor-store.types.ts
import type { Node } from "@xyflow/react";
import type { DiagramEntity } from "@erdify/domain";
import type { DiagramSlice } from "./diagramSlice";
import type { UISlice } from "./uiSlice";
import type { CollaboratorsSlice } from "./collaboratorsSlice";
import type { PendingSlice } from "./pendingSlice";

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

export type EditorState = DiagramSlice & UISlice & CollaboratorsSlice & PendingSlice;
