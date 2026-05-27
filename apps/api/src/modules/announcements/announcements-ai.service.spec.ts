import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConfigService } from "@nestjs/config";
import { AnnouncementsAiService } from "./announcements-ai.service";

let anthropicCreateMock: ReturnType<typeof vi.fn>;

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: (...args: unknown[]) => anthropicCreateMock(...args),
    },
  })),
}));

describe("AnnouncementsAiService", () => {
  let service: AnnouncementsAiService;

  beforeEach(() => {
    anthropicCreateMock = vi.fn();
    const config = { get: vi.fn().mockReturnValue("test-api-key") };
    service = new AnnouncementsAiService(config as unknown as ConfigService);
  });

  describe("generate", () => {
    it("Anthropic 응답에서 제목과 내용을 파싱한다", async () => {
      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: '{"title":"서버 점검 안내","content":"5월 29일 새벽 2시 점검이 예정되어 있습니다."}' }],
      });
      const result = await service.generate({ type: "maintenance", keywords: "5/29 새벽 2시 DB 점검" });
      expect(result.title).toBe("서버 점검 안내");
      expect(result.content).toBe("5월 29일 새벽 2시 점검이 예정되어 있습니다.");
    });

    it("JSON 파싱 실패 시 fallback 처리", async () => {
      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: "invalid json" }],
      });
      const result = await service.generate({ type: "general", keywords: "공지" });
      expect(result.title).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("refine", () => {
    it("Anthropic 응답에서 개선된 제목과 내용을 파싱한다", async () => {
      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: '{"title":"개선된 제목","content":"개선된 내용입니다."}' }],
      });
      const result = await service.refine({ title: "제목", content: "내용" });
      expect(result.title).toBe("개선된 제목");
      expect(result.content).toBe("개선된 내용입니다.");
    });
  });
});
