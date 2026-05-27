# Dashboard Active Users Design

## Overview

대시보드의 각 ERD 카드에 현재 접속 중인 사용자를 표시하는 기능. 완전 실시간이 아니어도 되며, 서버 부담 최소화가 목표.

---

## UI

각 `DiagramCard` 하단 행에 dialect 뱃지와 같은 줄로 표시:

```
[PostgreSQL뱃지]          [아바타스택][+N][● N명]
```

### 아바타 스택 규칙
- 아바타 최대 3개 표시. 초과분은 `+N` 원형 pill로 표시
- 아바타: 이메일 첫 글자 + 기존 협업자 color 값 (서버에서 내려오는 값 그대로)
- `+N` pill 스타일: `background: #F1F4F7, color: #5D6C7B, border: 2px solid white`
- 초록 점 + `N명` 텍스트: `color: #31A24C, font-weight: 600`

### 조건부 렌더링
- 접속자 0명이면 아바타/점/숫자 영역 전체 렌더링 안 함 — 카드 레이아웃 변화 없음

---

## API

### 엔드포인트

```
GET /diagrams/active-users?diagramIds=id1,id2,id3
```

### 응답

```json
{
  "id1": [
    { "userId": "u1", "email": "kim@co.kr", "color": "#ef4444" },
    { "userId": "u2", "email": "lee@co.kr", "color": "#3b82f6" }
  ],
  "id2": [],
  "id3": [{ "userId": "u3", "email": "park@co.kr", "color": "#22c55e" }]
}
```

### 구현
- `CollaborationService`의 `rooms: Map<diagramId, Room>` 메모리 데이터를 직접 읽음 — DB 쿼리 없음
- 권한 체크: 요청한 diagramId들을 기존 `canAccessDiagram` 로직으로 검증
- 접속자 0명 다이어그램은 빈 배열 반환

### 모듈 의존성
`DiagramsModule`이 `CollaborationModule`을 import하고 `CollaborationService`를 export해야 함. `collaboration.module.ts`에 `exports: [CollaborationService]` 추가 필요.

---

## 프론트엔드

### 훅 — `useActiveDiagramUsers`

```
위치: apps/web/src/features/dashboard/hooks/useActiveDiagramUsers.ts
```

- TanStack Query `useQuery` + `refetchInterval: 30_000`
- `refetchIntervalInBackground: false` — 탭 숨겨지면 자동 중단
- 최초 마운트 시 즉시 1회 fetch
- 입력: 현재 보이는 diagramId 목록
- 출력: `Record<diagramId, ActiveUser[]>`

### 컴포넌트 변경

`DiagramCard` (또는 `DiagramGrid` 내 카드 렌더링 부분) 하단 행에 접속자 UI 추가.

---

## 엣지케이스

| 상황 | 처리 |
|------|------|
| fetch 실패 | 이전 데이터 유지 (TanStack Query 기본). 에러 표시 없음 |
| 탭 비활성화 | 폴링 자동 중단 |
| 프로젝트 전환 | diagramIds 변경 → 쿼리 키 변경 → 자동 재폴링 |
| 본인이 해당 ERD 열고 있을 때 | 본인도 포함하여 표시 (에디터 동작과 동일) |
| 10명 이상 접속 | 아바타 3개 + `+N` pill + 총 인원수 텍스트로 표시 |

---

## 파일 변경 범위

| 파일 | 변경 내용 |
|------|-----------|
| `apps/api/src/modules/diagrams/diagrams.controller.ts` | `GET /diagrams/active-users` 엔드포인트 추가 |
| `apps/api/src/modules/diagrams/diagrams.service.ts` | `getActiveUsers(diagramIds, userId)` 메서드 추가 |
| `apps/api/src/modules/collaboration/collaboration.service.ts` | `getRoomPresences(diagramIds)` 메서드 노출 |
| `packages/contracts/src/` | `ActiveUsersResponse` 타입 추가 |
| `apps/web/src/features/dashboard/hooks/useActiveDiagramUsers.ts` | 신규 훅 |
| `apps/web/src/features/dashboard/components/DiagramGrid.tsx` | 훅 호출 후 카드에 prop 전달 |
| `apps/web/src/features/dashboard/components/DiagramCard` | 아바타 스택 UI 추가 (또는 기존 카드 컴포넌트 수정) |
