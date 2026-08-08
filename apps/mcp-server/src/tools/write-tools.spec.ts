import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DiagramDocument, DiagramEntity } from "@erdify/domain";
import { addColumn, addColumns, addEntity, addIndex, addObject, createEmptyDiagram } from "@erdify/domain";

import { assertColumnsExist, buildColumn, registerWriteTools, resolveColumnRef } from "./write-tools.js";
import { client } from "../client.js";

vi.mock("../client.js", () => ({
  client: {
    getDiagram: vi.fn(),
    updateDiagram: vi.fn(),
    recordToolCall: vi.fn(),
  },
}));

describe("buildColumn", () => {
  it("컬럼 추가 시 논리명(comment)을 반영한다", () => {
    const column = buildColumn({ name: "email", type: "varchar", comment: "이메일" }, 0);

    expect(column.name).toBe("email");
    expect(column.comment).toBe("이메일");
  });

  it("comment 미전달 시 null로 초기화한다", () => {
    const column = buildColumn({ name: "email", type: "varchar" }, 0);

    expect(column.comment).toBeNull();
  });

  it("autoIncrement를 반영하고, 미전달 시 false로 초기화한다", () => {
    expect(buildColumn({ name: "id", type: "bigint", autoIncrement: true }, 0).autoIncrement).toBe(true);
    expect(buildColumn({ name: "id", type: "bigint" }, 0).autoIncrement).toBe(false);
  });

  it("기본값(nullable/primaryKey/unique/defaultValue)을 적용한다", () => {
    const column = buildColumn({ name: "email", type: "varchar" }, 3);

    expect(column.nullable).toBe(true);
    expect(column.primaryKey).toBe(false);
    expect(column.unique).toBe(false);
    expect(column.defaultValue).toBeNull();
    expect(column.ordinal).toBe(3);
  });
});

describe("assertColumnsExist", () => {
  const entity: DiagramEntity = {
    id: "e1",
    name: "users",
    logicalName: null,
    comment: null,
    color: null,
    columns: [buildColumn({ name: "id", type: "uuid" }, 0)],
  };
  // buildColumn이 부여한 실제 컬럼 id로 검증
  const validId = entity.columns[0]!.id;

  it("존재하는 컬럼 id면 통과한다", () => {
    expect(() => assertColumnsExist(entity, [validId], "Source")).not.toThrow();
  });

  it("빈 배열이면 통과한다 (컬럼 미지정 관계 허용)", () => {
    expect(() => assertColumnsExist(entity, [], "Source")).not.toThrow();
  });

  it("존재하지 않는 컬럼 id면 테이블명과 함께 에러를 던진다", () => {
    expect(() => assertColumnsExist(entity, ["ghost"], "Target")).toThrow(/Target table "users".*ghost/);
  });
});

// registerWriteTools가 등록한 tool 핸들러를 이름으로 수집한다 (실제 McpServer 불필요).
type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

function collectTools(): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();
  const fakeServer = {
    registerTool: (name: string, config: { description?: string; inputSchema?: unknown }, handler: ToolHandler) => {
      if (!config.inputSchema || typeof config.inputSchema !== "object") {
        throw new Error(`tool "${name}" registered without inputSchema`);
      }
      handlers.set(name, handler);
    },
  } as unknown as McpServer;
  registerWriteTools(fakeServer);
  return handlers;
}

describe("object write tools", () => {
  const tools = collectTools();
  const baseDoc = (): DiagramDocument => createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
  const asResponse = (content: DiagramDocument) => ({ id: "d1", name: "T", content, organizationId: "org1" });
  const lastSavedDoc = (): DiagramDocument =>
    vi.mocked(client.updateDiagram).mock.calls[0]![1] as DiagramDocument;

  beforeEach(() => {
    vi.mocked(client.getDiagram).mockReset();
    vi.mocked(client.updateDiagram).mockReset().mockResolvedValue(undefined);
    // 핸들러가 recordToolCall(...).catch(...)를 호출하므로 항상 Promise를 반환해야 한다
    vi.mocked(client.recordToolCall).mockReset().mockResolvedValue(undefined as never);
  });

  it("add_object: 객체를 추가하고 objectId를 반환한다", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(baseDoc()));

    const res = await tools.get("add_object")!({
      diagramId: "d1",
      kind: "view",
      name: "v_active",
      sql: "CREATE VIEW v_active AS SELECT 1;",
    });

    expect(vi.mocked(client.updateDiagram)).toHaveBeenCalledTimes(1);
    const saved = lastSavedDoc();
    expect(saved.objects).toHaveLength(1);
    expect(saved.objects![0]).toMatchObject({ kind: "view", name: "v_active" });
    expect(res.content[0]!.text).toContain("objectId=");
  });

  it("update_object: 제공된 필드만 갱신하고 id는 유지한다", async () => {
    const doc = addObject(baseDoc(), {
      id: "o1",
      kind: "view",
      name: "old",
      sql: "CREATE VIEW old AS SELECT 1;",
    });
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(doc));

    await tools.get("update_object")!({ diagramId: "d1", objectId: "o1", name: "renamed" });

    const saved = lastSavedDoc();
    expect(saved.objects![0]).toMatchObject({ id: "o1", kind: "view", name: "renamed" });
  });

  it("update_column: autoIncrement 갱신이 저장 문서에 반영된다", async () => {
    let doc = addEntity(baseDoc(), { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", { ...buildColumn({ name: "id", type: "bigint", primaryKey: true }, 0), id: "c1" });
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(doc));

    await tools.get("update_column")!({
      diagramId: "d1",
      tableId: "e1",
      columnId: "c1",
      updates: { autoIncrement: true },
    });

    const saved = lastSavedDoc();
    expect(saved.entities[0]!.columns[0]).toMatchObject({ id: "c1", autoIncrement: true });
  });

  it("update_object: 존재하지 않는 id면 에러를 던지고 저장하지 않는다", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(baseDoc()));

    await expect(
      tools.get("update_object")!({ diagramId: "d1", objectId: "ghost", name: "x" })
    ).rejects.toThrow(/ghost/);
    expect(vi.mocked(client.updateDiagram)).not.toHaveBeenCalled();
  });

  it("remove_object: 객체를 삭제한다", async () => {
    const doc = addObject(baseDoc(), {
      id: "o1",
      kind: "procedure",
      name: "sp_touch",
      sql: "CREATE PROCEDURE sp_touch() AS $$ BEGIN END $$;",
    });
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(doc));

    const res = await tools.get("remove_object")!({ diagramId: "d1", objectId: "o1" });

    expect(lastSavedDoc().objects).toHaveLength(0);
    expect(res.content[0]!.text).toContain("removed");
  });

  it("remove_object: 존재하지 않는 id면 에러를 던지고 저장하지 않는다", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(baseDoc()));

    await expect(
      tools.get("remove_object")!({ diagramId: "d1", objectId: "ghost" })
    ).rejects.toThrow(/ghost/);
    expect(vi.mocked(client.updateDiagram)).not.toHaveBeenCalled();
  });
});

describe("table / column placement / index write tools (#106 #107 #109 #112)", () => {
  const tools = collectTools();
  const asResponse = (content: DiagramDocument) => ({ id: "d1", name: "T", content, organizationId: "org1" });
  const lastSavedDoc = (): DiagramDocument =>
    vi.mocked(client.updateDiagram).mock.calls[0]![1] as DiagramDocument;

  const mysqlDoc = (): DiagramDocument => createEmptyDiagram({ id: "d1", name: "T", dialect: "mysql" });

  /** ArticleID / ManageNo / Title 3컬럼짜리 App.Article */
  const articleDoc = (): DiagramDocument => {
    let doc = addEntity(mysqlDoc(), { id: "e1", name: "Article", schema: "App" });
    doc = addColumns(doc, "e1", [
      { ...buildColumn({ name: "ArticleID", type: "int", primaryKey: true }, 0), id: "c1" },
      { ...buildColumn({ name: "ManageNo", type: "varchar(20)" }, 1), id: "c2" },
      { ...buildColumn({ name: "Title", type: "varchar(200)" }, 2), id: "c3" },
    ]);
    return doc;
  };

  const columnNames = (doc: DiagramDocument): string[] =>
    [...doc.entities[0]!.columns].sort((a, b) => a.ordinal - b.ordinal).map((c) => c.name);

  beforeEach(() => {
    vi.mocked(client.getDiagram).mockReset();
    vi.mocked(client.updateDiagram).mockReset().mockResolvedValue(undefined);
    vi.mocked(client.recordToolCall).mockReset().mockResolvedValue(undefined as never);
  });

  it("add_table: schema를 저장하고 응답에 Schema.Table로 알린다 (#106)", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(mysqlDoc()));

    const res = await tools.get("add_table")!({ diagramId: "d1", name: "OrderItem", schema: "Sales" });

    expect(lastSavedDoc().entities[0]).toMatchObject({ name: "OrderItem", schema: "Sales" });
    expect(res.content[0]!.text).toContain('Table "Sales.OrderItem" added');
  });

  it("add_table: 스키마를 쓰는 다이어그램에 스키마 없이 만들면 경고를 붙인다 (#106)", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));

    const res = await tools.get("add_table")!({ diagramId: "d1", name: "Orphan" });

    expect(res.content[0]!.text).toContain("Warning");
    expect(res.content[0]!.text).toContain("update_table");
  });

  it("add_table: 스키마를 안 쓰는 다이어그램에서는 경고하지 않는다 (#106)", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(addEntity(mysqlDoc(), { id: "e1", name: "A" })));

    const res = await tools.get("add_table")!({ diagramId: "d1", name: "B" });

    expect(res.content[0]!.text).not.toContain("Warning");
  });

  it("update_table: 이름 앞뒤 공백을 삭제·재생성 없이 고친다 (#107)", async () => {
    let doc = addEntity(mysqlDoc(), { id: "e1", name: "Orders  ", schema: "Sales" });
    doc = addColumn(doc, "e1", { ...buildColumn({ name: "id", type: "int" }, 0), id: "c1" });
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(doc));

    const res = await tools.get("update_table")!({
      diagramId: "d1", tableId: "e1", updates: { name: "Orders" },
    });

    const saved = lastSavedDoc().entities[0]!;
    expect(saved).toMatchObject({ id: "e1", name: "Orders", schema: "Sales" });
    expect(saved.columns).toHaveLength(1); // tableId·컬럼 유지
    expect(res.content[0]!.text).toContain('→ "Sales.Orders"');
  });

  it("update_table: schema만 바꿀 수 있고 null로 지울 수 있다 (#106 #107)", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));
    await tools.get("update_table")!({ diagramId: "d1", tableId: "e1", updates: { schema: null } });
    expect(lastSavedDoc().entities[0]!.schema).toBeNull();
  });

  it("update_table: 빈 updates나 없는 tableId는 저장 없이 실패한다", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));

    await expect(
      tools.get("update_table")!({ diagramId: "d1", tableId: "e1", updates: {} })
    ).rejects.toThrow(/updates` is empty/);
    await expect(
      tools.get("update_table")!({ diagramId: "d1", tableId: "ghost", updates: { name: "X" } })
    ).rejects.toThrow(/ghost/);
    expect(vi.mocked(client.updateDiagram)).not.toHaveBeenCalled();
  });

  it("add_column: after로 지정한 컬럼 바로 뒤에 넣는다 (#109)", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));

    await tools.get("add_column")!({
      diagramId: "d1", tableId: "e1",
      column: { name: "CategoryCode", type: "varchar(11)" },
      after: "ManageNo",
    });

    expect(columnNames(lastSavedDoc())).toEqual(["ArticleID", "ManageNo", "CategoryCode", "Title"]);
  });

  it("add_column: position으로도 위치를 지정할 수 있다 (#109)", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));

    await tools.get("add_column")!({
      diagramId: "d1", tableId: "e1", column: { name: "Z", type: "int" }, position: 0,
    });

    expect(columnNames(lastSavedDoc())[0]).toBe("Z");
  });

  it("add_column: 위치를 안 주면 기존처럼 맨 뒤에 붙는다", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));
    await tools.get("add_column")!({ diagramId: "d1", tableId: "e1", column: { name: "Z", type: "int" } });
    expect(columnNames(lastSavedDoc()).at(-1)).toBe("Z");
  });

  it("add_column: after와 position을 함께 주면 거부한다", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));
    await expect(
      tools.get("add_column")!({
        diagramId: "d1", tableId: "e1", column: { name: "Z", type: "int" }, after: "c1", position: 0,
      })
    ).rejects.toThrow(/either `after` or `position`/);
    expect(vi.mocked(client.updateDiagram)).not.toHaveBeenCalled();
  });

  it("add_column: 없는 after 컬럼이면 저장 없이 실패한다", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));
    await expect(
      tools.get("add_column")!({ diagramId: "d1", tableId: "e1", column: { name: "Z", type: "int" }, after: "ghost" })
    ).rejects.toThrow(/Column "ghost" not found/);
    expect(vi.mocked(client.updateDiagram)).not.toHaveBeenCalled();
  });

  it("add_column: onUpdate를 저장한다 (#109)", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));

    await tools.get("add_column")!({
      diagramId: "d1", tableId: "e1",
      column: { name: "UpdateDate", type: "datetime", nullable: false,
        defaultValue: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" },
    });

    expect(lastSavedDoc().entities[0]!.columns.at(-1)).toMatchObject({ onUpdate: "CURRENT_TIMESTAMP" });
  });

  it("update_column: onUpdate를 갱신하고 null로 지울 수 있다 (#109)", async () => {
    let doc = addEntity(mysqlDoc(), { id: "e1", name: "A" });
    doc = addColumn(doc, "e1", {
      ...buildColumn({ name: "UpdateDate", type: "datetime", onUpdate: "CURRENT_TIMESTAMP" }, 0), id: "c1",
    });
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(doc));

    await tools.get("update_column")!({ diagramId: "d1", tableId: "e1", columnId: "c1", updates: { onUpdate: null } });

    expect(lastSavedDoc().entities[0]!.columns[0]!.onUpdate).toBeNull();
  });

  it("update_column: after로 기존 컬럼을 재배치한다 (#109)", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));

    await tools.get("update_column")!({
      diagramId: "d1", tableId: "e1", columnId: "c3", updates: {}, after: "ArticleID",
    });

    expect(columnNames(lastSavedDoc())).toEqual(["ArticleID", "Title", "ManageNo"]);
  });

  it("update_column: 자기 자신을 after로 주면 거부한다", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));
    await expect(
      tools.get("update_column")!({ diagramId: "d1", tableId: "e1", columnId: "c3", updates: {}, after: "c3" })
    ).rejects.toThrow(/cannot reference the column being moved/);
  });

  it("add_index: 컬럼 이름·id를 모두 받아 인덱스를 만든다 (#112)", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));

    const res = await tools.get("add_index")!({
      diagramId: "d1", tableId: "e1", name: "IX_Article_ManageNo", columns: ["ManageNo", "c3"],
    });

    expect(lastSavedDoc().indexes[0]).toMatchObject({
      entityId: "e1", name: "IX_Article_ManageNo", columnIds: ["c2", "c3"], unique: false,
    });
    expect(res.content[0]!.text).toContain("indexId=");
  });

  it("add_index: unique 인덱스를 만들 수 있다 (#112)", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));
    await tools.get("add_index")!({
      diagramId: "d1", tableId: "e1", name: "UX", columns: ["c2"], unique: true,
    });
    expect(lastSavedDoc().indexes[0]!.unique).toBe(true);
  });

  it("add_index: 없는 컬럼·중복 컬럼·없는 테이블은 저장 없이 실패한다 (#112)", async () => {
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(articleDoc()));

    await expect(
      tools.get("add_index")!({ diagramId: "d1", tableId: "e1", name: "IX", columns: ["ghost"] })
    ).rejects.toThrow(/Column "ghost" not found/);
    await expect(
      tools.get("add_index")!({ diagramId: "d1", tableId: "e1", name: "IX", columns: ["c2", "ManageNo"] })
    ).rejects.toThrow(/must be distinct/);
    await expect(
      tools.get("add_index")!({ diagramId: "d1", tableId: "ghost", name: "IX", columns: ["c2"] })
    ).rejects.toThrow(/ghost/);
    expect(vi.mocked(client.updateDiagram)).not.toHaveBeenCalled();
  });

  it("update_index: 제공된 필드만 갱신하고 entityId는 유지한다 (#112)", async () => {
    const doc = addIndex(articleDoc(), {
      id: "i1", entityId: "e1", name: "IX", columnIds: ["c2"], unique: false,
    });
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(doc));

    await tools.get("update_index")!({ diagramId: "d1", indexId: "i1", columns: ["Title"], unique: true });

    expect(lastSavedDoc().indexes[0]).toMatchObject({
      id: "i1", entityId: "e1", name: "IX", columnIds: ["c3"], unique: true,
    });
  });

  it("update_index: 바꿀 게 없거나 없는 id면 저장 없이 실패한다 (#112)", async () => {
    const doc = addIndex(articleDoc(), { id: "i1", entityId: "e1", name: "IX", columnIds: ["c2"], unique: false });
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(doc));

    await expect(tools.get("update_index")!({ diagramId: "d1", indexId: "i1" })).rejects.toThrow(/Nothing to update/);
    await expect(tools.get("update_index")!({ diagramId: "d1", indexId: "ghost", name: "X" })).rejects.toThrow(/ghost/);
    expect(vi.mocked(client.updateDiagram)).not.toHaveBeenCalled();
  });

  it("remove_index: 인덱스를 삭제한다 (#112)", async () => {
    const doc = addIndex(articleDoc(), { id: "i1", entityId: "e1", name: "IX", columnIds: ["c2"], unique: false });
    vi.mocked(client.getDiagram).mockResolvedValue(asResponse(doc));

    const res = await tools.get("remove_index")!({ diagramId: "d1", indexId: "i1" });

    expect(lastSavedDoc().indexes).toHaveLength(0);
    expect(res.content[0]!.text).toContain('Index "IX" (i1) removed');
  });
});

describe("resolveColumnRef", () => {
  const entity: DiagramEntity = {
    id: "e1", name: "Article", logicalName: null, comment: null, color: null,
    columns: [
      { ...buildColumn({ name: "ManageNo", type: "int" }, 0), id: "c1" },
      { ...buildColumn({ name: "manageno", type: "int" }, 1), id: "c2" },
      { ...buildColumn({ name: "Title", type: "int" }, 2), id: "c3" },
    ],
  };

  it("columnId를 그대로 해석한다", () => {
    expect(resolveColumnRef(entity, "c3").id).toBe("c3");
  });

  it("이름은 대소문자를 무시하지만, 후보가 여러 개면 모호하다고 실패한다", () => {
    expect(resolveColumnRef(entity, "TITLE").id).toBe("c3");
    expect(() => resolveColumnRef(entity, "ManageNo")).toThrow(/ambiguous/);
  });

  it("없는 컬럼이면 테이블명과 함께 실패한다", () => {
    expect(() => resolveColumnRef(entity, "ghost")).toThrow(/Column "ghost" not found in table "Article"/);
  });
});
