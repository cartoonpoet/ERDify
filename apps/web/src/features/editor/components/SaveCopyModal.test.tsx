import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SaveCopyModal } from "./SaveCopyModal";

describe("SaveCopyModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    defaultName: "My ERD",
    defaultDialect: "postgresql" as const,
  };

  it("open이 false면 아무것도 렌더링하지 않는다", () => {
    render(<SaveCopyModal {...defaultProps} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("기본 이름/방언으로 렌더링된다", () => {
    render(<SaveCopyModal {...defaultProps} />);
    expect(screen.getByDisplayValue("My ERD")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("postgresql");
  });

  it("제출하면 trim된 이름과 선택된 방언으로 onSave를 호출하고 모달을 닫는다", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<SaveCopyModal {...defaultProps} onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByDisplayValue("My ERD"), { target: { value: "  Copy ERD  " } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "mysql" } });
    fireEvent.click(screen.getByRole("button", { name: "복사본 저장" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("Copy ERD", "mysql");
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("저장에 실패하면 에러 메시지를 보여주고 모달을 닫지 않는다", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("fail"));
    const onClose = vi.fn();
    render(<SaveCopyModal {...defaultProps} onSave={onSave} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "복사본 저장" }));

    await waitFor(() => {
      expect(screen.getByText("복사본 저장에 실패했습니다.")).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
