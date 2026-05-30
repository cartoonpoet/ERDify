# AI 그라운딩 평가 하니스

AI 채팅이 ERD를 **사실 기반으로** 답하고 수정하는지를 회귀 테스트로 보장하기 위한 디렉터리.

핵심 아이디어: AI 답변/수정의 정확성은 결정적(deterministic) 파이프라인에서 나온다.

- `analyzeSchema` — 코드로 계산한 스키마 이슈(VERIFIED FACTS의 원천)
- `selectRelevantTables` — 질의 관련 테이블 선택(스키마-RAG)
- `classifyIntent` — 의도 분류(편집/DDL/질문/일반)
- `buildSystemPrompt` — 위 결과를 합친 프롬프트 조립

이 파이프라인을 **실제 LLM 호출 없이** 고정 입력으로 검증하면, 모델 비결정성 없이
빠르고 안정적으로 품질 회귀를 잡을 수 있다.

## 구성

- `fixtures.ts` — 의도적으로 이슈를 심어둔 고정 다이어그램(`shopWithIssues`)과
  이슈 없는 `cleanSchema`(폴스파지티브 회귀 방지).
- `scenarios.ts` — `(질의 → 기대 의도/관련 테이블)` 평가 데이터셋. 새 케이스는 여기 추가.
- `grounding.eval.spec.ts` — CI에서 도는 골든 테스트.

## 실행

```bash
pnpm --filter @erdify/api test -- eval
```

## 케이스 추가하기

1. 새 이슈 패턴을 검증하려면 `fixtures.ts`에 해당 패턴을 심은 테이블을 추가한다.
2. 의도/검색 회귀를 막으려면 `scenarios.ts`의 `SHOP_SCENARIOS`에 한 줄 추가한다.

## 실제 LLM 종단 평가(선택)

모델 품질 자체(프롬프트가 좋은 답을 끌어내는지)는 결정적 테스트로 잴 수 없다.
필요 시 별도 스크립트에서 실제 키로 `runChat`을 호출해 수동 평가하되, API 키가 없으면
스킵되도록 게이트한다(비용·비결정성 때문에 CI 기본 비활성).
