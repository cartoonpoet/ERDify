import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AiService } from "../ai/ai.service";
import { AnnouncementsAiService } from "./announcements-ai.service";

describe("AnnouncementsAiService", () => {
  let service: AnnouncementsAiService;
  let completeForUser: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    completeForUser = vi.fn();
    service = new AnnouncementsAiService({ completeForUser } as unknown as AiService);
  });

  describe("generate", () => {
    it("조직 키 응답에서 제목과 내용을 파싱한다", async () => {
      completeForUser.mockResolvedValue('{"title":"서버 점검 안내","content":"5월 29일 새벽 2시 점검이 예정되어 있습니다."}');
      const result = await service.generate({ type: "maintenance", keywords: "5/29 새벽 2시 DB 점검" }, "user-1");
      expect(result.title).toBe("서버 점검 안내");
      expect(result.content).toBe("5월 29일 새벽 2시 점검이 예정되어 있습니다.");
      expect(completeForUser).toHaveBeenCalledWith("user-1", expect.any(String), 512);
    });

    it("JSON 파싱 실패 시 fallback 처리", async () => {
      completeForUser.mockResolvedValue("invalid json");
      const result = await service.generate({ type: "general", keywords: "공지" }, "user-1");
      expect(result.title).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it("키 미등록 등 호출 실패 시 fallback 처리", async () => {
      completeForUser.mockRejectedValue(new Error("no key"));
      const result = await service.generate({ type: "general", keywords: "긴급 공지" }, "user-1");
      expect(result.title).toBe("긴급 공지");
      expect(result.content).toBe("");
    });
  });

  describe("refine", () => {
    it("조직 키 응답에서 개선된 제목과 내용을 파싱한다", async () => {
      completeForUser.mockResolvedValue('{"title":"개선된 제목","content":"개선된 내용입니다."}');
      const result = await service.refine({ title: "제목", content: "내용" }, "user-1");
      expect(result.title).toBe("개선된 제목");
      expect(result.content).toBe("개선된 내용입니다.");
    });
  });
});
