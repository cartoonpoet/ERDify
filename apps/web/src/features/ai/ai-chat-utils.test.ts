import { describe, it, expect } from "vitest";
import { mapToAiMessages, parseModelLabel, getBadgeVariant } from "./ai-chat-utils";
import type { SessionMessageItem } from "./api/ai.api";

describe("mapToAiMessages", () => {
  it("SessionMessageItem 배열을 AiMessage 배열로 변환한다", () => {
    const items: SessionMessageItem[] = [
      {
        id: "m-1",
        role: "user",
        content: "질문",
        diff: null,
        accepted: null,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "m-2",
        role: "assistant",
        content: "응답",
        diff: [{ type: "addTable", tableId: "t-1", tableName: "users" }],
        accepted: true,
        createdAt: "2026-01-01T00:00:01Z",
      },
    ];

    const result = mapToAiMessages(items);

    expect(result).toEqual([
      {
        id: "m-1",
        role: "user",
        content: "질문",
        diff: null,
        pendingDocument: null,
        accepted: null,
        isStreaming: false,
      },
      {
        id: "m-2",
        role: "assistant",
        content: "응답",
        diff: [{ type: "addTable", tableId: "t-1", tableName: "users" }],
        pendingDocument: null,
        accepted: true,
        isStreaming: false,
      },
    ]);
  });
});

describe("parseModelLabel", () => {
  it("괄호가 있는 라벨은 name과 badge로 분리한다", () => {
    expect(parseModelLabel("Claude Sonnet 5 (권장)")).toEqual({
      name: "Claude Sonnet 5",
      badge: "권장",
    });
  });

  it("괄호가 없는 라벨은 badge=null로 반환한다", () => {
    expect(parseModelLabel("Claude Sonnet 4.6")).toEqual({
      name: "Claude Sonnet 4.6",
      badge: null,
    });
  });

  it("빈 문자열은 badge=null로 반환한다", () => {
    expect(parseModelLabel("")).toEqual({ name: "", badge: null });
  });

  it("빈 괄호는 정규식에 매칭되지 않아 라벨 전체를 name으로 반환한다", () => {
    expect(parseModelLabel("GPT-4o ()")).toEqual({ name: "GPT-4o ()", badge: null });
  });
});

describe("getBadgeVariant", () => {
  it("'권장'은 blue를 반환한다", () => {
    expect(getBadgeVariant("권장")).toBe("blue");
  });

  it("'고성능'은 purple을 반환한다", () => {
    expect(getBadgeVariant("고성능")).toBe("purple");
  });

  it("'저비용'과 '경량'은 green을 반환한다", () => {
    expect(getBadgeVariant("저비용")).toBe("green");
    expect(getBadgeVariant("경량")).toBe("green");
  });

  it("그 외 badge와 null은 gray를 반환한다", () => {
    expect(getBadgeVariant("실험적")).toBe("gray");
    expect(getBadgeVariant(null)).toBe("gray");
  });
});
