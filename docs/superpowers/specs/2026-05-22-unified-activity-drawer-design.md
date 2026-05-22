# Unified Activity Drawer + Column Autosave Bug Fix

**Date:** 2026-05-22
**Status:** Approved

---

## Overview

두 가지 작업을 함께 진행한다.

1. 에디터 헤더의 "기록" 패널과 "AI 활동" 패널을 하나의 **통합 ActivityDrawer**로 합치고, 사람/AI 필터와 실제 사용자 이름 표시를 추가한다.
2. 컬럼명 변경 후 일부 변경사항이 저장되지 않는 **autosave 버그**를 수정한다.

---

## 1. Unified Activity Drawer

### 현재 상태

- `VersionHistoryDrawer.tsx` — 수동 저장한 버전 스냅샷 목록 (v1, v2...)
- `McpActivityDrawer.tsx` — MCP 세션별 도구 호출 목록
- 헤더에 버튼 2개 별도 존재

### 목표 상태

- 두 컴포넌트를 `ActivityDrawer.tsx` 하나로 통합
- 헤더 버튼 2개 → "활동 기록" 버튼 1개
- 하나의 시간순 타임라인에 버전 저장 + AI 활동 항목 혼합 표시

### 타임라인 항목 구조

| 항목 종류 | 출처 | 아이콘/이름 | 표시 내용 | 되돌리기 |
|-----------|------|------------|----------|---------|
| 버전 저장 | DiagramVersion (createdBy ≠ "mcp") | 사용자 아바타 + 이름 | "버전 v3 저장" | restoreVersion() |
| AI 활동 | McpSession | 🤖 AI | toolCalls 요약 | revertMcpSession() |

### 필터 UI

상단 토글 칩 2개 (B안):
- `● 사람` (파란 dot) — 켜면 버전 저장 항목 표시
- `● AI` (보라 dot) — 켜면 AI 활동 항목 표시
- 둘 다 켜면 전체 표시, 둘 다 끄면 빈 상태

### 사용자 이름 표시

현재 `DiagramVersionResponse.createdBy`는 userId(UUID)만 포함한다. API 응답에 `createdByName: string`을 추가해야 한다.

**변경 범위:**
- `packages/contracts` — `DiagramVersionResponse`에 `createdByName: string` 필드 추가
- `apps/api` — `diagrams-version.service.ts`의 `findVersions()`에서 User 테이블 join → 이름 포함 반환
- `apps/web` — `ActivityDrawer`에서 `createdByName` 표시

### 되돌리기

- 각 항목마다 "되돌리기" 버튼 유지
- 버전 항목 → `restoreVersion(diagramId, versionId)`
- AI 항목 → `revertMcpSession(diagramId, sessionId)`

### 데이터 병합 훅

`useActivityFeed(diagramId)` 훅 신규 생성:
- `useVersionHistory` + `useMcpActivity` 두 훅 데이터를 가져옴
- 두 목록을 `createdAt` 기준 내림차순 정렬해 단일 배열로 반환
- 항목 타입: `{ kind: "version" | "ai", ...data }`

---

## 2. Autosave Bug Fix

### 버그 원인

`useDiagramAutosave.ts`의 useEffect deps에 `isDirty`가 포함되어 있어, API 저장 완료 후 `clearDirty()` 호출 시 `isDirty`가 false로 바뀌고 effect가 재실행되면서 **더 최신 변경사항의 pending 타이머를 cancel**한다.

**재현 시나리오:**
1. 컬럼 A 수정 → doc=v1, isDirty=true → 3초 타이머 시작
2. 타이머 발동 → API 저장 중
3. 컬럼 B 수정 → doc=v2, isDirty=true → v2용 새 타이머 시작
4. v1 API 응답 → `clearDirty()` → isDirty=false → effect 재실행 → **v2 타이머 cancel**
5. v2 변경사항 영구 소실

### 수정

`useDiagramAutosave.ts`의 deps 배열에서 `isDirty` 제거:

```ts
// Before
}, [isDirty, document, diagramId, delayMs, clearDirty]);

// After
}, [document, diagramId, delayMs, clearDirty]);
```

`isDirty`를 deps에서 제거하면 `clearDirty()` 호출이 effect를 재트리거하지 않으므로 pending 타이머가 유지된다. `document`가 바뀔 때만 effect가 재실행되며, 이때 closure에서 캡처한 `isDirty` 값으로 early return 여부를 판단한다. `setDocument`(서버 동기화)는 `isDirty=false`를 함께 set하므로 불필요한 저장을 방지한다.

---

## 변경 파일 목록

### API (`apps/api`)
- `modules/diagrams/services/diagrams-version.service.ts` — `findVersions()`에 User join 추가

### Contracts (`packages/contracts`)
- `diagrams/diagram.types.ts` — `DiagramVersionResponse`에 `createdByName` 추가

### Web (`apps/web`)
- `features/editor/hooks/useDiagramAutosave.ts` — deps에서 `isDirty` 제거 (버그 수정)
- `features/editor/hooks/useActivityFeed.ts` — 신규: 버전+AI 데이터 병합 훅
- `features/editor/components/ActivityDrawer.tsx` — 신규: 통합 드로어
- `features/editor/components/VersionHistoryDrawer.tsx` — 삭제
- `features/editor/components/McpActivityDrawer.tsx` — 삭제
- `features/editor/pages/EditorPage.tsx` — 헤더 버튼 2개 → 1개 교체, 드로어 교체
- 관련 CSS/skeleton 파일 정리

---

## 범위 외

- 협업자 커서 이력, 실시간 변경 이벤트 스트림은 이번 범위에 포함하지 않는다.
- 필터 상태를 URL이나 localStorage에 persist하지 않는다 (기본값: 둘 다 켜짐).
