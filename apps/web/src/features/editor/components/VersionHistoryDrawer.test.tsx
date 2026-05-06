import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UseVersionHistoryResult } from "../hooks/useVersionHistory";
import { VersionHistoryDrawer } from "./VersionHistoryDrawer";

vi.mock("../hooks/useVersionHistory");

import { useVersionHistory } from "../hooks/useVersionHistory";

const mockHook = (overrides: Partial<UseVersionHistoryResult> = {}): UseVersionHistoryResult => ({
  versions: [],
  isLoadingVersions: false,
  saveVersion: vi.fn(),
  isSavingVersion: false,
  restoreVersion: vi.fn(),
  isRestoring: false,
  ...overrides
});

describe("VersionHistoryDrawer", () => {
  it("renders empty state when there are no versions", () => {
    vi.mocked(useVersionHistory).mockReturnValue(mockHook());

    render(<VersionHistoryDrawer diagramId="d" onClose={vi.fn()} />);

    expect(screen.getByText("버전 기록")).toBeInTheDocument();
    expect(screen.getByText("저장된 버전이 없습니다.")).toBeInTheDocument();
  });

  it("renders loading state when isLoadingVersions is true", () => {
    vi.mocked(useVersionHistory).mockReturnValue(
      mockHook({ isLoadingVersions: true })
    );

    render(<VersionHistoryDrawer diagramId="d" onClose={vi.fn()} />);

    expect(screen.queryByText("저장된 버전이 없습니다.")).not.toBeInTheDocument();
    expect(document.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThan(0);
  });

  it("renders version list when versions exist", () => {
    vi.mocked(useVersionHistory).mockReturnValue(
      mockHook({
        versions: [
          {
            id: "v1",
            diagramId: "d",
            content: {} as never,
            revision: 1,
            createdBy: "user-1",
            createdAt: "2026-04-30T12:00:00Z"
          }
        ]
      })
    );

    render(<VersionHistoryDrawer diagramId="d" onClose={vi.fn()} />);

    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "복원" })).toBeInTheDocument();
  });
});
