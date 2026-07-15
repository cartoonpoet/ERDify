import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RelDeleteConfirmModal } from "./RelDeleteConfirmModal";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditorState } from "@/features/editor/store/useEditorStore";

vi.mock("@/features/editor/store/useEditorStore");
vi.mock("@erdify/domain", () => ({
  removeRelationship: vi.fn((doc) => doc),
  removeColumn: vi.fn((doc) => doc),
}));
vi.mock("@/shared/components/Modal", () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div role="dialog">{title && <div>{title}</div>}{children}</div> : null,
}));
vi.mock("./invite-modal.css", () => ({ body: "", footer: "", cancelBtn: "", bodyText: "", bodyTextSub: "", dangerBtn: "" }));

const mockApplyCommand = vi.fn();
const mockSetPendingRelDelete = vi.fn();
type PendingRelDelete = { relId: string; srcEntityId: string; fkColIds: string[]; fkColNames: string[] } | null;

// zustand 훅의 오버로드 시그니처를 만족시키기 위해 구현 함수를 훅 타입으로 캐스팅한다
const mockStoreImpl = (pendingRelDelete: PendingRelDelete) =>
  ((selector: (s: EditorState) => unknown) =>
    selector({
      pendingRelDelete,
      setPendingRelDelete: mockSetPendingRelDelete,
      applyCommand: mockApplyCommand,
    } as unknown as EditorState)) as unknown as typeof useEditorStore;

vi.mocked(useEditorStore).mockImplementation(mockStoreImpl(null));

describe("RelDeleteConfirmModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEditorStore).mockImplementation(mockStoreImpl(null));
  });

  it("does not render dialog when pendingRelDelete is null", () => {
    vi.mocked(useEditorStore).mockImplementation(mockStoreImpl(null));
    render(<RelDeleteConfirmModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows FK column names in modal when pendingRelDelete is set", () => {
    vi.mocked(useEditorStore).mockImplementation(
      mockStoreImpl({ relId: "rel-1", srcEntityId: "e-1", fkColIds: ["col-1"], fkColNames: ["user_id"] })
    );
    render(<RelDeleteConfirmModal />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/user_id/)).toBeInTheDocument();
  });

  it('clicking "취소" calls setPendingRelDelete(null)', () => {
    vi.mocked(useEditorStore).mockImplementation(
      mockStoreImpl({ relId: "rel-1", srcEntityId: "e-1", fkColIds: ["col-1"], fkColNames: ["user_id"] })
    );
    render(<RelDeleteConfirmModal />);
    fireEvent.click(screen.getByText("취소"));
    expect(mockSetPendingRelDelete).toHaveBeenCalledWith(null);
  });

  it('clicking "관계만 삭제" calls applyCommand then setPendingRelDelete(null)', () => {
    vi.mocked(useEditorStore).mockImplementation(
      mockStoreImpl({ relId: "rel-1", srcEntityId: "e-1", fkColIds: ["col-1"], fkColNames: ["user_id"] })
    );
    render(<RelDeleteConfirmModal />);
    fireEvent.click(screen.getByText("관계만 삭제"));
    expect(mockApplyCommand).toHaveBeenCalled();
    expect(mockSetPendingRelDelete).toHaveBeenCalledWith(null);
  });
});
