import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildDiagramContext } from "./context-builder";
import type { DiagramDocument } from "@erdify/domain";

const doc: DiagramDocument = {
  format: "erdify.schema.v1",
  id: "d1",
  name: "shop",
  dialect: "postgresql",
  entities: [
    {
      id: "e1",
      name: "users",
      schema: null,
      logicalName: null,
      comment: null,
      color: null,
      columns: [
        { id: "c1", name: "id", type: "uuid", nullable: false, primaryKey: true, unique: false, defaultValue: null, comment: "고유 식별자", ordinal: 0 },
      ],
    },
  ],
  relationships: [],
  indexes: [{ id: "i1", entityId: "e1", name: "idx_users_id", columnIds: ["c1"], unique: true }],
  views: [],
  layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" },
};

const meta = { userName: "홍길동", userEmail: "a@b.com", orgName: "Acme", diagramId: "d1", diagramName: "shop", today: "2026-05-30" };

describe("buildDiagramContext", () => {
  it("모든 테이블을 상세히 포함하고 comment와 인덱스를 담는다", () => {
    const ctx = buildDiagramContext(doc);
    expect(ctx.entities[0]!.columns[0]!).toMatchObject({ comment: "고유 식별자" });
    expect(ctx.indexes[0]!.name).toBe("idx_users_id");
  });
});

describe("buildSystemPrompt", () => {
  it("세션 메타와 다이어그램 JSON을 포함한다", () => {
    const p = buildSystemPrompt(doc, meta, false);
    expect(p).toContain("홍길동");
    expect(p).toContain("a@b.com");
    expect(p).toContain("Acme");
    expect(p).toContain("users");
  });

  it("enableReadTools가 true면 읽기 도구 안내를 포함한다", () => {
    expect(buildSystemPrompt(doc, meta, true)).toContain("listTables");
    expect(buildSystemPrompt(doc, meta, false)).not.toContain("listTables");
  });
});
