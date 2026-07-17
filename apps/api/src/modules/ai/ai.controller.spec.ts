import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiController } from "./ai.controller";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import type { StreamEvent } from "./chat/ai-chat.service";

vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }));
vi.mock("openai", () => ({ default: vi.fn() }));

const makeUser = (sub = "user-1"): JwtPayload => ({
  sub,
  email: "test@example.com",
});

describe("AiController", () => {
  let controller: AiController;
  let aiServiceMock: {
    suggestColumns: ReturnType<typeof vi.fn>;
    getOrgAiSettings: ReturnType<typeof vi.fn>;
    setOrgProviderKey: ReturnType<typeof vi.fn>;
    removeOrgProviderKey: ReturnType<typeof vi.fn>;
    setEnabledModels: ReturnType<typeof vi.fn>;
    getDiagramAiConfig: ReturnType<typeof vi.fn>;
  };
  let aiChatServiceMock: { runChat: ReturnType<typeof vi.fn> };
  let aiHistoryServiceMock: {
    markAccepted: ReturnType<typeof vi.fn>;
    findSessions: ReturnType<typeof vi.fn>;
    createSession: ReturnType<typeof vi.fn>;
    findSessionMessages: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    aiServiceMock = {
      suggestColumns: vi.fn(),
      getOrgAiSettings: vi.fn(),
      setOrgProviderKey: vi.fn(),
      removeOrgProviderKey: vi.fn(),
      setEnabledModels: vi.fn(),
      getDiagramAiConfig: vi.fn(),
    };
    aiChatServiceMock = { runChat: vi.fn() };
    aiHistoryServiceMock = { markAccepted: vi.fn(), findSessions: vi.fn(), createSession: vi.fn(), findSessionMessages: vi.fn() };

    controller = new AiController(aiServiceMock as never, aiChatServiceMock as never, aiHistoryServiceMock as never);
  });

  describe("chatStream()", () => {
    it("SSE 헤더를 설정하고 runChat 이벤트를 data 라인으로 write한 뒤 종료한다", async () => {
      const headers: Record<string, string> = {};
      const writes: string[] = [];
      const res = {
        setHeader: vi.fn((k: string, v: string) => { headers[k] = v; }),
        flushHeaders: vi.fn(),
        on: vi.fn(),
        write: vi.fn((s: string) => { writes.push(s); }),
        end: vi.fn(),
        flush: vi.fn(),
      };
      aiChatServiceMock.runChat.mockImplementation(async (_params, emit: (e: StreamEvent) => void) => {
        emit({ event: "text", delta: "hi" });
        emit({ event: "done", messageId: "m1", content: "끝", diff: null, pendingDocument: null });
      });

      await controller.chatStream(makeUser(), { diagramId: "d1", message: "hello", sessionId: "s1" }, res as never);

      expect(headers["Content-Type"]).toBe("text/event-stream");
      expect(aiChatServiceMock.runChat).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", diagramId: "d1", message: "hello", sessionId: "s1" }),
        expect.any(Function),
      );
      expect(writes[0]).toContain("event: text");
      expect(writes[1]).toContain("event: done");
      expect(res.end).toHaveBeenCalled();
    });

    it("status와 error 이벤트도 각각의 SSE 라인으로 write한다", async () => {
      const writes: string[] = [];
      const res = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        on: vi.fn(),
        write: vi.fn((s: string) => { writes.push(s); }),
        end: vi.fn(),
      };
      aiChatServiceMock.runChat.mockImplementation(async (_params, emit: (e: StreamEvent) => void) => {
        emit({ event: "status", label: "users 테이블 생성 중" });
        emit({ event: "error", message: "AI 처리 중 오류가 발생했습니다." });
      });

      await controller.chatStream(makeUser(), { diagramId: "d1", message: "hello", sessionId: "s1" }, res as never);

      expect(writes[0]).toContain("event: status");
      expect(writes[0]).toContain("users 테이블 생성 중");
      expect(writes[1]).toContain("event: error");
      expect(writes[1]).toContain("AI 처리 중 오류가 발생했습니다.");
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe("getSessionMessages()", () => {
    const row = {
      id: "m1",
      role: "assistant",
      content: "응답",
      diff: undefined,
      accepted: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    it("limit 미지정 시 50으로 조회하고 메시지를 응답 형태로 매핑한다", async () => {
      aiHistoryServiceMock.findSessionMessages.mockResolvedValue({ messages: [row], hasMore: false });

      const result = await controller.getSessionMessages(makeUser(), "sess-1");

      expect(aiHistoryServiceMock.findSessionMessages).toHaveBeenCalledWith("user-1", "sess-1", 50, undefined);
      expect(result).toEqual({
        messages: [{ id: "m1", role: "assistant", content: "응답", diff: null, accepted: null, createdAt: "2026-01-01T00:00:00.000Z" }],
        hasMore: false,
      });
    });

    it("limit이 100을 넘으면 100으로 제한한다", async () => {
      aiHistoryServiceMock.findSessionMessages.mockResolvedValue({ messages: [], hasMore: false });

      await controller.getSessionMessages(makeUser(), "sess-1", "500", "m9");

      expect(aiHistoryServiceMock.findSessionMessages).toHaveBeenCalledWith("user-1", "sess-1", 100, "m9");
    });

    it("정수가 아니거나 0 이하인 limit은 50으로 대체한다", async () => {
      aiHistoryServiceMock.findSessionMessages.mockResolvedValue({ messages: [], hasMore: false });

      await controller.getSessionMessages(makeUser(), "sess-1", "abc");
      await controller.getSessionMessages(makeUser(), "sess-1", "-3");
      await controller.getSessionMessages(makeUser(), "sess-1", "1.5");

      for (const call of aiHistoryServiceMock.findSessionMessages.mock.calls) {
        expect(call[2]).toBe(50);
      }
    });

    it("createdAt이 Date가 아니면 문자열로 변환하고 diff는 그대로 전달한다", async () => {
      const diff = [{ type: "addTable", tableName: "users" }];
      aiHistoryServiceMock.findSessionMessages.mockResolvedValue({
        messages: [{ ...row, diff, createdAt: "2026-01-01 09:00:00" }],
        hasMore: true,
      });

      const result = await controller.getSessionMessages(makeUser(), "sess-1", "10");

      expect(result.hasMore).toBe(true);
      expect(result.messages[0]).toMatchObject({ diff, createdAt: "2026-01-01 09:00:00" });
    });
  });

  describe("sessions", () => {
    it("getSessions는 findSessions를 호출한다", async () => {
      aiHistoryServiceMock.findSessions.mockResolvedValue([]);
      await controller.getSessions(makeUser("user-1"), "diag-1");
      expect(aiHistoryServiceMock.findSessions).toHaveBeenCalledWith("user-1", "diag-1");
    });

    it("createSession은 createSession을 호출하고 sessionId를 반환한다", async () => {
      aiHistoryServiceMock.createSession.mockResolvedValue("sess-1");
      const result = await controller.createSession(makeUser("user-1"), { diagramId: "diag-1" });
      expect(aiHistoryServiceMock.createSession).toHaveBeenCalledWith("user-1", "diag-1");
      expect(result).toEqual({ sessionId: "sess-1" });
    });
  });

  describe("acceptDiff()", () => {
    it("aiHistoryService.markAccepted를 true로 호출한다", async () => {
      aiHistoryServiceMock.markAccepted.mockResolvedValue(undefined);
      await controller.acceptDiff(makeUser(), "msg-abc");
      expect(aiHistoryServiceMock.markAccepted).toHaveBeenCalledWith("msg-abc", "user-1", true);
    });
  });

  describe("rejectDiff()", () => {
    it("aiHistoryService.markAccepted를 false로 호출한다", async () => {
      aiHistoryServiceMock.markAccepted.mockResolvedValue(undefined);
      await controller.rejectDiff(makeUser(), "msg-xyz");
      expect(aiHistoryServiceMock.markAccepted).toHaveBeenCalledWith("msg-xyz", "user-1", false);
    });
  });

  describe("suggestColumns()", () => {
    it("aiService.suggestColumns를 올바른 인수로 호출한다", async () => {
      const dto = { tableName: "users", existingColumns: ["id", "email"] };
      const expected = [{ name: "created_at", type: "timestamptz", nullable: false, pk: false }];
      aiServiceMock.suggestColumns.mockResolvedValue(expected);

      const result = await controller.suggestColumns(makeUser(), dto as never);
      expect(aiServiceMock.suggestColumns).toHaveBeenCalledWith("user-1", "users", ["id", "email"]);
      expect(result).toEqual(expected);
    });
  });

  describe("getOrgAiSettings()", () => {
    it("aiService.getOrgAiSettings를 올바른 인수로 호출한다", async () => {
      const expected = { organizationId: "org-1", providers: { anthropic: true, openai: false, gemini: false }, enabledModels: [] };
      aiServiceMock.getOrgAiSettings.mockResolvedValue(expected);

      const result = await controller.getOrgAiSettings(makeUser(), "org-1");
      expect(aiServiceMock.getOrgAiSettings).toHaveBeenCalledWith("org-1", "user-1");
      expect(result).toEqual(expected);
    });
  });

  describe("setOrgProviderKey()", () => {
    it("provider와 apiKey로 setOrgProviderKey를 호출한다", async () => {
      aiServiceMock.setOrgProviderKey.mockResolvedValue(undefined);
      await controller.setOrgProviderKey(makeUser(), "org-1", { provider: "openai", apiKey: "sk-x" });
      expect(aiServiceMock.setOrgProviderKey).toHaveBeenCalledWith("org-1", "user-1", "openai", "sk-x");
    });
  });

  describe("removeOrgProviderKey()", () => {
    it("provider로 removeOrgProviderKey를 호출한다", async () => {
      aiServiceMock.removeOrgProviderKey.mockResolvedValue(undefined);
      await controller.removeOrgProviderKey(makeUser(), "org-1", "openai");
      expect(aiServiceMock.removeOrgProviderKey).toHaveBeenCalledWith("org-1", "user-1", "openai");
    });
  });

  describe("setEnabledModels()", () => {
    it("enabledModels로 setEnabledModels를 호출한다", async () => {
      aiServiceMock.setEnabledModels.mockResolvedValue(undefined);
      await controller.setEnabledModels(makeUser(), "org-1", { enabledModels: ["gpt-4o"] });
      expect(aiServiceMock.setEnabledModels).toHaveBeenCalledWith("org-1", "user-1", ["gpt-4o"]);
    });
  });

  describe("chatConfig()", () => {
    it("getDiagramAiConfig를 user/diagram으로 호출한다", async () => {
      const expected = { models: [{ provider: "openai", value: "gpt-4o", label: "GPT-4o (권장)" }] };
      aiServiceMock.getDiagramAiConfig.mockResolvedValue(expected);
      const result = await controller.chatConfig(makeUser(), "diag-1");
      expect(aiServiceMock.getDiagramAiConfig).toHaveBeenCalledWith("user-1", "diag-1");
      expect(result).toEqual(expected);
    });
  });
});
