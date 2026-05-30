import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiController } from "./ai.controller";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import type { AiStreamEvent } from "@erdify/contracts";

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
    updateOrgAiSettings: ReturnType<typeof vi.fn>;
  };
  let aiChatServiceMock: { runChat: ReturnType<typeof vi.fn> };
  let aiHistoryServiceMock: { markAccepted: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    aiServiceMock = {
      suggestColumns: vi.fn(),
      getOrgAiSettings: vi.fn(),
      updateOrgAiSettings: vi.fn(),
    };
    aiChatServiceMock = { runChat: vi.fn() };
    aiHistoryServiceMock = { markAccepted: vi.fn() };

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
      aiChatServiceMock.runChat.mockImplementation(async (_params, emit: (e: AiStreamEvent) => void) => {
        emit({ type: "step", text: "hi" });
        emit({ type: "done", messageId: "m1", content: "끝", diff: null, pendingDocument: null });
      });

      await controller.chatStream(makeUser(), { diagramId: "d1", message: "hello", enableReadTools: false }, res as never);

      expect(headers["Content-Type"]).toBe("text/event-stream");
      expect(aiChatServiceMock.runChat).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", diagramId: "d1", message: "hello", enableReadTools: false }),
        expect.any(Function),
      );
      expect(writes[0]).toContain('"type":"step"');
      expect(writes[1]).toContain('"type":"done"');
      expect(res.end).toHaveBeenCalled();
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
      const expected = { organizationId: "org-1", hasApiKey: true, provider: "anthropic", model: "claude-sonnet-4-6" };
      aiServiceMock.getOrgAiSettings.mockResolvedValue(expected);

      const result = await controller.getOrgAiSettings(makeUser(), "org-1");
      expect(aiServiceMock.getOrgAiSettings).toHaveBeenCalledWith("org-1", "user-1");
      expect(result).toEqual(expected);
    });
  });

  describe("updateOrgAiSettings()", () => {
    it("aiService.updateOrgAiSettings를 올바른 인수로 호출한다", async () => {
      const body = { apiKey: "sk-ant-key", provider: "anthropic" as const, model: "claude-sonnet-4-6" };
      aiServiceMock.updateOrgAiSettings.mockResolvedValue(undefined);

      await controller.updateOrgAiSettings(makeUser(), "org-1", body);
      expect(aiServiceMock.updateOrgAiSettings).toHaveBeenCalledWith("org-1", "user-1", "sk-ant-key", "anthropic", "claude-sonnet-4-6");
    });

    it("model이 없으면 빈 문자열로 대체해서 호출한다", async () => {
      const body = { apiKey: "sk-ant-key", provider: "anthropic" as const };
      aiServiceMock.updateOrgAiSettings.mockResolvedValue(undefined);

      await controller.updateOrgAiSettings(makeUser(), "org-1", body as never);
      expect(aiServiceMock.updateOrgAiSettings).toHaveBeenCalledWith("org-1", "user-1", "sk-ant-key", "anthropic", "");
    });
  });
});
