# Frontend Refactoring Design

**Date:** 2026-05-09  
**Scope:** apps/web, packages/contracts  
**Out of scope:** packages/erd-ui (5파일 94줄 — 리팩토링 불필요), apps/landing (Astro 정적 사이트)  
**Priority:** A(파일분리) → B(타입안전성) → D(성능) → C(테스트)  
**Approach:** Bottom-up — 안정 레이어(타입) → 공유 훅 → 컴포넌트

---

## 1. packages/contracts — 응답 타입 체계화

### 현재 상태

`packages/contracts`에는 Zod request schema 1개만 존재 (`CreateDiagramRequest`).  
API 응답 타입은 `apps/web/src/shared/types/index.ts`에 분산되어 있거나 아예 정의되지 않음.

### 변경 후 구조

```
packages/contracts/src/
  diagrams/
    diagram-contract.schema.ts   # 기존 유지 (request Zod schema)
    diagram.types.ts             # NEW: DiagramSummary, DiagramDetail, DiagramNode 등
  organizations/
    organization.types.ts        # NEW: OrganizationSummary, OrgRole 등
  members/
    member.types.ts              # NEW: MemberRole, InviteStatus, MemberSummary 등
  api-keys/
    api-key.types.ts             # NEW: ApiKey, CreateApiKeyResponse 등
  auth/
    auth.types.ts                # NEW: LoginResponse, UserProfile 등
  index.ts                       # 모든 타입 re-export
```

### 원칙

- Zod schema는 request validation 전용 (기존 패턴 유지)
- 응답 타입은 TypeScript `interface`/`type`만 사용 — runtime 오버헤드 없음
- `apps/web/src/shared/types/index.ts`의 기존 타입 마이그레이션 후 삭제
- 백엔드 DTO와 같은 소스에서 관리 → 타입 드리프트 원천 차단

---

## 2. Shared 레이어 — 훅 SRP + Zustand 슬라이스

### 2-1. useRealtimeCollaboration 분리

**현재:** 235줄 훅에 WebSocket 연결 / Automerge diff 적용 / Presence 관리가 혼재

**변경 후:**

```
features/editor/hooks/
  useCollaborationSocket.ts    # WebSocket 연결 생명주기만
                               # 입력: diagramId, handlers
                               # 출력: socket ref, connectionState
  usePresence.ts               # 협업자 presence 수신/브로드캐스트
                               # 입력: socket, userId
                               # 출력: collaborators[]
  useRealtimeCollaboration.ts  # 얇은 오케스트레이터 (위 2개 조합)
                               # EditorStore 연결 유지

features/editor/utils/
  collaboration-diff.ts        # applyDiff, applyColumnDiff 순수 함수
                               # 상태/사이드이펙트 없음 → 단독 테스트 가능
```

### 2-2. useEditorStore Zustand 슬라이스 분리

**현재:** 212줄 단일 스토어에 4가지 도메인 혼재

**변경 후:**

```
features/editor/stores/
  diagramSlice.ts        # 노드/엣지/Automerge 문서 상태
  uiSlice.ts             # 선택 상태, 사이드바 UI
  collaboratorsSlice.ts  # presence, 협업자 색상/커서
  pendingSlice.ts        # FK 연결 확인, 삭제 확인 등 임시 작업
  useEditorStore.ts      # 4개 슬라이스 통합 — 외부 API 동일 유지
```

외부 컴포넌트의 `useEditorStore` import 경로는 변경 없음.  
슬라이스 분리 후 각 slice별 selector 범위를 좁혀 불필요한 리렌더 방지.

### 2-3. Yjs 의존성 제거

현재 `yjs` 패키지가 `package.json`에 선언되어 있으나 실제 import 없음.  
번들에서 ~200kb 제거.

```
apps/web/package.json — "yjs" 항목 삭제
```

---

## 3. Editor 컴포넌트 분리

### 3-1. EditableTableNode (730줄 → 폴더)

```
features/editor/components/editable-table-node/
  index.tsx                # 외부 API 유지 (기존 import 경로 불변)
  TableHeader.tsx          # 테이블명, 스키마 셀렉터, 컬러 뱃지
  ColumnRow.tsx            # 컬럼 1행 편집 (이름/타입/PK/NN/FK)
  IndexSection.tsx         # 인덱스 목록 + 추가 버튼
  ColorPicker.tsx          # 테이블 색상 선택
  editable-table-node.css.ts  # 서브컴포넌트별 scope 분리
```

`ColorPicker`는 editor 전용으로 `editable-table-node/` 내부에 유지. 다른 feature에서 실제 사용이 확인될 때 `shared/components`로 이동.

### 3-2. EditorCanvas (600줄 → 책임 분리)

```
features/editor/components/
  EditorCanvas.tsx         # 얇은 루트 (XYFlow 초기화, 이벤트 핸들러)
  SchemaZoneLayer.tsx      # 스키마별 배경 존 렌더링
  CanvasToolbar.tsx        # 줌/레이아웃/내보내기 버튼 모음
  EdgeConfirmOverlay.tsx   # FK 연결 확인 오버레이
```

---

## 4. Dashboard 컴포넌트 분리

### 4-1. ImportDiagramModal (321줄 → 로직/UI 분리)

```
features/dashboard/hooks/
  useDiagramImport.ts      # DDL/eXERD 파싱 + 임포트 상태 관리

features/dashboard/components/
  ImportDiagramModal.tsx   # UI만 담당, useDiagramImport 사용
```

### 4-2. UnifiedSidebar (235줄 → 서브컴포넌트)

```
features/dashboard/components/unified-sidebar/
  index.tsx                # 기존 외부 API 유지
  SidebarOrgSection.tsx    # 조직/프로젝트 트리
  SidebarDiagramList.tsx   # 다이어그램 목록
  SidebarBottomBar.tsx     # 하단 버튼 바 (API키, 프로필)
```

### 4-3. CSS 파일 분산

`unified-sidebar.css.ts` (370줄), `api-keys-panel.css.ts` (351줄) 등 큰 CSS 파일은  
컴포넌트 분리 과정에서 각 서브컴포넌트 옆에 `.css.ts`로 자연스럽게 분산.

---

## 5. 성능 (D 우선순위)

1. **Yjs 제거** — 섹션 2-3 처리 (번들 ~200kb 감소)
2. **Zustand selector 범위 축소** — 슬라이스 분리 후 컴포넌트별 필요한 slice만 subscribe
3. **공통 컴포넌트 식별** — `ColorPicker`, `DarkCodeEditor` 등 재사용 가능한 것을 `shared/components`로 이동

---

## 실행 순서 (Bottom-up)

| 단계 | 작업 | 대상 |
|------|------|------|
| 1 | contracts 응답 타입 추가 | packages/contracts |
| 2 | web shared/types 마이그레이션 | apps/web/src/shared/types |
| 3 | Yjs 제거 | apps/web/package.json |
| 4 | collaboration-diff.ts 추출 | editor/utils |
| 5 | useCollaborationSocket, usePresence 분리 | editor/hooks |
| 6 | useEditorStore 슬라이스 분리 | editor/stores |
| 7 | EditableTableNode 폴더 분리 | editor/components |
| 8 | EditorCanvas 책임 분리 | editor/components |
| 9 | useDiagramImport 추출 | dashboard/hooks |
| 10 | UnifiedSidebar 서브컴포넌트 분리 | dashboard/components |

---

## 불변 원칙

- 외부 import 경로는 변경하지 않음 (index.ts로 re-export 유지)
- 기능 변경 없이 구조만 변경
- `useEffect`/`useMemo`/`memo`/`useCallback` 추가는 명시적 허락 필요
- React 컴포넌트는 `const` 화살표 함수로 선언
- 각 단계 후 `typecheck` + `test` 통과 확인
