import { describe, it, expect } from "vitest";
import * as domain from "@erdify/domain";
import { ToolExecutor } from "./tool-executor";
import { DomainLoaderService } from "../../../common/services/domain-loader.service";
import type { DiagramDocument } from "@erdify/domain";

const loader = { load: async () => domain } as unknown as DomainLoaderService;

const baseDoc: DiagramDocument = {
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
        { id: "c1", name: "id", type: "uuid", nullable: false, primaryKey: true, unique: false, defaultValue: null, comment: null, ordinal: 0 },
      ],
    },
  ],
  relationships: [],
  indexes: [],
  views: [],
  layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" },
};

const executor = new ToolExecutor(loader);

describe("ToolExecutor", () => {
  it("addTable이 엔티티를 추가하고 DiffChange를 반환한다", async () => {
    const res = await executor.execute("addTable", { name: "orders" }, baseDoc);
    expect(res.doc.entities).toHaveLength(2);
    expect(res.changes[0]).toMatchObject({ type: "addTable", tableName: "orders" });
    expect(res.resultText).toContain("orders");
  });

  it("listTables는 문서를 바꾸지 않고 테이블 목록 JSON을 반환한다", async () => {
    const res = await executor.execute("listTables", {}, baseDoc);
    expect(res.changes).toHaveLength(0);
    expect(res.doc).toBe(baseDoc);
    expect(res.resultText).toContain("users");
  });

  it("getTableDetails는 컬럼 상세를 반환한다", async () => {
    const res = await executor.execute("getTableDetails", { tableId: "e1" }, baseDoc);
    expect(res.resultText).toContain("c1");
    expect(res.changes).toHaveLength(0);
  });

  it("존재하지 않는 테이블 수정 시 명시적 오류와 listTables 안내를 반환한다", async () => {
    const res = await executor.execute("removeTable", { tableId: "nope" }, baseDoc);
    expect(res.changes).toHaveLength(0);
    expect(res.resultText).toContain("no table found");
    expect(res.resultText).toContain("listTables");
  });

  it("존재하지 않는 컬럼 수정 시 getTableDetails 안내가 포함된 오류를 반환한다", async () => {
    const res = await executor.execute("updateColumn", { tableId: "e1", columnId: "ghost", name: "x" }, baseDoc);
    expect(res.changes).toHaveLength(0);
    expect(res.resultText).toContain("no column with id");
    expect(res.resultText).toContain("getTableDetails");
  });

  it("addRelation의 소스 테이블이 없으면 해당 id를 명시한 오류를 반환한다", async () => {
    const res = await executor.execute("addRelation", { sourceTableId: "ghost", targetTableId: "e1", cardinality: "many-to-one" }, baseDoc);
    expect(res.changes).toHaveLength(0);
    expect(res.resultText).toContain("ghost");
    expect(res.resultText).toContain("no table found");
  });

  it("addIndex가 존재하지 않는 컬럼을 참조하면 오류를 반환한다", async () => {
    const res = await executor.execute("addIndex", { tableId: "e1", name: "idx_x", columnIds: ["ghost"] }, baseDoc);
    expect(res.changes).toHaveLength(0);
    expect(res.resultText).toContain("no column with id");
  });

  it("addColumn은 멱등 — 같은 이름 컬럼은 중복 추가하지 않는다", async () => {
    const first = await executor.execute("addColumn", { tableId: "e1", name: "email", type: "varchar" }, baseDoc);
    expect(first.changes).toHaveLength(1);
    const second = await executor.execute("addColumn", { tableId: "e1", name: "email", type: "varchar" }, first.doc);
    expect(second.changes).toHaveLength(0);
    expect(second.resultText).toContain("already exists");
    expect(second.doc.entities[0]!.columns.filter((c) => c.name === "email")).toHaveLength(1);
  });

  it("addTable은 멱등 — 같은 이름 테이블은 중복 생성하지 않는다", async () => {
    const res = await executor.execute("addTable", { name: "users" }, baseDoc);
    expect(res.changes).toHaveLength(0);
    expect(res.resultText).toContain("already exists");
    expect(res.doc.entities).toHaveLength(1);
  });

  it("addTable 컬럼 배열 내 중복 이름은 한 번만 추가한다", async () => {
    const res = await executor.execute(
      "addTable",
      { name: "orders", columns: [{ name: "id", type: "uuid" }, { name: "amount", type: "integer" }, { name: "amount", type: "integer" }] },
      baseDoc,
    );
    const orders = res.doc.entities.find((e) => e.name === "orders")!;
    expect(orders.columns.filter((c) => c.name === "amount")).toHaveLength(1);
  });
});
