# Error Handling & Exception Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize HTTP error handling so 401/403/404/5xx/network failures each show the right UI — session expiry redirects to login, access/not-found errors show purpose-built screens, unmatched URLs show a 404 page.

**Architecture:** React Query `throwOnError: true` bubbles query errors to class-based `QueryErrorBoundary` components placed strategically in the router tree. A single Axios interceptor handles 401s by navigating to `/login?reason=expired`, and `LoginPage` reads that param to show a session-expiry banner.

**Tech Stack:** React 19, Axios, @tanstack/react-query v5, react-router-dom v6, Vanilla Extract CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/web/src/shared/api/httpClient.ts` | Modify | Add `setNavigate` + 401 interceptor |
| `apps/web/src/shared/api/httpClient.interceptor.test.ts` | Create | Test the interceptor logic |
| `apps/web/src/app/providers/AppProviders.tsx` | Modify | `throwOnError: true`, smart retry, wire navigate |
| `apps/web/src/shared/components/QueryErrorBoundary.tsx` | Create | Class Error Boundary + `ErrorFallback` functional component |
| `apps/web/src/shared/components/query-error-boundary.css.ts` | Create | CSS for error fallback UI |
| `apps/web/src/shared/components/QueryErrorBoundary.test.tsx` | Create | Test per-status copy + variant classes |
| `apps/web/src/features/error/pages/NotFoundPage.tsx` | Create | `path="*"` catch-all page |
| `apps/web/src/features/error/pages/not-found-page.css.ts` | Create | CSS for not-found page |
| `apps/web/src/features/error/pages/NotFoundPage.test.tsx` | Create | Renders correctly, button present |
| `apps/web/src/app/Router.tsx` | Modify | Wrap routes with `QueryErrorBoundary`, add `*` route |
| `apps/web/src/features/dashboard/pages/DashboardPage.tsx` | Modify | Wrap `<Outlet />` with `QueryErrorBoundary variant="inline"` |
| `apps/web/src/features/shared-diagram/pages/SharedDiagramPage.tsx` | Modify | Remove `isError` branch (now handled by boundary) |
| `apps/web/src/features/shared-diagram/pages/SharedDiagramPage.test.tsx` | Modify | Remove error tests, update CSS mock |
| `apps/web/src/features/shared-diagram/pages/shared-diagram-page.css.ts` | Modify | Remove unused `errorPage` / `errorTitle` classes |
| `apps/web/src/features/auth/pages/LoginPage.tsx` | Modify | Read `reason=expired` param, show session banner |
| `apps/web/src/features/auth/pages/auth-page.css.ts` | Modify | Add `sessionBanner` style |
| `apps/web/src/features/auth/pages/LoginPage.test.tsx` | Modify | Add tests for banner presence/absence |

---

## Task 1: httpClient — `setNavigate` setter + 401 interceptor

**Files:**
- Modify: `apps/web/src/shared/api/httpClient.ts`
- Create: `apps/web/src/shared/api/httpClient.interceptor.test.ts`

Context: `httpClient.ts` is currently a bare `axios.create()` with no interceptors. We export `setNavigate` so `AppProviders` can wire React Router's `navigate` into the module, and export `onResponseError` as a named function so it can be unit-tested directly.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/shared/api/httpClient.interceptor.test.ts`:

```typescript
import axios from "axios";
import { onResponseError, setNavigate } from "./httpClient";

describe("httpClient onResponseError interceptor", () => {
  beforeEach(() => setNavigate(null));

  it("navigates to /login?reason=expired on 401 and rejects", async () => {
    const navigate = vi.fn();
    setNavigate(navigate);

    const error = new axios.AxiosError(
      "Unauthorized",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      { status: 401, data: null, statusText: "Unauthorized", headers: {}, config: {} as never }
    );

    await expect(onResponseError(error)).rejects.toBe(error);
    expect(navigate).toHaveBeenCalledWith("/login?reason=expired");
  });

  it("does not navigate on 403 and still rejects", async () => {
    const navigate = vi.fn();
    setNavigate(navigate);

    const error = new axios.AxiosError(
      "Forbidden",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      { status: 403, data: null, statusText: "Forbidden", headers: {}, config: {} as never }
    );

    await expect(onResponseError(error)).rejects.toBe(error);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not navigate on non-axios errors and still rejects", async () => {
    const navigate = vi.fn();
    setNavigate(navigate);

    const error = new Error("Network Error");
    await expect(onResponseError(error)).rejects.toBe(error);
    expect(navigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && pnpm test -- --reporter=verbose httpClient.interceptor
```

Expected: FAIL — `onResponseError` and `setNavigate` are not exported yet.

- [ ] **Step 3: Implement the changes**

Replace `apps/web/src/shared/api/httpClient.ts` with:

```typescript
import axios from "axios";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

type NavigateFn = (path: string) => void;
let _navigate: NavigateFn | null = null;

export const setNavigate = (fn: NavigateFn | null) => { _navigate = fn; };

export const onResponseError = (error: unknown): Promise<never> => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    _navigate?.("/login?reason=expired");
  }
  return Promise.reject(error);
};

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  withCredentials: true,
});

httpClient.interceptors.response.use(
  (response) => response,
  onResponseError
);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && pnpm test -- --reporter=verbose httpClient.interceptor
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
cd apps/web && pnpm test
```

Expected: all tests pass (existing api tests mock `httpClient` module itself, so they are unaffected).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/shared/api/httpClient.ts apps/web/src/shared/api/httpClient.interceptor.test.ts
git commit -m "feat(web): add setNavigate + 401 interceptor to httpClient"
```

---

## Task 2: QueryClient — global `throwOnError` + smart retry + `NavigateSetter`

**Files:**
- Modify: `apps/web/src/app/providers/AppProviders.tsx`

Context: Currently `AppProviders` creates a QueryClient with `staleTime: 30_000, retry: 1`. We upgrade it to throw query errors (so Error Boundaries catch them), disable retry for 403/404, and mount a `NavigateSetter` child to wire `navigate` into `httpClient` at runtime.

- [ ] **Step 1: Replace `AppProviders.tsx`**

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState, useEffect } from "react";
import { BrowserRouter, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { setNavigate } from "../../shared/api/httpClient";

const NavigateSetter = () => {
  const navigate = useNavigate();
  useEffect(() => { setNavigate(navigate); }, [navigate]);
  return null;
};

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error) => {
              const status = (error as AxiosError)?.response?.status;
              if (status === 403 || status === 404) return false;
              return count < 1;
            },
            throwOnError: true,
          },
        },
      })
  );

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <NavigateSetter />
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};
```

Note: `AppProviders` was previously a `function` declaration — keep it as `const` arrow function to match the project convention.

- [ ] **Step 2: Run full test suite**

```bash
cd apps/web && pnpm test
```

Expected: all tests pass. Tests that create their own `QueryClient` are unaffected because they override options locally.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/providers/AppProviders.tsx
git commit -m "feat(web): throwOnError + smart retry + NavigateSetter in QueryClient"
```

---

## Task 3: `QueryErrorBoundary` component

**Files:**
- Create: `apps/web/src/shared/components/QueryErrorBoundary.tsx`
- Create: `apps/web/src/shared/components/query-error-boundary.css.ts`
- Create: `apps/web/src/shared/components/QueryErrorBoundary.test.tsx`

Context: This is a React class-based Error Boundary (must be class — React requires `getDerivedStateFromError`). The fallback UI is a separate functional component `ErrorFallback` rendered inside the boundary's `render()`, so it can use the `useNavigate` hook. Variant `"page"` renders full-screen (100vh); variant `"inline"` renders with `flex: 1` so it fills only the content column (sidebar stays visible).

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/shared/components/QueryErrorBoundary.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryErrorBoundary } from "./QueryErrorBoundary";

// Suppress React's error boundary console output in test logs
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
afterAll(() => { consoleError.mockRestore(); });

const Throw = ({ error }: { error: unknown }) => { throw error; };

const wrap = (error: unknown, variant: "page" | "inline" = "page") =>
  render(
    <MemoryRouter>
      <QueryErrorBoundary variant={variant}>
        <Throw error={error} />
      </QueryErrorBoundary>
    </MemoryRouter>
  );

describe("QueryErrorBoundary", () => {
  it("shows 접근 권한이 없습니다 for status 403", () => {
    wrap({ response: { status: 403 } });
    expect(screen.getByText("접근 권한이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("접근 권한이 없는 다이어그램입니다.")).toBeInTheDocument();
  });

  it("shows 존재하지 않습니다 for status 404", () => {
    wrap({ response: { status: 404 } });
    expect(screen.getByText("존재하지 않습니다")).toBeInTheDocument();
    expect(screen.getByText("존재하지 않거나 삭제된 다이어그램입니다.")).toBeInTheDocument();
  });

  it("shows 서버 오류 for status 500", () => {
    wrap({ response: { status: 500 } });
    expect(screen.getByText("서버 오류")).toBeInTheDocument();
    expect(screen.getByText("서버에 일시적인 문제가 발생했습니다.")).toBeInTheDocument();
  });

  it("shows 서버 오류 for status 503", () => {
    wrap({ response: { status: 503 } });
    expect(screen.getByText("서버 오류")).toBeInTheDocument();
  });

  it("shows 연결 오류 for unknown error shape", () => {
    wrap(new Error("Network Error"));
    expect(screen.getByText("연결 오류")).toBeInTheDocument();
    expect(screen.getByText("네트워크 연결을 확인해 주세요.")).toBeInTheDocument();
  });

  it("renders 돌아가기 button", () => {
    wrap({ response: { status: 403 } });
    expect(screen.getByRole("button", { name: "돌아가기" })).toBeInTheDocument();
  });

  it("renders children when no error", () => {
    render(
      <MemoryRouter>
        <QueryErrorBoundary variant="page">
          <div>정상 콘텐츠</div>
        </QueryErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText("정상 콘텐츠")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && pnpm test -- --reporter=verbose QueryErrorBoundary
```

Expected: FAIL — `QueryErrorBoundary` module not found.

- [ ] **Step 3: Create CSS file**

Create `apps/web/src/shared/components/query-error-boundary.css.ts`:

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../design-system/tokens.css";

const base = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space["3"],
  padding: vars.space["6"],
});

export const pageFallback = style([base, {
  height: "100vh",
}]);

export const inlineFallback = style([base, {
  flex: 1,
  minHeight: 0,
}]);

export const icon = style({
  fontSize: "40px",
  lineHeight: 1,
});

export const title = style({
  fontSize: "18px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  textAlign: "center",
});

export const desc = style({
  fontSize: "13px",
  color: vars.color.textSecondary,
  textAlign: "center",
  maxWidth: "320px",
});

export const backBtn = style({
  marginTop: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.textPrimary,
  fontSize: "13px",
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});
```

- [ ] **Step 4: Create component file**

Create `apps/web/src/shared/components/QueryErrorBoundary.tsx`:

```typescript
import { Component, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import * as css from "./query-error-boundary.css";

type ErrorStatus = 403 | 404 | "5xx" | "network";

const getErrorStatus = (error: unknown): ErrorStatus => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) return 403;
  if (status === 404) return 404;
  if (status !== undefined && status >= 500) return "5xx";
  return "network";
};

const ERROR_CONTENT: Record<ErrorStatus, { icon: string; title: string; desc: string }> = {
  403: { icon: "🔒", title: "접근 권한이 없습니다", desc: "접근 권한이 없는 다이어그램입니다." },
  404: { icon: "🔍", title: "존재하지 않습니다", desc: "존재하지 않거나 삭제된 다이어그램입니다." },
  "5xx": { icon: "⚠️", title: "서버 오류", desc: "서버에 일시적인 문제가 발생했습니다." },
  network: { icon: "📡", title: "연결 오류", desc: "네트워크 연결을 확인해 주세요." },
};

const ErrorFallback = ({ error, variant }: { error: unknown; variant: "page" | "inline" }) => {
  const navigate = useNavigate();
  const status = getErrorStatus(error);
  const { icon, title, desc } = ERROR_CONTENT[status];
  return (
    <div className={variant === "page" ? css.pageFallback : css.inlineFallback}>
      <div className={css.icon}>{icon}</div>
      <div className={css.title}>{title}</div>
      <div className={css.desc}>{desc}</div>
      <button className={css.backBtn} onClick={() => navigate(-1)}>돌아가기</button>
    </div>
  );
};

type Props = { children: ReactNode; variant: "page" | "inline" };
type State = { error: unknown };

export class QueryErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  render() {
    if (this.state.error !== null) {
      return <ErrorFallback error={this.state.error} variant={this.props.variant} />;
    }
    return this.props.children;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/web && pnpm test -- --reporter=verbose QueryErrorBoundary
```

Expected: PASS — 8 tests passing.

- [ ] **Step 6: Run full test suite**

```bash
cd apps/web && pnpm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/shared/components/QueryErrorBoundary.tsx \
        apps/web/src/shared/components/query-error-boundary.css.ts \
        apps/web/src/shared/components/QueryErrorBoundary.test.tsx
git commit -m "feat(web): add QueryErrorBoundary component with page/inline variants"
```

---

## Task 4: `NotFoundPage`

**Files:**
- Create: `apps/web/src/features/error/pages/NotFoundPage.tsx`
- Create: `apps/web/src/features/error/pages/not-found-page.css.ts`
- Create: `apps/web/src/features/error/pages/NotFoundPage.test.tsx`

Context: `apps/web/src/features/error/` directory does not exist yet — create it. This page is rendered by a `path="*"` catch-all route in `Router.tsx` (Task 5). It is a simple full-screen message with a home button; no Error Boundary needed since it's a route component, not a thrown error.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/features/error/pages/NotFoundPage.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  it("renders 페이지를 찾을 수 없습니다", () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByText("페이지를 찾을 수 없습니다")).toBeInTheDocument();
  });

  it("renders 홈으로 이동 button", () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "홈으로 이동" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && pnpm test -- --reporter=verbose NotFoundPage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create CSS file**

Create `apps/web/src/features/error/pages/not-found-page.css.ts`:

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const root = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  gap: vars.space["3"],
});

export const icon = style({
  fontSize: "48px",
  lineHeight: 1,
});

export const title = style({
  fontSize: "20px",
  fontWeight: "700",
  color: vars.color.textPrimary,
});

export const desc = style({
  fontSize: "14px",
  color: vars.color.textSecondary,
  textAlign: "center",
});

export const homeBtn = style({
  marginTop: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.textPrimary,
  fontSize: "13px",
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});
```

- [ ] **Step 4: Create page component**

Create `apps/web/src/features/error/pages/NotFoundPage.tsx`:

```typescript
import { useNavigate } from "react-router-dom";
import * as css from "./not-found-page.css";

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className={css.root}>
      <div className={css.icon}>🔍</div>
      <div className={css.title}>페이지를 찾을 수 없습니다</div>
      <div className={css.desc}>요청하신 페이지가 없거나 이동되었습니다.</div>
      <button className={css.homeBtn} onClick={() => navigate("/")}>홈으로 이동</button>
    </div>
  );
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/web && pnpm test -- --reporter=verbose NotFoundPage
```

Expected: PASS — 2 tests passing.

- [ ] **Step 6: Run full test suite**

```bash
cd apps/web && pnpm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/error/
git commit -m "feat(web): add NotFoundPage for unmatched routes"
```

---

## Task 5: Wire up Router, DashboardPage, SharedDiagramPage

**Files:**
- Modify: `apps/web/src/app/Router.tsx`
- Modify: `apps/web/src/features/dashboard/pages/DashboardPage.tsx`
- Modify: `apps/web/src/features/shared-diagram/pages/SharedDiagramPage.tsx`
- Modify: `apps/web/src/features/shared-diagram/pages/SharedDiagramPage.test.tsx`
- Modify: `apps/web/src/features/shared-diagram/pages/shared-diagram-page.css.ts`

Context: Now that `QueryErrorBoundary` (Task 3) and `NotFoundPage` (Task 4) exist, we wire them into the app. `SharedDiagramPage` currently has its own `isError` branch that becomes dead code once the Error Boundary catches thrown errors — remove it to avoid two error UIs.

- [ ] **Step 1: Update `Router.tsx`**

Replace `apps/web/src/app/Router.tsx` with:

```typescript
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { QueryErrorBoundary } from "../shared/components/QueryErrorBoundary";

const LoginPage = lazy(() => import("../features/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("../features/auth/pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const EditorPage = lazy(() => import("../features/editor/pages/EditorPage").then(m => ({ default: m.EditorPage })));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const DiagramGrid = lazy(() => import("../features/dashboard/components/DiagramGrid").then(m => ({ default: m.DiagramGrid })));
const MemberManagementPage = lazy(() => import("../features/dashboard/pages/MemberManagementPage").then(m => ({ default: m.MemberManagementPage })));
const ApiKeysPanel = lazy(() => import("../features/dashboard/pages/ApiKeysPanel").then(m => ({ default: m.ApiKeysPanel })));
const RootRedirect = lazy(() => import("../features/dashboard/pages/RootRedirect").then(m => ({ default: m.RootRedirect })));
const SharedDiagramPage = lazy(() => import("../features/shared-diagram/pages/SharedDiagramPage").then(m => ({ default: m.SharedDiagramPage })));
const NotFoundPage = lazy(() => import("../features/error/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

export const Router = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/share/:shareToken"
        element={
          <QueryErrorBoundary variant="page">
            <SharedDiagramPage />
          </QueryErrorBoundary>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route
          path="/diagrams/:diagramId"
          element={
            <QueryErrorBoundary variant="page">
              <EditorPage />
            </QueryErrorBoundary>
          }
        />
        <Route path="/" element={<RootRedirect />} />
        <Route path="/:orgId" element={<DashboardPage />}>
          <Route index element={<DiagramGrid />} />
          <Route path="members" element={<MemberManagementPage />} />
          <Route path="api-keys" element={<ApiKeysPanel />} />
          <Route path=":projectId" element={<DiagramGrid />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);
```

- [ ] **Step 2: Update `DashboardPage.tsx` — wrap `<Outlet>` with inline boundary**

In `DashboardPage.tsx`, add the import at the top of the imports block:

```typescript
import { QueryErrorBoundary } from "../../../shared/components/QueryErrorBoundary";
```

Then find the `<Outlet context={outletCtx} />` line and replace it with:

```typescript
<QueryErrorBoundary variant="inline">
  <Outlet context={outletCtx} />
</QueryErrorBoundary>
```

- [ ] **Step 3: Update `SharedDiagramPage.tsx` — remove dead `isError` branch**

Replace `apps/web/src/features/shared-diagram/pages/SharedDiagramPage.tsx` with:

```typescript
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicDiagram } from "../../../shared/api/diagrams.api";
import { useEditorStore } from "../../editor/stores/useEditorStore";
import { EditorCanvas } from "../../editor/components/EditorCanvas";
import { Skeleton } from "../../../design-system/Skeleton";
import * as css from "./shared-diagram-page.css";

export const SharedDiagramPage = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { setDocument, setCanEdit } = useEditorStore();

  const { data, isLoading } = useQuery({
    queryKey: ["public-diagram", shareToken],
    queryFn: () => getPublicDiagram(shareToken!),
    enabled: !!shareToken,
  });

  useEffect(() => {
    if (data) {
      setDocument(data.content);
      setCanEdit(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  if (isLoading) {
    return (
      <div className={css.root}>
        <div className={css.topbar}>
          <Skeleton width={160} height={14} />
          <Skeleton width={60} height={20} />
        </div>
        <div className={css.content}>
          <Skeleton style={{ flex: 1, borderRadius: 0 }} />
        </div>
      </div>
    );
  }

  return (
    <div className={css.root}>
      <div className={css.topbar}>
        <span className={css.diagramName}>{data?.name}</span>
        <span className={css.readOnlyBadge}>읽기 전용</span>
      </div>
      <div className={css.content}>
        <EditorCanvas />
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Update `shared-diagram-page.css.ts` — remove unused classes**

Remove the `errorPage` and `errorTitle` exports from `apps/web/src/features/shared-diagram/pages/shared-diagram-page.css.ts`:

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const root = style({
  display: "flex",
  flexDirection: "column",
  height: "100vh",
});

export const topbar = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  background: vars.color.surface,
});

export const diagramName = style({
  fontWeight: "600",
  fontSize: "14px",
  color: vars.color.textPrimary,
});

export const readOnlyBadge = style({
  fontSize: "11px",
  fontWeight: "500",
  color: vars.color.textSecondary,
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.pill,
  padding: `2px 8px`,
});

export const content = style({
  flex: 1,
  display: "flex",
  overflow: "hidden",
});
```

- [ ] **Step 5: Update `SharedDiagramPage.test.tsx` — remove error tests, update CSS mock**

Replace `apps/web/src/features/shared-diagram/pages/SharedDiagramPage.test.tsx` with:

```typescript
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SharedDiagramPage } from "./SharedDiagramPage";
import { getPublicDiagram } from "../../../shared/api/diagrams.api";
import { useEditorStore } from "../../editor/stores/useEditorStore";

vi.mock("../../../shared/api/diagrams.api", () => ({
  getPublicDiagram: vi.fn(),
}));

vi.mock("../../editor/stores/useEditorStore");

vi.mock("../../editor/components/EditorCanvas", () => ({
  EditorCanvas: () => React.createElement("div", { "data-testid": "editor-canvas" }),
}));

vi.mock("../../../design-system/Skeleton", () => ({
  Skeleton: () => React.createElement("div", { "data-testid": "skeleton" }),
}));

vi.mock("./shared-diagram-page.css", () => ({
  root: "",
  topbar: "",
  content: "",
  diagramName: "",
  readOnlyBadge: "",
}));

const mockSetDocument = vi.fn();
const mockSetCanEdit = vi.fn();

vi.mocked(useEditorStore).mockReturnValue({
  setDocument: mockSetDocument,
  setCanEdit: mockSetCanEdit,
} as any);

const createQc = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (shareToken: string, qc = createQc()) =>
  render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/share/${shareToken}`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/share/:shareToken",
            element: React.createElement(SharedDiagramPage),
          })
        )
      )
    )
  );

describe("SharedDiagramPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEditorStore).mockReturnValue({
      setDocument: mockSetDocument,
      setCanEdit: mockSetCanEdit,
    } as any);
  });

  it("loading state — skeleton elements visible", () => {
    vi.mocked(getPublicDiagram).mockReturnValue(new Promise(() => {}));
    wrap("tok123");
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("success — setDocument and setCanEdit(false) called, diagram name, badge, and canvas shown", async () => {
    const content = {
      format: "erdify.schema.v1",
      entities: [],
      relationships: [],
    };
    vi.mocked(getPublicDiagram).mockResolvedValue({
      id: "d-1",
      name: "My ERD",
      content,
    } as any);
    wrap("tok123");
    await waitFor(() =>
      expect(screen.getByText("My ERD")).toBeInTheDocument()
    );
    expect(mockSetDocument).toHaveBeenCalledWith(content);
    expect(mockSetCanEdit).toHaveBeenCalledWith(false);
    expect(screen.getByText("읽기 전용")).toBeInTheDocument();
    expect(screen.getByTestId("editor-canvas")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run full test suite**

```bash
cd apps/web && pnpm test
```

Expected: all tests pass. The two removed error tests (403/404) are now covered by `QueryErrorBoundary.test.tsx`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/Router.tsx \
        apps/web/src/features/dashboard/pages/DashboardPage.tsx \
        apps/web/src/features/shared-diagram/pages/SharedDiagramPage.tsx \
        apps/web/src/features/shared-diagram/pages/SharedDiagramPage.test.tsx \
        apps/web/src/features/shared-diagram/pages/shared-diagram-page.css.ts
git commit -m "feat(web): wire QueryErrorBoundary into router, dashboard, shared-diagram"
```

---

## Task 6: `LoginPage` — session expiry banner

**Files:**
- Modify: `apps/web/src/features/auth/pages/LoginPage.tsx`
- Modify: `apps/web/src/features/auth/pages/auth-page.css.ts`
- Modify: `apps/web/src/features/auth/pages/LoginPage.test.tsx`

Context: When the Axios interceptor fires on 401, it navigates to `/login?reason=expired`. The `LoginPage` reads that param and shows a dismissible-looking info banner. The existing tests use `<MemoryRouter>` without explicit routes — we update the helper to accept an optional `initialPath` so tests for the banner can simulate the `?reason=expired` URL.

- [ ] **Step 1: Add the failing tests**

Open `apps/web/src/features/auth/pages/LoginPage.test.tsx` and:

1. Update `renderLoginPage` to accept an optional path:

```typescript
function renderLoginPage(initialPath = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LoginPage />
    </MemoryRouter>
  );
}
```

2. Add two new tests at the bottom of the `describe` block:

```typescript
it("shows session expiry banner when reason=expired", () => {
  renderLoginPage("/login?reason=expired");
  expect(
    screen.getByText("세션이 만료되었습니다. 다시 로그인해 주세요.")
  ).toBeInTheDocument();
});

it("does not show session expiry banner without reason param", () => {
  renderLoginPage();
  expect(
    screen.queryByText("세션이 만료되었습니다. 다시 로그인해 주세요.")
  ).not.toBeInTheDocument();
});
```

The full updated test file should look like:

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import * as authApi from "../../../shared/api/auth.api";

vi.mock("../../../shared/api/auth.api");
vi.mock("../../../shared/stores/useAuthStore", () => ({
  useAuthStore: (selector: (s: { token: null; setToken: ReturnType<typeof vi.fn>; clearToken: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ token: null, setToken: vi.fn(), clearToken: vi.fn() })
}));

function renderLoginPage(initialPath = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LoginPage />
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  it("renders login form", () => {
    renderLoginPage();
    expect(screen.getByRole("form", { name: "로그인" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("이메일")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("비밀번호")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  });

  it("shows error when login fails", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error("Unauthorized"));
    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "bad@example.com" }
    });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "wrongpass" }
    });
    fireEvent.submit(screen.getByRole("form", { name: "로그인" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "이메일 또는 비밀번호가 올바르지 않습니다."
      );
    });
  });

  it("shows session expiry banner when reason=expired", () => {
    renderLoginPage("/login?reason=expired");
    expect(
      screen.getByText("세션이 만료되었습니다. 다시 로그인해 주세요.")
    ).toBeInTheDocument();
  });

  it("does not show session expiry banner without reason param", () => {
    renderLoginPage();
    expect(
      screen.queryByText("세션이 만료되었습니다. 다시 로그인해 주세요.")
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify the new tests fail**

```bash
cd apps/web && pnpm test -- --reporter=verbose LoginPage
```

Expected: the 2 new banner tests FAIL (feature not implemented yet); existing 2 tests pass.

- [ ] **Step 3: Add `sessionBanner` to `auth-page.css.ts`**

Append to `apps/web/src/features/auth/pages/auth-page.css.ts`:

```typescript
export const sessionBanner = style({
  width: "100%",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.md,
  background: "#fef3c7",
  border: "1px solid #f59e0b",
  color: "#92400e",
  fontSize: "13px",
  textAlign: "center",
  marginBottom: vars.space["2"],
});
```

- [ ] **Step 4: Update `LoginPage.tsx` to show banner**

In `apps/web/src/features/auth/pages/LoginPage.tsx`:

1. Add `useSearchParams` to the react-router-dom import and `sessionBanner` to the CSS import:

```typescript
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login } from "../../../shared/api/auth.api";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import { Button, Input } from "../../../design-system";
import {
  page, card, brand, brandLogo, tagline, form, authLink, authLinkAnchor, sessionBanner,
} from "./auth-page.css";
```

2. Inside the component, after the `navigate` declaration, add:

```typescript
const [searchParams] = useSearchParams();
const isSessionExpired = searchParams.get("reason") === "expired";
```

3. Inside the `<div className={card}>`, add the banner just before `<div className={tagline}>`:

```typescript
{isSessionExpired && (
  <div className={sessionBanner}>
    세션이 만료되었습니다. 다시 로그인해 주세요.
  </div>
)}
```

The complete updated `LoginPage.tsx`:

```typescript
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login } from "../../../shared/api/auth.api";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import { Button, Input } from "../../../design-system";
import {
  page, card, brand, brandLogo, tagline, form, authLink, authLinkAnchor, sessionBanner,
} from "./auth-page.css";

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSessionExpired = searchParams.get("reason") === "expired";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      setAuthenticated(true);
      navigate("/");
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={page}>
      <div className={card}>
        <div className={brand}>
          <img src="/logo.svg" alt="ERDify" className={brandLogo} />
        </div>
        {isSessionExpired && (
          <div className={sessionBanner}>
            세션이 만료되었습니다. 다시 로그인해 주세요.
          </div>
        )}
        <div className={tagline}>AI와 함께, 팀과 함께 스키마를 관리하세요</div>
        <form className={form} onSubmit={handleSubmit} aria-label="로그인">
          <Input
            label="이메일"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="비밀번호"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            {...(error ? { error } : {})}
            required
            minLength={8}
          />
          <Button variant="primary" size="lg" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
        <div className={authLink}>
          계정이 없으신가요?{" "}
          <Link to="/register" className={authLinkAnchor}>회원가입</Link>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/web && pnpm test -- --reporter=verbose LoginPage
```

Expected: PASS — 4 tests passing.

- [ ] **Step 6: Run full test suite**

```bash
cd apps/web && pnpm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/auth/pages/LoginPage.tsx \
        apps/web/src/features/auth/pages/auth-page.css.ts \
        apps/web/src/features/auth/pages/LoginPage.test.tsx
git commit -m "feat(web): add session expiry banner to LoginPage"
```
