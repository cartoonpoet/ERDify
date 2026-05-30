# AI Chat Context & Streaming Redesign

**Date:** 2026-05-30
**Status:** Draft

## Overview

ERDify의 AI 채팅(`apps/api/src/modules/ai`)을 재설계한다. 현재 구조는 **단발 호출**(모델 1회 호출 → 도구 실행 → 종료)이라 다음 한계가 있다.

1. **에이전트 루프 부재** — 모델이 도구 실행 결과를 다시 보고 이어서 추론하지 못해, "테이블을 보고 개선해줘" 같은 다단계 작업이 구조적으로 불가능.
2. **취약한 context 주입** — `buildDiagramContext()`가 사용자 메시지에 테이블명이 문자 그대로 포함돼야만 상세 정보를 주입(substring 매칭). 매칭 실패 시 모델은 컬럼 수만 받아 테이블을 "볼" 수 없음.
3. **히스토리 손실** — 이전 턴의 tool_use/tool_result가 텍스트로만 복원돼 모델이 자기 작업 맥락을 잃음.
4. **세션/스키마 메타 부재** — 인덱스, 컬럼 comment(논리명), 사용자/조직 정보가 프롬프트에 없음.
5. **스트리밍 미구현** — 응답을 한 번에 받아 중간 과정이 안 보임.

이를 **NestJS 모듈 내 재설계**로 해결한다: 단발 호출 → 에이전트 루프, SSE 스트리밍, 전체 다이어그램 + 세션 메타 주입, 선택적 읽기 도구.

**결정 사항 (확정):**
- 아키텍처: NestJS `ai` 모듈 내부 재설계 (별도 서비스 분리 안 함)
- 스트리밍: SSE (POST + `fetch`/`ReadableStream`)
- Context 범위: 전체 다이어그램 항상 주입 + 세션 메타 (토큰 초과 시에만 요약 폴백)
- 읽기 도구: **토글 옵션**으로 제공, 켜면 안내문구 표시
- 기존 `POST /ai/chat` (non-stream): **완전 제거**, 스트리밍으로 대체

---

## 1. Architecture

```
[Web]
  └── FloatingAIChat
        ├── 심층 탐색 토글 (읽기 도구 on/off) + 안내문구
        ├── 스트림 소비 → 단계별 표시 (step / tool_call / tool_result)
        └── 완료 후 기존 AIDiffReviewPanel (accept/reject 유지)

[NestJS API] — AiModule (재구성)
  ai/
    ai.controller.ts          settings, suggest-columns, accept/reject, + POST /ai/chat/stream (SSE)
    chat/
      ai-chat.service.ts      에이전트 루프 오케스트레이션 + 스트림 이벤트 emit
    providers/
      ai-provider.interface.ts   공통 스트리밍 turn 인터페이스
      anthropic.provider.ts      messages.stream()
      openai.provider.ts         chat.completions stream:true
    context/
      context-builder.ts      system prompt 구성 (전체 다이어그램 + 세션 메타)
    tools/
      erd-tools.ts            mutate 도구 정의 + read 도구 정의
      tool-executor.ts        executeTool 분리 (mutate + read 처리)
    ai-history.service.ts     구조적 턴 복원 추가
    dto/

[Anthropic / OpenAI]
  스트리밍 turn → 공통 이벤트로 정규화 → 루프가 provider 차이를 모름
```

**핵심 플로우 (에이전트 루프):**

```
messages 초기화 (system + 복원된 히스토리 + user)
loop (max 8 iterations):
  provider.streamTurn(messages) 호출
    ├─ 텍스트 델타 → SSE event:step 으로 흘림
    └─ tool_use 블록 수집
  tool_use 없음 → break
  각 tool_use 실행 (read or mutate):
    ├─ SSE event:tool_call { name, args }
    ├─ tool-executor 실행 → updatedDoc 갱신, DiffChange 누적
    └─ SSE event:tool_result { change }  (mutate인 경우)
  tool_result 블록을 messages에 append → 다음 iteration
종료:
  히스토리에 assistant 턴 저장 (content + toolCalls + diff)
  SSE event:done { messageId, content, diff, pendingDocument }
```

`pendingDocument`는 in-memory 복사본에만 적용된 누적 결과. **accept 시에만** 실제 다이어그램에 저장 (현 흐름 유지).

---

## 2. Agent Runtime (에이전트 루프)

`chat/ai-chat.service.ts`가 루프를 오케스트레이션한다.

- **반복 종료 조건**: 모델이 tool_use 없이 텍스트만 반환, 또는 max iteration(8) 도달, 또는 토큰 예산 초과.
- **도구 실행**: `tool-executor.ts`가 mutate 도구(기존 9종)와 read 도구를 모두 처리. 각 도구는 `updatedDoc`(누적 in-memory doc)에 대해 동작.
- **tool_result 피드백**: 실행 결과(성공/실패, read 도구는 조회 데이터)를 tool_result 블록으로 messages에 append → 모델이 결과를 보고 이어서 추론.
- **안전장치**: max iteration 가드, 누적 토큰 추정치 가드, 도구 실행 예외 시 해당 tool_result에 에러 담아 모델이 복구하도록 유도.

### 읽기 도구 (토글 옵션)

읽기 도구는 요청 플래그 `enableReadTools: boolean`에 따라 도구 세트에 포함 여부 결정.

- `listTables()` → 전체 테이블 요약(id, name, columnCount) 반환
- `getTableDetails(tableId)` → 특정 테이블의 컬럼/인덱스/연결된 관계 상세 반환

플래그가 켜지면:
- 도구 세트에 read 도구 포함
- system prompt에 "필요 시 listTables/getTableDetails로 스키마를 직접 조회하라" 지침 추가
- 대형 다이어그램(토큰 초과로 요약 폴백된 경우) 대응이 가능해짐

플래그가 꺼지면 mutate 도구만 노출 (응답 빠름, 루프 짧음).

---

## 3. Context Builder

`context/context-builder.ts`로 분리하고 substring 매칭을 폐기한다.

**전체 다이어그램 (기본, 항상 상세):**
- 모든 entity: id, name, schema
- 각 column: id, name, type, nullable, primaryKey, unique, defaultValue, **comment(논리명)** ← 추가
- relationships: id, source/target entityId, cardinality, **FK 컬럼 매핑** ← 추가
- **indexes**: id, entityId, name, columnIds, unique ← 추가
- dialect

**세션 메타 (신규):**
- 현재 사용자: 이름, 이메일
- 조직: 조직명
- 다이어그램: 이름, id
- 오늘 날짜

**토큰 예산 폴백:**
- 전체 JSON이 임계치(예: 60k자) 초과 시에만 요약 모드(테이블은 name + columnCount)로 축소.
- 이때 `enableReadTools`가 켜져 있으면 모델이 read 도구로 상세 조회 가능. 꺼져 있으면 안내문구로 "스키마가 커서 일부만 표시됨"을 system prompt에 명시.

---

## 4. 히스토리 구조적 복원

`ai-history.service.ts`에 최근 턴을 **tool_use/tool_result 블록까지 재구성**하는 로직 추가.

- `ai_conversations` 테이블은 이미 `tool_calls`, `diff` jsonb 컬럼 보유 → 추가 마이그레이션 불필요.
- **요청 내부 루프**: tool_use/tool_result를 정식 스레딩(모델이 직전 도구 결과를 정확히 봄). 에이전트 루프의 핵심.
- **요청 간 히스토리(과거 메시지)**: dangling tool_use(짝 없는 tool_use 블록) API 에러를 피하기 위해 tool_use 블록을 재생하지 않고, assistant 메시지를 **텍스트 + 적용 요약**("[적용한 변경: orders, ...]")으로 복원. 별도 저장/마이그레이션 불필요하고 두 provider 모두 안전.
- 최근 N턴(기존 HISTORY_LIMIT=6 유지)을 `ConvMessage[]`로 변환 → provider 인터페이스가 Anthropic/OpenAI 각 포맷으로 변환.

---

## 5. SSE 스트리밍 엔드포인트

**`POST /ai/chat/stream`** (기존 `POST /ai/chat` 제거 후 대체)

- 요청 본문: `{ diagramId, message, enableReadTools }`
- 인증: 기존 `FlexAuthGuard` 유지
- 응답: `text/event-stream`, 수동 `res.write()`로 SSE 포맷 청크 전송
  - 본문(message)이 필요하고 길 수 있어 EventSource(GET 전용) 대신 프론트는 `fetch` + `ReadableStream` 리더 사용

**이벤트 스키마:**

```
event: step        data: { text }              // 모델 추론 텍스트 델타
event: tool_call   data: { name, args }        // "orders 테이블 읽는 중..." 단계 표시
event: tool_result data: { change }            // DiffChange 누적 (mutate)
event: done        data: { messageId, content, diff, pendingDocument }
event: error       data: { message }
```

- usage 로깅은 `done` 직전 기존 `usageService.log` 호출 유지.
- 스트림 도중 클라이언트 연결 종료 시 루프 중단 처리.

---

## 6. Provider 추상화

`providers/ai-provider.interface.ts`:

```ts
interface AiProvider {
  streamTurn(params: {
    system: string;
    messages: NormalizedMessage[];
    tools: NormalizedTool[];
  }): AsyncIterable<ProviderEvent>;
  // ProviderEvent: { type: "text", delta } | { type: "tool_use", id, name, input } | { type: "end" }
}
```

- `anthropic.provider.ts`: `client.messages.stream()` 사용, content_block_delta → text/tool_use 정규화.
- `openai.provider.ts`: `chat.completions.create({ stream: true })`, delta.tool_calls 누적 → 정규화. `gpt-5*` 모델의 `max_completion_tokens` 분기 유지.
- 루프와 컨텍스트 빌더는 정규화된 타입만 사용 → provider 차이 격리.

---

## 7. 프론트엔드

**`apps/web/src/features/ai/`:**

- `api/ai.api.ts`: `sendAiChat`(non-stream) 제거, `streamAiChat(diagramId, message, enableReadTools, handlers)` 추가. `fetch`로 POST, `response.body.getReader()`로 SSE 파싱, 이벤트별 콜백 호출.
- `store/useAIChatStore`: 스트리밍 상태(현재 진행 step, 누적 tool_call 목록, 텍스트 버퍼) 관리. `enableReadTools` 토글 상태 추가.
- `FloatingAIChat.tsx`:
  - 입력 영역에 **심층 탐색 토글** + 안내문구("AI가 스키마를 단계적으로 탐색해 더 정확하게 작업합니다. 응답이 다소 느려질 수 있어요.")
  - "AI가 생각 중..." → **단계별 진행 표시**(예: "스키마 분석 중", "orders 테이블 수정 중") + 텍스트 실시간 출력
  - diff는 스트림 동안 누적, `done` 후 기존 `AIDiffReviewPanel`로 accept/reject (현 흐름 유지)

---

## 8. 제거 / 비범위

**제거:**
- `POST /ai/chat` (non-stream) 엔드포인트 및 `sendAiChat`
- `buildDiagramContext`의 substring 매칭 로직
- `ai.service.ts`의 단발 `callAnthropic`/`callOpenAI` (스트리밍 provider로 대체)

**비범위 (이번 작업 안 함):**
- `suggestColumns` (별개 기능, 그대로 유지)
- AI ERD 전체 생성 플로우 (기존 chat 재사용 유지)
- org AI settings / API 키 관리 (변경 없음)
- 모델 추가/교체

---

## 9. 테스트

- `tool-executor.ts`: 각 mutate/read 도구 단위 테스트 (기존 executeTool 테스트 이관·확장).
- `context-builder.ts`: 전체 주입 / 토큰 폴백 / 세션 메타 포함 단위 테스트.
- `ai-chat.service.ts`: provider를 목으로 주입해 루프 종료 조건(텍스트 종료/max iteration/도구 에러) 테스트.
- provider 정규화: 목 스트림으로 text/tool_use 이벤트 정규화 검증.
- 프론트: SSE 파서 단위 테스트.

---

## 10. 마이그레이션 / 호환성

- DB 스키마 변경 없음 (`ai_conversations`의 기존 jsonb 컬럼 재사용).
- `POST /ai/chat` 제거는 breaking change지만, grep 확인 결과 **웹 클라이언트(`ai.api.ts`) 전용**이며 MCP 서버·외부에서 호출하지 않음 → 웹 동시 교체로 안전하게 대응. `POST /ai/chat/:messageId/accept`·`/reject`는 별개 엔드포인트로 그대로 유지.
