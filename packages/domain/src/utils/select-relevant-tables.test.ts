import { describe, expect, it } from "vitest";
import { createEmptyDiagram, selectRelevantTables } from "../index.js";
import type { DiagramColumn, DiagramDocument, DiagramEntity } from "../index.js";

let seq = 0;
function col(name: string): DiagramColumn {
  return { id: `col_${seq++}`, name, type: "varchar", nullable: true, primaryKey: false, unique: false, defaultValue: null, comment: null, ordinal: 0 };
}
function entity(id: string, name: string, columnNames: string[]): DiagramEntity {
  return { id, name, logicalName: null, comment: null, color: null, columns: columnNames.map(col) };
}
function docWith(entities: DiagramEntity[], relationships: DiagramDocument["relationships"] = []): DiagramDocument {
  const d = createEmptyDiagram({ id: "d1", name: "t", dialect: "postgresql" });
  d.entities = entities;
  d.relationships = relationships;
  return d;
}

const rel = (id: string, src: string, tgt: string): DiagramDocument["relationships"][number] => ({
  id, name: "", sourceEntityId: src, sourceColumnIds: [], targetEntityId: tgt, targetColumnIds: [],
  cardinality: "many-to-one", onDelete: "no-action", onUpdate: "no-action", identifying: false,
});

describe("selectRelevantTables", () => {
  it("returns [] for an empty diagram", () => {
    expect(selectRelevantTables(docWith([]), "users")).toEqual([]);
  });

  it("ranks a table named in the query first", () => {
    const d = docWith([
      entity("e1", "users", ["id", "email"]),
      entity("e2", "products", ["id", "price"]),
      entity("e3", "orders", ["id"]),
    ]);
    const ids = selectRelevantTables(d, "users 테이블 정규화해줘", 12);
    expect(ids[0]).toBe("e1");
  });

  it("matches by column name when table name does not appear", () => {
    const d = docWith([
      entity("e1", "accounts", ["id", "balance"]),
      entity("e2", "products", ["id", "price"]),
    ]);
    const ids = selectRelevantTables(d, "price 컬럼 타입 바꿔줘", 12);
    expect(ids[0]).toBe("e2");
  });

  it("includes 1-hop FK neighbors of a matched table", () => {
    const d = docWith(
      [entity("e1", "orders", ["id"]), entity("e2", "users", ["id"]), entity("e3", "unrelated", ["id"])],
      [rel("r1", "e1", "e2")],
    );
    const ids = selectRelevantTables(d, "orders 분석", 12);
    expect(ids).toContain("e1");
    expect(ids).toContain("e2"); // neighbor pulled in
  });

  it("falls back to highest-degree tables when nothing matches lexically", () => {
    const d = docWith(
      [entity("e1", "alpha", ["id"]), entity("e2", "beta", ["id"]), entity("e3", "gamma", ["id"])],
      [rel("r1", "e1", "e2"), rel("r2", "e1", "e3")], // e1 has degree 2
    );
    const ids = selectRelevantTables(d, "관계를 정리해줘", 12); // no english table tokens
    expect(ids[0]).toBe("e1");
  });

  it("respects the limit", () => {
    const entities = Array.from({ length: 30 }, (_, i) => entity(`e${i}`, `table_${i}`, ["id"]));
    const d = docWith(entities);
    expect(selectRelevantTables(d, "table_1", 5).length).toBeLessThanOrEqual(5);
  });
});
