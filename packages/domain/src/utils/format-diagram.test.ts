import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { addEntity, updateEntityComment } from "../commands/entity-commands.js";
import { addColumn, addColumns } from "../commands/column-commands.js";
import { addIndex } from "../commands/index-commands.js";
import { addRelationship } from "../commands/relationship-commands.js";
import { addObject } from "../commands/object-commands.js";
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

describe("formatDiagram — objects", () => {
  it("lists objects with kind, name, and objectId", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    doc = addObject(doc, {
      id: "o1",
      kind: "view",
      name: "v_active",
      sql: "CREATE VIEW v_active AS SELECT 1;",
    });
    const out = formatDiagram("T", doc);
    expect(out).toContain("Objects (1):");
    expect(out).toContain("view v_active [objectId: o1]");
  });

  it("omits the Objects section when there are none", () => {
    const doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
    expect(formatDiagram("T", doc)).not.toContain("Objects (");
  });
});

describe("formatDiagram — 스키마·상세 표기 (#106 #110 #112)", () => {
  const doc = () => {
    let d = createEmptyDiagram({ id: "d1", name: "Shop", dialect: "mysql" });
    d = addEntity(d, { id: "e1", name: "Article", schema: "App" });
    d = updateEntityComment(d, "e1", "기사");
    d = addColumns(d, "e1", [
      col({ id: "c1", name: "ArticleID", type: "int", ordinal: 0 }),
      col({
        id: "c2", name: "UpdateDate", type: "datetime", primaryKey: false, nullable: false, ordinal: 1,
        defaultValue: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP", comment: "수정 일시",
      }),
    ]);
    return addIndex(d, { id: "i1", entityId: "e1", name: "IX_Article_UpdateDate", columnIds: ["c2"], unique: false });
  };

  it("스키마가 있으면 Schema.Table로 표기한다", () => {
    expect(formatDiagram("Shop", doc())).toContain("App.Article [tableId: e1]");
  });

  it("기본 모드에서는 기본값·주석·인덱스를 싣지 않는다", () => {
    const out = formatDiagram("Shop", doc());
    expect(out).not.toContain("CURRENT_TIMESTAMP");
    expect(out).not.toContain("수정 일시");
    expect(out).not.toContain("IX_Article_UpdateDate");
    // 대신 인덱스가 있다는 사실은 알려준다
    expect(out).toContain("Indexes (1)");
  });

  it("detail 모드에서는 DEFAULT·ON UPDATE·주석·인덱스를 함께 낸다", () => {
    const out = formatDiagram("Shop", doc(), { detail: true });
    expect(out).toContain(
      "- UpdateDate [columnId: c2]: datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- 수정 일시"
    );
    expect(out).toContain("* IX_Article_UpdateDate (UpdateDate) [indexId: i1]");
    expect(out).toContain("App.Article [tableId: e1] -- 기사");
  });

  it("UNIQUE 인덱스는 표시가 다르다", () => {
    let d = doc();
    d = addIndex(d, { id: "i2", entityId: "e1", name: "UX_A", columnIds: ["c1", "c2"], unique: true });
    expect(formatDiagram("Shop", d, { detail: true })).toContain(
      "* UX_A (ArticleID, UpdateDate) UNIQUE [indexId: i2]"
    );
  });

  it("주석의 개행은 한 줄로 정규화해 요약 구조를 지킨다", () => {
    let d = createEmptyDiagram({ id: "d1", name: "S", dialect: "mysql" });
    d = addEntity(d, { id: "e1", name: "A" });
    d = addColumn(d, "e1", col({ id: "c1", name: "a", comment: "첫 줄\n둘째 줄" }));
    const out = formatDiagram("S", d, { detail: true });
    expect(out).toContain("-- 첫 줄 둘째 줄");
    expect(out.split("\n").filter((l) => l.includes("둘째 줄"))).toHaveLength(1);
  });

  it("삭제된 컬럼을 가리키는 인덱스 columnId는 감추지 않고 드러낸다", () => {
    let d = doc();
    d = addIndex(d, { id: "i3", entityId: "e1", name: "IX_Ghost", columnIds: ["gone"], unique: false });
    expect(formatDiagram("Shop", d, { detail: true })).toContain("* IX_Ghost (<gone>)");
  });
});
