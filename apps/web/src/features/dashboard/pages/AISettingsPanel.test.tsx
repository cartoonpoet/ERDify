import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as aiApi from "@/features/ai/api/ai.api";
import type { OrgAiSettings } from "@erdify/contracts";
import { AISettingsPanel } from "./AISettingsPanel";

vi.mock("@/features/ai/api/ai.api");
vi.mock("./ai-settings-panel.css", () => ({
  section: "",
  sectionLabel: "",
  card: "",
  cardBody: "",
  descRow: "",
  descText: "",
  statusRow: "",
  statusLabel: "",
  statusBadgeSet: "",
  statusBadgeUnset: "",
  inputRow: "",
  input: "",
  actionRow: "",
  providerRow: "",
  providerLabel: "",
  modelRow: "",
  modelSelect: "",
  readonlyNote: "",
  errorText: "",
  providerHeader: "",
  providerIcon: { anthropic: "", openai: "", gemini: "" },
  providerSectionDivider: "",
  checkboxList: "",
  checkboxItem: "",
  checkboxItemSelected: "checkboxItemSelected",
  checkboxItemDisabled: "",
  customCheckbox: "",
  customCheckboxChecked: "",
  checkboxLabel: "",
  checkboxBadge: "",
}));

const createQc = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (orgId = "org-1", isOwner = true) => {
  const qc = createQc();
  return render(
    <QueryClientProvider client={qc}>
      <AISettingsPanel orgId={orgId} isOwner={isOwner} />
    </QueryClientProvider>
  );
};

const settingsWithAnthropic: OrgAiSettings = {
  organizationId: "org-1",
  providers: { anthropic: true, openai: false, gemini: false },
  enabledModels: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

it("등록된 provider가 없으면 모델 섹션이 렌더되지 않는다", async () => {
  vi.mocked(aiApi.getOrgAiSettings).mockResolvedValue({
    organizationId: "org-1",
    providers: { anthropic: false, openai: false, gemini: false },
    enabledModels: [],
  });
  wrap();
  await waitFor(() => {
    expect(screen.queryByText("사용 가능 모델")).not.toBeInTheDocument();
  });
});

it("Anthropic이 등록되면 모델 카드들이 렌더된다", async () => {
  vi.mocked(aiApi.getOrgAiSettings).mockResolvedValue(settingsWithAnthropic);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("사용 가능 모델")).toBeInTheDocument();
    expect(screen.getByText("Claude Sonnet 4.6")).toBeInTheDocument();
    expect(screen.getByText("Claude Opus 4.6")).toBeInTheDocument();
  });
});

it("enabledModels가 비어있으면 아무 카드도 선택되지 않는다", async () => {
  vi.mocked(aiApi.getOrgAiSettings).mockResolvedValue(settingsWithAnthropic);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("Claude Sonnet 4.6")).toBeInTheDocument();
  });
  const cards = document.querySelectorAll(".checkboxItemSelected");
  expect(cards.length).toBe(0);
});

it("카드 클릭 시 모델이 토글되고 저장 버튼이 나타난다", async () => {
  vi.mocked(aiApi.getOrgAiSettings).mockResolvedValue(settingsWithAnthropic);
  wrap();
  await waitFor(() => {
    expect(screen.getByText("Claude Sonnet 4.6")).toBeInTheDocument();
  });
  expect(screen.queryByText("모델 설정 저장")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Claude Sonnet 4.6/ }));
  await waitFor(() => {
    expect(screen.getByText("모델 설정 저장")).toBeInTheDocument();
  });
});

it("isOwner=false이면 저장 버튼이 없다", async () => {
  vi.mocked(aiApi.getOrgAiSettings).mockResolvedValue({
    ...settingsWithAnthropic,
    enabledModels: ["claude-sonnet-4-6"],
  });
  wrap("org-1", false);
  await waitFor(() => {
    expect(screen.getByText("Claude Sonnet 4.6")).toBeInTheDocument();
  });
  expect(screen.queryByText("모델 설정 저장")).not.toBeInTheDocument();
});
