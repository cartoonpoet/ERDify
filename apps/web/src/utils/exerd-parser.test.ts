import { parseExerd } from "./exerd-parser";

let uuidCounter = 0;
vi.mock("./uuid", () => ({
  randomUUID: vi.fn(() => `uuid-${++uuidCounter}`),
}));

beforeEach(() => {
  uuidCounter = 0;
});

describe("parseExerd", () => {
  it("단순 XML에서 테이블 이름과 컬럼 이름/타입을 추출한다", () => {
    const xml = `
      <diagram>
        <table physicalName="users">
          <column physicalName="id" type="INT" pk="false" notNull="false" unique="false"/>
        </table>
      </diagram>
    `;
    const result = parseExerd(xml);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0]!.name).toBe("users");
    expect(result.entities[0]!.columns).toHaveLength(1);
    expect(result.entities[0]!.columns[0]!.name).toBe("id");
    expect(result.entities[0]!.columns[0]!.type).toBe("INT");
  });

  it("pk='true' 컬럼 → primaryKey: true, nullable: false", () => {
    const xml = `
      <diagram>
        <table physicalName="t">
          <column physicalName="id" type="INT" pk="true" notNull="false" unique="false"/>
        </table>
      </diagram>
    `;
    const result = parseExerd(xml);
    const col = result.entities[0]!.columns[0]!;

    expect(col.primaryKey).toBe(true);
    expect(col.nullable).toBe(false);
  });

  it("notNull='true' 컬럼(pk 아님) → nullable: false", () => {
    const xml = `
      <diagram>
        <table physicalName="t">
          <column physicalName="name" type="VARCHAR" pk="false" notNull="true" unique="false"/>
        </table>
      </diagram>
    `;
    const result = parseExerd(xml);
    const col = result.entities[0]!.columns[0]!;

    expect(col.primaryKey).toBe(false);
    expect(col.nullable).toBe(false);
  });

  it("x='100' y='200' 속성이 있으면 entityPositions에 해당 좌표를 사용한다", () => {
    const xml = `
      <diagram>
        <table physicalName="t" x="100" y="200">
          <column physicalName="id" type="INT" pk="false" notNull="false" unique="false"/>
        </table>
      </diagram>
    `;
    const result = parseExerd(xml);
    const entityId = result.entities[0]!.id;

    expect(result.layout.entityPositions[entityId]).toEqual({ x: 100, y: 200 });
  });

  it("relationship XML → 올바른 source/target 엔티티 ID와 컬럼 ID로 relationship 생성", () => {
    const xml = `
      <diagram>
        <table physicalName="orders">
          <column physicalName="id" type="INT" pk="true" notNull="false" unique="false"/>
        </table>
        <table physicalName="items">
          <column physicalName="order_id" type="INT" pk="false" notNull="false" unique="false"/>
        </table>
        <relationship name="fk_items_orders">
          <sourceTable physicalName="items"/>
          <targetTable physicalName="orders"/>
          <column foreignKeyColumn="order_id" primaryKeyColumn="id"/>
        </relationship>
      </diagram>
    `;
    const result = parseExerd(xml);

    expect(result.relationships).toHaveLength(1);
    const rel = result.relationships[0]!;
    const ordersEntity = result.entities.find((e) => e.name === "orders")!;
    const itemsEntity = result.entities.find((e) => e.name === "items")!;

    expect(rel.sourceEntityId).toBe(itemsEntity.id);
    expect(rel.targetEntityId).toBe(ordersEntity.id);
    expect(rel.sourceColumnIds).toContain(itemsEntity.columns[0]!.id);
    expect(rel.targetColumnIds).toContain(ordersEntity.columns[0]!.id);
  });

  it("유효하지 않은 XML에서 오류를 던진다", () => {
    const invalidXml = `<diagram><unclosed>`;
    expect(() => parseExerd(invalidXml)).toThrow();
  });

  it("indexes와 views는 빈 배열이다", () => {
    const xml = `
      <diagram>
        <table physicalName="t">
          <column physicalName="id" type="INT" pk="false" notNull="false" unique="false"/>
        </table>
      </diagram>
    `;
    const result = parseExerd(xml);

    expect(result.indexes).toEqual([]);
    expect(result.views).toEqual([]);
  });
});
