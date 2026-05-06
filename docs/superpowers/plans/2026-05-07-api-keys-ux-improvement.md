# API Keys UX Improvement — Inline Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move API key management from the `/settings/api-keys` separate page into an inline dashboard panel, accessed via a persistent 🔑 button at the bottom of the sidebar.

**Architecture:** Replace `ApiKeysPage` with a props-free `ApiKeysPanel` component in the dashboard feature. Add `sidebarBottomBar` section to `UnifiedSidebar` (outside the `selectedOrgId` block so it's always visible). Wire 3-way conditional rendering into `DashboardPage` (`apiKeysOpen` → `memberManagementOpen` → `DiagramGrid`). Remove the `/settings/api-keys` route and delete the old settings files.

**Tech Stack:** React, TanStack Query, vanilla-extract CSS. No backend changes. Reuses `api-keys.api.ts` and all existing mutations unchanged.

---

## File Map

| File | Action |
|---|---|
| `apps/web/src/features/dashboard/pages/api-keys-panel.css.ts` | **Create** — styles for ApiKeysPanel |
| `apps/web/src/features/dashboard/pages/ApiKeysPanel.tsx` | **Create** — migrated + refactored from ApiKeysPage |
| `apps/web/src/features/dashboard/pages/ApiKeysPanel.test.tsx` | **Create** — migrated tests + 2 new tests (copy, regenerate) |
| `apps/web/src/features/dashboard/components/unified-sidebar.css.ts` | **Modify** — add `sidebarBottomBar` |
| `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx` | **Modify** — add `apiKeysActive`/`onApiKeys` props + button |
| `apps/web/src/features/dashboard/components/UnifiedSidebar.test.tsx` | **Modify** — add new props to defaultProps + 2 new tests |
| `apps/web/src/features/dashboard/pages/DashboardPage.tsx` | **Modify** — wire state + render + remove dropdown item |
| `apps/web/src/app/Router.tsx` | **Modify** — remove `/settings/api-keys` route |
| `apps/web/src/features/settings/pages/ApiKeysPage.tsx` | **Delete** |
| `apps/web/src/features/settings/pages/api-keys-page.css.ts` | **Delete** |
| `apps/web/src/features/settings/pages/ApiKeysPage.test.tsx` | **Delete** |

---

## Task 1: Create `api-keys-panel.css.ts`

**Files:**
- Create: `apps/web/src/features/dashboard/pages/api-keys-panel.css.ts`

No tests needed for CSS files.

- [ ] **Step 1: Create the CSS file**

```typescript
import { style, composeStyles } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const page = style({
  padding: vars.space["6"],
  flex: 1,
  overflowY: "auto",
});

export const header = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: vars.space["6"],
});

export const title = style({
  fontSize: vars.font.size.lg,
  fontWeight: vars.font.weight.bold,
  color: vars.color.textPrimary,
  margin: 0,
});

export const subtitle = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  marginTop: vars.space["1"],
});

export const sectionLabel = style({
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.bold,
  color: vars.color.textDisabled,
  letterSpacing: "0.7px",
  textTransform: "uppercase",
  marginBottom: vars.space["2"],
});

export const card = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  overflow: "hidden",
  boxShadow: vars.shadow.sm,
});

export const keyRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["3"],
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.surfaceSecondary}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
});

export const keyName = style({
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
  color: vars.color.textPrimary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const keyMeta = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
});

export const createBtn = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  background: vars.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
  flexShrink: 0,
  selectors: { "&:hover": { background: vars.color.primaryHover } },
});

export const emptyMsg = style({
  textAlign: "center",
  color: vars.color.textSecondary,
  fontSize: "14px",
  padding: vars.space["8"],
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
});

export const badgeActive = style({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: "#dcfce7",
  color: "#16a34a",
  flexShrink: 0,
});

export const badgeExpiring = style({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: "#fef9c3",
  color: "#a16207",
  flexShrink: 0,
});

export const badgeExpired = style({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: vars.color.surfaceSecondary,
  color: vars.color.textDisabled,
  flexShrink: 0,
});

export const revealBox = style({
  background: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: vars.radius.lg,
  padding: vars.space["5"],
  marginBottom: vars.space["5"],
  display: "flex",
  flexDirection: "column",
  gap: vars.space["3"],
});

export const revealWarning = style({
  fontSize: "13px",
  color: "#92400e",
  margin: 0,
  fontWeight: "500",
});

export const keyBox = style({
  display: "flex",
  gap: vars.space["2"],
  alignItems: "stretch",
});

export const keyText = style({
  flex: 1,
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
  fontSize: "11px",
  padding: vars.space["2"],
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  color: vars.color.textPrimary,
  wordBreak: "break-all",
  lineHeight: "1.5",
  userSelect: "all",
});

export const copyBtn = style({
  flexShrink: 0,
  padding: `0 ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const copySuccessBtn = style({
  flexShrink: 0,
  padding: `0 ${vars.space["3"]}`,
  border: "1px solid #16a34a",
  borderRadius: vars.radius.md,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const confirmBtn = style({
  alignSelf: "flex-start",
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  background: vars.color.textPrimary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const createForm = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space["6"],
  marginBottom: vars.space["5"],
  display: "flex",
  flexDirection: "column",
  gap: vars.space["4"],
});

export const formRow = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["2"],
});

export const label = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textPrimary,
});

export const optional = style({
  fontWeight: "400",
  color: vars.color.textSecondary,
});

export const input = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: "13px",
  color: vars.color.textPrimary,
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary, boxShadow: `0 0 0 3px ${vars.color.focusRing}` },
  },
});

export const chips = style({
  display: "flex",
  gap: vars.space["2"],
  flexWrap: "wrap",
});

const chipBase = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.pill,
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const chip = composeStyles(chipBase, style({
  border: `1.5px solid ${vars.color.border}`,
  color: vars.color.textSecondary,
  background: vars.color.surface,
  selectors: { "&:hover": { borderColor: vars.color.borderStrong } },
}));

export const chipActive = composeStyles(chipBase, style({
  border: `1.5px solid ${vars.color.primary}`,
  color: vars.color.primary,
  background: vars.color.selectedBg,
  fontWeight: "600",
}));

export const formActions = style({
  display: "flex",
  justifyContent: "flex-end",
});

export const createSubmitBtn = style({
  padding: `${vars.space["2"]} ${vars.space["5"]}`,
  background: vars.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: {
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
    "&:hover:not(:disabled)": { background: vars.color.primaryHover },
  },
});

export const errorMsg = style({
  fontSize: "12px",
  color: vars.color.error,
  margin: 0,
});

export const actionBtn = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: vars.font.family,
  flexShrink: 0,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary, color: vars.color.textPrimary },
  },
});

export const actionBtnDanger = composeStyles(actionBtn, style({
  selectors: {
    "&:hover": { background: "#fee2e2", color: vars.color.error, borderColor: "#fca5a5" },
  },
}));

export const confirmInline = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  flexWrap: "wrap",
  fontSize: "12px",
  color: vars.color.textSecondary,
});

export const confirmYesBtn = style({
  padding: "2px 8px",
  background: vars.color.error,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.sm,
  fontSize: "11px",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: { "&:disabled": { opacity: 0.5 } },
});

export const confirmNoBtn = style({
  padding: "2px 8px",
  background: "none",
  color: vars.color.textSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: "11px",
  cursor: "pointer",
  fontFamily: vars.font.family,
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/dashboard/pages/api-keys-panel.css.ts
git commit -m "feat(web): add api-keys-panel.css.ts styles"
```

---

## Task 2: Create `ApiKeysPanel.tsx` (TDD)

**Files:**
- Create: `apps/web/src/features/dashboard/pages/ApiKeysPanel.test.tsx`
- Create: `apps/web/src/features/dashboard/pages/ApiKeysPanel.tsx`

- [ ] **Step 1: Write the failing test file**

Create `apps/web/src/features/dashboard/pages/ApiKeysPanel.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as apiKeysApi from "../../../shared/api/api-keys.api";
import type { ApiKeyItem, ApiKeyCreated } from "../../../shared/api/api-keys.api";
import * as clipboardUtil from "../../../shared/utils/clipboard";
import { ApiKeysPanel } from "./ApiKeysPanel";

vi.mock("../../../shared/api/api-keys.api");
vi.mock("../../../shared/utils/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./api-keys-panel.css", () => ({
  page: "",
  header: "",
  title: "",
  subtitle: "",
  sectionLabel: "",
  card: "",
  keyRow: "",
  keyName: "",
  keyMeta: "",
  createBtn: "",
  emptyMsg: "",
  createForm: "",
  formRow: "",
  label: "",
  optional: "",
  input: "",
  chips: "",
  chip: "",
  chipActive: "",
  formActions: "",
  createSubmitBtn: "",
  errorMsg: "",
  revealBox: "",
  revealWarning: "",
  keyBox: "",
  keyText: "",
  copyBtn: "",
  copySuccessBtn: "",
  confirmBtn: "",
  confirmInline: "",
  confirmYesBtn: "",
  confirmNoBtn: "",
  actionBtn: "",
  actionBtnDanger: "",
  badgeActive: "badgeActive",
  badgeExpiring: "badgeExpiring",
  badgeExpired: "badgeExpired",
}));

const createQc = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (qc = createQc()) =>
  render(
    <QueryClientProvider client={qc}>
      <ApiKeysPanel />
    </QueryClientProvider>
  );

const sampleKey: ApiKeyItem = {
  id: "key-1",
  name: "Production",
  prefix: "erd_",
  expiresAt: null,
  createdAt: new Date("2025-01-01").toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

it("shows loading text while query is pending", () => {
  vi.mocked(apiKeysApi.listApiKeys).mockReturnValue(new Promise(() => {}));
  wrap();
  expect(screen.getByText("불러오는 중...")).toBeInTheDocument();
});

it("shows empty message when no keys", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([]);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("API 키가 없습니다. 새 키를 생성해주세요.")).toBeInTheDocument();
  });
});

it("shows key row with name and prefix when keys exist", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([sampleKey]);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("erd_••••")).toBeInTheDocument();
  });
});

it("shows 활성 badge when expiresAt is null", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([sampleKey]);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("활성")).toBeInTheDocument();
  });
});

it("shows 만료됨 badge when expiresAt is in the past", async () => {
  const expiredKey: ApiKeyItem = {
    ...sampleKey,
    expiresAt: new Date(Date.now() - 86400000).toISOString(),
  };
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([expiredKey]);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("만료됨")).toBeInTheDocument();
  });
});

it("shows D-N badge when expiry is within 7 days", async () => {
  const expiringKey: ApiKeyItem = {
    ...sampleKey,
    expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
  };
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([expiringKey]);
  wrap();
  await waitFor(() => {
    expect(screen.getByText(/^D-\d+$/)).toBeInTheDocument();
  });
});

it("toggles form open and closed with create button", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([]);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("API 키가 없습니다. 새 키를 생성해주세요.")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("+ 새 키 생성"));
  expect(screen.getByText("키 생성")).toBeInTheDocument();

  fireEvent.click(screen.getByText("취소"));
  expect(screen.queryByText("키 생성")).not.toBeInTheDocument();
});

it("submitting create form calls createApiKey and shows reveal box", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([]);
  const created: ApiKeyCreated = {
    apiKey: "erd_secret_abc123",
    id: "key-2",
    name: null,
    prefix: "erd_",
    expiresAt: null,
    createdAt: new Date().toISOString(),
  };
  vi.mocked(apiKeysApi.createApiKey).mockResolvedValue(created);
  wrap();

  await waitFor(() => {
    expect(screen.getByText("API 키가 없습니다. 새 키를 생성해주세요.")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("+ 새 키 생성"));
  fireEvent.change(screen.getByPlaceholderText("예: Production, Claude MCP"), {
    target: { value: "Test Key" },
  });
  fireEvent.click(screen.getByText("키 생성"));

  await waitFor(() => {
    expect(apiKeysApi.createApiKey).toHaveBeenCalled();
    expect((apiKeysApi.createApiKey as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toMatchObject(
      { name: "Test Key" }
    );
    expect(screen.getByText("erd_secret_abc123")).toBeInTheDocument();
  });
});

it("copy button in reveal box calls copyToClipboard", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([]);
  const created: ApiKeyCreated = {
    apiKey: "erd_secret_abc123",
    id: "key-2",
    name: null,
    prefix: "erd_",
    expiresAt: null,
    createdAt: new Date().toISOString(),
  };
  vi.mocked(apiKeysApi.createApiKey).mockResolvedValue(created);
  wrap();

  await waitFor(() => {
    expect(screen.getByText("API 키가 없습니다. 새 키를 생성해주세요.")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("+ 새 키 생성"));
  fireEvent.click(screen.getByText("키 생성"));

  await waitFor(() => {
    expect(screen.getByText("erd_secret_abc123")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("복사"));

  await waitFor(() => {
    expect(clipboardUtil.copyToClipboard).toHaveBeenCalledWith("erd_secret_abc123");
  });
});

it("dismiss button in reveal box hides the reveal box", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([]);
  const created: ApiKeyCreated = {
    apiKey: "erd_secret_abc123",
    id: "key-2",
    name: null,
    prefix: "erd_",
    expiresAt: null,
    createdAt: new Date().toISOString(),
  };
  vi.mocked(apiKeysApi.createApiKey).mockResolvedValue(created);
  wrap();

  await waitFor(() => {
    expect(screen.getByText("API 키가 없습니다. 새 키를 생성해주세요.")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("+ 새 키 생성"));
  fireEvent.click(screen.getByText("키 생성"));

  await waitFor(() => {
    expect(screen.getByText("erd_secret_abc123")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("확인"));
  expect(screen.queryByText("erd_secret_abc123")).not.toBeInTheDocument();
});

it("폐기 button shows confirm and calls revokeApiKey on 확인", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([sampleKey]);
  vi.mocked(apiKeysApi.revokeApiKey).mockResolvedValue(undefined);
  wrap();

  await waitFor(() => {
    expect(screen.getByText("Production")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("폐기"));
  expect(screen.getByText("정말 폐기할까요?")).toBeInTheDocument();

  fireEvent.click(screen.getByText("확인"));

  await waitFor(() => {
    expect(apiKeysApi.revokeApiKey).toHaveBeenCalled();
    expect((apiKeysApi.revokeApiKey as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe("key-1");
  });
});

it("재생성 button shows confirm and calls regenerateApiKey on 확인", async () => {
  const regenerated: ApiKeyCreated = {
    apiKey: "erd_new_key",
    id: "key-1",
    name: "Production",
    prefix: "erd_",
    expiresAt: null,
    createdAt: new Date().toISOString(),
  };
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([sampleKey]);
  vi.mocked(apiKeysApi.regenerateApiKey).mockResolvedValue(regenerated);
  wrap();

  await waitFor(() => {
    expect(screen.getByText("Production")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("재생성"));
  expect(screen.getByText("기존 키가 즉시 무효화됩니다.")).toBeInTheDocument();

  fireEvent.click(screen.getByText("확인"));

  await waitFor(() => {
    expect(apiKeysApi.regenerateApiKey).toHaveBeenCalled();
    expect((apiKeysApi.regenerateApiKey as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe("key-1");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @erdify/web test -- ApiKeysPanel --run
```

Expected: FAIL — `Cannot find module './ApiKeysPanel'`

- [ ] **Step 3: Create `ApiKeysPanel.tsx`**

Create `apps/web/src/features/dashboard/pages/ApiKeysPanel.tsx`:

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listApiKeys, createApiKey, revokeApiKey, regenerateApiKey } from "../../../shared/api/api-keys.api";
import type { ApiKeyItem, ApiKeyCreated } from "../../../shared/api/api-keys.api";
import { copyToClipboard } from "../../../shared/utils/clipboard";
import * as css from "./api-keys-panel.css";

type ExpiryPreset = "30d" | "90d" | "1y" | "none" | "custom";

const PRESET_LABELS: Record<ExpiryPreset, string> = {
  "30d": "30일",
  "90d": "90일",
  "1y": "1년",
  none: "무기한",
  custom: "직접 입력",
};

function expiresAtFromPreset(preset: ExpiryPreset, customDate: string): string | undefined {
  if (preset === "30d") return new Date(Date.now() + 30 * 86400000).toISOString();
  if (preset === "90d") return new Date(Date.now() + 90 * 86400000).toISOString();
  if (preset === "1y") return new Date(Date.now() + 365 * 86400000).toISOString();
  if (preset === "custom" && customDate) return new Date(customDate).toISOString();
  return undefined;
}

function getStatusInfo(key: ApiKeyItem): { label: string; type: "active" | "expiring" | "expired" } {
  if (!key.expiresAt) return { label: "활성", type: "active" };
  const ms = new Date(key.expiresAt).getTime() - Date.now();
  if (ms < 0) return { label: "만료됨", type: "expired" };
  if (ms < 7 * 86400000) return { label: `D-${Math.ceil(ms / 86400000)}`, type: "expiring" };
  return { label: "활성", type: "active" };
}

const BADGE_CLASS: Record<"active" | "expiring" | "expired", string> = {
  active: css.badgeActive,
  expiring: css.badgeExpiring,
  expired: css.badgeExpired,
};

export const ApiKeysPanel = () => {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formExpiry, setFormExpiry] = useState<ExpiryPreset>("1y");
  const [formCustomDate, setFormCustomDate] = useState("");

  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmRegenerateId, setConfirmRegenerateId] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: listApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      setRevealedKey(data);
      setShowForm(false);
      setFormName("");
      setFormExpiry("1y");
      setFormCustomDate("");
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      setConfirmRevokeId(null);
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateApiKey,
    onSuccess: (data) => {
      setRevealedKey(data);
      setConfirmRegenerateId(null);
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  function handleCreate() {
    if (formExpiry === "custom" && formCustomDate) {
      if (new Date(formCustomDate).getTime() <= Date.now()) return;
    }
    const expiresAt = expiresAtFromPreset(formExpiry, formCustomDate);
    const trimmedName = formName.trim();
    const body: { name?: string; expiresAt?: string } = {};
    if (trimmedName) body.name = trimmedName;
    if (expiresAt) body.expiresAt = expiresAt;
    createMutation.mutate(body);
  }

  async function handleCopyKey() {
    if (!revealedKey) return;
    await copyToClipboard(revealedKey.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDismissReveal() {
    setRevealedKey(null);
    setCopied(false);
  }

  return (
    <div className={css.page}>
      <div className={css.header}>
        <div>
          <h1 className={css.title}>API 키</h1>
          <p className={css.subtitle}>HTTP 헤더 X-Api-Key 또는 Bearer 토큰으로 사용</p>
        </div>
        <button className={css.createBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "취소" : "+ 새 키 생성"}
        </button>
      </div>

      {showForm && (
        <div className={css.createForm}>
          <div className={css.formRow}>
            <label className={css.label}>
              키 이름 <span className={css.optional}>(선택)</span>
            </label>
            <input
              className={css.input}
              type="text"
              placeholder="예: Production, Claude MCP"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className={css.formRow}>
            <label className={css.label}>만료 기간</label>
            <div className={css.chips}>
              {(["30d", "90d", "1y", "none", "custom"] as ExpiryPreset[]).map((p) => (
                <button
                  key={p}
                  className={formExpiry === p ? css.chipActive : css.chip}
                  onClick={() => setFormExpiry(p)}
                >
                  {PRESET_LABELS[p]}
                </button>
              ))}
            </div>
            {formExpiry === "custom" && (
              <input
                className={css.input}
                type="date"
                value={formCustomDate}
                onChange={(e) => setFormCustomDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                style={{ marginTop: 8 }}
              />
            )}
          </div>
          <div className={css.formActions}>
            <button
              className={css.createSubmitBtn}
              onClick={handleCreate}
              disabled={createMutation.isPending || (formExpiry === "custom" && !formCustomDate)}
            >
              {createMutation.isPending ? "생성 중..." : "키 생성"}
            </button>
          </div>
          {createMutation.isError && <p className={css.errorMsg}>키 생성에 실패했습니다.</p>}
        </div>
      )}

      {revealedKey && (
        <div className={css.revealBox}>
          <p className={css.revealWarning}>
            이 키는 지금만 표시됩니다. 안전한 곳에 복사해 보관하세요.
          </p>
          <div className={css.keyBox}>
            <span className={css.keyText}>{revealedKey.apiKey}</span>
            <button
              className={copied ? css.copySuccessBtn : css.copyBtn}
              onClick={handleCopyKey}
            >
              {copied ? "복사됨 ✓" : "복사"}
            </button>
          </div>
          <button className={css.confirmBtn} onClick={handleDismissReveal}>확인</button>
        </div>
      )}

      {isLoading ? (
        <p className={css.emptyMsg}>불러오는 중...</p>
      ) : keys.length === 0 ? (
        <p className={css.emptyMsg}>API 키가 없습니다. 새 키를 생성해주세요.</p>
      ) : (
        <>
          <div className={css.sectionLabel}>활성 키 · {keys.length}개</div>
          <div className={css.card}>
            {keys.map((key) => {
              const status = getStatusInfo(key);
              return (
                <div key={key.id} className={css.keyRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={css.keyName}>{key.name ?? "—"}</div>
                    <div className={css.keyMeta}>
                      <span>{key.prefix}••••</span>
                      <span> · {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString("ko-KR") : "무기한"}</span>
                    </div>
                  </div>
                  <span className={BADGE_CLASS[status.type]}>{status.label}</span>
                  {confirmRegenerateId === key.id ? (
                    <div className={css.confirmInline}>
                      <span>기존 키가 즉시 무효화됩니다.</span>
                      <button
                        className={css.confirmYesBtn}
                        onClick={() => regenerateMutation.mutate(key.id)}
                        disabled={regenerateMutation.isPending}
                      >
                        확인
                      </button>
                      <button
                        className={css.confirmNoBtn}
                        onClick={() => setConfirmRegenerateId(null)}
                      >
                        취소
                      </button>
                    </div>
                  ) : confirmRevokeId === key.id ? (
                    <div className={css.confirmInline}>
                      <span>정말 폐기할까요?</span>
                      <button
                        className={css.confirmYesBtn}
                        onClick={() => revokeMutation.mutate(key.id)}
                        disabled={revokeMutation.isPending}
                      >
                        확인
                      </button>
                      <button
                        className={css.confirmNoBtn}
                        onClick={() => setConfirmRevokeId(null)}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className={css.actionBtn}
                        onClick={() => setConfirmRegenerateId(key.id)}
                      >
                        재생성
                      </button>
                      <button
                        className={css.actionBtnDanger}
                        onClick={() => setConfirmRevokeId(key.id)}
                      >
                        폐기
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @erdify/web test -- ApiKeysPanel --run
```

Expected: All 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/pages/ApiKeysPanel.tsx \
        apps/web/src/features/dashboard/pages/ApiKeysPanel.test.tsx
git commit -m "feat(web): add ApiKeysPanel component with card-list layout"
```

---

## Task 3: Update `UnifiedSidebar` (TDD)

**Files:**
- Modify: `apps/web/src/features/dashboard/components/UnifiedSidebar.test.tsx`
- Modify: `apps/web/src/features/dashboard/components/unified-sidebar.css.ts`
- Modify: `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx`

- [ ] **Step 1: Update `UnifiedSidebar.test.tsx` — add props to `defaultProps` and 2 new tests**

In `apps/web/src/features/dashboard/components/UnifiedSidebar.test.tsx`, find the `defaultProps` object (lines 46–61) and replace it:

```typescript
const defaultProps = {
  orgs,
  selectedOrgId: "org-1",
  onSelectOrg: vi.fn(),
  onDeleteOrg: vi.fn(),
  onCreateOrg: vi.fn(),
  projects,
  selectedProjectId: null,
  onSelectProject: vi.fn(),
  onDeleteProject: vi.fn(),
  onCreateProject: vi.fn(),
  diagrams: [],
  onCreateDiagram: vi.fn(),
  memberManagementActive: false,
  onManageMembers: vi.fn(),
  apiKeysActive: false,
  onApiKeys: vi.fn(),
};
```

Then append 2 new tests at the end of the `describe("UnifiedSidebar", ...)` block (before the closing `}`):

```typescript
  it("API 키 버튼은 조직 미선택 상태에서도 렌더링된다", () => {
    wrap(<UnifiedSidebar {...defaultProps} selectedOrgId={null} />);
    expect(screen.getByText("API 키")).toBeInTheDocument();
  });

  it("API 키 버튼 클릭 시 onApiKeys가 호출된다", () => {
    const onApiKeys = vi.fn();
    wrap(<UnifiedSidebar {...defaultProps} onApiKeys={onApiKeys} />);
    fireEvent.click(screen.getByText("API 키").closest("button")!);
    expect(onApiKeys).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Run tests to confirm they fail (TypeScript prop mismatch)**

```bash
pnpm --filter @erdify/web test -- UnifiedSidebar --run
```

Expected: FAIL — `Object literal may only specify known properties` (TypeScript error on `apiKeysActive`)

- [ ] **Step 3: Add `sidebarBottomBar` to `unified-sidebar.css.ts`**

In `apps/web/src/features/dashboard/components/unified-sidebar.css.ts`, append before the end of the file:

```typescript
export const sidebarBottomBar = style({
  borderTop: `1px solid ${vars.color.border}`,
  padding: `${vars.space["2"]} 0`,
  flexShrink: 0,
});
```

- [ ] **Step 4: Update `UnifiedSidebar.tsx` — add props and bottom bar section**

In `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx`:

**4a.** Find the `interface UnifiedSidebarProps` block and add 2 new props:

Replace:
```typescript
  memberManagementActive: boolean;
  onManageMembers: () => void;
```
With:
```typescript
  memberManagementActive: boolean;
  onManageMembers: () => void;
  apiKeysActive: boolean;
  onApiKeys: () => void;
```

**4b.** Find the destructured props in the component function signature and add `apiKeysActive` and `onApiKeys`:

Replace:
```typescript
  memberManagementActive, onManageMembers,
```
With:
```typescript
  memberManagementActive, onManageMembers, apiKeysActive, onApiKeys,
```

**4c.** Find the closing of the `{selectedOrgId && (...)}` block followed by `</aside>` (the last 3 lines of the JSX):

Replace:
```tsx
      {selectedOrgId && (
        // ... existing block ...
      )}
    </aside>
```

The closing two lines are:
```tsx
      )}
    </aside>
```

Insert the `sidebarBottomBar` section between them:

```tsx
      )}

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
    </aside>
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pnpm --filter @erdify/web test -- UnifiedSidebar --run
```

Expected: All existing + 2 new tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/dashboard/components/UnifiedSidebar.tsx \
        apps/web/src/features/dashboard/components/unified-sidebar.css.ts \
        apps/web/src/features/dashboard/components/UnifiedSidebar.test.tsx
git commit -m "feat(web): add API 키 button to UnifiedSidebar bottom bar"
```

---

## Task 4: Update `DashboardPage.tsx`

**Files:**
- Modify: `apps/web/src/features/dashboard/pages/DashboardPage.tsx`

- [ ] **Step 1: Add `ApiKeysPanel` import**

In `apps/web/src/features/dashboard/pages/DashboardPage.tsx`, after the `MemberManagementPage` import (line 19), add:

```typescript
import { ApiKeysPanel } from "./ApiKeysPanel";
```

- [ ] **Step 2: Add `apiKeysOpen` state**

After line 44 (`const [memberManagementOpen, setMemberManagementOpen] = useState(false);`), add:

```typescript
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
```

- [ ] **Step 3: Update `deleteOrgMutation.onSuccess` to close both views**

Find (lines 70–77):
```typescript
    onSuccess: (_data, orgId) => {
      if (selectedOrganizationId === orgId) {
        reset();
        setMemberManagementOpen(false);
      }
      void queryClient.invalidateQueries({ queryKey: ["orgs"] });
    },
```

Replace with:
```typescript
    onSuccess: (_data, orgId) => {
      if (selectedOrganizationId === orgId) {
        reset();
        setMemberManagementOpen(false);
        setApiKeysOpen(false);
      }
      void queryClient.invalidateQueries({ queryKey: ["orgs"] });
    },
```

- [ ] **Step 4: Add `handleApiKeys` function**

After the existing `handleSelectOrg` function (after line 155), add:

```typescript
  function handleApiKeys() {
    setApiKeysOpen(true);
    setMemberManagementOpen(false);
  }
```

- [ ] **Step 5: Remove "API 키 관리" from avatar dropdown**

Find and delete these lines (lines 209–211):
```typescript
              <button className={dropdownItem} onClick={() => { setMenuOpen(false); navigate("/settings/api-keys"); }}>
                API 키 관리
              </button>
```

- [ ] **Step 6: Update `UnifiedSidebar` props and `onManageMembers` handler**

Find (lines 221–236):
```tsx
        <UnifiedSidebar
          orgs={orgs}
          selectedOrgId={selectedOrganizationId}
          onSelectOrg={handleSelectOrg}
          onDeleteOrg={handleDeleteOrg}
          onCreateOrg={handleOpenOrgModal}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          onDeleteProject={handleDeleteProject}
          onCreateProject={handleOpenProjectModal}
          diagrams={diagrams}
          onCreateDiagram={handleOpenDiagramModal}
          memberManagementActive={memberManagementOpen}
          onManageMembers={() => setMemberManagementOpen(true)}
        />
```

Replace with:
```tsx
        <UnifiedSidebar
          orgs={orgs}
          selectedOrgId={selectedOrganizationId}
          onSelectOrg={handleSelectOrg}
          onDeleteOrg={handleDeleteOrg}
          onCreateOrg={handleOpenOrgModal}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          onDeleteProject={handleDeleteProject}
          onCreateProject={handleOpenProjectModal}
          diagrams={diagrams}
          onCreateDiagram={handleOpenDiagramModal}
          memberManagementActive={memberManagementOpen}
          onManageMembers={() => { setMemberManagementOpen(true); setApiKeysOpen(false); }}
          apiKeysActive={apiKeysOpen}
          onApiKeys={handleApiKeys}
        />
```

- [ ] **Step 7: Replace 2-way conditional render with 3-way**

Find (lines 238–254):
```tsx
        {memberManagementOpen && selectedOrganizationId ? (
          <MemberManagementPage
            orgId={selectedOrganizationId}
            orgName={orgs.find((o) => o.id === selectedOrganizationId)?.name ?? ""}
          />
        ) : (
          <DiagramGrid
            diagrams={diagrams}
            {...(selectedProject?.name ? { projectName: selectedProject.name } : {})}
            currentUserId={me?.id ?? null}
            onCreateDiagram={handleOpenDiagramModal}
            {...(selectedProjectId ? { onImportDiagram: handleOpenImportModal } : {})}
            onDeleteDiagram={handleDeleteDiagram}
            loading={diagramsLoading && !!selectedProjectId}
            {...(searchQuery ? { filterQuery: searchQuery } : {})}
          />
        )}
```

Replace with:
```tsx
        {apiKeysOpen ? (
          <ApiKeysPanel />
        ) : memberManagementOpen && selectedOrganizationId ? (
          <MemberManagementPage
            orgId={selectedOrganizationId}
            orgName={orgs.find((o) => o.id === selectedOrganizationId)?.name ?? ""}
          />
        ) : (
          <DiagramGrid
            diagrams={diagrams}
            {...(selectedProject?.name ? { projectName: selectedProject.name } : {})}
            currentUserId={me?.id ?? null}
            onCreateDiagram={handleOpenDiagramModal}
            {...(selectedProjectId ? { onImportDiagram: handleOpenImportModal } : {})}
            onDeleteDiagram={handleDeleteDiagram}
            loading={diagramsLoading && !!selectedProjectId}
            {...(searchQuery ? { filterQuery: searchQuery } : {})}
          />
        )}
```

- [ ] **Step 8: Run tests**

```bash
pnpm --filter @erdify/web test --run
```

Expected: All tests PASS (the DashboardPage itself has no unit tests, so this just confirms nothing else broke)

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/features/dashboard/pages/DashboardPage.tsx
git commit -m "feat(web): wire ApiKeysPanel into DashboardPage with 3-way render"
```

---

## Task 5: Update Router and Delete Old Files

**Files:**
- Modify: `apps/web/src/app/Router.tsx`
- Delete: `apps/web/src/features/settings/pages/ApiKeysPage.tsx`
- Delete: `apps/web/src/features/settings/pages/api-keys-page.css.ts`
- Delete: `apps/web/src/features/settings/pages/ApiKeysPage.test.tsx`

- [ ] **Step 1: Remove the `/settings/api-keys` route from `Router.tsx`**

In `apps/web/src/app/Router.tsx`, replace the entire file with:

```tsx
import { Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { EditorPage } from "../features/editor/pages/EditorPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { SharedDiagramPage } from "../features/shared-diagram/pages/SharedDiagramPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export const Router = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/share/:shareToken" element={<SharedDiagramPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/diagrams/:diagramId" element={<EditorPage />} />
      <Route path="/*" element={<DashboardPage />} />
    </Route>
  </Routes>
);
```

- [ ] **Step 2: Delete the old settings files**

```bash
rm apps/web/src/features/settings/pages/ApiKeysPage.tsx \
   apps/web/src/features/settings/pages/api-keys-page.css.ts \
   apps/web/src/features/settings/pages/ApiKeysPage.test.tsx
```

- [ ] **Step 3: Check if `settings/` directory is now empty and remove it**

```bash
ls apps/web/src/features/settings/pages/
```

Expected: empty output. If empty, run:

```bash
rmdir apps/web/src/features/settings/pages/ apps/web/src/features/settings/
```

- [ ] **Step 4: Run all tests to confirm nothing is broken**

```bash
pnpm --filter @erdify/web test --run
```

Expected: All tests PASS. The deleted `ApiKeysPage.test.tsx` tests are gone; `ApiKeysPanel.test.tsx` replaces them. Pre-existing failures in `diagrams.service.spec.ts` and `collaboration.gateway.spec.ts` are not introduced by this change.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/Router.tsx
git rm apps/web/src/features/settings/pages/ApiKeysPage.tsx \
       apps/web/src/features/settings/pages/api-keys-page.css.ts \
       apps/web/src/features/settings/pages/ApiKeysPage.test.tsx
git commit -m "feat(web): migrate API keys to inline panel, remove settings route"
```
