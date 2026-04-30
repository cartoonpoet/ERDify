# ERDify UI — Design System & Dashboard Implementation Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** lawkit 의존성을 제거하고 Meta Store 디자인 언어 기반의 자체 디자인 시스템을 구축하며, Org→Project→Diagram 3단 패널 대시보드를 완성해 실제로 쓸 수 있는 상태로 만든다.

**Architecture:** vanilla-extract 기반 디자인 토큰 + recipe/styleVariants/keyframes 적극 활용. features 폴더는 `pages/` + `components/` 2-depth 분리. 대시보드는 52px 아이콘 레일(Org) + 220px 사이드바(Project) + 메인(Diagram 그리드) 3단 구조.

**Tech Stack:** React 18, vanilla-extract (style/recipe/styleVariants/createGlobalTheme/keyframes), Pretendard Variable Font (CDN), Zustand, TanStack Query, react-router-dom v6, axios

---

## 배경 & 용도

ERDify는 법무 솔루션을 개발하는 내부 팀이 고객사(회사)별로 다른 DB 스키마를 관리하기 위한 도구다.

- **Organization** = 고객사 (예: A법인, B기업)
- **Project** = 고객사 내 모듈/시스템 (예: 계약관리, 소송기록)
- **Diagram** = 실제 ERD

고객사 전환이 빠르고 직관적이어야 한다. 고객사 담당자에게 ERD를 직접 보여주는 경우는 드물고, 추후 읽기 전용 공유 링크(Phase 8)로 대응한다.

---

## 디자인 토큰

### 색상

```
--color-primary:           #0064E0   (Meta Blue — 모든 CTA)
--color-primary-hover:     #0143B5
--color-primary-pressed:   #004BB9
--color-surface:           #FFFFFF
--color-surface-secondary: #F1F4F7
--color-surface-tertiary:  #F8F9FB   (메인 배경)
--color-text-primary:      #1C2B33
--color-text-secondary:    #5D6C7B
--color-text-disabled:     #BCC0C4
--color-border:            #DEE3E9
--color-border-strong:     #CBD2D9
--color-success:           #31A24C
--color-error:             #E41E3F
--color-focus-ring:        rgba(0,100,224,0.12)
--color-selected-bg:       #EEF4FF
```

### 타이포그래피

- **Font:** `'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif`
- **CDN:** `https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css`

| 역할 | Size | Weight | Letter-spacing |
|------|------|--------|----------------|
| Display | 28px | 700 | -0.5px |
| Heading | 20px | 700 | -0.3px |
| Title | 16px | 700 | -0.3px |
| Body | 14px | 400 | 0 |
| Caption | 12px | 400 | 0 |
| Label | 11px | 600 | 0.5px (uppercase) |

### 간격 (8px grid)

```
space-1:  4px
space-2:  8px
space-3: 12px
space-4: 16px
space-5: 20px
space-6: 24px
space-7: 32px
space-8: 40px
space-9: 48px
```

### 보더 라디우스

```
radius-sm:   6px   (뱃지, 작은 태그)
radius-md:   8px   (인풋, 작은 카드)
radius-lg:  14px   (다이어그램 카드)
radius-xl:  20px   (모달)
radius-pill: 100px (버튼)
radius-org:  10px  (org 아이콘)
```

### 그림자

```
shadow-sm:  0 1px 3px rgba(0,0,0,0.08)
shadow-md:  0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)
shadow-lg:  0 16px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)
shadow-xl:  0 24px 64px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)
```

---

## 디자인 시스템 파일 구조

```
apps/web/src/design-system/
├── tokens.css.ts          ← createGlobalTheme(':root', vars, {...})
├── Button/
│   ├── index.tsx          ← recipe() 기반 — variant: primary|secondary|ghost, size: sm|md|lg
│   └── button.css.ts
├── Input/
│   ├── index.tsx          ← style() + focus 상태 관리
│   └── input.css.ts
├── Card/
│   ├── index.tsx          ← style() — 기본 카드 래퍼
│   └── card.css.ts
├── Modal/
│   ├── index.tsx          ← createPortal + keyframes() 애니메이션
│   └── modal.css.ts
├── Skeleton/
│   ├── index.tsx          ← keyframes() pulse 애니메이션
│   └── skeleton.css.ts
└── index.ts               ← 통합 export
```

### vanilla-extract 사용 전략

| API | 적용 대상 |
|-----|-----------|
| `createGlobalTheme` | `tokens.css.ts` — 전역 CSS 변수 정의 |
| `recipe()` | Button (variant × size 조합), Input (상태별 variant) |
| `styleVariants()` | 뱃지 색상 (success/error/warning), 필터 칩 상태 |
| `style()` | 단일 컴포넌트 레이아웃·포지셔닝 |
| `keyframes()` | Skeleton pulse, Modal fade-in/slide-up |
| `globalStyle()` | body reset, Pretendard 폰트 적용 |
| `composeStyles()` | 여러 style() 조합이 필요한 복합 상태 |

---

## features 폴더 구조

```
apps/web/src/features/
├── auth/
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   └── components/
│       └── AuthForm.tsx         ← 공통 폼 래퍼 (로그인/회원가입 공유)
├── dashboard/
│   ├── pages/
│   │   └── DashboardPage.tsx
│   └── components/
│       ├── OrgRail.tsx          ← 좌측 org 아이콘 레일 (52px)
│       ├── OrgRail.css.ts
│       ├── ProjectSidebar.tsx   ← 중간 프로젝트 목록 (220px)
│       ├── ProjectSidebar.css.ts
│       ├── DiagramGrid.tsx      ← 우측 다이어그램 카드 그리드
│       ├── DiagramGrid.css.ts
│       ├── CreateOrgModal.tsx   ← 조직 생성 모달
│       ├── CreateProjectModal.tsx
│       └── CreateDiagramModal.tsx
└── editor/
    ├── pages/
    │   └── EditorPage.tsx       ← 기존 EditorPage 이동
    └── components/
        ├── EditorCanvas.tsx
        ├── PresenceIndicator.tsx
        └── VersionHistoryDrawer.tsx
```

---

## 백엔드 추가 사항 (apps/api)

대시보드가 동작하려면 아래 엔드포인트가 필요하다. 현재 없으므로 구현 플랜에 포함.

### `GET /organizations` — 내 조직 목록

`OrganizationController`에 추가:
```typescript
@Get()
findMyOrganizations(@CurrentUser() user: JwtPayload) {
  return this.organizationService.findMyOrganizations(user.sub);
}
```

`OrganizationService`에 추가:
```typescript
// OrganizationMember 조인으로 현재 유저가 속한 org 목록 반환
findMyOrganizations(userId: string): Promise<Organization[]>
```

---

## API 클라이언트 (신규)

### `shared/api/organizations.api.ts`

```typescript
createOrganization(body: { name: string }): Promise<OrgResponse>
getOrganization(id: string): Promise<OrgResponse>
listMyOrganizations(): Promise<OrgResponse[]>   // GET /organizations
updateOrganization(id: string, body: { name?: string }): Promise<OrgResponse>
deleteOrganization(id: string): Promise<void>
addMember(orgId: string, body: { email: string }): Promise<void>
removeMember(orgId: string, userId: string): Promise<void>
```

### `shared/api/projects.api.ts`

```typescript
createProject(orgId: string, body: { name: string }): Promise<ProjectResponse>
listProjects(orgId: string): Promise<ProjectResponse[]>
getProject(orgId: string, id: string): Promise<ProjectResponse>
updateProject(orgId: string, id: string, body: { name?: string }): Promise<ProjectResponse>
deleteProject(orgId: string, id: string): Promise<void>
```

---

## 라우팅

```
/login                   → LoginPage
/register                → RegisterPage
/                        → DashboardPage (ProtectedRoute)
/diagrams/:diagramId     → EditorPage (ProtectedRoute)
```

DashboardPage는 URL 쿼리 없이 Zustand `useWorkspaceStore`로 선택된 org/project 상태를 관리한다.

---

## 대시보드 레이아웃 상세

### 앱 셸 (`DashboardPage`)

```
┌─ Topbar (48px) ──────────────────────────────────────────┐
│ ERDify (brand)                              [User Avatar] │
├─ Body ────────────────────────────────────────────────────┤
│ OrgRail │ ProjectSidebar  │ Main                          │
│  52px   │    220px        │  flex: 1                      │
│         │                 │                               │
│  [A] ←active              │  ┌─ Main Header ──────────┐  │
│  [M]    │ Acme Corp       │  │ "Backend API"  [+ 새ERD]│  │
│  [S]    │ ─────────────── │  └────────────────────────┘  │
│         │ · Backend API ← │  ┌─ Filter Row ────────────┐  │
│  [+]    │   Frontend App  │  │ 전체  최근수정  내가만든 │  │
│         │   Mobile        │  └────────────────────────┘  │
│         │                 │  ┌─ Diagram Grid ──────────┐  │
│         │ [+ 새 프로젝트] │  │ [Card][Card][Card]      │  │
│         │                 │  │ [Card][Card][+New]      │  │
│         │ ─────────────── │  └────────────────────────┘  │
│         │ ⚙ 조직 설정     │                               │
└─────────┴─────────────────┴───────────────────────────────┘
```

### Org 아이콘 레일 동작
- 선택된 Org: Meta Blue 배경 + 흰 글자 + shadow
- 미선택: 흰 배경 + border + 회색 글자
- Org 전환 시 ProjectSidebar 초기화, selectedProjectId null로

### ProjectSidebar 동작
- 선택된 Project: `#EEF4FF` 배경 + Meta Blue 글자 + 왼쪽 3px 포인터 바
- "새 프로젝트" 버튼: dashed border 스타일 → CreateProjectModal 열기

### DiagramGrid 동작
- 카드: 미리보기(테이블 미니 렌더) + 이름 + dialect 뱃지 + 상대 시간
- 마지막 칸: dashed "새 ERD 만들기" → CreateDiagramModal 열기
- 로딩 상태: Skeleton 컴포넌트 (pulse 애니메이션)
- 카드 클릭 → `/diagrams/:id` 이동

---

## 모달 명세

### CreateDiagramModal
필드: `name` (텍스트 인풋), `dialect` (select: postgresql | mysql | mariadb)  
제출 → `createDiagram(selectedProjectId, { name, dialect })` → 성공 시 목록 갱신 후 모달 닫기

### CreateProjectModal
필드: `name` (텍스트 인풋)  
제출 → `createProject(selectedOrgId, { name })` → 성공 시 사이드바 목록 갱신

### CreateOrgModal
필드: `name` (텍스트 인풋)  
제출 → `createOrganization({ name })` → 성공 시 Org Rail 갱신, 새 org 자동 선택

---

## 인증 페이지 명세

### LoginPage
- 중앙 정렬, 흰 배경
- 로고: `ERD<span style="color:primary">ify</span>` (22px/700)
- 태그라인: "고객사 DB 스키마를 한 곳에서" (13px/400/text-secondary)
- 필드: 이메일, 비밀번호
- CTA: "로그인" (btn-primary, 풀 width, pill)
- 하단: "계정이 없으신가요? 회원가입" 링크

### RegisterPage
- 동일 레이아웃
- 태그라인: "팀과 함께 스키마를 관리하세요"
- 필드: 이름, 이메일, 비밀번호 (강도 바 포함)
- CTA: "시작하기"

---

## 제거 대상

- `@lawkit/ui` — `apps/web/package.json`에서 삭제
- 모든 `import { Button, lightThemeClass } from "@lawkit/ui"` 및 `import "@lawkit/ui/style.css"` 제거
- `apps/web/src/app/App.tsx` 전면 재작성 (→ DashboardPage로 분리)

---

## 데이터 흐름

```
useWorkspaceStore (Zustand)
  ├── selectedOrgId: string | null
  ├── selectedProjectId: string | null
  ├── orgs: OrgResponse[]
  └── selectOrg(id) → selectedProjectId 초기화

TanStack Query
  ├── ['orgs'] → listMyOrganizations()
  ├── ['projects', orgId] → listProjects(orgId)
  └── ['diagrams', projectId] → listDiagrams(projectId)
```

Query는 selectedOrgId/selectedProjectId가 null이면 enabled: false로 비활성.

---

## 코딩 컨벤션

- **컴포넌트 선언:** `function` 키워드 금지. 반드시 `const Component = () => {}` 형태 사용
- **커스텀 훅:** 동일하게 `const useXxx = () => {}` 형태
- **일반 유틸 함수:** 동일하게 화살표 함수

---

## 제거하지 않는 것

- EditorPage 내부 로직 (useRealtimeCollaboration, useVersionHistory, 등) — 이번 작업 범위 밖
- 기존 테스트 파일 — 구조 이동 시 경로만 업데이트
- `apps/api` — 변경 없음
