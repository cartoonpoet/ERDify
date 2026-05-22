# Error Handling UX Improvement Design Spec

## Goal

Fix two UX problems with the existing error handling (see `2026-05-09-error-handling-design.md`):

1. **Back button is broken** — "돌아가기" calls `navigate(-1)`, which silently does nothing when there is no browser history (direct URL access, fresh tab).
2. **Inline errors are too coarse** — When the DiagramGrid fails to load, the entire right content panel shows the error fallback, hiding the project header, filter tabs, and action buttons. Users lose navigation context and cannot take any action.

---

## Architecture Changes

### QueryErrorBoundary — props extension

Add two optional props for the `page` variant:

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `backLabel` | `string` | `"홈으로 이동"` | Button label shown in page-level fallback |
| `backPath` | `string` | `"/"` | `navigate(backPath)` on button click |

Add retry support for the `inline` variant via `useQueryErrorResetBoundary()`:

- Wrap the existing class component in a function component that calls `useQueryErrorResetBoundary()` from TanStack Query.
- Pass the returned `reset` function as `onReset` prop to the class component.
- On retry click: call `onReset()` (clears query error cache) then `setState({ hasError: false })` (re-renders children).

### ERROR_CONTENT — add `retryable` flag

Extend the existing `ERROR_CONTENT` map with a `retryable: boolean` field and updated copy:

| Status | Icon | Title | Description | Retryable | Guide (inline) |
|--------|------|-------|-------------|-----------|----------------|
| 403 | 🔒 | 접근 권한이 없습니다 | 이 프로젝트를 볼 수 있는 권한이 없습니다. 관리자에게 문의하세요. | false | 사이드바에서 다른 프로젝트를 선택하거나 관리자에게 문의하세요 |
| 404 | 🔍 | ERD 목록을 찾을 수 없습니다 | 이 프로젝트의 ERD 목록을 찾을 수 없습니다. | false | 사이드바에서 다른 프로젝트를 선택해 주세요 |
| 5xx | ⚠️ | 서버 오류 | 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요. | true | 문제가 지속되면 페이지를 새로고침해 주세요 |
| network | 📡 | 연결 오류 | 인터넷 연결을 확인한 후 다시 시도해 주세요. | true | 인터넷 연결을 확인해 주세요 |

### ErrorFallback — action differentiation

**page variant:**
- Button label: `backLabel` prop (e.g., "대시보드로 이동", "홈으로 이동")
- Button action: `navigate(backPath ?? "/")`
- No guide text

**inline variant:**
- If `retryable === true`: show "다시 시도" button → calls `onRetry()`
- If `retryable === false`: no button
- Always show guide text below (from ERROR_CONTENT)

### DiagramGrid — section-level inline error

Override global `throwOnError` for the `diagrams` query so errors are handled within the component rather than propagated to the boundary:

```ts
const { data: diagrams = [], isLoading, isError, error, refetch } = useQuery({
  queryKey: ["diagrams", projectId],
  queryFn: () => listDiagrams(projectId!),
  enabled: !!projectId,
  throwOnError: false,
});
```

When `isError`:

- **Grid area**: replaced by inline error UI (icon + title + desc + conditional retry button + guide text), using shared `ERROR_CONTENT` logic.
- **Filter tabs** (`전체 / 최근 수정 / 내가 만든`): `aria-disabled + pointer-events: none + opacity: 0.4`. Clicking a stale filter would just re-show the same error on a re-fetch.
- **"가져오기" / "+ 새 ERD" buttons**: disabled only on 403 (permission denied makes creation meaningless too). For 404/5xx/network the buttons remain enabled.

The outer `<QueryErrorBoundary variant="inline">` on `<Outlet>` is kept as a safety net for unexpected render errors or errors from other queries in DiagramGrid (e.g., `projects`, `me`).

### Router — context-aware back labels

```tsx
// Editor page
<QueryErrorBoundary variant="page" backLabel="대시보드로 이동" backPath="/">
  <EditorPage />
</QueryErrorBoundary>

// Shared diagram page
<QueryErrorBoundary variant="page" backLabel="홈으로 이동" backPath="/">
  <SharedDiagramPage />
</QueryErrorBoundary>
```

Both navigate to `"/"` (root redirect handles auth state). The label difference signals context to the user.

### 401 — no change needed

`httpClient` already intercepts 401 and redirects to `/login?reason=expired` before React Query throws. 401 never reaches the error boundary.

---

## Data Flow: DiagramGrid Error

```
User opens /:orgId/:projectId
  → DiagramGrid mounts
  → useQuery({ throwOnError: false }) fires listDiagrams
  → Server returns 5xx
  → React Query: isError = true, error = AxiosError
  → DiagramGrid renders:
       - Header: project name + "가져오기" + "+ 새 ERD" (enabled)
       - Filter row: disabled (opacity 0.4)
       - Grid area: ⚠️ 서버 오류 + "다시 시도" button + guide text
  → User clicks "다시 시도"
  → refetch() called → query re-executes
```

```
User opens /:orgId/:projectId
  → DiagramGrid mounts
  → useQuery returns 403
  → DiagramGrid renders:
       - Header: project name (buttons disabled)
       - Filter row: disabled
       - Grid area: 🔒 접근 권한이 없습니다 (no retry button) + guide text
  → User clicks sidebar → different project → DiagramGrid remounts → fresh query
```

---

## Updated Error Cases Matrix

| Scenario | Status | Handler | Retry Button | UI |
|----------|--------|---------|--------------|-----|
| Diagram 403 in editor | 403 | QueryErrorBoundary page | — | 전체 화면 + "대시보드로 이동" |
| Diagram 404 in editor | 404 | QueryErrorBoundary page | — | 전체 화면 + "대시보드로 이동" |
| Share link 404 | 404 | QueryErrorBoundary page | — | 전체 화면 + "홈으로 이동" |
| Dashboard 403/404 (DiagramGrid) | 403/404 | DiagramGrid inline | ✗ | 그리드 섹션만, 필터/버튼 disabled |
| Dashboard 5xx/network (DiagramGrid) | 5xx/net | DiagramGrid inline | ✓ | 그리드 섹션만, 필터 disabled, 버튼 유지 |
| Dashboard unexpected render error | any | QueryErrorBoundary inline | ✓ (retryable) | 콘텐츠 패널 전체 (사이드바 유지) |
| Session expiry | 401 | Axios interceptor | — | /login?reason=expired |

---

## Files Changed

| File | Change |
|------|--------|
| `shared/utils/queryErrorContent.ts` | **New** — extract `ERROR_CONTENT` map (+ `retryable`, `guide` fields) from QueryErrorBoundary so both QueryErrorBoundary and DiagramGrid can import it |
| `shared/components/QueryErrorBoundary.tsx` | `backLabel`, `backPath` props; `useQueryErrorResetBoundary` wrapper; `retryable` action split; import from `queryErrorContent.ts` |
| `shared/components/query-error-boundary.css` | Guide text style |
| `features/dashboard/components/DiagramGrid.tsx` | `throwOnError: false` on diagrams query; `isError` inline UI; filter/button disabled states; import from `queryErrorContent.ts` |
| `features/dashboard/components/DiagramGrid.css` | Disabled filter chip variant |
| `router/index.tsx` | Add `backLabel` props to page boundaries |

---

## Testing

| File | New Tests |
|------|-----------|
| `QueryErrorBoundary.test.tsx` | `backLabel` prop renders custom label; `backPath` used on click; inline retry resets boundary; inline 403 shows no retry button; inline 5xx shows retry + guide text |
| `DiagramGrid.test.tsx` | `isError` renders inline error UI; filter tabs disabled on error; "가져오기"/새ERD disabled on 403, enabled on 5xx |

---

## Out of Scope

- Stale-data-with-error banner (showing cached diagrams while refresh fails)
- Pagination / infinite scroll partial-load errors
- MemberManagementPage / ApiKeysPanel inline error (same pattern, add when needed)
- Sentry integration
