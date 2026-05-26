import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiController } from "./ai.controller";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";

vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }));
vi.mock("openai", () => ({ default: vi.fn() }));

const makeUser = (sub = "user-1"): JwtPayload => ({
  sub,
  email: "test@example.com",
});

describe("AiController", () => {
  let controller: AiController;
  let aiServiceMock: {
    chat: ReturnType<typeof vi.fn>;
    suggestColumns: ReturnType<typeof vi.fn>;
    getOrgAiSettings: ReturnType<typeof vi.fn>;
    updateOrgAiSettings: ReturnType<typeof vi.fn>;
  };
  let aiHistoryServiceMock: {
    markAccepted: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    aiServiceMock = {
      chat: vi.fn(),
      suggestColumns: vi.fn(),
      getOrgAiSettings: vi.fn(),
      updateOrgAiSettings: vi.fn(),
    };
    aiHistoryServiceMock = {
      markAccepted: vi.fn(),
    };

    controller = new AiController(aiServiceMock as never, aiHistoryServiceMock as never);
  });

  describe("chat()", () => {
    it("aiService.chat을 올바른 인수로 호출한다", async () => {
      const user = makeUser("user-1");
      const dto = { diagramId: "diag-1", message: "테이블 추가해줘" };
      const expected = { messageId: "msg-1", content: "완료", diff: null, pendingDocument: null };
      aiServiceMock.chat.mockResolvedValue(expected);

      const result = await controller.chat(user, dto as never);

      expect(aiServiceMock.chat).toHaveBeenCalledWith("user-1", "diag-1", "테이블 추가해줘");
      expect(result).toEqual(expected);
    });
  });

  describe("acceptDiff()", () => {
    it("aiHistoryService.markAccepted를 true로 호출한다", async () => {
      const user = makeUser("user-1");
      aiHistoryServiceMock.markAccepted.mockResolvedValue(undefined);

      await controller.acceptDiff(user, "msg-abc");

      expect(aiHistoryServiceMock.markAccepted).toHaveBeenCalledWith("msg-abc", "user-1", true);
    });
  });

  describe("rejectDiff()", () => {
    it("aiHistoryService.markAccepted를 false로 호출한다", async () => {
      const user = makeUser("user-1");
      aiHistoryServiceMock.markAccepted.mockResolvedValue(undefined);

      await controller.rejectDiff(user, "msg-xyz");

      expect(aiHistoryServiceMock.markAccepted).toHaveBeenCalledWith("msg-xyz", "user-1", false);
    });
  });

  describe("suggestColumns()", () => {
    it("aiService.suggestColumns를 올바른 인수로 호출한다", async () => {
      const user = makeUser("user-1");
      const dto = { tableName: "users", existingColumns: ["id", "email"] };
      const expected = [{ name: "created_at", type: "timestamptz", nullable: false, pk: false }];
      aiServiceMock.suggestColumns.mockResolvedValue(expected);

      const result = await controller.suggestColumns(user, dto as never);

      expect(aiServiceMock.suggestColumns).toHaveBeenCalledWith("user-1", "users", ["id", "email"]);
      expect(result).toEqual(expected);
    });
  });

  describe("getOrgAiSettings()", () => {
    it("aiService.getOrgAiSettings를 올바른 인수로 호출한다", async () => {
      const user = makeUser("user-1");
      const expected = { organizationId: "org-1", hasApiKey: true, provider: "anthropic", model: "claude-sonnet-4-6" };
      aiServiceMock.getOrgAiSettings.mockResolvedValue(expected);

      const result = await controller.getOrgAiSettings(user, "org-1");

      expect(aiServiceMock.getOrgAiSettings).toHaveBeenCalledWith("org-1", "user-1");
      expect(result).toEqual(expected);
    });
  });

  describe("updateOrgAiSettings()", () => {
    it("aiService.updateOrgAiSettings를 올바른 인수로 호출한다", async () => {
      const user = makeUser("user-1");
      const body = { apiKey: "sk-ant-key", provider: "anthropic" as const, model: "claude-sonnet-4-6" };
      aiServiceMock.updateOrgAiSettings.mockResolvedValue(undefined);

      await controller.updateOrgAiSettings(user, "org-1", body);

      expect(aiServiceMock.updateOrgAiSettings).toHaveBeenCalledWith("org-1", "user-1", "sk-ant-key", "anthropic", "claude-sonnet-4-6");
    });

    it("model이 없으면 빈 문자열로 대체해서 호출한다", async () => {
      const user = makeUser("user-1");
      const body = { apiKey: "sk-ant-key", provider: "anthropic" as const };
      aiServiceMock.updateOrgAiSettings.mockResolvedValue(undefined);

      await controller.updateOrgAiSettings(user, "org-1", body as never);

      expect(aiServiceMock.updateOrgAiSettings).toHaveBeenCalledWith("org-1", "user-1", "sk-ant-key", "anthropic", "");
    });
  });
});
