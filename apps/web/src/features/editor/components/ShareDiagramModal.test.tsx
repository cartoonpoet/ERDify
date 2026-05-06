import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShareDiagramModal } from "./ShareDiagramModal";
import { shareDiagram, revokeDiagramShare } from "../../../shared/api/diagrams.api";
import { copyToClipboard } from "../../../shared/utils/clipboard";

vi.mock("../../../shared/api/diagrams.api", () => ({
  shareDiagram: vi.fn(),
  revokeDiagramShare: vi.fn(),
}));

vi.mock("../../../shared/utils/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./share-diagram-modal.css", () => ({
  body: "",
  linkBox: "",
  linkInput: "",
  copyBtn: "",
  expiry: "",
  divider: "",
  sectionLabel: "",
  presetRow: "",
  presetBtn: "",
  revokeBtn: "",
  errorText: "",
  description: "",
}));

vi.mock("lucide-react", () => ({
  Copy: () => <span data-testid="icon-copy" />,
  Check: () => <span data-testid="icon-check" />,
}));

vi.mock("../../../design-system", () => ({
  Modal: ({
    open,
    children,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    title?: string;
  }) =>
    open ? (
      <div role="dialog">
        {title && <div>{title}</div>}
        {children}
      </div>
    ) : null,
}));

const createQc = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const wrap = (
  props: React.ComponentProps<typeof ShareDiagramModal>,
  qc = createQc()
) =>
  render(
    <QueryClientProvider client={qc}>
      <ShareDiagramModal {...props} />
    </QueryClientProvider>
  );

const baseProps = {
  open: true,
  diagramId: "diag-1",
  onClose: vi.fn(),
};

describe("ShareDiagramModal", () => {
  it("no share token — shows description text about creating a link", () => {
    wrap({ ...baseProps, initialShareToken: null, initialExpiresAt: null });
    expect(
      screen.getByText(/만료 시간을 선택하면 공유 링크가 생성됩니다/)
    ).toBeInTheDocument();
  });

  it("no share token — preset buttons (1시간, 1일, 7일, 30일) are visible", () => {
    wrap({ ...baseProps, initialShareToken: null, initialExpiresAt: null });
    expect(screen.getByRole("button", { name: "1시간" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1일" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7일" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30일" })).toBeInTheDocument();
  });

  it("clicking '1일' preset calls shareDiagram('diag-1', '1d')", async () => {
    vi.mocked(shareDiagram).mockResolvedValue({
      shareToken: "tok123",
      expiresAt: new Date().toISOString(),
    });

    wrap({ ...baseProps, initialShareToken: null, initialExpiresAt: null });
    fireEvent.click(screen.getByRole("button", { name: "1일" }));

    await waitFor(() => {
      expect(shareDiagram).toHaveBeenCalledWith("diag-1", "1d");
    });
  });

  it("has share token — shows link input (readonly, value contains shareToken)", () => {
    wrap({
      ...baseProps,
      initialShareToken: "abc123",
      initialExpiresAt: null,
    });

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveAttribute("readonly");
    expect(input.value).toContain("abc123");
  });

  it("has share token + expiresAt — shows expiry text", () => {
    const expiresAt = "2025-12-31T23:59:59.000Z";
    wrap({
      ...baseProps,
      initialShareToken: "abc123",
      initialExpiresAt: expiresAt,
    });

    expect(screen.getByText(/유효 기간/)).toBeInTheDocument();
  });

  it("'링크 비활성화' button calls revokeDiagramShare('diag-1')", async () => {
    vi.mocked(revokeDiagramShare).mockResolvedValue(undefined);

    wrap({
      ...baseProps,
      initialShareToken: "abc123",
      initialExpiresAt: null,
    });

    fireEvent.click(screen.getByRole("button", { name: "링크 비활성화" }));

    await waitFor(() => {
      expect(revokeDiagramShare).toHaveBeenCalledWith("diag-1");
    });
  });

  it("share mutation error — shows error text '링크 생성에 실패했습니다.'", async () => {
    vi.mocked(shareDiagram).mockRejectedValue(new Error("server error"));

    wrap({ ...baseProps, initialShareToken: null, initialExpiresAt: null });
    fireEvent.click(screen.getByRole("button", { name: "1시간" }));

    await waitFor(() => {
      expect(
        screen.getByText("링크 생성에 실패했습니다.")
      ).toBeInTheDocument();
    });
  });
});
