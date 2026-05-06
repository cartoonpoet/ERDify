# API 키 관리 UX 개선 — 인라인 패널

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** API 키 관리를 별도 라우트(`/settings/api-keys`)에서 대시보드 인라인 패널로 이동해 컨텍스트 전환 없이 사용할 수 있게 한다.

**Architecture:** `ApiKeysPage` → `ApiKeysPanel`로 재구성. 사이드바 하단에 조직과 무관하게 항상 표시되는 🔑 API 키 버튼 추가. 클릭 시 대시보드 메인 영역에 `ApiKeysPanel`을 인라인 렌더링 (MemberManagementPage와 동일한 패턴).

**Tech Stack:** React, TanStack Query, vanilla-extract CSS. 기존 `api-keys.api.ts` 재사용. 라우트 변경만으로 백엔드 수정 없음.

---

## 파일 구조

| 파일 | 변경 |
|---|---|
| `apps/web/src/features/dashboard/pages/ApiKeysPanel.tsx` | 신규 생성 |
| `apps/web/src/features/dashboard/pages/api-keys-panel.css.ts` | 신규 생성 |
| `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx` | 수정 |
| `apps/web/src/features/dashboard/components/unified-sidebar.css.ts` | 수정 |
| `apps/web/src/features/dashboard/pages/DashboardPage.tsx` | 수정 |
| `apps/web/src/app/Router.tsx` | 수정 — `/settings/api-keys` 라우트 제거 |
| `apps/web/src/features/settings/pages/ApiKeysPage.tsx` | 삭제 |
| `apps/web/src/features/settings/pages/ApiKeysPage.test.tsx` | 이동/재작성 → `ApiKeysPanel.test.tsx` |
| `apps/web/src/features/settings/pages/api-keys-page.css.ts` | 삭제 |

---

## 컴포넌트 설계

### ApiKeysPanel

**위치:** `apps/web/src/features/dashboard/pages/ApiKeysPanel.tsx`

**props:** 없음 (user-level 기능, orgId 불필요)

**상태 (기존 ApiKeysPage에서 이전):**
- `showForm: boolean` — 새 키 생성 폼 표시
- `formName: string`
- `formExpiry: ExpiryPreset` — "30d" | "90d" | "1y" | "none" | "custom"
- `formCustomDate: string`
- `confirmRevokeId: string | null`
- `confirmRegenerateId: string | null`
- `revealedKey: ApiKeyCreated | null`
- `copied: boolean`

**TanStack Query:**
- `useQuery({ queryKey: ["api-keys"], queryFn: listApiKeys })`
- `useMutation` × 3: createApiKey, revokeApiKey, regenerateApiKey (기존과 동일)

**렌더링 구조:**
```
<div className={css.page}>
  <div className={css.header}>
    <div>
      <h1>API 키</h1>
      <p className={css.subtitle}>HTTP 헤더 X-Api-Key 또는 Bearer 토큰으로 사용</p>
    </div>
    <Button "+ 새 키 생성" / "취소">
  </div>

  {showForm && <CreateForm />}    ← 기존 createForm 그대로
  {revealedKey && <RevealBox />}  ← 기존 revealBox 그대로

  <div className={css.sectionLabel}>활성 키 · {N}개</div>
  <div className={css.card}>
    {keys.map(...)}  ← 기존 테이블 대신 카드 row (MemberManagementPage 스타일)
  </div>
</div>
```

**키 행(row) 구조** (테이블 → 카드 리스트):
```
[이름 + prefix·••••]  [만료일]  [상태 뱃지]  [재생성 버튼]  [폐기 버튼]
```
인라인 confirm (재생성/폐기) 동작은 기존 ApiKeysPage와 동일.

**주의:** `useNavigate` 및 `← 대시보드` 버튼 제거. `page` 스타일은 `member-management-page.css.ts`의 `page`와 동일한 패턴(`padding, flex:1, overflowY:auto`).

---

### api-keys-panel.css.ts

`member-management-page.css.ts`와 동일한 패턴. 필요한 exports:

- `page` — padding: vars.space["6"], flex: 1, overflowY: "auto"
- `header` — flex, justify-content: space-between, align-items: flex-start, marginBottom: vars.space["6"]
- `title` — lg font, bold
- `subtitle` — sm font, textSecondary, marginTop: vars.space["1"]
- `sectionLabel` — "2xs" uppercase label (기존 treeSectionLabel 패턴)
- `card` — border, borderRadius md, overflow hidden, shadow sm
- `keyRow` — flex, alignItems center, gap 3, padding (memberRow와 동일 패턴), borderBottom last-child:none
- `keyName` — sm font, medium weight, textPrimary, overflow ellipsis
- `keyMeta` — xs font, textDisabled (prefix·만료일 표시)
- `badgeActive`, `badgeExpiring`, `badgeExpired` — 기존 api-keys-page.css.ts에서 이전
- `revealBox`, `revealWarning`, `keyBox`, `keyText`, `copyBtn`, `copySuccessBtn`, `confirmBtn` — 기존 스타일 이전
- `createForm`, `formRow`, `label`, `optional`, `input`, `chips`, `chip`, `chipActive`, `formActions`, `createSubmitBtn`, `errorMsg` — 기존 스타일 이전
- `actionBtn`, `actionBtnDanger`, `confirmInline`, `confirmYesBtn`, `confirmNoBtn` — 기존 스타일 이전

---

### UnifiedSidebar — 사이드바 하단 고정 영역

**새 props 추가:**
```typescript
interface UnifiedSidebarProps {
  // ... 기존 props ...
  apiKeysActive: boolean;
  onApiKeys: () => void;
}
```

**구조 변경:** `<aside>` 내부 맨 하단에 `{selectedOrgId && ...}` 블록 **밖에** 새 영역 추가:

```tsx
{/* 기존 selectedOrgId 블록 (멤버 관리 포함) */}
{selectedOrgId && ( ... )}

{/* 항상 표시되는 하단 고정 영역 (NEW) */}
<div className={css.sidebarBottomBar}>
  <button
    className={[css.projRow, apiKeysActive ? css.projRowActive : ""].filter(Boolean).join(" ")}
    onClick={onApiKeys}
    aria-pressed={apiKeysActive}
  >
    <span className={css.projArrow} aria-hidden="true" />
    <span className={css.projIcon} aria-hidden="true">🔑</span>
    <span className={css.projName}>API 키</span>
  </button>
</div>
```

**unified-sidebar.css.ts에 추가:**
```typescript
export const sidebarBottomBar = style({
  borderTop: `1px solid ${vars.color.border}`,
  padding: `${vars.space["2"]} 0`,
  flexShrink: 0,
});
```

---

### DashboardPage — 뷰 조율

**새 상태:**
```typescript
const [apiKeysOpen, setApiKeysOpen] = useState(false);
```

**새 핸들러:**
```typescript
function handleApiKeys() {
  setApiKeysOpen(true);
  setMemberManagementOpen(false);
}
```

**기존 handleManageMembers도 수정** (상호 배타적):
```typescript
// onManageMembers prop으로 전달되는 inline arrow
onManageMembers={() => { setMemberManagementOpen(true); setApiKeysOpen(false); }}
```

**deleteOrgMutation.onSuccess 수정** (org 삭제 시 두 뷰 모두 닫기):
```typescript
if (selectedOrganizationId === orgId) {
  reset();
  setMemberManagementOpen(false);
  setApiKeysOpen(false);  // ← 추가
}
```

**handleSelectOrg 수정** (조직 전환 시 memberManagement만 닫음, apiKeys는 유지):
```typescript
function handleSelectOrg(orgId: string) {
  selectOrganization(orgId);
  setMemberManagementOpen(false);
  // apiKeysOpen은 닫지 않음 — API 키는 조직과 무관
}
```

**메인 콘텐츠 렌더링 (3단계 우선순위):**
```tsx
{apiKeysOpen ? (
  <ApiKeysPanel />
) : memberManagementOpen && selectedOrganizationId ? (
  <MemberManagementPage
    orgId={selectedOrganizationId}
    orgName={orgs.find((o) => o.id === selectedOrganizationId)?.name ?? ""}
  />
) : (
  <DiagramGrid ... />
)}
```

**UnifiedSidebar props 추가:**
```tsx
<UnifiedSidebar
  ...
  apiKeysActive={apiKeysOpen}
  onApiKeys={handleApiKeys}
/>
```

**아바타 드롭다운에서 제거:**
```tsx
// 이 버튼 삭제
<button onClick={() => { setMenuOpen(false); navigate("/settings/api-keys"); }}>
  API 키 관리
</button>
```

**import 추가:** `import { ApiKeysPanel } from "./ApiKeysPanel";`

---

### Router.tsx

```tsx
// 이 라우트 삭제
<Route path="/settings/api-keys" element={<ApiKeysPage />} />

// ApiKeysPage import도 삭제
```

---

## 테스트

**ApiKeysPanel.test.tsx** (`apps/web/src/features/dashboard/pages/ApiKeysPanel.test.tsx`):
- 기존 `ApiKeysPage.test.tsx`에서 이전
- `useNavigate` mock 제거
- `render(<ApiKeysPanel />)` — props 없음
- 테스트 케이스 그대로 유지:
  - 로딩 상태
  - 빈 키 목록 메시지
  - 키 목록 렌더링
  - 폼 토글 (+ 새 키 생성 버튼)
  - 키 생성 및 reveal box 표시
  - 복사 버튼
  - reveal box dismiss
  - 폐기 confirm 플로우
  - 재생성 confirm 플로우

**UnifiedSidebar.test.tsx 수정:**
- `defaultProps`에 `apiKeysActive: false`, `onApiKeys: vi.fn()` 추가

---

## 제거 대상

- `apps/web/src/features/settings/pages/ApiKeysPage.tsx`
- `apps/web/src/features/settings/pages/api-keys-page.css.ts`
- `apps/web/src/features/settings/pages/ApiKeysPage.test.tsx` (→ ApiKeysPanel.test.tsx로 이전)
- `/settings/api-keys` 라우트
- `settings/` 디렉터리 (다른 파일 없으면 삭제)
