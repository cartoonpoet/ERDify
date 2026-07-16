import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DiagramColumn, DiagramDocument, DiagramEntity, DiagramRelationship } from "@erdify/domain";
import { createEmptyDiagram } from "@erdify/domain";

import { registerReadTools } from "./read-tools.js";
import { client } from "../client.js";

vi.mock("../client.js", () => ({
  client: {
    getOrganizations: vi.fn(),
    getProjects: vi.fn(),
    getDiagrams: vi.fn(),
    getDiagram: vi.fn(),
    recordToolCall: vi.fn(),
  },
}));

// registerReadTools가 등록한 tool 핸들러를 이름으로 수집한다 (실제 McpServer 불필요).
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
  registerReadTools(fakeServer);
  return handlers;
}

const makeColumn = (id: string, name: string, overrides: Partial<DiagramColumn> = {}): DiagramColumn => ({
  id,
  name,
  type: "varchar",
  nullable: true,
  primaryKey: false,
  unique: false,
  defaultValue: null,
  comment: null,
  autoIncrement: false,
  ordinal: 0,
  ...overrides,
});

const makeEntity = (id: string, name: string, columns: DiagramColumn[]): DiagramEntity => ({
  id,
  name,
  logicalName: null,
  comment: null,
  color: null,
  columns,
});

const makeRelationship = (overrides: Partial<DiagramRelationship>): DiagramRelationship => ({
  id: "r1",
  name: "fk_posts_users",
  sourceEntityId: "e2",
  sourceColumnIds: [],
  targetEntityId: "e1",
  targetColumnIds: [],
  cardinality: "many-to-one",
  onDelete: "no-action",
  onUpdate: "no-action",
  identifying: false,
  ...overrides,
});

describe("read tools", () => {
  const tools = collectTools();
  const baseDoc = (): DiagramDocument => createEmptyDiagram({ id: "d1", name: "T", dialect: "postgresql" });
  const asResponse = (content: DiagramDocument) => ({ id: "d1", name: "T", content, organizationId: "org1" });

  // users(id PK NOT NULL, email UNIQUE) ← posts(user_id), 관계 1건 포함 픽스처
  const docWithTables = (): DiagramDocument => ({
    ...baseDoc(),
    entities: [
      makeEntity("e1", "users", [
        makeColumn("c1", "id", { type: "uuid", primaryKey: true, nullable: false, ordinal: 0 }),
        makeColumn("c2", "email", { unique: true, ordinal: 1 }),
      ]),
      makeEntity("e2", "posts", [
        makeColumn("c3", "user_id", { type: "uuid", ordinal: 0 }),
      ]),
    ],
    relationships: [
      makeRelationship({ sourceColumnIds: ["c3"], targetColumnIds: ["c1"] }),
    ],
  });

  beforeEach(() => {
    vi.mocked(client.getOrganizations).mockReset();
    vi.mocked(client.getProjects).mockReset();
    vi.mocked(client.getDiagrams).mockReset();
    vi.mocked(client.getDiagram).mockReset();
    // 핸들러가 recordToolCall(...).catch(...)를 호출하므로 항상 Promise를 반환해야 한다
    vi.mocked(client.recordToolCall).mockReset().mockResolvedValue(undefined as never);
  });

  describe("list_organizations", () => {
    it("조직 목록을 이름과 id로 나열한다", async () => {
      vi.mocked(client.getOrganizations).mockResolvedValue([
        { id: "org1", name: "Acme" },
        { id: "org2", name: "Beta" },
      ]);

      const res = await tools.get("list_organizations")!({});

      expect(res.content[0]!.text).toBe("- Acme (id: org1)\n- Beta (id: org2)");
    });

    it("조직이 없으면 안내 문구를 반환한다", async () => {
      vi.mocked(client.getOrganizations).mockResolvedValue([]);

      const res = await tools.get("list_organizations")!({});

      expect(res.content[0]!.text).toBe("No organizations found.");
    });
  });

  describe("list_projects", () => {
    it("organizationId로 프로젝트 목록을 조회해 나열한다", async () => {
      vi.mocked(client.getProjects).mockResolvedValue([{ id: "p1", name: "ERD" }]);

      const res = await tools.get("list_projects")!({ organizationId: "org1" });

      expect(vi.mocked(client.getProjects)).toHaveBeenCalledWith("org1");
      expect(res.content[0]!.text).toBe("- ERD (id: p1)");
    });

    it("프로젝트가 없으면 안내 문구를 반환한다", async () => {
      vi.mocked(client.getProjects).mockResolvedValue([]);

      const res = await tools.get("list_projects")!({ organizationId: "org1" });

      expect(res.content[0]!.text).toBe("No projects found.");
    });
  });

  describe("list_diagrams", () => {
    it("projectId로 다이어그램 목록을 갱신일과 함께 나열한다", async () => {
      vi.mocked(client.getDiagrams).mockResolvedValue([
        { id: "d1", name: "Main", updatedAt: "2026-01-01T00:00:00Z" },
      ]);

      const res = await tools.get("list_diagrams")!({ projectId: "p1" });

      expect(vi.mocked(client.getDiagrams)).toHaveBeenCalledWith("p1");
      expect(res.content[0]!.text).toBe("- Main (id: d1, updated: 2026-01-01T00:00:00Z)");
    });

    it("다이어그램이 없으면 안내 문구를 반환한다", async () => {
      vi.mocked(client.getDiagrams).mockResolvedValue([]);

      const res = await tools.get("list_diagrams")!({ projectId: "p1" });

      expect(res.content[0]!.text).toBe("No diagrams found.");
    });
  });

  describe("get_diagram", () => {
    it("formatDiagram 요약을 반환하고 recordToolCall을 남긴다", async () => {
      vi.mocked(client.getDiagram).mockResolvedValue(asResponse(docWithTables()));

      const res = await tools.get("get_diagram")!({ diagramId: "d1" });

      const text = res.content[0]!.text;
      expect(text).toContain('Diagram: "T" (postgresql)');
      expect(text).toContain("Tables (2):");
      expect(text).toContain("users [tableId: e1]");
      expect(text).toContain("- id [columnId: c1]: uuid PK NOT NULL");
      expect(text).toContain("Relationships (1):");
      expect(text).toContain("posts → users (many-to-one) [relationshipId: r1]");
      expect(vi.mocked(client.recordToolCall)).toHaveBeenCalledWith("d1", "get_diagram", expect.stringContaining("T"));
    });
  });

  describe("get_table", () => {
    it("테이블명(대소문자 무시)으로 컬럼과 관계를 조회한다", async () => {
      vi.mocked(client.getDiagram).mockResolvedValue(asResponse(docWithTables()));

      const res = await tools.get("get_table")!({ diagramId: "d1", tableName: "USERS" });

      const text = res.content[0]!.text;
      expect(text).toContain("Table: users [tableId: e1]");
      expect(text).toContain("- id [columnId: c1]: uuid PK NOT NULL");
      expect(text).toContain("- email [columnId: c2]: varchar UNIQUE");
      expect(text).toContain("Relationships (1):");
      expect(text).toContain("posts → users (many-to-one) [relationshipId: r1]");
    });

    it("관계가 없는 테이블은 Relationships 섹션을 생략한다", async () => {
      const doc: DiagramDocument = { ...docWithTables(), relationships: [] };
      vi.mocked(client.getDiagram).mockResolvedValue(asResponse(doc));

      const res = await tools.get("get_table")!({ diagramId: "d1", tableName: "posts" });

      expect(res.content[0]!.text).not.toContain("Relationships");
    });

    it("존재하지 않는 테이블이면 not found 메시지를 반환한다", async () => {
      vi.mocked(client.getDiagram).mockResolvedValue(asResponse(docWithTables()));

      const res = await tools.get("get_table")!({ diagramId: "d1", tableName: "ghost" });

      expect(res.content[0]!.text).toBe('Table "ghost" not found in diagram "T".');
    });
  });

  describe("get_ddl", () => {
    it("DDL을 생성하고 recordToolCall을 남긴다", async () => {
      vi.mocked(client.getDiagram).mockResolvedValue(asResponse(docWithTables()));

      const res = await tools.get("get_ddl")!({ diagramId: "d1" });

      const text = res.content[0]!.text;
      expect(text).toContain('CREATE TABLE "users"');
      expect(text).not.toContain("경고"); // 정상 다이어그램이면 경고 배너가 없어야 한다
      expect(vi.mocked(client.recordToolCall)).toHaveBeenCalledWith("d1", "get_ddl", expect.stringContaining("DDL"));
    });

    it("테이블이 없으면 placeholder 주석을 반환한다", async () => {
      vi.mocked(client.getDiagram).mockResolvedValue(asResponse(baseDoc()));

      const res = await tools.get("get_ddl")!({ diagramId: "d1" });

      expect(res.content[0]!.text).toBe("-- No tables defined");
    });

    it("강등된 항목이 있으면 경고 배너를 DDL 상단에 노출한다", async () => {
      // 대상 엔티티가 없는 FK → fk_missing_entity 경고 + 주석 강등
      const doc: DiagramDocument = {
        ...docWithTables(),
        relationships: [makeRelationship({ targetEntityId: "ghost", targetColumnIds: [] })],
      };
      vi.mocked(client.getDiagram).mockResolvedValue(asResponse(doc));

      const res = await tools.get("get_ddl")!({ diagramId: "d1" });

      const text = res.content[0]!.text;
      expect(text).toContain("erdify export 경고 1건");
      expect(text).toContain("[fk_missing_entity]");
      expect(text.indexOf("경고")).toBeLessThan(text.indexOf("CREATE TABLE"));
    });
  });
});
