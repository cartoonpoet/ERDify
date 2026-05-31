import { describe, it, expect } from "vitest";
import { classifyIntent, buildIntentBlock } from "./intent";

describe("classifyIntent", () => {
  it("classifies normalization/modification requests as edit", () => {
    expect(classifyIntent("users 테이블 정규화해줘")).toBe("edit");
    expect(classifyIntent("created_at 컬럼 추가해줘")).toBe("edit");
    expect(classifyIntent("rename this table")).toBe("edit");
  });

  it("classifies DDL/export requests as ddl", () => {
    expect(classifyIntent("이 스키마 DDL로 내보내줘")).toBe("ddl");
    expect(classifyIntent("show me the create table sql")).toBe("ddl");
  });

  it("classifies informational questions as question", () => {
    expect(classifyIntent("3NF가 뭐야?")).toBe("question");
    expect(classifyIntent("why is this table not normalized")).toBe("question");
  });

  it("prioritizes edit over question when both signals present", () => {
    expect(classifyIntent("왜 이런지 설명하고 정규화도 해줘")).toBe("edit");
  });

  it("falls back to general", () => {
    expect(classifyIntent("안녕")).toBe("general");
  });
});

describe("buildIntentBlock", () => {
  it("always includes grounded answer rules", () => {
    for (const intent of ["edit", "ddl", "question", "general"] as const) {
      expect(buildIntentBlock(intent)).toContain("Grounded answer rules");
    }
  });

  it("labels the detected intent", () => {
    expect(buildIntentBlock("edit")).toContain("intent: EDIT");
    expect(buildIntentBlock("question")).toContain("intent: QUESTION");
  });
});
