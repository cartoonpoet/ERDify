import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { OrganizationAiSettings, AiConversation, Diagram, OrganizationMember } from "@erdify/db";
import { AiService } from "./ai.service";
import { AiHistoryService } from "./ai-history.service";
import { DomainLoaderService } from "../../common/services/domain-loader.service";
import { encrypt } from "../../common/utils/field-cipher";
import type { DiagramDocument } from "@erdify/domain";

let anthropicCreateMock: ReturnType<typeof vi.fn>;

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: (...args: unknown[]) => anthropicCreateMock(...args),
    },
  })),
}));

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  findOne: vi.fn(),
  find: vi.fn(),
  save: vi.fn(),
  create: vi.fn((v: unknown) => v),
  update: vi.fn(),
  delete: vi.fn(),
  createQueryBuilder: vi.fn(),
  ...overrides,
});

const makeEmptyDoc = (): DiagramDocument => ({
  format: "erdify.schema.v1",
  id: "doc-1",
  name: "Test",
  dialect: "postgresql",
  entities: [],
  relationships: [],
  indexes: [],
  views: [],
  layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
});

describe("AiService", () => {
  let service: AiService;
  let settingsRepo: ReturnType<typeof makeRepo>;
  let diagramRepo: ReturnType<typeof makeRepo>;
  let memberRepo: ReturnType<typeof makeRepo>;
  let domainLoader: { load: ReturnType<typeof vi.fn> };
  let historyService: {
    findRecent: ReturnType<typeof vi.fn>;
    saveUserMessage: ReturnType<typeof vi.fn>;
    saveAssistantMessage: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    anthropicCreateMock = vi.fn();
    settingsRepo = makeRepo();
    diagramRepo = makeRepo();
    memberRepo = makeRepo();
    domainLoader = { load: vi.fn() };
    historyService = {
      findRecent: vi.fn().mockResolvedValue([]),
      saveUserMessage: vi.fn().mockResolvedValue({ id: "msg-u1" }),
      saveAssistantMessage: vi.fn().mockResolvedValue({ id: "msg-a1", content: "Done." }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getRepositoryToken(OrganizationAiSettings), useValue: settingsRepo },
        { provide: getRepositoryToken(Diagram), useValue: diagramRepo },
        { provide: getRepositoryToken(OrganizationMember), useValue: memberRepo },
        { provide: AiHistoryService, useValue: historyService },
        { provide: DomainLoaderService, useValue: domainLoader },
      ],
    }).compile();

    service = module.get(AiService);
  });

  describe("getOrgAiSettings", () => {
    it("멤버가 아니면 ForbiddenException을 던진다", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.getOrgAiSettings("org-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("API 키가 없으면 hasApiKey=false를 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue(null);
      const result = await service.getOrgAiSettings("org-1", "user-1");
      expect(result).toEqual({ organizationId: "org-1", hasApiKey: false, provider: "anthropic", model: "" });
    });

    it("API 키가 있으면 hasApiKey=true를 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ encryptedApiKey: "iv:encrypted" });
      const result = await service.getOrgAiSettings("org-1", "user-1");
      expect(result.hasApiKey).toBe(true);
    });
  });

  describe("updateOrgAiSettings", () => {
    it("owner가 아니면 ForbiddenException을 던진다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-xxx", "anthropic", "")).rejects.toThrow(ForbiddenException);
    });

    it("멤버가 없으면 ForbiddenException을 던진다", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-xxx", "anthropic", "")).rejects.toThrow(ForbiddenException);
    });

    it("owner이면 API 키를 암호화해서 저장한다 (신규)", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "owner" });
      settingsRepo.findOne.mockResolvedValue(null);
      settingsRepo.save.mockResolvedValue({});
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-xxx", "anthropic", "")).resolves.toBeUndefined();
      expect(settingsRepo.save).toHaveBeenCalled();
      const savedArg = (settingsRepo.save.mock.calls[0] as [{ encryptedApiKey: string }])[0];
      expect(savedArg.encryptedApiKey).not.toBe("sk-ant-xxx");
      expect(typeof savedArg.encryptedApiKey).toBe("string");
    });

    it("기존 설정이 있으면 update를 호출한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "owner" });
      settingsRepo.findOne.mockResolvedValue({ id: "setting-1", encryptedApiKey: "old" });
      settingsRepo.update.mockResolvedValue({});
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-new", "anthropic", "")).resolves.toBeUndefined();
      expect(settingsRepo.update).toHaveBeenCalled();
      expect(settingsRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── Helpers shared by chat() tests ──────────────────────────────────────────

  const setupChatHappyPath = (doc: DiagramDocument = makeEmptyDoc()) => {
    const qb = {
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue({ content: doc, org_id: "org-1" }),
    };
    diagramRepo.createQueryBuilder.mockReturnValue(qb);
    memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
    settingsRepo.findOne.mockResolvedValue({
      encryptedApiKey: encrypt("sk-ant-key"),
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });
    return qb;
  };

  describe("chat()", () => {
    it("Anthropic 제공자 — 텍스트 응답만 반환 시 diff가 null", async () => {
      setupChatHappyPath();

      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: "테이블이 없습니다." }],
      });
      historyService.saveAssistantMessage.mockResolvedValue({ id: "msg-a1", content: "테이블이 없습니다." });

      const result = await service.chat("user-1", "diag-1", "현재 테이블이 있나요?");

      expect(result.messageId).toBe("msg-a1");
      expect(result.content).toBe("테이블이 없습니다.");
      expect(result.diff).toBeNull();
      expect(result.pendingDocument).toBeNull();
    });

    it("API 키가 설정되지 않은 경우 ForbiddenException을 던진다", async () => {
      const qb = {
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ content: makeEmptyDoc(), org_id: "org-1" }),
      };
      diagramRepo.createQueryBuilder.mockReturnValue(qb);
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue(null);

      await expect(service.chat("user-1", "diag-1", "안녕")).rejects.toThrow(ForbiddenException);
    });

    it("다이어그램을 찾을 수 없는 경우 NotFoundException을 던진다", async () => {
      const qb = {
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue(null),
      };
      diagramRepo.createQueryBuilder.mockReturnValue(qb);
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });

      await expect(service.chat("user-1", "missing-diag", "안녕")).rejects.toThrow(NotFoundException);
    });

    it("tool call이 addTable을 반환하면 diffs에 addTable 변경이 포함된다", async () => {
      const doc = makeEmptyDoc();
      setupChatHappyPath(doc);

      anthropicCreateMock.mockResolvedValue({
        content: [
          { type: "text", text: "users 테이블을 추가했습니다." },
          {
            type: "tool_use",
            name: "addTable",
            input: { name: "users", columns: [{ name: "id", type: "uuid", primaryKey: true, nullable: false }] },
          },
        ],
      });

      const updatedDoc = { ...doc, entities: [{ id: "ent-new", name: "users", logicalName: null, comment: null, color: null, columns: [] }] };
      domainLoader.load.mockResolvedValue({
        addEntity: vi.fn().mockReturnValue(updatedDoc),
        removeEntity: vi.fn(),
        renameEntity: vi.fn(),
        addColumn: vi.fn().mockReturnValue(updatedDoc),
        removeColumn: vi.fn(),
        updateColumn: vi.fn(),
        addRelationship: vi.fn(),
        removeRelationship: vi.fn(),
      });

      historyService.saveAssistantMessage.mockResolvedValue({
        id: "msg-a2",
        content: "users 테이블을 추가했습니다.",
      });

      const result = await service.chat("user-1", "diag-1", "users 테이블 추가해줘");

      expect(result.diff).not.toBeNull();
      expect(result.diff?.some((d) => d.type === "addTable")).toBe(true);
      expect(result.pendingDocument).not.toBeNull();
    });

    it("tool call이 여러 diffs를 생성하면 응답에 모두 포함된다", async () => {
      const doc = makeEmptyDoc();
      setupChatHappyPath(doc);

      anthropicCreateMock.mockResolvedValue({
        content: [
          { type: "text", text: "완료했습니다." },
          { type: "tool_use", name: "addTable", input: { name: "orders" } },
          { type: "tool_use", name: "addTable", input: { name: "products" } },
        ],
      });

      const docWithOrders = { ...doc, entities: [{ id: "ent-orders", name: "orders", logicalName: null, comment: null, color: null, columns: [] }] };
      const docWithBoth = {
        ...docWithOrders,
        entities: [
          ...docWithOrders.entities,
          { id: "ent-products", name: "products", logicalName: null, comment: null, color: null, columns: [] },
        ],
      };

      const addEntityMock = vi.fn()
        .mockReturnValueOnce(docWithOrders)
        .mockReturnValueOnce(docWithBoth);

      domainLoader.load.mockResolvedValue({
        addEntity: addEntityMock,
        addColumn: vi.fn().mockReturnValue(docWithBoth),
        removeEntity: vi.fn(),
        renameEntity: vi.fn(),
        removeColumn: vi.fn(),
        updateColumn: vi.fn(),
        addRelationship: vi.fn(),
        removeRelationship: vi.fn(),
      });

      historyService.saveAssistantMessage.mockResolvedValue({ id: "msg-a3", content: "완료했습니다." });

      const result = await service.chat("user-1", "diag-1", "orders와 products 테이블 추가해줘");

      expect(result.diff).not.toBeNull();
      const addTableDiffs = result.diff?.filter((d) => d.type === "addTable") ?? [];
      expect(addTableDiffs).toHaveLength(2);
    });
  });

  describe("suggestColumns()", () => {
    it("Anthropic 응답에서 JSON 배열을 파싱해서 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({
        encryptedApiKey: encrypt("sk-ant-key"),
        provider: "anthropic",
        model: "claude-sonnet-4-6",
      });

      const suggestions = [
        { name: "id", type: "uuid", nullable: false, pk: true },
        { name: "created_at", type: "timestamptz", nullable: false, pk: false },
      ];
      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(suggestions) }],
      });

      const result = await service.suggestColumns("user-1", "users", ["email"]);

      expect(result).toEqual(suggestions);
    });

    it("응답이 유효하지 않은 JSON이면 빈 배열을 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({
        encryptedApiKey: encrypt("sk-ant-key"),
        provider: "anthropic",
        model: "claude-sonnet-4-6",
      });

      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: "Sure! Here are some columns you might consider..." }],
      });

      const result = await service.suggestColumns("user-1", "users", []);
      expect(result).toEqual([]);
    });

    it("응답에 JSON 배열이 없으면 빈 배열을 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({
        encryptedApiKey: encrypt("sk-ant-key"),
        provider: "anthropic",
        model: "claude-sonnet-4-6",
      });

      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: "" }],
      });

      const result = await service.suggestColumns("user-1", "orders", ["id"]);
      expect(result).toEqual([]);
    });

    it("조직 멤버십이 없으면 ForbiddenException을 던진다", async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(service.suggestColumns("user-1", "users", [])).rejects.toThrow(ForbiddenException);
    });

    it("응답 텍스트에 설명이 섞여 있어도 JSON 배열 부분만 파싱한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({
        encryptedApiKey: encrypt("sk-ant-key"),
        provider: "anthropic",
        model: "claude-sonnet-4-6",
      });

      const suggestions = [{ name: "email", type: "varchar", nullable: false, pk: false }];
      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: `Here are suggestions:\n${JSON.stringify(suggestions)}\nHope that helps!` }],
      });

      const result = await service.suggestColumns("user-1", "users", []);
      expect(result).toEqual(suggestions);
    });
  });
});
