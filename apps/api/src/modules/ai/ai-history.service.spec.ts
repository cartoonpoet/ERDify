import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiConversation } from "@erdify/db";
import { AiHistoryService } from "./ai-history.service";

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  findOne: vi.fn(),
  find: vi.fn(),
  save: vi.fn(),
  create: vi.fn((v: unknown) => v),
  update: vi.fn(),
  delete: vi.fn(),
  ...overrides,
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
      expect(messages[0].id).toBe("m1"); // DESC 결과를 reverse → 오름차순
      expect(messages[1].id).toBe("m2");
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

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "m3", userId: "user-1" } });
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
