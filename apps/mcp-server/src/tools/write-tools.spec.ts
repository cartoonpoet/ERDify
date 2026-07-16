import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DiagramDocument, DiagramEntity } from "@erdify/domain";
import { addObject, createEmptyDiagram } from "@erdify/domain";

import { assertColumnsExist, buildColumn, registerWriteTools } from "./write-tools.js";
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
    registerTool: (name: string, _config: unknown, handler: ToolHandler) => {
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
