import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiConversation } from "@erdify/db";
import { AiHistoryService, rowsToConvMessages } from "./ai-history.service";

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

describe("rowsToConvMessages()", () => {
  it("user 행은 content 그대로 user 메시지로 복원한다", () => {
    const rows = [{ role: "user", content: "users 테이블 만들어줘" }] as AiConversation[];
    expect(rowsToConvMessages(rows)).toEqual([{ role: "user", content: "users 테이블 만들어줘" }]);
  });

  it("assistant 행의 diff를 종류별 라벨로 요약하고, 알 수 없는 형태는 걸러낸다", () => {
    const rows = [
      {
        role: "assistant",
        content: "변경했어요",
        diff: [
          { type: "addTable", tableId: "e1", tableName: "users" }, // tableName 계열
          { type: "updateTable", tableId: "e1", oldName: "user", newName: "users" }, // oldName->newName
          { type: "addRelation", relationId: "r1", fromTable: "orders", toTable: "users" }, // fromTable->toTable
          { type: "mystery" }, // 알 수 없는 형태 → "" → 필터링
        ],
      },
    ] as unknown as AiConversation[];

    expect(rowsToConvMessages(rows)).toEqual([
      { role: "assistant", text: "변경했어요\n[적용한 변경: users, user->users, orders->users]", toolCalls: [] },
    ]);
  });

  it("논리명만 바뀐 updateTable(oldName===newName)은 이름 하나로만 요약한다", () => {
    const rows = [
      {
        role: "assistant",
        content: "논리명을 채웠어요",
        diff: [
          { type: "updateTable", tableId: "e1", oldName: "users", newName: "users", changes: ["logicalName"] },
        ],
      },
    ] as unknown as AiConversation[];

    expect(rowsToConvMessages(rows)).toEqual([
      { role: "assistant", text: "논리명을 채웠어요\n[적용한 변경: users]", toolCalls: [] },
    ]);
  });

  it("diff가 null이거나 비어 있으면 요약 없이 본문만 복원한다", () => {
    const rows = [
      { role: "assistant", content: "안녕하세요", diff: null },
      { role: "assistant", content: null, diff: [] },
    ] as unknown as AiConversation[];

    expect(rowsToConvMessages(rows)).toEqual([
      { role: "assistant", text: "안녕하세요", toolCalls: [] },
      { role: "assistant", text: "", toolCalls: [] },
    ]);
  });
});

describe("AiHistoryService", () => {
  let service: AiHistoryService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    repo = makeRepo();

    const module = await Test.createTestingModule({
      providers: [
        AiHistoryService,
        { provide: getRepositoryToken(AiConversation), useValue: repo },
      ],
    }).compile();

    service = module.get(AiHistoryService);
  });

  describe("saveUserMessage()", () => {
    it("repo.create와 repo.save를 올바른 인수로 호출한다", async () => {
      const savedEntity = { id: "msg-u1", userId: "user-1", diagramId: "diag-1", role: "user", content: "안녕" };
      repo.save.mockResolvedValue(savedEntity);

      const result = await service.saveUserMessage("user-1", "diag-1", "안녕");

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          diagramId: "diag-1",
          role: "user",
          content: "안녕",
          toolCalls: null,
          diff: null,
          accepted: null,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(savedEntity);
    });

    it("diagramId가 null이어도 저장한다", async () => {
      const savedEntity = { id: "msg-u2", userId: "user-1", diagramId: null, role: "user", content: "질문" };
      repo.save.mockResolvedValue(savedEntity);

      await service.saveUserMessage("user-1", null, "질문");

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ diagramId: null }),
      );
    });
  });

  describe("saveAssistantMessage()", () => {
    it("diff가 null이면 accepted 필드를 설정하지 않는다", async () => {
      const savedEntity = { id: "msg-a1", role: "assistant", content: "응답" };
      repo.save.mockResolvedValue(savedEntity);

      await service.saveAssistantMessage("user-1", "diag-1", "응답", null, null);

      const createdArg = (repo.create.mock.calls[0] as [Record<string, unknown>])[0];
      expect(createdArg).not.toHaveProperty("accepted");
    });

    it("diff가 있으면 accepted를 null로 설정한다", async () => {
      const diff = [{ type: "addTable", tableName: "users" }];
      const savedEntity = { id: "msg-a2", role: "assistant", content: "추가했습니다", accepted: null };
      repo.save.mockResolvedValue(savedEntity);

      await service.saveAssistantMessage("user-1", "diag-1", "추가했습니다", diff as never, null);

      const createdArg = (repo.create.mock.calls[0] as [Record<string, unknown>])[0];
      expect(createdArg).toHaveProperty("accepted", null);
    });

    it("toolCalls를 올바르게 저장한다", async () => {
      const toolCalls = [{ name: "addTable", input: { tableName: "orders" } }];
      repo.save.mockResolvedValue({ id: "msg-a3" });

      await service.saveAssistantMessage("user-1", "diag-1", "완료", null, toolCalls);

      const createdArg = (repo.create.mock.calls[0] as [Record<string, unknown>])[0];
      expect(createdArg).toHaveProperty("toolCalls", toolCalls);
    });
  });

  describe("findRecent()", () => {
    it("HISTORY_LIMIT=6으로 DESC 조회 후 reverse() 순서로 반환한다", async () => {
      const rows = [
        { id: "6", createdAt: new Date("2026-01-06") },
        { id: "5", createdAt: new Date("2026-01-05") },
        { id: "4", createdAt: new Date("2026-01-04") },
        { id: "3", createdAt: new Date("2026-01-03") },
        { id: "2", createdAt: new Date("2026-01-02") },
        { id: "1", createdAt: new Date("2026-01-01") },
      ];
      repo.find.mockResolvedValue(rows);

      const result = await service.findRecent("user-1", "diag-1");

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1", diagramId: "diag-1" },
          order: { createdAt: "DESC" },
          take: 6,
        }),
      );
      // reverse() 후 오름차순(오래된 것 먼저)
      expect(result[0]!.id).toBe("1");
      expect(result[result.length - 1]!.id).toBe("6");
    });

    it("diagramId가 null이면 where에 diagramId를 포함하지 않는다", async () => {
      repo.find.mockResolvedValue([]);

      await service.findRecent("user-1", null);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
        }),
      );
    });

    it("sessionId가 있으면 세션+다이어그램 기준으로 조회하고 역순으로 반환한다", async () => {
      repo.find.mockResolvedValue([
        { id: "2", createdAt: new Date("2026-01-02") },
        { id: "1", createdAt: new Date("2026-01-01") },
      ]);

      const result = await service.findRecent("user-1", "diag-1", "sess-1");

      // diagramId 조건 포함: 다른 다이어그램에서 재사용된 sessionId의 대화가 섞이지 않아야 한다
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1", sessionId: "sess-1", diagramId: "diag-1" },
          order: { createdAt: "DESC" },
          take: 6,
        }),
      );
      expect(result.map((r) => r.id)).toEqual(["1", "2"]);
    });

    it("sessionId가 있어도 diagramId가 null이면 where에 diagramId를 포함하지 않는다", async () => {
      repo.find.mockResolvedValue([]);

      await service.findRecent("user-1", null, "sess-1");

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1", sessionId: "sess-1" },
        }),
      );
    });
  });

  describe("findRecentTurns()", () => {
    it("최근 대화 행을 ConvMessage 턴으로 복원한다", async () => {
      repo.find.mockResolvedValue([
        { id: "2", role: "assistant", content: "응답", diff: null, createdAt: new Date("2026-01-02") },
        { id: "1", role: "user", content: "질문", createdAt: new Date("2026-01-01") },
      ]);

      const turns = await service.findRecentTurns("user-1", "diag-1", "sess-1");

      expect(turns).toEqual([
        { role: "user", content: "질문" },
        { role: "assistant", text: "응답", toolCalls: [] },
      ]);
    });
  });

  describe("findSessions()", () => {
    it("세션별 첫 user 메시지를 이름(30자 제한)으로, 없으면 '새 세션'으로 반환한다", async () => {
      const longFirst = "가".repeat(40);
      const qb = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        setParameter: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { sessionId: "s1", createdAt: new Date("2026-01-02T00:00:00.000Z"), firstName: longFirst },
          { sessionId: "s2", createdAt: "2026-01-01 00:00:00", firstName: null },
        ]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const sessions = await service.findSessions("user-1", "diag-1");

      expect(sessions).toEqual([
        { id: "s1", diagramId: "diag-1", name: longFirst.slice(0, 30), createdAt: "2026-01-02T00:00:00.000Z" },
        { id: "s2", diagramId: "diag-1", name: "새 세션", createdAt: "2026-01-01 00:00:00" },
      ]);
    });
  });

  describe("createSession()", () => {
    it("호출마다 새 UUID를 반환한다 (DB 저장은 첫 메시지 때)", async () => {
      const a = await service.createSession("user-1", "diag-1");
      const b = await service.createSession("user-1", "diag-1");
      expect(a).toMatch(/^[0-9a-f-]{36}$/);
      expect(b).not.toBe(a);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe("findSessionMessages()", () => {
    it("최신 limit개를 오름차순으로 반환하고 hasMore=true를 계산한다", async () => {
      const rows = [
        { id: "m3", createdAt: new Date("2024-01-03") },
        { id: "m2", createdAt: new Date("2024-01-02") },
        { id: "m1", createdAt: new Date("2024-01-01") },
      ];
      // limit=2 → take=3, 결과 3개 → hasMore=true, 반환은 2개
      repo.find.mockResolvedValue(rows);

      const { messages, hasMore } = await service.findSessionMessages("user-1", "sess-1", 2);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1", sessionId: "sess-1" },
          order: { createdAt: "DESC" },
          take: 3,
        }),
      );
      expect(hasMore).toBe(true);
      expect(messages).toHaveLength(2);
      expect(messages[0]?.id).toBe("m2"); // 최신 2개를 오름차순: m2 → m3
      expect(messages[1]?.id).toBe("m3");
    });

    it("결과가 limit 이하면 hasMore=false", async () => {
      repo.find.mockResolvedValue([{ id: "m1", createdAt: new Date("2024-01-01") }]);

      const { messages, hasMore } = await service.findSessionMessages("user-1", "sess-1", 50);

      expect(hasMore).toBe(false);
      expect(messages).toHaveLength(1);
    });

    it("beforeId가 있으면 해당 메시지의 createdAt 기준으로 더 오래된 것을 조회한다", async () => {
      const refDate = new Date("2024-01-03");
      repo.findOne.mockResolvedValue({ id: "m3", createdAt: refDate });
      repo.find.mockResolvedValue([{ id: "m1", createdAt: new Date("2024-01-01") }]);

      await service.findSessionMessages("user-1", "sess-1", 50, "m3");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "m3", userId: "user-1", sessionId: "sess-1" } });
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdAt: expect.anything() }),
        }),
      );
    });

    it("beforeId에 해당하는 메시지가 없으면 최신 메시지를 반환한다", async () => {
      repo.findOne.mockResolvedValue(null);
      repo.find.mockResolvedValue([{ id: "m1", createdAt: new Date("2024-01-01") }]);

      const { messages } = await service.findSessionMessages("user-1", "sess-1", 50, "nonexistent");

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1", sessionId: "sess-1" } }),
      );
      expect(messages).toHaveLength(1);
    });
  });

  describe("markAccepted()", () => {
    it("accepted=true로 repo.update를 호출한다", async () => {
      repo.update.mockResolvedValue({ affected: 1 });

      await service.markAccepted("msg-1", "user-1", true);

      expect(repo.update).toHaveBeenCalledWith({ id: "msg-1", userId: "user-1" }, { accepted: true });
    });

    it("accepted=false로 repo.update를 호출한다", async () => {
      repo.update.mockResolvedValue({ affected: 1 });

      await service.markAccepted("msg-2", "user-1", false);

      expect(repo.update).toHaveBeenCalledWith({ id: "msg-2", userId: "user-1" }, { accepted: false });
    });
  });

  describe("cleanupExpired()", () => {
    it("TTL 90일 이전 레코드를 삭제하는 쿼리를 호출한다", async () => {
      repo.delete.mockResolvedValue({ affected: 5 });

      const before = new Date();
      await service.cleanupExpired();
      const after = new Date();

      expect(repo.delete).toHaveBeenCalledTimes(1);
      const deleteArg = (repo.delete.mock.calls[0] as [{ createdAt: { _value: Date } }])[0];
      // LessThan(cutoff) — TypeORM FindOperator 객체
      const cutoffValue: Date = (deleteArg.createdAt as unknown as { _value: Date })._value;
      const expectedMinCutoff = new Date(before);
      expectedMinCutoff.setDate(expectedMinCutoff.getDate() - 90);
      const expectedMaxCutoff = new Date(after);
      expectedMaxCutoff.setDate(expectedMaxCutoff.getDate() - 90);

      expect(cutoffValue.getTime()).toBeGreaterThanOrEqual(expectedMinCutoff.getTime());
      expect(cutoffValue.getTime()).toBeLessThanOrEqual(expectedMaxCutoff.getTime());
    });

    it("삭제된 레코드 수를 로그에 기록한다 (에러 없이 완료)", async () => {
      repo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.cleanupExpired()).resolves.toBeUndefined();
    });
  });
});
