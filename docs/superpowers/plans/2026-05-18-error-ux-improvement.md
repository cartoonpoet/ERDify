# Error Handling UX Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken "돌아가기" button on error pages and make DiagramGrid errors show inline in the grid section only (keeping project header/filters visible).

**Architecture:** Extract shared error content to `queryErrorContent.ts`, refactor `QueryErrorBoundary` with `useQueryErrorResetBoundary` + `backLabel`/`backPath` props + per-variant actions, then update `DiagramGrid` to handle its own query error with `throwOnError: false` and an inline error section.

**Tech Stack:** React, TanStack Query v5 (`useQueryErrorResetBoundary`), vanilla-extract CSS, Vitest + Testing Library

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/web/src/shared/utils/queryErrorContent.ts` | Create | Shared error content map with `retryable` + `guide` fields; `getErrorStatus` helper |
| `apps/web/src/shared/components/QueryErrorBoundary.tsx` | Modify | Add `backLabel`/`backPath` props, `useQueryErrorResetBoundary` wrapper, retryable action split |
| `apps/web/src/shared/components/query-error-boundary.css.ts` | Modify | Rename `backBtn` → `actionBtn`, add `guide` text style |
| `apps/web/src/features/dashboard/components/DiagramGrid.tsx` | Modify | `throwOnError: false` on diagrams query; inline error UI; disabled filter row on error |
| `apps/web/src/features/dashboard/components/DiagramGrid.css.ts` | Modify | Add `filterRowDisabled` style |
| `apps/web/src/router/index.tsx` | Modify | Add `backLabel` to EditorPage and SharedDiagramPage boundaries |
| `apps/web/src/shared/components/QueryErrorBoundary.test.tsx` | Modify | Update tests for new button text/variants |
| `apps/web/src/features/dashboard/components/DiagramGrid.test.tsx` | Modify | Add `isError` inline UI tests |

---

### Task 1: Extract queryErrorContent utility

**Files:**
- Create: `apps/web/src/shared/utils/queryErrorContent.ts`
- Test: `apps/web/src/shared/utils/queryErrorContent.test.ts`

- [ ] **Write the failing tests**

```ts
// apps/web/src/shared/utils/queryErrorContent.test.ts
import { getErrorStatus, ERROR_CONTENT } from "./queryErrorContent";

describe("getErrorStatus", () => {
  it("returns 403 for status 403", () => {
    expect(getErrorStatus({ response: { status: 403 } })).toBe(403);
  });
  it("returns 404 for status 404", () => {
    expect(getErrorStatus({ response: { status: 404 } })).toBe(404);
  });
  it("returns '5xx' for status 500", () => {
    expect(getErrorStatus({ response: { status: 500 } })).toBe("5xx");
  });
  it("returns '5xx' for status 503", () => {
    expect(getErrorStatus({ response: { status: 503 } })).toBe("5xx");
  });
  it("returns 'network' for unknown error shape", () => {
    expect(getErrorStatus(new Error("Network Error"))).toBe("network");
  });
});

describe("ERROR_CONTENT", () => {
  it("403 is not retryable", () => {
    expect(ERROR_CONTENT[403].retryable).toBe(false);
  });
  it("404 is not retryable", () => {
    expect(ERROR_CONTENT[404].retryable).toBe(false);
  });
  it("5xx is retryable", () => {
    expect(ERROR_CONTENT["5xx"].retryable).toBe(true);
  });
  it("network is retryable", () => {
    expect(ERROR_CONTENT["network"].retryable).toBe(true);
  });
  it("all entries have guide text", () => {
    for (const key of [403, 404, "5xx", "network"] as const) {
      expect(ERROR_CONTENT[key].guide.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Run tests to confirm they fail**

```bash
cd apps/web && pnpm test --reporter=verbose 2>&1 | grep -A3 "queryErrorContent"
```
Expected: FAIL — module not found

- [ ] **Create the utility**

```ts
// apps/web/src/shared/utils/queryErrorContent.ts
export type ErrorStatus = 403 | 404 | "5xx" | "network";

export const getErrorStatus = (error: unknown): ErrorStatus => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) return 403;
  if (status === 404) return 404;
  if (status !== undefined && status >= 500) return "5xx";
  return "network";
};

export interface ErrorContent {
  icon: string;
  title: string;
  desc: string;
  retryable: boolean;
  guide: string;
}

export const ERROR_CONTENT: Record<ErrorStatus, ErrorContent> = {
  403: {
    icon: "🔒",
    title: "접근 권한이 없습니다",
    desc: "이 프로젝트를 볼 수 있는 권한이 없습니다. 관리자에게 문의하세요.",
    retryable: false,
    guide: "사이드바에서 다른 프로젝트를 선택하거나 관리자에게 문의하세요",
  },
  404: {
    icon: "🔍",
    title: "ERD 목록을 찾을 수 없습니다",
    desc: "이 프로젝트의 ERD 목록을 찾을 수 없습니다.",
    retryable: false,
    guide: "사이드바에서 다른 프로젝트를 선택해 주세요",
  },
  "5xx": {
    icon: "⚠️",
    title: "서버 오류",
    desc: "서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    retryable: true,
    guide: "문제가 지속되면 페이지를 새로고침해 주세요",
  },
  network: {
    icon: "📡",
    title: "연결 오류",
    desc: "인터넷 연결을 확인한 후 다시 시도해 주세요.",
    retryable: true,
    guide: "인터넷 연결을 확인해 주세요",
  },
};
```

- [ ] **Run tests to confirm they pass**

```bash
cd apps/web && pnpm test --reporter=verbose 2>&1 | grep -A3 "queryErrorContent"
```
Expected: PASS — 9 tests

- [ ] **Commit**

```bash
git add apps/web/src/shared/utils/queryErrorContent.ts apps/web/src/shared/utils/queryErrorContent.test.ts
git commit -m "feat(web): extract queryErrorContent utility with retryable + guide fields"
```

---

### Task 2: Update QueryErrorBoundary

**Files:**
- Modify: `apps/web/src/shared/components/QueryErrorBoundary.tsx`
- Modify: `apps/web/src/shared/components/query-error-boundary.css.ts`
- Modify: `apps/web/src/shared/components/QueryErrorBoundary.test.tsx`

- [ ] **Update the CSS file**

Replace the contents of `apps/web/src/shared/components/query-error-boundary.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

const base = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space["3"],
  padding: vars.space["6"],
});

export const pageFallback = style([base, { height: "100vh" }]);

export const inlineFallback = style([base, { width: "100%", height: "100%" }]);

export const icon = style({ fontSize: "40px", lineHeight: 1 });

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

export const actionBtn = style({
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

export const guide = style({
  fontSize: "12px",
  color: vars.color.textSecondary,
  textAlign: "center",
  maxWidth: "280px",
  marginTop: vars.space["1"],
});
```

- [ ] **Write the failing tests**

Replace the contents of `apps/web/src/shared/components/QueryErrorBoundary.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryErrorBoundary } from "./QueryErrorBoundary";

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
afterAll(() => { consoleError.mockRestore(); });

const Throw = ({ error }: { error: unknown }) => { throw error; };

const wrap = (
  error: unknown,
  variant: "page" | "inline" = "page",
  props: { backLabel?: string; backPath?: string } = {},
) => {
  const qc = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <QueryErrorBoundary variant={variant} {...props}>
          <Throw error={error} />
        </QueryErrorBoundary>
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

describe("QueryErrorBoundary — error messages", () => {
  it("shows 접근 권한이 없습니다 for 403", () => {
    wrap({ response: { status: 403 } });
    expect(screen.getByText("접근 권한이 없습니다")).toBeInTheDocument();
  });
  it("shows ERD 목록을 찾을 수 없습니다 for 404", () => {
    wrap({ response: { status: 404 } });
    expect(screen.getByText("ERD 목록을 찾을 수 없습니다")).toBeInTheDocument();
  });
  it("shows 서버 오류 for 500", () => {
    wrap({ response: { status: 500 } });
    expect(screen.getByText("서버 오류")).toBeInTheDocument();
  });
  it("shows 서버 오류 for 503", () => {
    wrap({ response: { status: 503 } });
    expect(screen.getByText("서버 오류")).toBeInTheDocument();
  });
  it("shows 연결 오류 for unknown error", () => {
    wrap(new Error("Network Error"));
    expect(screen.getByText("연결 오류")).toBeInTheDocument();
  });
});

describe("QueryErrorBoundary — page variant", () => {
  it("renders default backLabel '홈으로 이동'", () => {
    wrap({ response: { status: 500 } }, "page");
    expect(screen.getByRole("button", { name: "홈으로 이동" })).toBeInTheDocument();
  });
  it("renders custom backLabel", () => {
    wrap({ response: { status: 500 } }, "page", { backLabel: "대시보드로 이동" });
    expect(screen.getByRole("button", { name: "대시보드로 이동" })).toBeInTheDocument();
  });
  it("does not render guide text in page variant", () => {
    wrap({ response: { status: 500 } }, "page");
    expect(screen.queryByText(/문제가 지속/)).not.toBeInTheDocument();
  });
});

describe("QueryErrorBoundary — inline variant", () => {
  it("renders 다시 시도 button for retryable errors (5xx)", () => {
    wrap({ response: { status: 500 } }, "inline");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });
  it("renders 다시 시도 button for network errors", () => {
    wrap(new Error("Network"), "inline");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });
  it("does NOT render retry button for 403", () => {
    wrap({ response: { status: 403 } }, "inline");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("does NOT render retry button for 404", () => {
    wrap({ response: { status: 404 } }, "inline");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("renders guide text for inline variant", () => {
    wrap({ response: { status: 500 } }, "inline");
    expect(screen.getByText("문제가 지속되면 페이지를 새로고침해 주세요")).toBeInTheDocument();
  });
  it("renders 403 guide text without retry button", () => {
    wrap({ response: { status: 403 } }, "inline");
    expect(screen.getByText(/사이드바에서 다른 프로젝트/)).toBeInTheDocument();
  });
});

describe("QueryErrorBoundary — renders children when no error", () => {
  it("renders children", () => {
    const qc = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <QueryErrorBoundary variant="page">
            <div>정상 콘텐츠</div>
          </QueryErrorBoundary>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("정상 콘텐츠")).toBeInTheDocument();
  });
});
```

- [ ] **Run tests to confirm they fail**

```bash
cd apps/web && pnpm test --reporter=verbose 2>&1 | grep -E "(FAIL|PASS|✓|✗)" | head -30
```
Expected: most tests FAIL — old component doesn't match new expectations

- [ ] **Replace QueryErrorBoundary.tsx**

```tsx
// apps/web/src/shared/components/QueryErrorBoundary.tsx
import { Component, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { getErrorStatus, ERROR_CONTENT } from "@/shared/utils/queryErrorContent";
import * as css from "./query-error-boundary.css";

type FallbackProps = {
  error: unknown;
  variant: "page" | "inline";
  backLabel: string;
  backPath: string;
  onRetry: () => void;
};

const ErrorFallback = ({ error, variant, backLabel, backPath, onRetry }: FallbackProps) => {
  const navigate = useNavigate();
  const status = getErrorStatus(error);
  const { icon, title, desc, retryable, guide } = ERROR_CONTENT[status];

  return (
    <div className={variant === "page" ? css.pageFallback : css.inlineFallback}>
      <div className={css.icon}>{icon}</div>
      <div className={css.title}>{title}</div>
      <div className={css.desc}>{desc}</div>
      {variant === "page" ? (
        <button type="button" className={css.actionBtn} onClick={() => navigate(backPath)}>
          {backLabel}
        </button>
      ) : (
        <>
          {retryable && (
            <button type="button" className={css.actionBtn} onClick={onRetry}>
              다시 시도
            </button>
          )}
          <div className={css.guide}>{guide}</div>
        </>
      )}
    </div>
  );
};

type ClassProps = {
  children: ReactNode;
  variant: "page" | "inline";
  backLabel: string;
  backPath: string;
  onReset: () => void;
};
type State = { hasError: boolean; error: unknown };

class QueryErrorBoundaryClass extends Component<ClassProps, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const handleRetry = () => {
        this.props.onReset();
        this.setState({ hasError: false, error: null });
      };
      return (
        <ErrorFallback
          error={this.state.error}
          variant={this.props.variant}
          backLabel={this.props.backLabel}
          backPath={this.props.backPath}
          onRetry={handleRetry}
        />
      );
    }
    return this.props.children;
  }
}

type PublicProps = {
  children: ReactNode;
  variant: "page" | "inline";
  backLabel?: string;
  backPath?: string;
};

export const QueryErrorBoundary = ({ children, variant, backLabel, backPath }: PublicProps) => {
  const { reset } = useQueryErrorResetBoundary();
  return (
    <QueryErrorBoundaryClass
      variant={variant}
      backLabel={backLabel ?? "홈으로 이동"}
      backPath={backPath ?? "/"}
      onReset={reset}
    >
      {children}
    </QueryErrorBoundaryClass>
  );
};
```

- [ ] **Run tests to confirm they pass**

```bash
cd apps/web && pnpm test --reporter=verbose 2>&1 | grep -E "QueryErrorBoundary"
```
Expected: all QueryErrorBoundary tests PASS

- [ ] **Commit**

```bash
git add apps/web/src/shared/components/QueryErrorBoundary.tsx \
        apps/web/src/shared/components/query-error-boundary.css.ts \
        apps/web/src/shared/components/QueryErrorBoundary.test.tsx
git commit -m "feat(web): refactor QueryErrorBoundary — backLabel/backPath props, retryable split, query reset"
```

---

### Task 3: Update DiagramGrid inline error

**Files:**
- Modify: `apps/web/src/features/dashboard/components/DiagramGrid.tsx`
- Modify: `apps/web/src/features/dashboard/components/DiagramGrid.css.ts`
- Modify: `apps/web/src/features/dashboard/components/DiagramGrid.test.tsx`

- [ ] **Add filterRowDisabled to DiagramGrid.css.ts**

Add at the end of `apps/web/src/features/dashboard/components/DiagramGrid.css.ts`:

```ts
export const filterRowDisabled = style({
  opacity: 0.4,
  pointerEvents: "none",
});

export const sectionError = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space["3"],
  padding: `${vars.space["10"]} ${vars.space["6"]}`,
  flex: 1,
});

export const sectionErrorIcon = style({ fontSize: "32px", lineHeight: 1 });

export const sectionErrorTitle = style({
  fontSize: "15px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  textAlign: "center",
});

export const sectionErrorDesc = style({
  fontSize: "12px",
  color: vars.color.textSecondary,
  textAlign: "center",
  maxWidth: "280px",
});

export const sectionErrorBtn = style({
  marginTop: vars.space["1"],
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

export const sectionErrorGuide = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  textAlign: "center",
  maxWidth: "260px",
  marginTop: vars.space["1"],
});
```

- [ ] **Write the failing tests**

Add the following to the end of the `describe("DiagramGrid")` block in `apps/web/src/features/dashboard/components/DiagramGrid.test.tsx`:

```tsx
  describe("에러 상태", () => {
    it("diagrams 쿼리 실패 시 에러 UI를 렌더링한다", async () => {
      vi.mocked(listDiagrams).mockRejectedValue({ response: { status: 500 } });
      wrap();
      expect(await screen.findByText("서버 오류")).toBeInTheDocument();
    });

    it("5xx 에러 시 '다시 시도' 버튼을 렌더링한다", async () => {
      vi.mocked(listDiagrams).mockRejectedValue({ response: { status: 500 } });
      wrap();
      expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    });

    it("403 에러 시 '다시 시도' 버튼을 렌더링하지 않는다", async () => {
      vi.mocked(listDiagrams).mockRejectedValue({ response: { status: 403 } });
      wrap();
      expect(await screen.findByText("접근 권한이 없습니다")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
    });

    it("403 에러 시 '가져오기'/'새 ERD' 버튼이 disabled 된다", async () => {
      vi.mocked(listDiagrams).mockRejectedValue({ response: { status: 403 } });
      wrap();
      await screen.findByText("접근 권한이 없습니다");
      const importBtn = screen.queryByRole("button", { name: "가져오기" });
      const newBtn = screen.queryByRole("button", { name: /새 ERD/ });
      if (importBtn) expect(importBtn).toBeDisabled();
      if (newBtn) expect(newBtn).toBeDisabled();
    });

    it("에러 상태에서 프로젝트 이름은 계속 표시된다", async () => {
      vi.mocked(listDiagrams).mockRejectedValue({ response: { status: 500 } });
      wrap();
      await screen.findByText("서버 오류");
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });
  });
```

- [ ] **Run tests to confirm they fail**

```bash
cd apps/web && pnpm test --reporter=verbose 2>&1 | grep -E "에러 상태"
```
Expected: FAIL — DiagramGrid doesn't handle isError yet

- [ ] **Update DiagramGrid.tsx**

Replace the `useQuery` call for diagrams and add error handling. Find this section:

```tsx
  const { data: diagrams = [], isLoading } = useQuery({
    queryKey: ["diagrams", projectId],
    queryFn: () => listDiagrams(projectId!),
    enabled: !!projectId,
  });
```

Replace with:

```tsx
  const { data: diagrams = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["diagrams", projectId],
    queryFn: () => listDiagrams(projectId!),
    enabled: !!projectId,
    throwOnError: false,
  });
```

Add these two new imports to the existing import block in DiagramGrid.tsx:

```tsx
import { getErrorStatus, ERROR_CONTENT } from "@/shared/utils/queryErrorContent";
```

In the existing CSS import from `"./DiagramGrid.css"`, add the new tokens to the existing list:

```tsx
  filterRowDisabled,
  sectionError, sectionErrorIcon, sectionErrorTitle,
  sectionErrorDesc, sectionErrorBtn, sectionErrorGuide,
```

Add after the `const filtered = applyFilter(...)` line:

```tsx
  const errorStatus = isError ? getErrorStatus(error) : null;
  const isPermissionError = errorStatus === 403;
```

Update the filter row JSX — find:

```tsx
      {projectName && (
        <div className={filterRow}>
```

Replace with:

```tsx
      {projectName && (
        <div className={[filterRow, isError ? filterRowDisabled : ""].filter(Boolean).join(" ")}>
```

Update the header buttons to be disabled on 403. Find:

```tsx
        {projectName && (
          <Button variant="secondary" size="md" onClick={onImportDiagram}>
            가져오기
          </Button>
        )}
        {projectName && (
          <Button variant="primary" size="md" onClick={onCreateDiagram}>
            + 새 ERD
          </Button>
        )}
```

Replace with:

```tsx
        {projectName && (
          <Button variant="secondary" size="md" onClick={onImportDiagram} disabled={isPermissionError}>
            가져오기
          </Button>
        )}
        {projectName && (
          <Button variant="primary" size="md" onClick={onCreateDiagram} disabled={isPermissionError}>
            + 새 ERD
          </Button>
        )}
```

Replace the loading/grid section — find:

```tsx
      {isLoading && !!projectId ? (
        <div className={grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={140} />
          ))}
        </div>
      ) : (
        <div className={grid}>
          {filtered.map((diagram) => (
```

Replace with:

```tsx
      {isError ? (
        <div className={sectionError}>
          <div className={sectionErrorIcon}>{ERROR_CONTENT[errorStatus!].icon}</div>
          <div className={sectionErrorTitle}>{ERROR_CONTENT[errorStatus!].title}</div>
          <div className={sectionErrorDesc}>{ERROR_CONTENT[errorStatus!].desc}</div>
          {ERROR_CONTENT[errorStatus!].retryable && (
            <button type="button" className={sectionErrorBtn} onClick={() => refetch()}>
              다시 시도
            </button>
          )}
          <div className={sectionErrorGuide}>{ERROR_CONTENT[errorStatus!].guide}</div>
        </div>
      ) : isLoading && !!projectId ? (
        <div className={grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={140} />
          ))}
        </div>
      ) : (
        <div className={grid}>
          {filtered.map((diagram) => (
```

- [ ] **Run tests to confirm they pass**

```bash
cd apps/web && pnpm test --reporter=verbose 2>&1 | grep -E "(DiagramGrid|에러 상태)"
```
Expected: all DiagramGrid tests PASS

- [ ] **Commit**

```bash
git add apps/web/src/features/dashboard/components/DiagramGrid.tsx \
        apps/web/src/features/dashboard/components/DiagramGrid.css.ts \
        apps/web/src/features/dashboard/components/DiagramGrid.test.tsx
git commit -m "feat(web): DiagramGrid inline error section — section-only error state, disabled filters on error"
```

---

### Task 4: Update Router with context-aware backLabels

**Files:**
- Modify: `apps/web/src/router/index.tsx`

- [ ] **Update Router.tsx**

Find the EditorPage boundary:

```tsx
        <Route
          path="/diagrams/:diagramId"
          element={
            <QueryErrorBoundary variant="page">
              <EditorPage />
            </QueryErrorBoundary>
          }
        />
```

Replace with:

```tsx
        <Route
          path="/diagrams/:diagramId"
          element={
            <QueryErrorBoundary variant="page" backLabel="대시보드로 이동" backPath="/">
              <EditorPage />
            </QueryErrorBoundary>
          }
        />
```

Find the SharedDiagramPage boundary:

```tsx
      <Route
        path="/share/:shareToken"
        element={
          <QueryErrorBoundary variant="page">
            <SharedDiagramPage />
          </QueryErrorBoundary>
        }
      />
```

Replace with:

```tsx
      <Route
        path="/share/:shareToken"
        element={
          <QueryErrorBoundary variant="page" backLabel="홈으로 이동" backPath="/">
            <SharedDiagramPage />
          </QueryErrorBoundary>
        }
      />
```

- [ ] **Run full test suite and typecheck**

```bash
cd apps/web && pnpm typecheck && pnpm test
```
Expected: all tests pass, no type errors

- [ ] **Commit**

```bash
git add apps/web/src/router/index.tsx
git commit -m "feat(web): context-aware back labels on page error boundaries"
```
