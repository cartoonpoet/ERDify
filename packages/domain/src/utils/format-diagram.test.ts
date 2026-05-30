import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity } from "../commands/entity-commands.js";
import { addColumn } from "../commands/column-commands.js";
import { addRelationship } from "../commands/relationship-commands.js";
import { formatDiagram } from "./format-diagram.js";
import type { DiagramColumn, DiagramRelationship } from "../types/index.js";

const col = (o: Partial<DiagramColumn>): DiagramColumn => ({
  id: "c1", name: "id", type: "uuid", nullable: false, primaryKey: true,
  unique: false, defaultValue: null, comment: null, ordinal: 0, ...o,
});

describe("formatDiagram", () => {
  it("표 이름·컬럼·관계를 사람이 읽을 텍스트로 요약한다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "Shop", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addEntity(doc, { id: "e2", name: "orders" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id" }));
    const rel: DiagramRelationship = {
      id: "r1", name: "", sourceEntityId: "e2", sourceColumnIds: [],
      targetEntityId: "e1", targetColumnIds: [], cardinality: "many-to-one",
      onDelete: "no-action", onUpdate: "no-action", identifying: false,
    };
    doc = addRelationship(doc, rel);

    const out = formatDiagram("Shop", doc);
    expect(out).toContain('Diagram: "Shop" (postgresql)');
    expect(out).toContain("users [tableId: e1]");
    expect(out).toContain("id [columnId: c1]: uuid PK");
    // 관계는 엔티티 이름으로 해석 (id 맵 사용)
    expect(out).toContain("orders → users (many-to-one) [relationshipId: r1]");
  });

  it("관계가 없으면 Relationships 섹션을 출력하지 않는다", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "Empty", dialect: "postgresql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    expect(formatDiagram("Empty", doc)).not.toContain("Relationships");
  });
});
