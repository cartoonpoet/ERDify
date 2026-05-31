import { describe, it, expect } from "vitest";
import { analyzeSchema, selectRelevantTables } from "@erdify/domain";
import { classifyIntent } from "../context/intent";
import { buildSystemPrompt } from "../context/context-builder";
import { shopWithIssues, cleanSchema } from "./fixtures";
import { SHOP_SCENARIOS } from "./scenarios";

const meta = { userName: "u", userEmail: "e", orgName: "o", diagramId: "shop", diagramName: "shop", today: "2026-05-31" };

/**
 * 그라운딩 평가 하니스: 실제 LLM 호출 없이, AI 답변/수정의 "사실 기반"을 결정하는
 * 결정적 파이프라인(스키마 분석·관련 테이블 선택·의도 분류·프롬프트 조립)이
 * 기대대로 동작하는지 검증한다. CI에서 빠르게 회귀를 잡는다.
 */
describe("eval: analyzeSchema grounds on real issues only", () => {
  it("detects the planted FK-without-index on orders.user_id", () => {
    const findings = analyzeSchema(shopWithIssues);
    expect(findings.some((f) => f.kind === "fk_without_index" && f.detail.includes("orders.user_id"))).toBe(true);
  });

  it("detects the planted repeating column group on order_items", () => {
    const findings = analyzeSchema(shopWithIssues);
    expect(findings.some((f) => f.kind === "repeating_group" && f.table === "order_items")).toBe(true);
  });

  it("does NOT invent a missing_pk (every table has a PK)", () => {
    expect(analyzeSchema(shopWithIssues).some((f) => f.kind === "missing_pk")).toBe(false);
  });

  it("reports zero findings for a clean schema (no false positives)", () => {
    expect(analyzeSchema(cleanSchema)).toEqual([]);
  });
});

describe("eval: scenario dataset (intent + relevant-table selection)", () => {
  for (const s of SHOP_SCENARIOS) {
    it(s.name, () => {
      expect(classifyIntent(s.query)).toBe(s.expectIntent);
      const ids = selectRelevantTables(shopWithIssues, s.query);
      if (s.expectTopTableId) expect(ids[0]).toBe(s.expectTopTableId);
      for (const id of s.expectIncludesTableIds ?? []) expect(ids).toContain(id);
    });
  }
});

describe("eval: assembled system prompt is grounded", () => {
  it("surfaces the verified FK-index fact and stays in the user's language scope", () => {
    const facts = analyzeSchema(shopWithIssues);
    const focusTableIds = selectRelevantTables(shopWithIssues, "orders 정규화해줘");
    const prompt = buildSystemPrompt(shopWithIssues, meta, facts, { focusTableIds, intent: "edit" });
    expect(prompt).toContain("VERIFIED FACTS");
    expect(prompt).toContain("orders.user_id");
    expect(prompt).toContain("Grounded answer rules");
    expect(prompt).toContain("orders");
  });
});
