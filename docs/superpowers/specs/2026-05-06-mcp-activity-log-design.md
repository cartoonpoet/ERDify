# MCP AI 활동 감사 로그 — Design Spec

**Date:** 2026-05-06  
**Scope:** AI(MCP)가 다이어그램을 수정할 때 세션 단위로 기록하고, 에디터에서 실시간으로 확인·되돌리기

---

## 1. 개요

사용자가 AI 도구(Cursor · Claude · Gemini · Codex)를 통해 ERDify MCP로 다이어그램을 수정할 때, 무엇을 어떻게 바꿨는지 세션 단위로 기록한다. 에디터에 전용 "AI 활동" 패널을 제공하고, 새 AI 변경이 생기면 실시간 토스트로 알린다. 각 세션을 되돌릴 수 있다.

---

## 2. 세션 그룹핑 전략

MCP 서버 프로세스 시작 시 `randomUUID()`로 세션 ID 1개 생성. 모든 API 요청에 `X-MCP-Session-ID: <uuid>` 헤더를 포함한다. 서버는 이 헤더로 tool call들을 하나의 세션으로 묶는다.

- 같은 AI 대화 세션 = 같은 MCP 프로세스 = 같은 세션 ID
- MCP 재시작(새 대화) = 새 세션 ID = 새 세션 항목

---

## 3. 데이터 모델

### 새 테이블: `mcp_sessions`

```sql
CREATE TABLE "mcp_sessions" (
  "id"                   VARCHAR(36)  NOT NULL,  -- X-MCP-Session-ID
  "diagram_id"           VARCHAR(36)  NOT NULL,
  "tool_calls"           JSONB        NOT NULL DEFAULT '[]',
  -- [{ "tool": "add_table", "summary": "orders 테이블 추가" }, ...]
  "summary"              VARCHAR(500),
  -- 전체 tool_calls 요약 합산, 최대 200자
  "snapshot_version_id"  VARCHAR(36),            -- 복원용 (FK → diagram_versions)
  "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "pk_mcp_sessions" PRIMARY KEY ("id"),
  CONSTRAINT "fk_mcp_sessions_diagram"
    FOREIGN KEY ("diagram_id") REFERENCES "diagrams"("id") ON DELETE CASCADE
)
```

---

## 4. API

| 메서드 | 경로 | 동작 |
|--------|------|------|
| `POST` | `/diagrams/:id/mcp-sessions/:sessionId/tool-calls` | tool call 기록. 세션 없으면 생성 + 스냅샷 저장. 있으면 tool_calls 추가. WebSocket broadcast. |
| `GET`  | `/diagrams/:id/mcp-sessions` | 세션 목록 (최신순, 최대 50개) |
| `POST` | `/diagrams/:id/mcp-sessions/:sessionId/revert` | 스냅샷으로 다이어그램 복원 |

**POST tool-calls 요청 body:**
```json
{
  "tool": "add_table",
  "summary": "orders 테이블 추가"
}
```

**GET 응답 항목:**
```json
{
  "id": "uuid",
  "summary": "orders, order_items 테이블 추가, users 관계 설정",
  "toolCalls": [
    { "tool": "add_table", "summary": "orders 테이블 추가" },
    { "tool": "add_table", "summary": "order_items 테이블 추가" },
    { "tool": "add_relationship", "summary": "orders → users 관계 추가" }
  ],
  "snapshotVersionId": "uuid",
  "createdAt": "2026-05-06T10:00:00Z",
  "updatedAt": "2026-05-06T10:00:05Z"
}
```

---

## 5. MCP 서버 변경

### 세션 ID 생성 (`apps/mcp-server/src/index.ts`)
```typescript
const MCP_SESSION_ID = randomUUID();
```

### 헤더 추가 (`apps/mcp-server/src/client.ts`)
모든 `request()` 호출에 `X-MCP-Session-ID: ${MCP_SESSION_ID}` 헤더 추가.

`recordToolCall(diagramId, tool, summary)` 메서드 추가:
```typescript
recordToolCall: (diagramId: string, tool: string, summary: string) =>
  request<void>("POST", `/diagrams/${diagramId}/mcp-sessions/${MCP_SESSION_ID}/tool-calls`, { tool, summary })
```

### 툴별 자동 요약 (`apps/mcp-server/src/tools/write-tools.ts`)

각 write tool 실행 후 `client.recordToolCall()` 호출:

| 툴 | 요약 형식 |
|----|----------|
| `add_table` | `"{name} 테이블 추가"` |
| `remove_table` | `"{name} 테이블 삭제"` |
| `add_column` | `"{tableName}.{name} 컬럼 추가"` |
| `update_column` | `"{tableName}.{name} 컬럼 수정"` |
| `remove_column` | `"{tableName}.{name} 컬럼 삭제"` |
| `add_relationship` | `"{sourceTable} → {targetTable} 관계 추가"` |
| `remove_relationship` | `"{name} 관계 삭제"` |

세션 summary = tool_calls 요약 `", "` 합산, 200자 초과 시 `"…"` 말줄임.

---

## 6. WebSocket 이벤트

기존 WebSocket 인프라에 새 이벤트 타입 추가:

```typescript
{
  type: "mcp_activity",
  diagramId: string,
  sessionId: string,
  summary: string,       // 세션 전체 요약
  toolCall: {            // 방금 추가된 tool call
    tool: string,
    summary: string
  }
}
```

해당 diagram을 구독 중인 클라이언트에게 broadcast.

---

## 7. 프론트엔드

### 새 파일
- `apps/web/src/features/editor/components/McpActivityDrawer.tsx`
- `apps/web/src/features/editor/components/mcp-activity-drawer.css.ts`
- `apps/web/src/features/editor/hooks/useMcpActivity.ts`
- `apps/web/src/shared/api/mcp-sessions.api.ts`

### 에디터 툴바 버튼
기존 "버전 기록" 버튼 옆에 🤖 버튼 추가.  
미확인 AI 활동이 있으면 파란 점 배지 표시.  
미확인 여부: `localStorage`에 `mcp_seen_{diagramId}` 타임스탬프 저장, 패널 열면 업데이트.

### McpActivityDrawer UI

```
┌─────────────────────────────────────────┐
│ 🤖 AI 활동       [1 새로운]          ✕ │
├─────────────────────────────────────────┤
│ ● 방금 전                               │
│   orders, order_items 테이블 추가       │
│   users와 관계 설정                     │
│   [상세 접기 ▲]            [되돌리기]   │
│   • orders 테이블 추가                  │
│   • order_items 테이블 추가             │
│   • orders → users 관계 추가           │
├─────────────────────────────────────────┤
│   어제 3:24 PM                          │
│   users.email 컬럼 추가                 │
│   [상세 보기 ▼]            [되돌리기]   │
└─────────────────────────────────────────┘
```

### 실시간 알림 흐름
1. WebSocket `mcp_activity` 이벤트 수신
2. 화면 우하단 토스트 3초 표시: "🤖 AI가 다이어그램을 수정했습니다 — {summary}"
3. 툴바 🤖 버튼에 파란 점 배지 표시
4. 패널 열려 있으면 목록 상단에 즉시 추가 (React Query invalidate)

### 되돌리기
1. "되돌리기" 클릭 → confirm 다이얼로그
2. 확인 → `POST /diagrams/{id}/mcp-sessions/{sessionId}/revert`
3. 성공 → 에디터 document 갱신 (기존 restoreVersion 패턴 재활용)

---

## 8. 변경 파일 목록

| 파일 | 유형 |
|------|------|
| `packages/db/src/entities/mcp-session.entity.ts` | 신규 |
| `packages/db/src/migrations/XXXXXX-CreateMcpSessionsTable.ts` | 신규 |
| `packages/db/src/index.ts` | 수정 (entity export) |
| `apps/api/src/modules/diagrams/mcp-sessions.service.ts` | 신규 |
| `apps/api/src/modules/diagrams/mcp-sessions.controller.ts` | 신규 |
| `apps/api/src/modules/diagrams/diagrams.module.ts` | 수정 (module 등록) |
| `apps/api/src/modules/realtime/realtime.gateway.ts` | 수정 (mcp_activity 이벤트) |
| `apps/mcp-server/src/index.ts` | 수정 (세션 ID 생성) |
| `apps/mcp-server/src/client.ts` | 수정 (헤더 + recordToolCall) |
| `apps/mcp-server/src/tools/write-tools.ts` | 수정 (각 툴 후 recordToolCall 호출) |
| `apps/web/src/shared/api/mcp-sessions.api.ts` | 신규 |
| `apps/web/src/features/editor/hooks/useMcpActivity.ts` | 신규 |
| `apps/web/src/features/editor/components/McpActivityDrawer.tsx` | 신규 |
| `apps/web/src/features/editor/components/mcp-activity-drawer.css.ts` | 신규 |
| `apps/web/src/features/editor/components/EditorToolbar.tsx` | 수정 (🤖 버튼 + 토스트) |
