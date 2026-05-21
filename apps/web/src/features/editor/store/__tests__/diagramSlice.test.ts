import { describe, it, expect } from "vitest";
import { createStore } from "zustand";
import type { EditorState } from "../editor-store.types";
import { createDiagramSlice } from "../diagramSlice";
import { createUISlice } from "../uiSlice";
import { createCollaboratorsSlice } from "../collaboratorsSlice";
import { createPendingSlice } from "../pendingSlice";
import type { DiagramDocument } from "@erdify/domain";

const makeCol = (id: string, name: string, primaryKey: boolean, ordinal: number) => ({
  id,
  name,
  type: "bigint",
  primaryKey,
  nullable: false,
  unique: false,
  defaultValue: null,
  comment: null,
  ordinal,
});

const makeDoc = (overrides: Partial<DiagramDocument> = {}): DiagramDocument => ({
  format: "erdify.schema.v1" as const,
  id: "doc1",
  name: "test",
  dialect: "postgresql" as const,
  entities: [
    { id: "e1", name: "users", logicalName: null, comment: null, color: null, columns: [makeCol("c1", "id", true, 0)], seedData: [] },
    { id: "e2", name: "posts", logicalName: null, comment: null, color: null, columns: [makeCol("c2", "id", true, 0), makeCol("c3", "user_id", false, 1)], seedData: [] },
  ],
  relationships: [
    { id: "r1", name: "fk_posts_users", sourceEntityId: "e2", sourceColumnIds: ["c3"], targetEntityId: "e1", targetColumnIds: ["c1"], cardinality: "many-to-one", onDelete: "no-action", onUpdate: "no-action", identifying: false },
  ],
  indexes: [
    { id: "i1", entityId: "e2", name: "idx_user_id", columnIds: ["c3"], unique: false },
  ],
  views: [],
  layout: { entityPositions: { e1: { x: 0, y: 0 }, e2: { x: 300, y: 0 } } },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  ...overrides,
});

const makeStore = () =>
  createStore<EditorState>()((...a) => ({
    ...createDiagramSlice(...a),
    ...createUISlice(...a),
    ...createCollaboratorsSlice(...a),
    ...createPendingSlice(...a),
  }));

describe("DiagramSlice - derived state", () => {
  it("setDocument: fkColumnIds에 relationship의 모든 column id가 포함된다", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const { fkColumnIds } = store.getState();
    expect(fkColumnIds.has("c3")).toBe(true);
    expect(fkColumnIds.has("c1")).toBe(true);
    expect(fkColumnIds.has("c2")).toBe(false);
  });

  it("setDocument: indexesByEntityId에 entityId별 index 배열이 매핑된다", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const { indexesByEntityId } = store.getState();
    expect(indexesByEntityId.get("e2")).toHaveLength(1);
    expect(indexesByEntityId.get("e2")![0]!.id).toBe("i1");
    expect(indexesByEntityId.get("e1")).toBeUndefined();
  });

  it("setDocument: allSchemas는 entity의 schema 목록이다 (schema 없으면 빈 배열)", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    expect(store.getState().allSchemas).toEqual([]);
  });

  it("applyCommand: entity만 변경 시 fkColumnIds identity가 유지된다", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const before = store.getState().fkColumnIds;

    store.getState().applyCommand((doc) => ({
      ...doc,
      entities: doc.entities.map((e) =>
        e.id === "e1" ? { ...e, name: "users_renamed" } : e
      ),
    }));

    const after = store.getState().fkColumnIds;
    expect(after).toBe(before);
  });

  it("applyCommand: relationship 변경 시 fkColumnIds identity가 교체된다", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const before = store.getState().fkColumnIds;

    store.getState().applyCommand((doc) => ({
      ...doc,
      relationships: [],
    }));

    const after = store.getState().fkColumnIds;
    expect(after).not.toBe(before);
    expect(after.size).toBe(0);
  });

  it("applyCommand: index만 변경 시 indexesByEntityId identity가 교체된다", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const before = store.getState().indexesByEntityId;

    store.getState().applyCommand((doc) => ({
      ...doc,
      indexes: [],
    }));

    expect(store.getState().indexesByEntityId).not.toBe(before);
    expect(store.getState().indexesByEntityId.size).toBe(0);
  });

  it("applyCommand: layout만 변경 시 파생 상태 identity 전부 유지된다", () => {
    const store = makeStore();
    store.getState().setDocument(makeDoc());
    const { fkColumnIds: fkBefore, indexesByEntityId: idxBefore, allSchemas: schBefore } = store.getState();

    store.getState().applyCommand((doc) => ({
      ...doc,
      layout: { entityPositions: { e1: { x: 100, y: 0 }, e2: { x: 400, y: 0 } } },
    }));

    const { fkColumnIds: fkAfter, indexesByEntityId: idxAfter, allSchemas: schAfter } = store.getState();
    expect(fkAfter).toBe(fkBefore);
    expect(idxAfter).toBe(idxBefore);
    expect(schAfter).toBe(schBefore);
  });
});
