import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnnouncementForm } from "./AnnouncementForm";

vi.mock("@/shared/api/admin-announcements.api");

describe("AnnouncementForm", () => {
  const defaultProps = {
    open: true,
    initial: undefined,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  it("open이 false면 아무것도 렌더링하지 않는다", () => {
    render(<AnnouncementForm {...defaultProps} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("제목/내용이 공백뿐이면(네이티브 required 통과 후) 제출을 막고 에러를 보여준다", () => {
    render(<AnnouncementForm {...defaultProps} />);

    // 완전히 빈 값은 <input required>의 브라우저 네이티브 검증이 이미 막으므로,
    // 컴포넌트의 trim 체크가 실제로 잡아야 하는 "공백만 있는 입력" 케이스로 검증한다.
    fireEvent.change(screen.getByPlaceholderText("공지 제목"), { target: { value: "   " } });
    fireEvent.change(screen.getByPlaceholderText("공지 내용을 입력하세요"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByText("제목과 내용을 입력해주세요.")).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("제목/내용을 입력해 제출하면 onSubmit을 호출하고 모달을 닫는다", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<AnnouncementForm {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText("공지 제목"), { target: { value: "  점검 안내  " } });
    fireEvent.change(screen.getByPlaceholderText("공지 내용을 입력하세요"), { target: { value: "  자정에 점검 있습니다  " } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: "점검 안내", content: "자정에 점검 있습니다", type: "general", isUrgent: false })
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("저장에 실패하면 에러 메시지를 보여주고 모달을 닫지 않는다", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("fail"));
    const onClose = vi.fn();
    render(<AnnouncementForm {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText("공지 제목"), { target: { value: "제목" } });
    fireEvent.change(screen.getByPlaceholderText("공지 내용을 입력하세요"), { target: { value: "내용" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(screen.getByText("저장에 실패했습니다. 다시 시도해주세요.")).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("initial이 주어지면 기존 값으로 필드를 채운다", () => {
    const initial = {
      id: "a1",
      title: "기존 제목",
      content: "기존 내용",
      type: "feature" as const,
      isUrgent: true,
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    render(<AnnouncementForm {...defaultProps} initial={initial} />);

    expect(screen.getByDisplayValue("기존 제목")).toBeInTheDocument();
    expect(screen.getByDisplayValue("기존 내용")).toBeInTheDocument();
    expect(screen.getByText("공지 수정")).toBeInTheDocument();
  });
});
