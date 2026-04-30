# ERDify UI Design System & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** lawkit 제거, Meta Store 기반 자체 디자인 시스템(vanilla-extract) 구축, Org→Project→Diagram 3단 패널 대시보드 완성, 인증 페이지 리디자인

**Architecture:** vanilla-extract의 `createGlobalTheme`/`recipe`/`styleVariants`/`keyframes`를 역할에 맞게 사용. features 폴더는 `pages/` + `components/` 2-depth 분리. 대시보드는 OrgRail(52px) + ProjectSidebar(220px) + DiagramGrid(flex:1) 3단 레이아웃. 상태는 Zustand(선택), TanStack Query(서버 데이터) 조합.

**Tech Stack:** React 18, vanilla-extract (style/recipe/styleVariants/createGlobalTheme/keyframes/globalStyle), Pretendard Variable (CDN), Zustand, TanStack Query, react-router-dom v6, vitest + @testing-library/react

**코딩 컨벤션:** 모든 함수/컴포넌트는 `const Name = () => {}` 화살표 함수 사용. `function` 키워드 금지.

---

## 파일 맵

### 생성

```
apps/web/
├── index.html                                          수정 (Pretendard CDN 추가)
├── src/
│   ├── design-system/
│   │   ├── tokens.css.ts                              신규 - createGlobalTheme 전역 토큰
│   │   ├── global.css.ts                              신규 - globalStyle body/reset
│   │   ├── Button/
│   │   │   ├── index.tsx                              신규 - recipe() 기반 버튼
│   │   │   ├── button.css.ts                          신규
│   │   │   └── Button.test.tsx                        신규
│   │   ├── Input/
│   │   │   ├── index.tsx                              신규
│   │   │   ├── input.css.ts                           신규
│   │   │   └── Input.test.tsx                         신규
│   │   ├── Card/
│   │   │   ├── index.tsx                              신규
│   │   │   └── card.css.ts                            신규
│   │   ├── Skeleton/
│   │   │   ├── index.tsx                              신규
│   │   │   └── skeleton.css.ts                        신규
│   │   ├── Modal/
│   │   │   ├── index.tsx                              신규
│   │   │   ├── modal.css.ts                           신규
│   │   │   └── Modal.test.tsx                         신규
│   │   └── index.ts                                   신규 - 통합 export
│   ├── shared/api/
│   │   ├── organizations.api.ts                       신규
│   │   ├── organizations.api.test.ts                  신규
│   │   ├── projects.api.ts                            신규
│   │   └── projects.api.test.ts                       신규
│   └── features/
│       ├── auth/
│       │   ├── pages/
│       │   │   ├── LoginPage.tsx                      이동+수정 (lawkit 제거, 새 디자인)
│       │   │   └── RegisterPage.tsx                   이동+수정
│       │   └── components/
│       │       └── (빈 폴더 — 추후 LoginForm 분리 시 사용)
│       ├── dashboard/
│       │   ├── pages/
│       │   │   └── DashboardPage.tsx                  신규
│       │   └── components/
│       │       ├── OrgRail.tsx                        신규
│       │       ├── OrgRail.css.ts                     신규
│       │       ├── OrgRail.test.tsx                   신규
│       │       ├── ProjectSidebar.tsx                 신규
│       │       ├── ProjectSidebar.css.ts              신규
│       │       ├── ProjectSidebar.test.tsx            신규
│       │       ├── DiagramGrid.tsx                    신규
│       │       ├── DiagramGrid.css.ts                 신규
│       │       ├── DiagramGrid.test.tsx               신규
│       │       ├── CreateOrgModal.tsx                 신규
│       │       ├── CreateProjectModal.tsx             신규
│       │       └── CreateDiagramModal.tsx             신규
│       └── editor/
│           ├── pages/
│           │   └── EditorPage.tsx                     이동 (내용 변경 없음)
│           ├── components/
│           │   ├── EditorCanvas.tsx                   이동
│           │   ├── PresenceIndicator.tsx              이동
│           │   └── VersionHistoryDrawer.tsx           이동
│           ├── hooks/                                 경로 유지
│           └── stores/                               경로 유지
```

### 삭제
```
apps/web/src/app/App.tsx
apps/web/src/app/app.css.ts
apps/web/src/features/auth/LoginPage.tsx         (pages/로 이동 후 삭제)
apps/web/src/features/auth/RegisterPage.tsx
apps/web/src/features/editor/EditorPage.tsx
apps/web/src/features/editor/components/EditorCanvas.tsx
apps/web/src/features/editor/components/PresenceIndicator.tsx
apps/web/src/features/editor/components/VersionHistoryDrawer.tsx
```

### 수정
```
apps/web/package.json                            @lawkit/ui 제거
apps/web/src/app/Router.tsx                      import 경로 업데이트
apps/api/src/modules/organization/organization.service.ts   findMyOrganizations 추가
apps/api/src/modules/organization/organization.controller.ts GET / 라우트 추가
```

---

### Task 1: 전역 설정 — Pretendard, 토큰, 리셋

**Files:**
- Modify: `apps/web/index.html`
- Create: `apps/web/src/design-system/tokens.css.ts`
- Create: `apps/web/src/design-system/global.css.ts`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/package.json`

- [ ] **Step 1: @lawkit/ui 의존성 제거**

```bash
cd apps/web
pnpm remove @lawkit/ui
```

- [ ] **Step 2: Pretendard CDN을 index.html에 추가**

`apps/web/index.html` 전체를 아래로 교체:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ERDify</title>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: 디자인 토큰 파일 생성**

`apps/web/src/design-system/tokens.css.ts`:

```ts
import { createGlobalTheme } from "@vanilla-extract/css";

export const vars = createGlobalTheme(":root", {
  color: {
    primary: "#0064E0",
    primaryHover: "#0143B5",
    primaryPressed: "#004BB9",
    surface: "#FFFFFF",
    surfaceSecondary: "#F1F4F7",
    surfaceTertiary: "#F8F9FB",
    textPrimary: "#1C2B33",
    textSecondary: "#5D6C7B",
    textDisabled: "#BCC0C4",
    border: "#DEE3E9",
    borderStrong: "#CBD2D9",
    success: "#31A24C",
    error: "#E41E3F",
    focusRing: "rgba(0, 100, 224, 0.12)",
    selectedBg: "#EEF4FF",
  },
  font: {
    family:
      "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "14px",
    xl: "20px",
    pill: "100px",
    org: "10px",
  },
  shadow: {
    sm: "0 1px 3px rgba(0,0,0,0.08)",
    md: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
    lg: "0 16px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
    xl: "0 24px 64px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)",
  },
  space: {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "7": "32px",
    "8": "40px",
    "9": "48px",
  },
});
```

- [ ] **Step 4: 전역 CSS 리셋 파일 생성**

`apps/web/src/design-system/global.css.ts`:

```ts
import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./tokens.css";

globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
  margin: 0,
  padding: 0,
});

globalStyle("body", {
  fontFamily: vars.font.family,
  color: vars.color.textPrimary,
  background: vars.color.surface,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

globalStyle("a", {
  color: "inherit",
  textDecoration: "none",
});

globalStyle("button", {
  fontFamily: vars.font.family,
});

globalStyle("input, textarea, select", {
  fontFamily: vars.font.family,
});
```

- [ ] **Step 5: global.css.ts를 main.tsx에서 import**

`apps/web/src/main.tsx` 전체를 아래로 교체:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "./app/Router";
import { AppProviders } from "./app/providers/AppProviders";
import "./design-system/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppProviders>
      <Router />
    </AppProviders>
  </React.StrictMode>
);
```

- [ ] **Step 6: 개발 서버 실행하여 빌드 에러 없는지 확인**

```bash
# 루트에서
pnpm dev
```

Expected: 서버 기동, 브라우저에서 흰 화면 (App.tsx에 lawkit import가 아직 있어서 에러 뜰 수 있음 — 다음 태스크에서 해결)

- [ ] **Step 7: Commit**

```bash
git add apps/web/index.html apps/web/src/design-system/tokens.css.ts apps/web/src/design-system/global.css.ts apps/web/src/main.tsx apps/web/package.json
git commit -m "feat(design-system): add Pretendard, global tokens, CSS reset; remove lawkit"
```

---

### Task 2: Button 컴포넌트

**Files:**
- Create: `apps/web/src/design-system/Button/button.css.ts`
- Create: `apps/web/src/design-system/Button/index.tsx`
- Create: `apps/web/src/design-system/Button/Button.test.tsx`

- [ ] **Step 1: 테스트 작성**

`apps/web/src/design-system/Button/Button.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./index";

describe("Button", () => {
  it("children을 렌더링한다", () => {
    render(<Button>저장</Button>);
    expect(screen.getByText("저장")).toBeInTheDocument();
  });

  it("onClick이 호출된다", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>저장</Button>);
    fireEvent.click(screen.getByText("저장"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled 상태에서 onClick이 호출되지 않는다", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>저장</Button>);
    fireEvent.click(screen.getByText("저장"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("type='submit'이 button 엘리먼트에 전달된다", () => {
    render(<Button type="submit">제출</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | grep -E "Button|PASS|FAIL"
```

Expected: `Button.test.tsx` 관련 에러 (모듈 없음)

- [ ] **Step 3: CSS 파일 작성**

`apps/web/src/design-system/Button/button.css.ts`:

```ts
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../tokens.css";

export const buttonRecipe = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: vars.space["2"],
    borderRadius: vars.radius.pill,
    border: "none",
    cursor: "pointer",
    fontFamily: vars.font.family,
    fontWeight: "500",
    letterSpacing: "-0.14px",
    transition: "background 200ms ease, transform 150ms ease, opacity 150ms ease",
    outline: "none",
    textDecoration: "none",
    whiteSpace: "nowrap",
    selectors: {
      "&:focus-visible": {
        boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
        outline: `2px solid ${vars.color.primary}`,
      },
      "&:disabled": {
        cursor: "not-allowed",
        opacity: 0.5,
        pointerEvents: "none",
      },
    },
  },
  variants: {
    variant: {
      primary: {
        background: vars.color.primary,
        color: "#fff",
        selectors: {
          "&:hover:not(:disabled)": { background: vars.color.primaryHover },
          "&:active:not(:disabled)": { background: vars.color.primaryPressed },
        },
      },
      secondary: {
        background: "transparent",
        color: vars.color.textPrimary,
        border: `1.5px solid ${vars.color.border}`,
        selectors: {
          "&:hover:not(:disabled)": { background: vars.color.surfaceSecondary },
        },
      },
      ghost: {
        background: "transparent",
        color: vars.color.primary,
        selectors: {
          "&:hover:not(:disabled)": { background: vars.color.selectedBg },
        },
      },
    },
    size: {
      sm: { padding: "5px 14px", fontSize: "12px" },
      md: { padding: "8px 18px", fontSize: "13px" },
      lg: { padding: "11px 22px", fontSize: "14px" },
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});
```

- [ ] **Step 4: 컴포넌트 구현**

`apps/web/src/design-system/Button/index.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";
import { buttonRecipe } from "./button.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = ({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) => (
  <button
    className={`${buttonRecipe({ variant, size })} ${className ?? ""}`}
    {...props}
  >
    {children}
  </button>
);
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | grep -E "Button|✓|✗|PASS|FAIL"
```

Expected: Button 관련 테스트 4개 모두 통과

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/design-system/Button/
git commit -m "feat(design-system): add Button component with recipe variants"
```

---

### Task 3: Input 컴포넌트

**Files:**
- Create: `apps/web/src/design-system/Input/input.css.ts`
- Create: `apps/web/src/design-system/Input/index.tsx`
- Create: `apps/web/src/design-system/Input/Input.test.tsx`

- [ ] **Step 1: 테스트 작성**

`apps/web/src/design-system/Input/Input.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./index";

describe("Input", () => {
  it("placeholder를 렌더링한다", () => {
    render(<Input placeholder="이메일 입력" />);
    expect(screen.getByPlaceholderText("이메일 입력")).toBeInTheDocument();
  });

  it("error prop이 있으면 에러 메시지를 보여준다", () => {
    render(<Input error="필수 항목입니다" />);
    expect(screen.getByText("필수 항목입니다")).toBeInTheDocument();
  });

  it("onChange가 호출된다", () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("label prop이 있으면 label을 렌더링한다", () => {
    render(<Input label="이메일" id="email" />);
    expect(screen.getByText("이메일")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | grep -E "Input|PASS|FAIL"
```

Expected: Input 관련 에러

- [ ] **Step 3: CSS 파일 작성**

`apps/web/src/design-system/Input/input.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { styleVariants } from "@vanilla-extract/css";
import { vars } from "../tokens.css";

export const wrapper = style({ display: "flex", flexDirection: "column", gap: vars.space["1"] });

export const label = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textPrimary,
});

export const inputBase = style({
  width: "100%",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,  // 8px 12px
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: "14px",
  fontFamily: vars.font.family,
  color: vars.color.textPrimary,
  background: vars.color.surface,
  outline: "none",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
  "::placeholder": { color: vars.color.textDisabled },
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
    },
  },
});

export const inputError = style({
  borderColor: vars.color.error,
  selectors: {
    "&:focus": {
      borderColor: vars.color.error,
      boxShadow: "0 0 0 3px rgba(228, 30, 63, 0.12)",
    },
  },
});

export const errorText = style({
  fontSize: "11px",
  color: vars.color.error,
});
```

- [ ] **Step 4: 컴포넌트 구현**

`apps/web/src/design-system/Input/index.tsx`:

```tsx
import type { InputHTMLAttributes } from "react";
import { wrapper, label as labelStyle, inputBase, inputError, errorText } from "./input.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className, id, ...props }: InputProps) => (
  <div className={wrapper}>
    {label && <label htmlFor={id} className={labelStyle}>{label}</label>}
    <input
      id={id}
      className={`${inputBase} ${error ? inputError : ""} ${className ?? ""}`}
      {...props}
    />
    {error && <span className={errorText} role="alert">{error}</span>}
  </div>
);
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | grep -E "Input|✓|✗"
```

Expected: Input 관련 테스트 4개 통과

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/design-system/Input/
git commit -m "feat(design-system): add Input component with error/label states"
```

---

### Task 4: Card + Skeleton 컴포넌트

**Files:**
- Create: `apps/web/src/design-system/Card/card.css.ts`
- Create: `apps/web/src/design-system/Card/index.tsx`
- Create: `apps/web/src/design-system/Skeleton/skeleton.css.ts`
- Create: `apps/web/src/design-system/Skeleton/index.tsx`

- [ ] **Step 1: Card CSS 작성**

`apps/web/src/design-system/Card/card.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { vars } from "../tokens.css";

export const card = style({
  background: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  overflow: "hidden",
});

export const cardHoverable = style({
  cursor: "pointer",
  transition: "box-shadow 200ms ease, transform 200ms ease",
  selectors: {
    "&:hover": {
      boxShadow: vars.shadow.md,
      transform: "translateY(-2px)",
    },
  },
});
```

- [ ] **Step 2: Card 컴포넌트 구현**

`apps/web/src/design-system/Card/index.tsx`:

```tsx
import type { HTMLAttributes } from "react";
import { card, cardHoverable } from "./card.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = ({ hoverable = false, className, children, ...props }: CardProps) => (
  <div
    className={`${card} ${hoverable ? cardHoverable : ""} ${className ?? ""}`}
    {...props}
  >
    {children}
  </div>
);
```

- [ ] **Step 3: Skeleton CSS 작성 (keyframes 사용)**

`apps/web/src/design-system/Skeleton/skeleton.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { keyframes } from "@vanilla-extract/css";
import { vars } from "../tokens.css";

const pulse = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.4 },
});

export const skeleton = style({
  background: vars.color.surfaceSecondary,
  borderRadius: vars.radius.md,
  animation: `${pulse} 1.5s ease-in-out infinite`,
});
```

- [ ] **Step 4: Skeleton 컴포넌트 구현**

`apps/web/src/design-system/Skeleton/index.tsx`:

```tsx
import type { HTMLAttributes } from "react";
import { skeleton } from "./skeleton.css";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export const Skeleton = ({ width, height, style, className, ...props }: SkeletonProps) => (
  <div
    className={`${skeleton} ${className ?? ""}`}
    style={{ width, height, ...style }}
    aria-hidden="true"
    {...props}
  />
);
```

- [ ] **Step 5: 개발 서버에서 임시로 Card, Skeleton 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | tail -5
```

Expected: 기존 테스트 모두 통과, 새 에러 없음

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/design-system/Card/ apps/web/src/design-system/Skeleton/
git commit -m "feat(design-system): add Card and Skeleton components"
```

---

### Task 5: Modal 컴포넌트

**Files:**
- Create: `apps/web/src/design-system/Modal/modal.css.ts`
- Create: `apps/web/src/design-system/Modal/index.tsx`
- Create: `apps/web/src/design-system/Modal/Modal.test.tsx`

- [ ] **Step 1: 테스트 작성**

`apps/web/src/design-system/Modal/Modal.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "./index";

describe("Modal", () => {
  it("open=true일 때 children을 렌더링한다", () => {
    render(<Modal open onClose={vi.fn()} title="테스트"><div>내용</div></Modal>);
    expect(screen.getByText("내용")).toBeInTheDocument();
  });

  it("open=false일 때 children을 렌더링하지 않는다", () => {
    render(<Modal open={false} onClose={vi.fn()} title="테스트"><div>내용</div></Modal>);
    expect(screen.queryByText("내용")).not.toBeInTheDocument();
  });

  it("Escape 키를 누르면 onClose가 호출된다", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="테스트"><div>내용</div></Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop 클릭 시 onClose가 호출된다", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="테스트"><div>내용</div></Modal>);
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("title prop이 렌더링된다", () => {
    render(<Modal open onClose={vi.fn()} title="조직 만들기"><div>내용</div></Modal>);
    expect(screen.getByText("조직 만들기")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | grep -E "Modal|FAIL"
```

Expected: Modal 관련 에러

- [ ] **Step 3: Modal CSS 작성 (keyframes 사용)**

`apps/web/src/design-system/Modal/modal.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { keyframes } from "@vanilla-extract/css";
import { vars } from "../tokens.css";

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const slideUp = keyframes({
  from: { opacity: 0, transform: "translateY(16px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

export const backdrop = style({
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  animation: `${fadeIn} 150ms ease`,
});

export const panel = style({
  background: vars.color.surface,
  borderRadius: vars.radius.xl,
  boxShadow: vars.shadow.xl,
  width: "100%",
  maxWidth: "440px",
  padding: vars.space["6"],
  animation: `${slideUp} 200ms ease`,
});

export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: vars.space["5"],
});

export const title = style({
  fontSize: "16px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  letterSpacing: "-0.3px",
});

export const closeBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: vars.color.textSecondary,
  fontSize: "20px",
  lineHeight: 1,
  padding: "2px",
  borderRadius: vars.radius.sm,
  selectors: {
    "&:hover": { color: vars.color.textPrimary, background: vars.color.surfaceSecondary },
  },
});
```

- [ ] **Step 4: Modal 컴포넌트 구현**

`apps/web/src/design-system/Modal/index.tsx`:

```tsx
import { type PropsWithChildren, useEffect } from "react";
import { createPortal } from "react-dom";
import { backdrop, panel, header, title as titleStyle, closeBtn } from "./modal.css";

interface ModalProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  title: string;
}

export const Modal = ({ open, onClose, title, children }: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={backdrop}
      data-testid="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={panel} role="dialog" aria-modal aria-label={title}>
        <div className={header}>
          <span className={titleStyle}>{title}</span>
          <button className={closeBtn} onClick={onClose} aria-label="닫기">×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | grep -E "Modal|✓|✗"
```

Expected: Modal 테스트 5개 모두 통과

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/design-system/Modal/
git commit -m "feat(design-system): add Modal component with keyframe animations"
```

---

### Task 6: 디자인 시스템 통합 export

**Files:**
- Create: `apps/web/src/design-system/index.ts`

- [ ] **Step 1: 통합 index.ts 작성**

`apps/web/src/design-system/index.ts`:

```ts
export { Button } from "./Button";
export type { } from "./Button";

export { Input } from "./Input";

export { Card } from "./Card";

export { Skeleton } from "./Skeleton";

export { Modal } from "./Modal";

export { vars } from "./tokens.css";
```

- [ ] **Step 2: 타입체크 통과 확인**

```bash
pnpm --filter @erdify/web typecheck 2>&1 | tail -10
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/design-system/index.ts
git commit -m "feat(design-system): unified export index"
```

---

### Task 7: 백엔드 — GET /organizations 엔드포인트 추가

**Files:**
- Modify: `apps/api/src/modules/organization/organization.service.ts`
- Modify: `apps/api/src/modules/organization/organization.controller.ts`

- [ ] **Step 1: OrganizationService에 findMyOrganizations 추가**

`apps/api/src/modules/organization/organization.service.ts` 기존 메서드들 아래에 추가:

```ts
async findMyOrganizations(userId: string): Promise<Organization[]> {
  const memberships = await this.memberRepo.find({ where: { userId } });
  if (memberships.length === 0) return [];
  const orgIds = memberships.map((m) => m.organizationId);
  return this.orgRepo.find({ where: orgIds.map((id) => ({ id })) });
}
```

- [ ] **Step 2: OrganizationController에 GET / 라우트 추가**

`apps/api/src/modules/organization/organization.controller.ts`의 `@Controller("organizations")` 클래스 안, `create` 메서드 바로 위에 추가:

```ts
@Get()
findMyOrganizations(@CurrentUser() user: JwtPayload) {
  return this.organizationService.findMyOrganizations(user.sub);
}
```

- [ ] **Step 3: API 동작 확인**

```bash
# 먼저 로그인해서 토큰 획득
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | jq -r '.accessToken')

# 내 조직 목록 조회
curl -s http://localhost:4000/organizations \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: `[]` 또는 가입된 조직 배열

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/organization/organization.service.ts apps/api/src/modules/organization/organization.controller.ts
git commit -m "feat(api): add GET /organizations endpoint for current user's orgs"
```

---

### Task 8: 프론트엔드 API 클라이언트 추가

**Files:**
- Create: `apps/web/src/shared/api/organizations.api.ts`
- Create: `apps/web/src/shared/api/organizations.api.test.ts`
- Create: `apps/web/src/shared/api/projects.api.ts`
- Create: `apps/web/src/shared/api/projects.api.test.ts`

- [ ] **Step 1: organizations.api.ts 테스트 작성**

`apps/web/src/shared/api/organizations.api.test.ts`:

```ts
import { listMyOrganizations, createOrganization } from "./organizations.api";
import { httpClient } from "./httpClient";

vi.mock("./httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn() },
}));

describe("organizations.api", () => {
  it("listMyOrganizations는 GET /organizations를 호출한다", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [] });
    const result = await listMyOrganizations();
    expect(httpClient.get).toHaveBeenCalledWith("/organizations");
    expect(result).toEqual([]);
  });

  it("createOrganization은 POST /organizations를 호출한다", async () => {
    const org = { id: "1", name: "Acme", ownerId: "u1", createdAt: "", updatedAt: "" };
    vi.mocked(httpClient.post).mockResolvedValue({ data: org });
    const result = await createOrganization({ name: "Acme" });
    expect(httpClient.post).toHaveBeenCalledWith("/organizations", { name: "Acme" });
    expect(result).toEqual(org);
  });
});
```

- [ ] **Step 2: organizations.api.ts 구현**

`apps/web/src/shared/api/organizations.api.ts`:

```ts
import { httpClient } from "./httpClient";

export interface OrgResponse {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export const listMyOrganizations = (): Promise<OrgResponse[]> =>
  httpClient.get<OrgResponse[]>("/organizations").then((r) => r.data);

export const createOrganization = (body: { name: string }): Promise<OrgResponse> =>
  httpClient.post<OrgResponse>("/organizations", body).then((r) => r.data);

export const getOrganization = (id: string): Promise<OrgResponse> =>
  httpClient.get<OrgResponse>(`/organizations/${id}`).then((r) => r.data);

export const deleteOrganization = (id: string): Promise<void> =>
  httpClient.delete(`/organizations/${id}`).then(() => undefined);
```

- [ ] **Step 3: projects.api.ts 테스트 작성**

`apps/web/src/shared/api/projects.api.test.ts`:

```ts
import { listProjects, createProject } from "./projects.api";
import { httpClient } from "./httpClient";

vi.mock("./httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn() },
}));

describe("projects.api", () => {
  it("listProjects는 GET /organizations/:orgId/projects를 호출한다", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [] });
    await listProjects("org-1");
    expect(httpClient.get).toHaveBeenCalledWith("/organizations/org-1/projects");
  });

  it("createProject는 POST /organizations/:orgId/projects를 호출한다", async () => {
    const project = { id: "p1", organizationId: "org-1", name: "Backend", description: null, createdAt: "", updatedAt: "" };
    vi.mocked(httpClient.post).mockResolvedValue({ data: project });
    const result = await createProject("org-1", { name: "Backend" });
    expect(httpClient.post).toHaveBeenCalledWith("/organizations/org-1/projects", { name: "Backend" });
    expect(result).toEqual(project);
  });
});
```

- [ ] **Step 4: projects.api.ts 구현**

`apps/web/src/shared/api/projects.api.ts`:

```ts
import { httpClient } from "./httpClient";

export interface ProjectResponse {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export const listProjects = (orgId: string): Promise<ProjectResponse[]> =>
  httpClient.get<ProjectResponse[]>(`/organizations/${orgId}/projects`).then((r) => r.data);

export const createProject = (
  orgId: string,
  body: { name: string }
): Promise<ProjectResponse> =>
  httpClient.post<ProjectResponse>(`/organizations/${orgId}/projects`, body).then((r) => r.data);

export const deleteProject = (orgId: string, projectId: string): Promise<void> =>
  httpClient.delete(`/organizations/${orgId}/projects/${projectId}`).then(() => undefined);
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | grep -E "organizations|projects|✓|✗"
```

Expected: 4개 테스트 모두 통과

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/shared/api/organizations.api.ts apps/web/src/shared/api/organizations.api.test.ts apps/web/src/shared/api/projects.api.ts apps/web/src/shared/api/projects.api.test.ts
git commit -m "feat(api-client): add organizations and projects API clients"
```

---

### Task 9: OrgRail 컴포넌트

**Files:**
- Create: `apps/web/src/features/dashboard/components/OrgRail.css.ts`
- Create: `apps/web/src/features/dashboard/components/OrgRail.tsx`
- Create: `apps/web/src/features/dashboard/components/OrgRail.test.tsx`

- [ ] **Step 1: 테스트 작성**

`apps/web/src/features/dashboard/components/OrgRail.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { OrgRail } from "./OrgRail";
import type { OrgResponse } from "../../../shared/api/organizations.api";

const orgs: OrgResponse[] = [
  { id: "1", name: "Acme Corp", ownerId: "u1", createdAt: "", updatedAt: "" },
  { id: "2", name: "My Team", ownerId: "u1", createdAt: "", updatedAt: "" },
];

describe("OrgRail", () => {
  it("각 조직의 첫 글자를 렌더링한다", () => {
    render(<OrgRail orgs={orgs} selectedOrgId={null} onSelect={vi.fn()} onCreateOrg={vi.fn()} />);
    expect(screen.getByTitle("Acme Corp")).toBeInTheDocument();
    expect(screen.getByTitle("My Team")).toBeInTheDocument();
  });

  it("조직 아이콘 클릭 시 onSelect가 해당 id로 호출된다", () => {
    const onSelect = vi.fn();
    render(<OrgRail orgs={orgs} selectedOrgId={null} onSelect={onSelect} onCreateOrg={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Acme Corp"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("selectedOrgId와 일치하는 아이콘은 active 상태다", () => {
    render(<OrgRail orgs={orgs} selectedOrgId="1" onSelect={vi.fn()} onCreateOrg={vi.fn()} />);
    expect(screen.getByTitle("Acme Corp")).toHaveAttribute("data-active", "true");
  });

  it("+버튼 클릭 시 onCreateOrg가 호출된다", () => {
    const onCreateOrg = vi.fn();
    render(<OrgRail orgs={orgs} selectedOrgId={null} onSelect={vi.fn()} onCreateOrg={onCreateOrg} />);
    fireEvent.click(screen.getByLabelText("새 조직 추가"));
    expect(onCreateOrg).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | grep -E "OrgRail|FAIL"
```

- [ ] **Step 3: CSS 작성**

`apps/web/src/features/dashboard/components/OrgRail.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { styleVariants } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const rail = style({
  width: "52px",
  background: vars.color.surfaceSecondary,
  borderRight: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: `${vars.space["3"]} 0`,
  gap: vars.space["2"],
  flexShrink: 0,
});

export const orgIconBase = style({
  width: "32px",
  height: "32px",
  borderRadius: vars.radius.org,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "700",
  cursor: "pointer",
  border: "none",
  transition: "transform 100ms ease, box-shadow 100ms ease",
  selectors: {
    "&:hover": { transform: "scale(1.08)" },
  },
});

export const orgIconVariants = styleVariants({
  active: {
    background: vars.color.primary,
    color: "#fff",
    boxShadow: "0 2px 8px rgba(0, 100, 224, 0.35)",
  },
  inactive: {
    background: vars.color.surface,
    color: vars.color.textSecondary,
    border: `1px solid ${vars.color.border}`,
  },
});

export const addBtn = style({
  width: "32px",
  height: "32px",
  borderRadius: vars.radius.org,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  cursor: "pointer",
  background: "transparent",
  color: vars.color.textSecondary,
  border: `1.5px dashed ${vars.color.borderStrong}`,
  marginTop: "auto",
  marginBottom: vars.space["1"],
  transition: "background 150ms ease, border-color 150ms ease",
  selectors: {
    "&:hover": {
      background: vars.color.surface,
      borderColor: vars.color.primary,
      color: vars.color.primary,
    },
  },
});
```

- [ ] **Step 4: 컴포넌트 구현**

`apps/web/src/features/dashboard/components/OrgRail.tsx`:

```tsx
import type { OrgResponse } from "../../../shared/api/organizations.api";
import { rail, orgIconBase, orgIconVariants, addBtn } from "./OrgRail.css";

interface OrgRailProps {
  orgs: OrgResponse[];
  selectedOrgId: string | null;
  onSelect: (orgId: string) => void;
  onCreateOrg: () => void;
}

export const OrgRail = ({ orgs, selectedOrgId, onSelect, onCreateOrg }: OrgRailProps) => (
  <nav className={rail} aria-label="조직 목록">
    {orgs.map((org) => (
      <button
        key={org.id}
        className={`${orgIconBase} ${orgIconVariants[selectedOrgId === org.id ? "active" : "inactive"]}`}
        onClick={() => onSelect(org.id)}
        title={org.name}
        data-active={selectedOrgId === org.id}
        aria-label={org.name}
        aria-pressed={selectedOrgId === org.id}
      >
        {org.name.charAt(0).toUpperCase()}
      </button>
    ))}
    <button className={addBtn} onClick={onCreateOrg} aria-label="새 조직 추가" title="새 조직 추가">
      +
    </button>
  </nav>
);
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | grep -E "OrgRail|✓|✗"
```

Expected: OrgRail 테스트 4개 모두 통과

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/dashboard/components/OrgRail.tsx apps/web/src/features/dashboard/components/OrgRail.css.ts apps/web/src/features/dashboard/components/OrgRail.test.tsx
git commit -m "feat(dashboard): add OrgRail component"
```

---

### Task 10: ProjectSidebar 컴포넌트

**Files:**
- Create: `apps/web/src/features/dashboard/components/ProjectSidebar.css.ts`
- Create: `apps/web/src/features/dashboard/components/ProjectSidebar.tsx`
- Create: `apps/web/src/features/dashboard/components/ProjectSidebar.test.tsx`

- [ ] **Step 1: 테스트 작성**

`apps/web/src/features/dashboard/components/ProjectSidebar.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectSidebar } from "./ProjectSidebar";
import type { OrgResponse } from "../../../shared/api/organizations.api";
import type { ProjectResponse } from "../../../shared/api/projects.api";

const org: OrgResponse = { id: "org-1", name: "Acme Corp", ownerId: "u1", createdAt: "", updatedAt: "" };
const projects: ProjectResponse[] = [
  { id: "p1", organizationId: "org-1", name: "Backend API", description: null, createdAt: "", updatedAt: "" },
  { id: "p2", organizationId: "org-1", name: "Frontend", description: null, createdAt: "", updatedAt: "" },
];

describe("ProjectSidebar", () => {
  it("조직 이름을 렌더링한다", () => {
    render(<ProjectSidebar org={org} projects={projects} selectedProjectId={null} onSelect={vi.fn()} onCreateProject={vi.fn()} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("프로젝트 목록을 렌더링한다", () => {
    render(<ProjectSidebar org={org} projects={projects} selectedProjectId={null} onSelect={vi.fn()} onCreateProject={vi.fn()} />);
    expect(screen.getByText("Backend API")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("프로젝트 클릭 시 onSelect가 해당 id로 호출된다", () => {
    const onSelect = vi.fn();
    render(<ProjectSidebar org={org} projects={projects} selectedProjectId={null} onSelect={onSelect} onCreateProject={vi.fn()} />);
    fireEvent.click(screen.getByText("Backend API"));
    expect(onSelect).toHaveBeenCalledWith("p1");
  });

  it("'새 프로젝트' 클릭 시 onCreateProject가 호출된다", () => {
    const onCreateProject = vi.fn();
    render(<ProjectSidebar org={org} projects={[]} selectedProjectId={null} onSelect={vi.fn()} onCreateProject={onCreateProject} />);
    fireEvent.click(screen.getByText("+ 새 프로젝트"));
    expect(onCreateProject).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: CSS 작성**

`apps/web/src/features/dashboard/components/ProjectSidebar.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const sidebar = style({
  width: "220px",
  background: vars.color.surface,
  borderRight: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flexShrink: 0,
});

export const sidebarHeader = style({
  padding: `${vars.space["4"]} ${vars.space["4"]} ${vars.space["2"]}`,
  borderBottom: `1px solid ${vars.color.surfaceSecondary}`,
});

export const orgName = style({
  fontSize: "13px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  marginBottom: "2px",
});

export const sectionLabel = style({
  padding: `${vars.space["3"]} ${vars.space["4"]} ${vars.space["1"]}`,
  fontSize: "10px",
  fontWeight: "600",
  color: vars.color.textSecondary,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
});

export const projectItem = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `7px ${vars.space["4"]}`,
  fontSize: "13px",
  color: vars.color.textSecondary,
  cursor: "pointer",
  background: "none",
  border: "none",
  width: "100%",
  textAlign: "left",
  fontFamily: vars.font.family,
  position: "relative",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary, color: vars.color.textPrimary },
  },
});

export const projectItemActive = style({
  background: vars.color.selectedBg,
  color: vars.color.primary,
  fontWeight: "600",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: "3px",
      background: vars.color.primary,
      borderRadius: "0 2px 2px 0",
    },
  },
});

export const dot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "currentColor",
  opacity: 0.5,
  flexShrink: 0,
});

export const addProjectBtn = style({
  margin: `${vars.space["2"]} ${vars.space["3"]}`,
  padding: `7px ${vars.space["3"]}`,
  borderRadius: vars.radius.md,
  border: `1.5px dashed ${vars.color.borderStrong}`,
  background: "transparent",
  color: vars.color.textSecondary,
  fontSize: "12px",
  fontFamily: vars.font.family,
  cursor: "pointer",
  textAlign: "center",
  selectors: {
    "&:hover": { borderColor: vars.color.primary, color: vars.color.primary },
  },
});

export const scrollArea = style({
  overflowY: "auto",
  flex: 1,
});
```

- [ ] **Step 3: 컴포넌트 구현**

`apps/web/src/features/dashboard/components/ProjectSidebar.tsx`:

```tsx
import type { OrgResponse } from "../../../shared/api/organizations.api";
import type { ProjectResponse } from "../../../shared/api/projects.api";
import {
  sidebar, sidebarHeader, orgName, sectionLabel,
  projectItem, projectItemActive, dot, addProjectBtn, scrollArea,
} from "./ProjectSidebar.css";

interface ProjectSidebarProps {
  org: OrgResponse;
  projects: ProjectResponse[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  onCreateProject: () => void;
}

export const ProjectSidebar = ({
  org, projects, selectedProjectId, onSelect, onCreateProject,
}: ProjectSidebarProps) => (
  <aside className={sidebar} aria-label="프로젝트 목록">
    <div className={sidebarHeader}>
      <div className={orgName}>{org.name}</div>
    </div>
    <div className={sectionLabel}>프로젝트</div>
    <div className={scrollArea}>
      {projects.map((project) => (
        <button
          key={project.id}
          className={`${projectItem} ${selectedProjectId === project.id ? projectItemActive : ""}`}
          onClick={() => onSelect(project.id)}
          aria-pressed={selectedProjectId === project.id}
        >
          <span className={dot} />
          {project.name}
        </button>
      ))}
      <button className={addProjectBtn} onClick={onCreateProject}>
        + 새 프로젝트
      </button>
    </div>
  </aside>
);
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | grep -E "ProjectSidebar|✓|✗"
```

Expected: 4개 통과

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/ProjectSidebar.tsx apps/web/src/features/dashboard/components/ProjectSidebar.css.ts apps/web/src/features/dashboard/components/ProjectSidebar.test.tsx
git commit -m "feat(dashboard): add ProjectSidebar component"
```

---

### Task 11: DiagramGrid 컴포넌트

**Files:**
- Create: `apps/web/src/features/dashboard/components/DiagramGrid.css.ts`
- Create: `apps/web/src/features/dashboard/components/DiagramGrid.tsx`
- Create: `apps/web/src/features/dashboard/components/DiagramGrid.test.tsx`

- [ ] **Step 1: 테스트 작성**

`apps/web/src/features/dashboard/components/DiagramGrid.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DiagramGrid } from "./DiagramGrid";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";

const diagrams: DiagramResponse[] = [
  {
    id: "d1", projectId: "p1", name: "User Schema",
    content: { entities: [], relationships: [], dialect: "postgresql" },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "d2", projectId: "p1", name: "Order Schema",
    content: { entities: [], relationships: [], dialect: "mysql" },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("DiagramGrid", () => {
  it("다이어그램 이름들을 렌더링한다", () => {
    wrap(<DiagramGrid diagrams={diagrams} onCreateDiagram={vi.fn()} />);
    expect(screen.getByText("User Schema")).toBeInTheDocument();
    expect(screen.getByText("Order Schema")).toBeInTheDocument();
  });

  it("'새 ERD 만들기' 카드를 렌더링한다", () => {
    wrap(<DiagramGrid diagrams={diagrams} onCreateDiagram={vi.fn()} />);
    expect(screen.getByText("새 ERD 만들기")).toBeInTheDocument();
  });

  it("'새 ERD 만들기' 클릭 시 onCreateDiagram이 호출된다", () => {
    const onCreateDiagram = vi.fn();
    wrap(<DiagramGrid diagrams={diagrams} onCreateDiagram={onCreateDiagram} />);
    fireEvent.click(screen.getByText("새 ERD 만들기"));
    expect(onCreateDiagram).toHaveBeenCalledTimes(1);
  });

  it("로딩 상태에서 Skeleton을 렌더링한다", () => {
    wrap(<DiagramGrid diagrams={[]} onCreateDiagram={vi.fn()} loading />);
    expect(document.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: CSS 작성**

`apps/web/src/features/dashboard/components/DiagramGrid.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { styleVariants } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const mainArea = style({
  background: vars.color.surfaceTertiary,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flex: 1,
});

export const mainHeader = style({
  padding: `${vars.space["5"]} ${vars.space["6"]} ${vars.space["4"]}`,
  display: "flex",
  alignItems: "center",
  gap: vars.space["3"],
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const mainTitle = style({
  fontSize: "16px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  letterSpacing: "-0.3px",
  flex: 1,
});

export const filterRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["3"]} ${vars.space["6"]}`,
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const filterChip = style({
  padding: `4px ${vars.space["3"]}`,
  borderRadius: vars.radius.pill,
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  border: "none",
  fontFamily: vars.font.family,
  transition: "background 150ms ease",
});

export const filterChipVariants = styleVariants({
  active: { background: vars.color.textPrimary, color: "#fff" },
  inactive: {
    background: vars.color.surfaceSecondary,
    color: vars.color.textSecondary,
    selectors: { "&:hover": { background: vars.color.border } },
  },
});

export const grid = style({
  padding: vars.space["5"],
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: vars.space["3"],
  overflowY: "auto",
  flex: 1,
});

export const diagramCard = style({
  background: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  overflow: "hidden",
  cursor: "pointer",
  textDecoration: "none",
  display: "block",
  transition: "box-shadow 200ms ease, transform 200ms ease",
  color: "inherit",
  selectors: {
    "&:hover": {
      boxShadow: vars.shadow.md,
      transform: "translateY(-2px)",
    },
  },
});

export const cardPreview = style({
  height: "90px",
  background: vars.color.surfaceSecondary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space["2"],
});

export const miniTable = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: "4px",
  padding: "5px 7px",
  fontSize: "8px",
  color: vars.color.textPrimary,
  minWidth: "52px",
});

export const miniTableHeader = style({
  background: vars.color.primary,
  color: "#fff",
  margin: "-5px -7px 4px",
  padding: "3px 7px",
  fontWeight: "600",
  borderRadius: "4px 4px 0 0",
  fontSize: "8px",
});

export const miniField = style({
  color: vars.color.textSecondary,
  marginTop: "2px",
});

export const cardBody = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
});

export const cardName = style({
  fontSize: "13px",
  fontWeight: "600",
  color: vars.color.textPrimary,
  marginBottom: "3px",
});

export const cardMeta = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  display: "flex",
  alignItems: "center",
  gap: vars.space["1"],
});

export const dialectBadge = style({
  background: vars.color.surfaceSecondary,
  borderRadius: "4px",
  padding: "1px 5px",
  fontSize: "10px",
  color: vars.color.textSecondary,
});

export const newCard = style({
  border: `1.5px dashed ${vars.color.borderStrong}`,
  borderRadius: vars.radius.lg,
  background: "transparent",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space["2"],
  minHeight: "140px",
  color: vars.color.textSecondary,
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "border-color 150ms ease, color 150ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      color: vars.color.primary,
    },
  },
});

export const newCardIcon = style({
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: vars.color.surfaceSecondary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
});

export const emptyState = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  gap: vars.space["3"],
  color: vars.color.textSecondary,
  fontSize: "14px",
});
```

- [ ] **Step 3: 컴포넌트 구현**

`apps/web/src/features/dashboard/components/DiagramGrid.tsx`:

```tsx
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";
import { Button } from "../../../design-system";
import { Skeleton } from "../../../design-system";
import {
  mainArea, mainHeader, mainTitle, filterRow, filterChip, filterChipVariants,
  grid, diagramCard, cardPreview, miniTable, miniTableHeader, miniField,
  cardBody, cardName, cardMeta, dialectBadge, newCard, newCardIcon, emptyState,
} from "./DiagramGrid.css";

interface DiagramGridProps {
  diagrams: DiagramResponse[];
  projectName?: string;
  onCreateDiagram: () => void;
  loading?: boolean;
}

const DiagramCardPreview = ({ diagram }: { diagram: DiagramResponse }) => {
  const previewEntities = diagram.content.entities.slice(0, 2);
  if (previewEntities.length === 0) {
    return <div className={cardPreview} />;
  }
  return (
    <div className={cardPreview}>
      {previewEntities.map((entity) => (
        <div key={entity.id} className={miniTable}>
          <div className={miniTableHeader}>{entity.name}</div>
          {entity.columns.slice(0, 3).map((col) => (
            <div key={col.id} className={miniField}>{col.name}</div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const DiagramGrid = ({ diagrams, projectName, onCreateDiagram, loading = false }: DiagramGridProps) => (
  <div className={mainArea}>
    <div className={mainHeader}>
      <div className={mainTitle}>{projectName ?? "프로젝트를 선택하세요"}</div>
      {projectName && (
        <Button variant="primary" size="md" onClick={onCreateDiagram}>
          + 새 ERD
        </Button>
      )}
    </div>
    {projectName && (
      <div className={filterRow}>
        <button className={`${filterChip} ${filterChipVariants.active}`}>전체</button>
        <button className={`${filterChip} ${filterChipVariants.inactive}`}>최근 수정</button>
        <button className={`${filterChip} ${filterChipVariants.inactive}`}>내가 만든</button>
      </div>
    )}
    {loading ? (
      <div className={grid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={140} />
        ))}
      </div>
    ) : !projectName ? (
      <div className={emptyState}>
        <span>왼쪽에서 프로젝트를 선택하세요</span>
      </div>
    ) : (
      <div className={grid}>
        {diagrams.map((diagram) => (
          <Link key={diagram.id} to={`/diagrams/${diagram.id}`} className={diagramCard}>
            <DiagramCardPreview diagram={diagram} />
            <div className={cardBody}>
              <div className={cardName}>{diagram.name}</div>
              <div className={cardMeta}>
                <span className={dialectBadge}>{diagram.content.dialect}</span>
                {formatDistanceToNow(new Date(diagram.updatedAt), { addSuffix: true, locale: ko })}
              </div>
            </div>
          </Link>
        ))}
        <button className={newCard} onClick={onCreateDiagram}>
          <div className={newCardIcon}>+</div>
          새 ERD 만들기
        </button>
      </div>
    )}
  </div>
);
```

- [ ] **Step 4: date-fns 설치**

```bash
pnpm --filter @erdify/web add date-fns
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | grep -E "DiagramGrid|✓|✗"
```

Expected: DiagramGrid 테스트 4개 통과

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/dashboard/components/DiagramGrid.tsx apps/web/src/features/dashboard/components/DiagramGrid.css.ts apps/web/src/features/dashboard/components/DiagramGrid.test.tsx
git commit -m "feat(dashboard): add DiagramGrid component"
```

---

### Task 12: 모달 컴포넌트 3종 (CreateOrg, CreateProject, CreateDiagram)

**Files:**
- Create: `apps/web/src/features/dashboard/components/CreateOrgModal.tsx`
- Create: `apps/web/src/features/dashboard/components/CreateProjectModal.tsx`
- Create: `apps/web/src/features/dashboard/components/CreateDiagramModal.tsx`

- [ ] **Step 1: 공통 모달 내부 스타일 파일 작성**

`apps/web/src/features/dashboard/components/modal-form.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const form = style({ display: "flex", flexDirection: "column", gap: vars.space["4"] });
export const footer = style({ display: "flex", justifyContent: "flex-end", gap: vars.space["2"], marginTop: vars.space["2"] });
export const selectInput = style({
  width: "100%",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: "14px",
  fontFamily: vars.font.family,
  color: vars.color.textPrimary,
  background: vars.color.surface,
  outline: "none",
  selectors: { "&:focus": { borderColor: vars.color.primary, boxShadow: `0 0 0 3px ${vars.color.focusRing}` } },
});
```

- [ ] **Step 2: CreateOrgModal 구현**

`apps/web/src/features/dashboard/components/CreateOrgModal.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { Modal, Button, Input } from "../../../design-system";
import { createOrganization } from "../../../shared/api/organizations.api";
import { form, footer } from "./modal-form.css";

interface CreateOrgModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateOrgModal = ({ open, onClose, onCreated }: CreateOrgModalProps) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createOrganization({ name: name.trim() });
      setName("");
      onCreated();
      onClose();
    } catch {
      setError("조직 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="새 조직 만들기">
      <form className={form} onSubmit={handleSubmit}>
        <Input
          label="조직 이름"
          placeholder="예: Acme Corp"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error ?? undefined}
          required
          autoFocus
        />
        <div className={footer}>
          <Button variant="secondary" size="md" type="button" onClick={onClose}>취소</Button>
          <Button variant="primary" size="md" type="submit" disabled={loading || !name.trim()}>
            {loading ? "만드는 중..." : "만들기"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
```

- [ ] **Step 3: CreateProjectModal 구현**

`apps/web/src/features/dashboard/components/CreateProjectModal.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { Modal, Button, Input } from "../../../design-system";
import { createProject } from "../../../shared/api/projects.api";
import { form, footer } from "./modal-form.css";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  orgId: string;
}

export const CreateProjectModal = ({ open, onClose, onCreated, orgId }: CreateProjectModalProps) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createProject(orgId, { name: name.trim() });
      setName("");
      onCreated();
      onClose();
    } catch {
      setError("프로젝트 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="새 프로젝트 만들기">
      <form className={form} onSubmit={handleSubmit}>
        <Input
          label="프로젝트 이름"
          placeholder="예: Backend API"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error ?? undefined}
          required
          autoFocus
        />
        <div className={footer}>
          <Button variant="secondary" size="md" type="button" onClick={onClose}>취소</Button>
          <Button variant="primary" size="md" type="submit" disabled={loading || !name.trim()}>
            {loading ? "만드는 중..." : "만들기"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
```

- [ ] **Step 4: CreateDiagramModal 구현**

`apps/web/src/features/dashboard/components/CreateDiagramModal.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { Modal, Button, Input } from "../../../design-system";
import { createDiagram } from "../../../shared/api/diagrams.api";
import { form, footer, selectInput } from "./modal-form.css";

interface CreateDiagramModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (diagramId: string) => void;
  projectId: string;
}

export const CreateDiagramModal = ({ open, onClose, onCreated, projectId }: CreateDiagramModalProps) => {
  const [name, setName] = useState("");
  const [dialect, setDialect] = useState<"postgresql" | "mysql" | "mariadb">("postgresql");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const diagram = await createDiagram(projectId, { name: name.trim(), dialect });
      setName("");
      onCreated(diagram.id);
      onClose();
    } catch {
      setError("ERD 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="새 ERD 만들기">
      <form className={form} onSubmit={handleSubmit}>
        <Input
          label="ERD 이름"
          placeholder="예: User Schema"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error ?? undefined}
          required
          autoFocus
        />
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
            데이터베이스 종류
          </label>
          <select
            className={selectInput}
            value={dialect}
            onChange={(e) => setDialect(e.target.value as "postgresql" | "mysql" | "mariadb")}
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="mariadb">MariaDB</option>
          </select>
        </div>
        <div className={footer}>
          <Button variant="secondary" size="md" type="button" onClick={onClose}>취소</Button>
          <Button variant="primary" size="md" type="submit" disabled={loading || !name.trim()}>
            {loading ? "만드는 중..." : "만들기"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/CreateOrgModal.tsx apps/web/src/features/dashboard/components/CreateProjectModal.tsx apps/web/src/features/dashboard/components/CreateDiagramModal.tsx apps/web/src/features/dashboard/components/modal-form.css.ts
git commit -m "feat(dashboard): add CreateOrg, CreateProject, CreateDiagram modals"
```

---

### Task 13: DashboardPage + 파일 구조 정리 + Router 업데이트

**Files:**
- Create: `apps/web/src/features/dashboard/pages/DashboardPage.tsx`
- Create: `apps/web/src/features/dashboard/pages/dashboard-page.css.ts`
- Move: editor 파일들 → `features/editor/pages/` + `features/editor/components/`
- Move: auth 파일들 → `features/auth/pages/`
- Delete: `apps/web/src/app/App.tsx`, `apps/web/src/app/app.css.ts`
- Modify: `apps/web/src/app/Router.tsx`

- [ ] **Step 1: DashboardPage 레이아웃 CSS 작성**

`apps/web/src/features/dashboard/pages/dashboard-page.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const shell = style({
  display: "grid",
  gridTemplateRows: "48px 1fr",
  height: "100vh",
  overflow: "hidden",
});

export const topbar = style({
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
  display: "flex",
  alignItems: "center",
  padding: `0 ${vars.space["5"]}`,
  gap: vars.space["3"],
});

export const brand = style({
  fontSize: "16px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  letterSpacing: "-0.3px",
});

export const brandAccent = style({ color: vars.color.primary });

export const topbarSpacer = style({ flex: 1 });

export const avatar = style({
  width: "30px",
  height: "30px",
  background: vars.color.primary,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
});

export const body = style({
  display: "grid",
  gridTemplateColumns: "52px 220px 1fr",
  overflow: "hidden",
});
```

- [ ] **Step 2: DashboardPage 구현**

`apps/web/src/features/dashboard/pages/DashboardPage.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyOrganizations } from "../../../shared/api/organizations.api";
import { listProjects } from "../../../shared/api/projects.api";
import { listDiagrams } from "../../../shared/api/diagrams.api";
import { useWorkspaceStore } from "../../../shared/stores/useWorkspaceStore";
import { OrgRail } from "../components/OrgRail";
import { ProjectSidebar } from "../components/ProjectSidebar";
import { DiagramGrid } from "../components/DiagramGrid";
import { CreateOrgModal } from "../components/CreateOrgModal";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreateDiagramModal } from "../components/CreateDiagramModal";
import {
  shell, topbar, brand, brandAccent, topbarSpacer, avatar, body,
} from "./dashboard-page.css";

export const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedOrganizationId, selectedProjectId, selectOrganization, selectProject } =
    useWorkspaceStore();

  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);

  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: listMyOrganizations,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", selectedOrganizationId],
    queryFn: () => listProjects(selectedOrganizationId!),
    enabled: !!selectedOrganizationId,
  });

  const { data: diagrams = [], isLoading: diagramsLoading } = useQuery({
    queryKey: ["diagrams", selectedProjectId],
    queryFn: () => listDiagrams(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const selectedOrg = orgs.find((o) => o.id === selectedOrganizationId) ?? null;
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <div className={shell}>
      <header className={topbar}>
        <div className={brand}>
          ERD<span className={brandAccent}>ify</span>
        </div>
        <div className={topbarSpacer} />
        <div className={avatar}>J</div>
      </header>

      <div className={body}>
        <OrgRail
          orgs={orgs}
          selectedOrgId={selectedOrganizationId}
          onSelect={selectOrganization}
          onCreateOrg={() => setOrgModalOpen(true)}
        />

        {selectedOrg ? (
          <ProjectSidebar
            org={selectedOrg}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelect={selectProject}
            onCreateProject={() => setProjectModalOpen(true)}
          />
        ) : (
          <div style={{ width: 220, borderRight: "1px solid var(--border)" }} />
        )}

        <DiagramGrid
          diagrams={diagrams}
          projectName={selectedProject?.name}
          onCreateDiagram={() => setDiagramModalOpen(true)}
          loading={diagramsLoading && !!selectedProjectId}
        />
      </div>

      <CreateOrgModal
        open={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["orgs"] })}
      />

      {selectedOrganizationId && (
        <CreateProjectModal
          open={projectModalOpen}
          onClose={() => setProjectModalOpen(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["projects", selectedOrganizationId] })}
          orgId={selectedOrganizationId}
        />
      )}

      {selectedProjectId && (
        <CreateDiagramModal
          open={diagramModalOpen}
          onClose={() => setDiagramModalOpen(false)}
          onCreated={(id) => navigate(`/diagrams/${id}`)}
          projectId={selectedProjectId}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 3: editor 파일 이동**

```bash
cd /path/to/ERDify
mkdir -p apps/web/src/features/editor/pages
mkdir -p apps/web/src/features/editor/components

# 파일 이동
mv apps/web/src/features/editor/EditorPage.tsx apps/web/src/features/editor/pages/EditorPage.tsx
mv apps/web/src/features/editor/components/EditorCanvas.tsx apps/web/src/features/editor/components/EditorCanvas.tsx
mv apps/web/src/features/editor/components/PresenceIndicator.tsx apps/web/src/features/editor/components/PresenceIndicator.tsx
mv apps/web/src/features/editor/components/VersionHistoryDrawer.tsx apps/web/src/features/editor/components/VersionHistoryDrawer.tsx
```

참고: `EditorCanvas.tsx`, `PresenceIndicator.tsx`, `VersionHistoryDrawer.tsx`는 이미 `features/editor/components/`에 있으므로 이동 불필요. `EditorPage.tsx`만 `pages/`로 이동.

- [ ] **Step 4: auth 파일 이동**

```bash
mkdir -p apps/web/src/features/auth/pages

# LoginPage, RegisterPage는 Task 14에서 재작성하므로 빈 파일만 미리 만들어도 됨
# (Task 14에서 전면 교체)
```

- [ ] **Step 5: Router.tsx 업데이트**

`apps/web/src/app/Router.tsx` 전체를 아래로 교체:

```tsx
import { Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { EditorPage } from "../features/editor/pages/EditorPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export const Router = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/diagrams/:diagramId" element={<EditorPage />} />
      <Route path="/*" element={<DashboardPage />} />
    </Route>
  </Routes>
);
```

- [ ] **Step 6: App.tsx, app.css.ts 삭제**

```bash
rm apps/web/src/app/App.tsx apps/web/src/app/app.css.ts
```

- [ ] **Step 7: EditorPage 내부 import 경로 업데이트**

`apps/web/src/features/editor/pages/EditorPage.tsx`를 열어서 내부에서 상대경로로 `../components/`, `../hooks/`, `../stores/`를 참조하는 부분을 확인하고 수정. 이동 후 경로가 한 단계 깊어졌으므로:
- `./components/EditorCanvas` → `../components/EditorCanvas`
- `./hooks/useXxx` → `../hooks/useXxx`
- `./stores/useEditorStore` → `../stores/useEditorStore`

- [ ] **Step 8: 개발 서버 빌드 에러 없는지 확인**

```bash
pnpm --filter @erdify/web typecheck 2>&1 | tail -20
```

Expected: 에러 없음

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/features/dashboard/ apps/web/src/features/editor/pages/ apps/web/src/app/Router.tsx
git rm apps/web/src/app/App.tsx apps/web/src/app/app.css.ts
git commit -m "feat(dashboard): DashboardPage, file structure migration, Router update"
```

---

### Task 14: 인증 페이지 리디자인 (LoginPage + RegisterPage)

**Files:**
- Create: `apps/web/src/features/auth/pages/LoginPage.tsx`
- Create: `apps/web/src/features/auth/pages/RegisterPage.tsx`
- Create: `apps/web/src/features/auth/pages/auth-page.css.ts`

- [ ] **Step 1: 인증 페이지 공통 CSS 작성**

`apps/web/src/features/auth/pages/auth-page.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const page = style({
  minHeight: "100vh",
  background: vars.color.surfaceSecondary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: vars.space["6"],
});

export const card = style({
  background: vars.color.surface,
  borderRadius: vars.radius.xl,
  boxShadow: vars.shadow.lg,
  padding: `${vars.space["8"]} ${vars.space["7"]}`,
  width: "100%",
  maxWidth: "380px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

export const brand = style({
  fontSize: "22px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  letterSpacing: "-0.5px",
  marginBottom: "4px",
});

export const brandAccent = style({ color: vars.color.primary });

export const tagline = style({
  fontSize: "13px",
  color: vars.color.textSecondary,
  marginBottom: vars.space["7"],
});

export const form = style({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: vars.space["3"],
});

export const authLink = style({
  textAlign: "center",
  fontSize: "13px",
  color: vars.color.textSecondary,
  marginTop: vars.space["2"],
});

export const authLinkAnchor = style({
  color: vars.color.primary,
  fontWeight: "500",
  cursor: "pointer",
  selectors: { "&:hover": { textDecoration: "underline" } },
});

export const strengthBars = style({
  display: "flex",
  gap: "4px",
  marginTop: "6px",
});

export const strengthBar = style({
  flex: 1,
  height: "3px",
  borderRadius: "2px",
  background: vars.color.border,
  transition: "background 200ms ease",
});

export const strengthBarFilled = style({
  background: vars.color.success,
});
```

- [ ] **Step 2: LoginPage 구현**

`apps/web/src/features/auth/pages/LoginPage.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../../shared/api/auth.api";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import { Button, Input } from "../../../design-system";
import {
  page, card, brand, brandAccent, tagline, form, authLink, authLinkAnchor,
} from "./auth-page.css";

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((s) => s.setToken);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await login({ email, password });
      setToken(accessToken);
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
          ERD<span className={brandAccent}>ify</span>
        </div>
        <div className={tagline}>고객사 DB 스키마를 한 곳에서</div>
        <form className={form} onSubmit={handleSubmit} aria-label="로그인">
          <Input
            label="이메일"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="비밀번호"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error ?? undefined}
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

- [ ] **Step 3: RegisterPage 구현**

`apps/web/src/features/auth/pages/RegisterPage.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../../../shared/api/auth.api";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import { Button, Input } from "../../../design-system";
import {
  page, card, brand, brandAccent, tagline, form,
  authLink, authLinkAnchor, strengthBars, strengthBar, strengthBarFilled,
} from "./auth-page.css";

const getStrength = (pw: string) => {
  if (pw.length === 0) return 0;
  if (pw.length < 6) return 1;
  if (pw.length < 8) return 2;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 4;
  return 3;
};

export const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((s) => s.setToken);
  const navigate = useNavigate();

  const strength = getStrength(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await register({ name, email, password });
      setToken(accessToken);
      navigate("/");
    } catch {
      setError("회원가입에 실패했습니다. 이미 사용 중인 이메일일 수 있습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={page}>
      <div className={card}>
        <div className={brand}>
          ERD<span className={brandAccent}>ify</span>
        </div>
        <div className={tagline}>팀과 함께 스키마를 관리하세요</div>
        <form className={form} onSubmit={handleSubmit} aria-label="회원가입">
          <Input
            label="이름"
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="이메일"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div>
            <Input
              label="비밀번호"
              type="password"
              placeholder="8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
              required
              minLength={8}
            />
            {password.length > 0 && (
              <div className={strengthBars}>
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`${strengthBar} ${strength >= level ? strengthBarFilled : ""}`}
                  />
                ))}
              </div>
            )}
          </div>
          <Button variant="primary" size="lg" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "처리 중..." : "시작하기"}
          </Button>
        </form>
        <div className={authLink}>
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className={authLinkAnchor}>로그인</Link>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: 기존 auth 테스트 업데이트**

`apps/web/src/features/auth/LoginPage.test.tsx`가 있다면 경로 이동:

```bash
mv apps/web/src/features/auth/LoginPage.test.tsx apps/web/src/features/auth/pages/LoginPage.test.tsx
```

`apps/web/src/features/auth/pages/LoginPage.test.tsx`에서 import 경로 수정:
```ts
// 기존: import { LoginPage } from "../LoginPage";
// 변경:
import { LoginPage } from "./LoginPage";
```

- [ ] **Step 5: 전체 테스트 실행**

```bash
pnpm --filter @erdify/web test -- --reporter=verbose 2>&1 | tail -30
```

Expected: 전체 테스트 통과

- [ ] **Step 6: 개발 서버에서 브라우저 동작 확인**

```bash
pnpm dev
```

확인 항목:
1. http://localhost:5173/login — 새 로그인 페이지 렌더링
2. http://localhost:5173/register — 새 회원가입 페이지 렌더링
3. 로그인 후 → 대시보드 진입
4. 조직 생성 → Org Rail에 나타남
5. 프로젝트 생성 → 사이드바에 나타남
6. ERD 생성 → 에디터로 이동

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/auth/
git commit -m "feat(auth): redesign LoginPage and RegisterPage with new design system"
```

---

## Self-Review 결과

**Spec coverage:**
- [x] lawkit 제거 — Task 1
- [x] Pretendard CDN — Task 1
- [x] vanilla-extract tokens (createGlobalTheme) — Task 1
- [x] vanilla-extract recipe — Task 2 (Button)
- [x] vanilla-extract styleVariants — Task 9, 10, 11 (OrgRail, filter chips)
- [x] vanilla-extract keyframes — Task 4 (Skeleton), Task 5 (Modal)
- [x] vanilla-extract globalStyle — Task 1
- [x] Button component — Task 2
- [x] Input component — Task 3
- [x] Card component — Task 4
- [x] Skeleton component — Task 4
- [x] Modal component — Task 5
- [x] 통합 export — Task 6
- [x] Backend GET /organizations — Task 7
- [x] organizations.api.ts — Task 8
- [x] projects.api.ts — Task 8
- [x] OrgRail — Task 9
- [x] ProjectSidebar — Task 10
- [x] DiagramGrid — Task 11
- [x] Create modals × 3 — Task 12
- [x] DashboardPage — Task 13
- [x] features 구조 pages/components 분리 — Task 13
- [x] Router 업데이트 — Task 13
- [x] LoginPage 리디자인 — Task 14
- [x] RegisterPage 리디자인 — Task 14
- [x] 화살표 함수 컨벤션 — 전 태스크

**Placeholder 없음** — 모든 스텝에 실제 코드 포함됨.

**Type consistency:**
- `OrgResponse` — Task 8에서 정의, Task 9/10/12/13에서 동일하게 사용
- `ProjectResponse` — Task 8에서 정의, Task 10/12/13에서 동일하게 사용
- `DiagramResponse` — 기존 `diagrams.api.ts` 타입 그대로 사용
- `vars` — Task 1 `tokens.css.ts`에서 정의, 모든 `*.css.ts`에서 `import { vars } from "../../../design-system/tokens.css"` 경로 일치
