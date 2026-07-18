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

  it("알 수 없는 도구 이름이면 변경 없이 오류 텍스트를 반환한다", async () => {
    const res = await executor.execute("noSuchTool", {}, baseDoc);
    expect(res.changes).toHaveLength(0);
    expect(res.doc).toBe(baseDoc);
    expect(res.resultText).toContain('tool "noSuchTool" did not produce any change');
  });

  it("removeTable이 테이블을 제거하고 removeTable DiffChange를 반환한다", async () => {
    const res = await executor.execute("removeTable", { tableId: "e1" }, baseDoc);
    expect(res.doc.entities).toHaveLength(0);
    expect(res.changes[0]).toEqual({ type: "removeTable", tableId: "e1", tableName: "users" });
    expect(res.resultText).toContain("removed table users");
  });

  it("updateTable이 테이블 이름을 바꾸고 oldName/newName을 반환한다", async () => {
    const res = await executor.execute("updateTable", { tableId: "e1", name: "members" }, baseDoc);
    expect(res.doc.entities[0]!.name).toBe("members");
    expect(res.changes[0]).toEqual({ type: "updateTable", tableId: "e1", oldName: "users", newName: "members", changes: ["name"] });
    expect(res.resultText).toContain("renamed users -> members");
  });

  it("updateTable이 logicalName만 바꾸면 이름은 유지되고 changes에 logicalName만 담긴다", async () => {
    const res = await executor.execute("updateTable", { tableId: "e1", logicalName: "사용자" }, baseDoc);
    expect(res.doc.entities[0]!.name).toBe("users");
    expect(res.doc.entities[0]!.logicalName).toBe("사용자");
    expect(res.changes[0]).toEqual({ type: "updateTable", tableId: "e1", oldName: "users", newName: "users", changes: ["logicalName"] });
    expect(res.resultText).toContain("updated table users (logicalName)");
    expect(res.resultText).not.toContain("->");
  });

  it("updateTable이 이름과 logicalName을 동시에 바꾸면 changes에 둘 다 담긴다", async () => {
    const res = await executor.execute("updateTable", { tableId: "e1", name: "members", logicalName: "회원" }, baseDoc);
    expect(res.doc.entities[0]!.name).toBe("members");
    expect(res.doc.entities[0]!.logicalName).toBe("회원");
    expect(res.changes[0]).toEqual({ type: "updateTable", tableId: "e1", oldName: "users", newName: "members", changes: ["name", "logicalName"] });
  });

  it("updateTable에 name도 logicalName도 없으면 변경 없이 오류 텍스트를 반환한다", async () => {
    const res = await executor.execute("updateTable", { tableId: "e1" }, baseDoc);
    expect(res.changes).toHaveLength(0);
    expect(res.doc).toBe(baseDoc);
    expect(res.resultText).toContain("Error:");
    expect(res.resultText).toContain("no fields to change");
    expect(res.resultText).toContain("logicalName");
  });

  it("addTable이 logicalName을 생성된 엔티티에 전달한다", async () => {
    const res = await executor.execute("addTable", { name: "orders", logicalName: "주문" }, baseDoc);
    const orders = res.doc.entities.find((e) => e.name === "orders")!;
    expect(orders.logicalName).toBe("주문");
    expect(res.changes[0]).toMatchObject({ type: "addTable", tableName: "orders" });
  });

  it("removeColumn이 컬럼을 제거하고 removeColumn DiffChange를 반환한다", async () => {
    const res = await executor.execute("removeColumn", { tableId: "e1", columnId: "c1" }, baseDoc);
    expect(res.doc.entities[0]!.columns).toHaveLength(0);
    expect(res.changes[0]).toEqual({ type: "removeColumn", tableId: "e1", tableName: "users", columnId: "c1", columnName: "id" });
  });

  it("updateColumn이 전달된 필드만 패치하고 변경 필드 목록을 반환한다", async () => {
    const res = await executor.execute(
      "updateColumn",
      { tableId: "e1", columnId: "c1", name: "uid", type: "bigint", nullable: true, primaryKey: false, unique: true, defaultValue: "0" },
      baseDoc,
    );
    const col = res.doc.entities[0]!.columns[0]!;
    expect(col).toMatchObject({ name: "uid", type: "bigint", nullable: true, primaryKey: false, unique: true, defaultValue: "0" });
    expect(res.changes[0]).toMatchObject({
      type: "updateColumn",
      tableId: "e1",
      columnId: "c1",
      changes: ["name", "type", "nullable", "primaryKey", "unique", "defaultValue"],
    });
  });

  it("updateColumn이 comment(논리명)를 패치하고 changes에 comment를 담는다", async () => {
    const res = await executor.execute("updateColumn", { tableId: "e1", columnId: "c1", comment: "고유 식별자" }, baseDoc);
    expect(res.doc.entities[0]!.columns[0]!.comment).toBe("고유 식별자");
    expect(res.changes[0]).toMatchObject({ type: "updateColumn", tableId: "e1", columnId: "c1", changes: ["comment"] });
  });

  it("updateColumn에 변경할 필드가 하나도 없으면 변경 없이 오류 텍스트를 반환한다", async () => {
    const res = await executor.execute("updateColumn", { tableId: "e1", columnId: "c1" }, baseDoc);
    expect(res.changes).toHaveLength(0);
    expect(res.doc).toBe(baseDoc);
    expect(res.resultText).toContain("Error:");
    expect(res.resultText).toContain("no fields to change");
  });

  describe("addRelation / removeRelation", () => {
    const twoTableDoc: DiagramDocument = {
      ...baseDoc,
      entities: [
        ...baseDoc.entities,
        {
          id: "e2",
          name: "orders",
          schema: null,
          logicalName: null,
          comment: null,
          color: null,
          columns: [
            { id: "c2", name: "id", type: "uuid", nullable: false, primaryKey: true, unique: false, defaultValue: null, comment: null, ordinal: 0 },
            { id: "c3", name: "user_id", type: "uuid", nullable: false, primaryKey: false, unique: false, defaultValue: null, comment: null, ordinal: 1 },
          ],
        },
      ],
    };

    /** 타깃(users, e1)의 PK(c1) 타입만 바꾼 문서 — FK 타입 전파/불일치 케이스용 */
    const withUsersPkType = (type: string): DiagramDocument => ({
      ...twoTableDoc,
      entities: twoTableDoc.entities.map((e) =>
        e.id === "e1" ? { ...e, columns: e.columns.map((c) => ({ ...c, type })) } : e,
      ),
    });

    it("addRelation의 타깃 테이블이 없으면 해당 id를 명시한 오류를 반환한다", async () => {
      const res = await executor.execute("addRelation", { sourceTableId: "e1", targetTableId: "ghost", cardinality: "many-to-one" }, baseDoc);
      expect(res.changes).toHaveLength(0);
      expect(res.resultText).toContain('no table found with id "ghost"');
    });

    it("타깃 테이블에 PK가 없으면 변경 없이 primary key 지정 안내 오류를 반환한다", async () => {
      const noPkDoc: DiagramDocument = {
        ...twoTableDoc,
        entities: twoTableDoc.entities.map((e) =>
          e.id === "e1" ? { ...e, columns: e.columns.map((c) => ({ ...c, primaryKey: false })) } : e,
        ),
      };
      const res = await executor.execute(
        "addRelation",
        { sourceTableId: "e2", targetTableId: "e1", cardinality: "many-to-one", fkColumnName: "owner_id" },
        noPkDoc,
      );
      expect(res.changes).toHaveLength(0);
      expect(res.doc).toBe(noPkDoc); // 어떤 변형도 일어나지 않는다
      expect(res.resultText).toContain("Error:");
      expect(res.resultText).toContain("primary key");
      expect(res.resultText).toContain("users");
    });

    it("타깃 테이블의 PK가 복합 키면 지원하지 않는다는 오류를 반환한다", async () => {
      const compositePkDoc: DiagramDocument = {
        ...twoTableDoc,
        entities: twoTableDoc.entities.map((e) =>
          e.id === "e1"
            ? {
                ...e,
                columns: [
                  ...e.columns,
                  { id: "c9", name: "tenant_id", type: "uuid", nullable: false, primaryKey: true, unique: false, defaultValue: null, comment: null, ordinal: 1 },
                ],
              }
            : e,
        ),
      };
      const res = await executor.execute(
        "addRelation",
        { sourceTableId: "e2", targetTableId: "e1", cardinality: "many-to-one", fkColumnName: "owner_id" },
        compositePkDoc,
      );
      expect(res.changes).toHaveLength(0);
      expect(res.doc).toBe(compositePkDoc);
      expect(res.resultText).toContain("복합 키");
      expect(res.resultText).toContain("id, tenant_id");
    });

    it("fkColumnName이 없으면 '<대상테이블>_<PK>' 이름으로 FK 컬럼을 파생 생성하고 양쪽 컬럼을 연결한다", async () => {
      const res = await executor.execute("addRelation", { sourceTableId: "e2", targetTableId: "e1", cardinality: "many-to-one" }, twoTableDoc);
      expect(res.changes).toHaveLength(2);
      expect(res.changes[0]).toMatchObject({ type: "addColumn", tableId: "e2", tableName: "orders", columnName: "users_id", columnType: "uuid" });
      expect(res.changes[1]).toMatchObject({ type: "addRelation", fromTable: "orders", toTable: "users", cardinality: "many-to-one" });
      const fkCol = res.doc.entities.find((e) => e.id === "e2")!.columns.find((c) => c.name === "users_id")!;
      expect(fkCol.type).toBe("uuid"); // 타깃 PK 타입을 따른다
      expect(res.doc.relationships).toHaveLength(1);
      expect(res.doc.relationships[0]!.sourceColumnIds).toEqual([fkCol.id]); // 파생 컬럼으로 항상 비지 않는다
      expect(res.doc.relationships[0]!.targetColumnIds).toEqual(["c1"]);
      expect(res.resultText).toContain("added relation orders->users");
    });

    it("fkColumnName이 없고 파생 이름이 호환 타입 컬럼과 겹치면 새 컬럼 없이 재사용한다", async () => {
      const withDerivedCol: DiagramDocument = {
        ...twoTableDoc,
        entities: twoTableDoc.entities.map((e) =>
          e.id === "e2"
            ? {
                ...e,
                columns: [
                  ...e.columns,
                  { id: "c4", name: "users_id", type: "uuid", nullable: false, primaryKey: false, unique: false, defaultValue: null, comment: null, ordinal: 2 },
                ],
              }
            : e,
        ),
      };
      const res = await executor.execute("addRelation", { sourceTableId: "e2", targetTableId: "e1", cardinality: "many-to-one" }, withDerivedCol);
      expect(res.changes).toHaveLength(1); // addColumn 없이 addRelation만
      expect(res.doc.entities.find((e) => e.id === "e2")!.columns.filter((c) => c.name === "users_id")).toHaveLength(1);
      expect(res.doc.relationships[0]!.sourceColumnIds).toEqual(["c4"]);
      expect(res.doc.relationships[0]!.targetColumnIds).toEqual(["c1"]);
    });

    it("fkColumnName이 없고 파생 이름이 타입이 다른 컬럼과 겹치면 두 타입을 명시한 오류를 반환한다", async () => {
      const withClashingCol: DiagramDocument = {
        ...twoTableDoc,
        entities: twoTableDoc.entities.map((e) =>
          e.id === "e2"
            ? {
                ...e,
                columns: [
                  ...e.columns,
                  { id: "c4", name: "users_id", type: "bigint", nullable: false, primaryKey: false, unique: false, defaultValue: null, comment: null, ordinal: 2 },
                ],
              }
            : e,
        ),
      };
      const res = await executor.execute("addRelation", { sourceTableId: "e2", targetTableId: "e1", cardinality: "many-to-one" }, withClashingCol);
      expect(res.changes).toHaveLength(0);
      expect(res.doc).toBe(withClashingCol);
      expect(res.doc.relationships).toHaveLength(0);
      expect(res.resultText).toContain("bigint");
      expect(res.resultText).toContain("uuid");
      expect(res.resultText).toContain("updateColumn");
    });

    it("fkColumnName이 새 이름이면 타깃 PK 타입으로 FK 컬럼을 만들고 양쪽 컬럼을 관계에 연결한다", async () => {
      const res = await executor.execute(
        "addRelation",
        { sourceTableId: "e2", targetTableId: "e1", cardinality: "many-to-one", fkColumnName: "owner_id", fkNullable: true },
        withUsersPkType("bigint"),
      );
      expect(res.changes).toHaveLength(2);
      expect(res.changes[0]).toMatchObject({ type: "addColumn", tableId: "e2", tableName: "orders", columnName: "owner_id", columnType: "bigint" });
      expect(res.changes[1]).toMatchObject({ type: "addRelation", fromTable: "orders", toTable: "users" });
      const fkCol = res.doc.entities.find((e) => e.id === "e2")!.columns.find((c) => c.name === "owner_id")!;
      expect(fkCol.type).toBe("bigint"); // uuid 고정이 아니라 타깃 PK 타입을 따른다
      expect(fkCol.nullable).toBe(true);
      expect(res.doc.relationships[0]!.sourceColumnIds).toEqual([fkCol.id]);
      expect(res.doc.relationships[0]!.targetColumnIds).toEqual(["c1"]);
    });

    it("fkColumnName이 이미 존재하고 타입이 PK와 같으면 그 컬럼을 재사용하고 타깃 PK를 연결한다", async () => {
      const res = await executor.execute(
        "addRelation",
        { sourceTableId: "e2", targetTableId: "e1", cardinality: "many-to-one", fkColumnName: "user_id" },
        twoTableDoc,
      );
      expect(res.changes).toHaveLength(1); // addColumn 없이 addRelation만
      expect(res.doc.entities.find((e) => e.id === "e2")!.columns.filter((c) => c.name === "user_id")).toHaveLength(1);
      expect(res.doc.relationships[0]!.sourceColumnIds).toEqual(["c3"]);
      expect(res.doc.relationships[0]!.targetColumnIds).toEqual(["c1"]);
    });

    it("기존 컬럼 재사용 시 타입이 타깃 PK와 다르면 두 타입을 명시한 오류를 반환한다", async () => {
      const bigintPkDoc = withUsersPkType("bigint"); // 소스의 user_id는 uuid 그대로
      const res = await executor.execute(
        "addRelation",
        { sourceTableId: "e2", targetTableId: "e1", cardinality: "many-to-one", fkColumnName: "user_id" },
        bigintPkDoc,
      );
      expect(res.changes).toHaveLength(0);
      expect(res.doc).toBe(bigintPkDoc);
      expect(res.doc.relationships).toHaveLength(0);
      expect(res.resultText).toContain("uuid");
      expect(res.resultText).toContain("bigint");
      expect(res.resultText).toContain("updateColumn");
    });

    it("존재하지 않는 관계 삭제 시 명시적 오류를 반환한다", async () => {
      const res = await executor.execute("removeRelation", { relationId: "ghost" }, twoTableDoc);
      expect(res.changes).toHaveLength(0);
      expect(res.resultText).toContain('no relationship found with id "ghost"');
    });

    it("removeRelation이 관계를 제거하고 양쪽 테이블 이름을 반환한다", async () => {
      const withRel: DiagramDocument = {
        ...twoTableDoc,
        relationships: [
          {
            id: "r1", name: "", sourceEntityId: "e2", sourceColumnIds: ["c3"],
            targetEntityId: "e1", targetColumnIds: [], cardinality: "many-to-one",
            onDelete: "no-action", onUpdate: "no-action", identifying: false,
          },
        ],
      };
      const res = await executor.execute("removeRelation", { relationId: "r1" }, withRel);
      expect(res.doc.relationships).toHaveLength(0);
      expect(res.changes[0]).toEqual({ type: "removeRelation", relationId: "r1", fromTable: "orders", toTable: "users" });
      expect(res.resultText).toContain("removed relation orders->users");
    });
  });

  it("addIndex가 인덱스를 추가하고 컬럼 이름과 unique 기본값(false)을 반환한다", async () => {
    const res = await executor.execute("addIndex", { tableId: "e1", name: "idx_users_id", columnIds: ["c1"] }, baseDoc);
    expect(res.doc.indexes).toHaveLength(1);
    expect(res.changes[0]).toMatchObject({ type: "addIndex", tableName: "users", indexName: "idx_users_id", columnNames: ["id"], unique: false });
    expect(res.resultText).toContain("added index idx_users_id on users");
  });
});
