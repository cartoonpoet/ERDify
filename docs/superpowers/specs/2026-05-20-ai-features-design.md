# AI Features Design

**Date:** 2026-05-20
**Status:** Approved

## Overview

ERDify에 세 가지 AI 기능을 추가한다.

1. **In-app AI Chat** — 채널톡 스타일 플로팅 채팅창으로 자연어 명령을 통해 ERD 수정
2. **Inline Column Suggestions** — 테이블 편집 시 컬럼명 입력 중 AI 자동완성 추천
3. **AI ERD Generation** — 빈 캔버스에서 자연어 설명으로 ERD 전체 생성

Claude API의 **Tool Use (Function Calling)** 방식을 사용한다. 모든 변경사항은 diff 형태로 사용자에게 미리 보여주고 수락/거절 후 반영된다.

---

## 1. Architecture

```
[Web]
  ├── FloatingAIChat         채팅창 (채널톡 스타일)
  ├── TableEditor (inline)   컬럼 추천 드롭다운
  └── EmptyCanvas            "AI로 ERD 생성하기" 버튼 → FloatingAIChat 자동 오픈 (동일 /ai/chat 사용)

[NestJS API] — AiModule
  ├── AiController           POST /ai/chat, /ai/suggest-columns
  ├── AiService              Claude API 호출 + Tool Use 실행
  ├── AiHistoryService       대화 저장/조회, 3개월 TTL
  └── ErdTools               Claude에 노출하는 Tool 정의

[Anthropic Claude API]
  tool_use 방식으로 ErdTools 호출 → 서버에서 실행 → diff 반환

[DB]
  ├── ai_conversations       사용자별 대화 이력 (3개월 보관)
  └── organization_ai_settings  org별 Claude API 키 (암호화)
```

**핵심 플로우:**
1. 사용자가 채팅창에 명령 입력
2. 서버가 현재 `DiagramDocument` + 대화 히스토리 + Tool 스키마를 Claude에 전송
3. Claude가 적절한 Tool(addTable, addColumn 등)을 호출하는 응답 반환
4. 서버가 `packages/domain` 순수 함수로 Tool 실행 → before/after diff 계산
5. 프론트에 diff 전달 → 사용자가 수락/거절
6. 수락 시 기존 diagram 저장 API로 반영

---

## 2. Data Model

### `organization_ai_settings`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| organization_id | uuid FK unique | |
| encrypted_api_key | text | AES-256 암호화 |
| created_at | timestamp | |
| updated_at | timestamp | |

### `ai_conversations`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK | |
| diagram_id | uuid FK nullable | 생성 기능은 null로 시작 |
| role | enum | 'user' \| 'assistant' |
| content | text | 메시지 텍스트 |
| tool_calls | jsonb nullable | Claude가 호출한 Tool 정보 |
| diff | jsonb nullable | 수락/거절 대상 변경사항 |
| accepted | boolean nullable | null=pending, true=수락, false=거절 |
| created_at | timestamp | 3개월 후 자동 삭제 (NestJS 스케줄러) |

### ErdTools — Claude에 노출하는 Tool 목록

```typescript
const ErdTools = [
  { name: "addTable",      input: { name: string, columns?: ColumnDef[] } },
  { name: "updateTable",   input: { tableId: string, name: string } },
  { name: "deleteTable",   input: { tableId: string } },
  { name: "addColumn",     input: { tableId: string, name: string, type: string, nullable: boolean, pk?: boolean, fk?: FkDef } },
  { name: "updateColumn",  input: { tableId: string, columnId: string, ...patch } },
  { name: "deleteColumn",  input: { tableId: string, columnId: string } },
  { name: "addRelation",   input: { fromTableId: string, toTableId: string, type: RelationType } },
  { name: "deleteRelation", input: { relationId: string } },
]
```

각 Tool은 `packages/domain`의 기존 순수 함수와 1:1로 매핑된다.

---

## 3. Frontend UI

### FloatingAIChat

- **FAB 버튼**: 에디터 우하단 고정
- **채팅창**: FAB 클릭 시 위로 확장 (채널톡 스타일)
- **미니맵 연동**: 채팅창 열리면 미니맵 `display:none`, 닫히면 복원
- **Diff 카드**: AI 응답에 변경사항이 있으면 메시지 하단에 카드 형태로 표시
  - 변경 항목 요약 (예: "테이블 3개, 컬럼 12개 추가")
  - 아코디언으로 상세 목록 펼치기
  - [수락] [거절] 버튼

### Inline Column Suggestions (TableEditor)

- 컬럼명 입력 중 300ms 디바운스 후 `POST /ai/suggest-columns` 호출
- 결과를 드롭다운으로 표시: "id (bigint PK)", "created_at (timestamp)" 등
- 선택 시 컬럼명 + 타입 자동 완성
- 추천 결과는 컴포넌트 로컬 state로 관리 (store 업데이트 없음)

### AI ERD Generation (EmptyCanvas)

- 빈 캔버스 중앙에 "AI로 ERD 생성하기" 버튼 표시
- 클릭 시 FloatingAIChat 자동 오픈 + 초기 프롬프트: "어떤 서비스의 DB를 설계할까요?"
- 사용자 입력 → Claude가 전체 ERD를 Tool Use로 구성
- 생성 결과를 Diff 카드로 미리보기 후 수락

---

## 4. Performance

### Zustand Store 분리

채팅 상태와 다이어그램 상태를 별도 store로 분리하여 채팅 메시지 업데이트가 캔버스 리렌더링을 유발하지 않도록 한다.

```
diagramStore  → 캔버스 상태만 (TableNode, Edge)
aiChatStore   → 채팅 메시지, 열림/닫힘, 로딩 상태
```

- `FloatingAIChat` → `aiChatStore`만 구독
- 에디터 캔버스 → `diagramStore`만 구독

### 인라인 추천

- 300ms 디바운스로 불필요한 API 호출 최소화
- 결과를 컴포넌트 로컬 state로 관리, store 오염 없음

### Diff 카드

- 변경 항목이 많아도 (테이블 수십 개) 가상 리스트 불필요
- 요약 표시 + 아코디언으로 상세 펼치기 → 초기 렌더 최소화

---

## 5. Error Handling

| 상황 | 처리 |
|------|------|
| Org API 키 미설정 | 채팅창 열릴 때 "조직 관리자에게 API 키 설정 요청" 안내 메시지 |
| Claude API 오류 | 기존 `QueryErrorBoundary` 패턴 재사용 + 토스트 알림 |
| Tool 실행 실패 | 해당 Tool만 실패 처리, 나머지 Tool 결과는 정상 반영, AI가 대안 제안 |
| 히스토리 로드 실패 | 빈 히스토리로 graceful 시작 (세션만으로 동작) |
| API 키 권한 없음 | 403 반환 후 "API 키를 확인해주세요" 안내 |

---

## 6. API Key Security

- Org 관리자만 API 키 설정/변경 가능 (기존 Organization 권한 체계 활용)
- API 키는 DB에 AES-256으로 암호화 저장
- 서버→Claude API 호출만 사용, 키가 클라이언트에 노출되지 않음
- API 키는 응답에 절대 포함하지 않음 (설정 UI에도 마스킹 표시)

---

## 7. Conversation History TTL

- `ai_conversations.created_at` 기준 90일(3개월) 후 자동 삭제
- NestJS `@Cron` 스케줄러로 매일 자정 만료 레코드 삭제
- 삭제 전 사용자 알림 없음 (채팅 히스토리는 보조 수단, 중요 데이터 아님)
