import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as apiKeysApi from "@/shared/api/api-keys.api";
import type { ApiKeyItem, ApiKeyCreated } from "@/shared/api/api-keys.api";
import * as clipboardUtil from "@/shared/utils/clipboard";
import { ApiKeysPanel } from "./ApiKeysPanel";

vi.mock("@/shared/api/api-keys.api");
vi.mock("@/shared/utils/clipboard", () => ({
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
  legend: "",
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

it("만료 기간 선택 그룹은 fieldset/legend로 렌더링되며 legend가 그룹명을 표시한다", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([]);
  wrap();

  await waitFor(() => {
    expect(screen.getByText("API 키가 없습니다. 새 키를 생성해주세요.")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("+ 새 키 생성"));

  const group = screen.getByRole("group", { name: "만료 기간" });
  expect(group.tagName).toBe("FIELDSET");
  expect(screen.getByText("만료 기간").tagName).toBe("LEGEND");
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

it("listApiKeys 실패 시 빈 키 목록 메시지를 표시한다", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockRejectedValue(new Error("Network error"));
  wrap();
  await waitFor(() => {
    expect(screen.getByText("API 키가 없습니다. 새 키를 생성해주세요.")).toBeInTheDocument();
  });
});

it("createApiKey 실패 시 에러 메시지를 표시한다", async () => {
  vi.mocked(apiKeysApi.listApiKeys).mockResolvedValue([]);
  vi.mocked(apiKeysApi.createApiKey).mockRejectedValue(new Error("Server error"));
  wrap();

  await waitFor(() => {
    expect(screen.getByText("API 키가 없습니다. 새 키를 생성해주세요.")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("+ 새 키 생성"));
  fireEvent.click(screen.getByText("키 생성"));

  await waitFor(() => {
    expect(screen.getByText("키 생성에 실패했습니다.")).toBeInTheDocument();
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
