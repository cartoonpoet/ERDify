import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as apiKeysApi from "../../../shared/api/api-keys.api";
import type { ApiKeyItem, ApiKeyCreated } from "../../../shared/api/api-keys.api";
import * as clipboardUtil from "../../../shared/utils/clipboard";
import { ApiKeysPage } from "./ApiKeysPage";

vi.mock("../../../shared/api/api-keys.api");
vi.mock("../../../shared/utils/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./api-keys-page.css", () => ({
  page: "",
  container: "",
  header: "",
  backBtn: "",
  title: "",
  createBtn: "",
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
  emptyMsg: "",
  table: "",
  th: "",
  tr: "",
  td: "",
  tdMono: "",
  tdActions: "",
  confirmInline: "",
  confirmYesBtn: "",
  confirmNoBtn: "",
  actionsRow: "",
  actionBtn: "",
  actionBtnDanger: "",
  badgeActive: "badgeActive",
  badgeExpiring: "badgeExpiring",
  badgeExpired: "badgeExpired",
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const createQc = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (qc = createQc()) =>
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>
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

// 1. Shows empty message when no keys
it("shows empty message when no keys", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([]);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("API 키가 없습니다. 새 키를 생성해주세요.")).toBeInTheDocument();
  });
});

// 2. Shows loading text while query is pending
it("shows loading text while query is pending", () => {
  vi.mocked(apiKeysApi.listApiKeys).mockReturnValue(new Promise(() => {}));
  wrap();
  expect(screen.getByText("불러오는 중...")).toBeInTheDocument();
});

// 3. Shows key table row with name and prefix when keys exist
it("shows key table row with name and prefix when keys exist", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([sampleKey]);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("erd_••••")).toBeInTheDocument();
  });
});

// 4. Status badge shows "활성" when expiresAt is null
it("shows 활성 badge when expiresAt is null", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([sampleKey]);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("활성")).toBeInTheDocument();
  });
});

// 5. Status badge shows "만료됨" when expiresAt is in the past
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

// 6. Status badge shows D-N format when expiry is within 7 days (3 days from now)
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

// 7. "+ 새 키 생성" button toggles form; clicking again hides form
it("toggles form open and closed with create button", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([]);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("API 키가 없습니다. 새 키를 생성해주세요.")).toBeInTheDocument();
  });

  const toggleBtn = screen.getByText("+ 새 키 생성");
  fireEvent.click(toggleBtn);
  expect(screen.getByText("키 생성")).toBeInTheDocument();

  const cancelBtn = screen.getByText("취소");
  fireEvent.click(cancelBtn);
  expect(screen.queryByText("키 생성")).not.toBeInTheDocument();
});

// 8. Submitting create form calls createApiKey and shows reveal box
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

  const nameInput = screen.getByPlaceholderText("예: Production, Claude MCP");
  fireEvent.change(nameInput, { target: { value: "Test Key" } });

  fireEvent.click(screen.getByText("키 생성"));

  await waitFor(() => {
    expect(apiKeysApi.createApiKey).toHaveBeenCalled();
    expect((apiKeysApi.createApiKey as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toMatchObject(
      { name: "Test Key" }
    );
    expect(screen.getByText("erd_secret_abc123")).toBeInTheDocument();
  });
});

// 9. Reveal box dismiss button ("확인") hides the reveal box
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

  // "확인" in the reveal box dismisses it
  const confirmBtn = screen.getByText("확인");
  fireEvent.click(confirmBtn);

  expect(screen.queryByText("erd_secret_abc123")).not.toBeInTheDocument();
});

// 10. "폐기" button shows confirm; clicking "확인" calls revokeApiKey(key.id)
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

// 11. "← 대시보드" button calls navigate("/")
it("back button calls navigate('/')", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([]);
  wrap();

  fireEvent.click(screen.getByText("← 대시보드"));

  expect(mockNavigate).toHaveBeenCalledWith("/");
});
