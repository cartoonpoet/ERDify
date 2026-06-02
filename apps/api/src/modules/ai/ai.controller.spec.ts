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
  let aiHistoryServiceMock: { markAccepted: ReturnType<typeof vi.fn>; findSessions: ReturnType<typeof vi.fn>; createSession: ReturnType<typeof vi.fn> };

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
    aiHistoryServiceMock = { markAccepted: vi.fn(), findSessions: vi.fn(), createSession: vi.fn() };

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
