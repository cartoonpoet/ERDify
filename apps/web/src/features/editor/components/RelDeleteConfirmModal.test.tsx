import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RelDeleteConfirmModal } from "./RelDeleteConfirmModal";
import { useEditorStore } from "../stores/useEditorStore";
import * as erdifyDomain from "@erdify/domain";

vi.mock("../stores/useEditorStore");
vi.mock("@erdify/domain", () => ({
  removeRelationship: vi.fn((doc) => doc),
  removeColumn: vi.fn((doc) => doc),
}));
vi.mock("../../../design-system/Modal", () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div role="dialog">{title && <div>{title}</div>}{children}</div> : null,
}));
vi.mock("./invite-modal.css", () => ({ body: "", footer: "", cancelBtn: "" }));

const mockApplyCommand = vi.fn();
const mockSetPendingRelDelete = vi.fn();
let mockPendingRelDelete: { relId: string; srcEntityId: string; fkColIds: string[]; fkColNames: string[] } | null = null;

vi.mocked(useEditorStore).mockImplementation((selector: any) =>
  selector({
    pendingRelDelete: mockPendingRelDelete,
    setPendingRelDelete: mockSetPendingRelDelete,
    applyCommand: mockApplyCommand,
  })
);

describe("RelDeleteConfirmModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPendingRelDelete = null;
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({
        pendingRelDelete: mockPendingRelDelete,
        setPendingRelDelete: mockSetPendingRelDelete,
        applyCommand: mockApplyCommand,
      })
    );
  });

  it("does not render dialog when pendingRelDelete is null", () => {
    mockPendingRelDelete = null;
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({
        pendingRelDelete: null,
        setPendingRelDelete: mockSetPendingRelDelete,
        applyCommand: mockApplyCommand,
      })
    );
    render(<RelDeleteConfirmModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows FK column names in modal when pendingRelDelete is set", () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({
        pendingRelDelete: {
          relId: "rel-1",
          srcEntityId: "e-1",
          fkColIds: ["col-1"],
          fkColNames: ["user_id"],
        },
        setPendingRelDelete: mockSetPendingRelDelete,
        applyCommand: mockApplyCommand,
      })
    );
    render(<RelDeleteConfirmModal />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/user_id/)).toBeInTheDocument();
  });

  it('clicking "취소" calls setPendingRelDelete(null)', () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({
        pendingRelDelete: {
          relId: "rel-1",
          srcEntityId: "e-1",
          fkColIds: ["col-1"],
          fkColNames: ["user_id"],
        },
        setPendingRelDelete: mockSetPendingRelDelete,
        applyCommand: mockApplyCommand,
      })
    );
    render(<RelDeleteConfirmModal />);
    fireEvent.click(screen.getByText("취소"));
    expect(mockSetPendingRelDelete).toHaveBeenCalledWith(null);
  });

  it('clicking "관계만 삭제" calls applyCommand then setPendingRelDelete(null)', () => {
    vi.mocked(useEditorStore).mockImplementation((selector: any) =>
      selector({
        pendingRelDelete: {
          relId: "rel-1",
          srcEntityId: "e-1",
          fkColIds: ["col-1"],
          fkColNames: ["user_id"],
        },
        setPendingRelDelete: mockSetPendingRelDelete,
        applyCommand: mockApplyCommand,
      })
    );
    render(<RelDeleteConfirmModal />);
    fireEvent.click(screen.getByText("관계만 삭제"));
    expect(mockApplyCommand).toHaveBeenCalled();
    expect(mockSetPendingRelDelete).toHaveBeenCalledWith(null);
  });
});
