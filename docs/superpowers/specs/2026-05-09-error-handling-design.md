# Error Handling & Exception Pages Design Spec

## Goal

Centralize HTTP error handling so that access-denied, not-found, server-error, and session-expiry cases each show an appropriate UI without scattered per-component error state.

---

## Architecture

### Core principle

React Query's `throwOnError: true` makes query errors bubble to the nearest React Error Boundary. This lets us put all error UI in one place (`QueryErrorBoundary`) rather than writing error branches in every page component.

Mutations keep `throwOnError: false` — they use local state as before (e.g., login, form submit).

### Layer overview

```
httpClient (Axios)
  └─ interceptor: 401 → navigate to /login?reason=expired

QueryClient (AppProviders)
  └─ defaultOptions.queries.throwOnError: true
  └─ retry: (count, error) => status ≠ 403/404 && count < 1

Router.tsx
  ├─ <QueryErrorBoundary variant="page">  ← wraps EditorPage, SharedDiagramPage
  │    └─ <EditorPage />
  ├─ <QueryErrorBoundary variant="page">
  │    └─ <SharedDiagramPage />
  ├─ <DashboardPage>  (keeps sidebar)
  │    └─ <QueryErrorBoundary variant="inline">
  │         └─ <Outlet /> (DiagramGrid, MemberManagementPage, ApiKeysPanel)
  └─ <Route path="*" element={<NotFoundPage />} />

LoginPage
  └─ reads ?reason=expired → shows session-expiry banner
```

---

## Components

### `QueryErrorBoundary`

`apps/web/src/shared/components/QueryErrorBoundary.tsx`

React class-based Error Boundary that catches errors thrown by React Query.

Props:
- `variant: "page" | "inline"` — `"page"` renders full-screen centered; `"inline"` renders content-area only (sidebar visible)
- `children: ReactNode`

Reads `error.response?.status` (Axios error shape) to choose copy:
- `403` → 권한 없음 (접근 권한이 없는 다이어그램입니다)
- `404` → 존재하지 않음 (존재하지 않거나 삭제된 다이어그램입니다)
- `5xx` → 서버 오류 (서버에 일시적인 문제가 발생했습니다)
- network / unknown → 네트워크 오류 (네트워크 연결을 확인해 주세요)

Each variant shows: icon, title, description, and a "돌아가기" button (`navigate(-1)`).

Implementation note: Error Boundaries must be class components (`getDerivedStateFromError`). The fallback UI is a separate functional component `ErrorFallback` rendered inside the boundary's `render()` — this lets `ErrorFallback` use `useNavigate()` normally.

### `NotFoundPage`

`apps/web/src/features/error/pages/NotFoundPage.tsx`

Rendered for any unmatched URL (`path="*"`). Full-screen, shows "페이지를 찾을 수 없습니다" and a home button.

No Error Boundary needed — this is a route match, not a thrown error.

### Session-expiry banner in `LoginPage`

`LoginPage.tsx` reads `useSearchParams()` for `reason=expired`. If present, shows a dismissible info banner above the form: "세션이 만료되었습니다. 다시 로그인해 주세요."

### Axios interceptor in `httpClient.ts`

Single response-error interceptor:
- If `error.response?.status === 401`: call `navigate("/login?reason=expired")` and reject.
- All other statuses: pass through (React Query / caller handles them).

Navigation from outside React requires storing the React Router `navigate` function. We'll expose a module-level setter: `setNavigate(fn)` called once inside `AppProviders` via `useEffect`.

---

## Data Flow

1. User opens `/diagrams/abc` where they have no access.
2. `useQuery({ queryKey: ["diagram","abc"], queryFn: getDiagram })` fires.
3. `getDiagram` calls `httpClient.get(...)` → server returns `403`.
4. Axios interceptor: status ≠ 401, passes through.
5. React Query: `throwOnError: true` → throws `AxiosError { response.status: 403 }`.
6. `QueryErrorBoundary variant="page"` catches it → renders 권한 없음 screen.

For 401 (session expiry):
1. Any query fires → server returns `401`.
2. Axios interceptor catches `401` → navigates to `/login?reason=expired`.
3. React Query query is never resolved; navigation already happened.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/web/src/shared/api/httpClient.ts` | Add 401 interceptor + `setNavigate` setter |
| `apps/web/src/app/providers/AppProviders.tsx` | `throwOnError: true`, smart retry, call `setNavigate` |
| `apps/web/src/app/Router.tsx` | Wrap routes with `QueryErrorBoundary`, add `path="*"` |
| `apps/web/src/shared/components/QueryErrorBoundary.tsx` | New — class Error Boundary, `variant` prop |
| `apps/web/src/features/error/pages/NotFoundPage.tsx` | New — 404 route fallback |
| `apps/web/src/features/auth/pages/LoginPage.tsx` | Add `reason=expired` banner |

---

## Error Cases Matrix

| Scenario | HTTP status | Handler | UI |
|----------|-------------|---------|-----|
| No access to diagram | 403 | QueryErrorBoundary | 권한 없음 전체 화면 |
| Diagram deleted | 404 | QueryErrorBoundary | 존재하지 않음 전체 화면 |
| Share link expired/invalid | 404 | QueryErrorBoundary | 존재하지 않음 전체 화면 |
| Server crash | 5xx | QueryErrorBoundary | 서버 오류 전체 화면 |
| Network offline | no response | QueryErrorBoundary | 네트워크 오류 화면 |
| Session expired | 401 | Axios interceptor | /login?reason=expired |
| Wrong URL typed | route miss | NotFoundPage route | 페이지 없음 전체 화면 |
| Dashboard sub-page 403/404 | 403/404 | QueryErrorBoundary inline | 권한 없음 (사이드바 유지) |

---

## Testing

- `QueryErrorBoundary.test.tsx`: mount with a child that throws an Axios-shaped error; assert correct copy for each status; assert `variant="page"` vs `"inline"` class difference.
- `NotFoundPage.test.tsx`: renders and home button navigates to `/`.
- `LoginPage.test.tsx`: `?reason=expired` shows banner; absence hides it.
- `httpClient interceptor.test.ts`: mock axios, assert 401 calls navigate and rejects; assert non-401 passes through.

---

## Out of Scope

- Sentry / error reporting integration
- Offline mode / service worker
- Per-mutation error toasts (existing behavior unchanged)
