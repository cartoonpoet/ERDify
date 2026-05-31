import type { ChatIntent } from "../context/intent";

/**
 * 평가 데이터셋: (질의 → 결정적 기대값). 새 케이스는 여기에 추가한다.
 * 실제 LLM 호출 없이 그라운딩 파이프라인(의도 분류·관련 테이블 선택·스키마 분석)을
 * 검증하므로 CI에서 빠르고 안정적으로 회귀를 잡는다.
 */
export interface EvalScenario {
  name: string;
  query: string;
  /** 기대 의도 분류 결과. */
  expectIntent: ChatIntent;
  /** selectRelevantTables 결과의 최상위로 기대되는 테이블 id (있으면). */
  expectTopTableId?: string;
  /** 관련 테이블 결과에 반드시 포함돼야 하는 테이블 id들(이웃 포함 등). */
  expectIncludesTableIds?: string[];
}

export const SHOP_SCENARIOS: EvalScenario[] = [
  { name: "정규화(편집) 요청 — orders 중심 + 이웃 포함", query: "orders 테이블 정규화해줘", expectIntent: "edit", expectTopTableId: "orders", expectIncludesTableIds: ["orders", "users"] },
  { name: "순수 정보 질문 — 관련 테이블 선택", query: "users 테이블에는 어떤 컬럼이 있어?", expectIntent: "question", expectTopTableId: "users" },
  { name: "DDL 내보내기", query: "이 스키마를 DDL로 내보내줘", expectIntent: "ddl" },
  { name: "컬럼명 기반 매칭 + 분리(편집)", query: "product1, product2 컬럼을 분리하고 싶어", expectIntent: "edit", expectTopTableId: "order_items" },
];
