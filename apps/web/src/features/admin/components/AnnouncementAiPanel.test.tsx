import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnnouncementAiPanel } from "./AnnouncementAiPanel";
import { adminAiGenerate, adminAiRefine } from "@/shared/api/admin-announcements.api";

vi.mock("@/shared/api/admin-announcements.api");

const defaultProps = {
  type: "general" as const,
  currentTitle: "",
  currentContent: "",
  onApply: vi.fn(),
};

describe("AnnouncementAiPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("키워드 입력 없이는 'AI로 작성' 버튼이 disabled된다", () => {
    render(<AnnouncementAiPanel {...defaultProps} />);
    expect(screen.getByText("AI로 작성")).toBeDisabled();
  });

  it("제목/내용이 모두 없으면 'AI로 다듬기' 버튼이 disabled된다", () => {
    render(<AnnouncementAiPanel {...defaultProps} />);
    expect(screen.getByText("AI로 다듬기")).toBeDisabled();
  });

  it("제목이 있으면 'AI로 다듬기' 버튼이 활성화된다", () => {
    render(<AnnouncementAiPanel {...defaultProps} currentTitle="점검 안내" />);
    expect(screen.getByText("AI로 다듬기")).not.toBeDisabled();
  });

  it("키워드 입력 후 'AI로 작성' 클릭 시 adminAiGenerate 호출 후 미리보기와 적용/취소 버튼이 나타난다", async () => {
    vi.mocked(adminAiGenerate).mockResolvedValue({ title: "점검 안내", content: "5/29 새벽 점검" });

    render(<AnnouncementAiPanel {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/핵심 내용을 입력하세요/), {
      target: { value: "5/29 새벽 2-4시 DB 점검" },
    });
    fireEvent.click(screen.getByText("AI로 작성"));

    expect(adminAiGenerate).toHaveBeenCalledWith({ type: "general", keywords: "5/29 새벽 2-4시 DB 점검" });

    await waitFor(() => expect(screen.getByText("점검 안내")).toBeInTheDocument());
    expect(screen.getByText("5/29 새벽 점검")).toBeInTheDocument();
    expect(screen.getByText("적용")).toBeInTheDocument();
    expect(screen.getByText("취소")).toBeInTheDocument();
  });

  it("'AI로 다듬기' 클릭 시 adminAiRefine이 현재 제목/내용으로 호출된다", async () => {
    vi.mocked(adminAiRefine).mockResolvedValue({ title: "다듬어진 제목", content: "다듬어진 내용" });

    render(<AnnouncementAiPanel {...defaultProps} currentTitle="원래 제목" currentContent="원래 내용" />);
    fireEvent.click(screen.getByText("AI로 다듬기"));

    expect(adminAiRefine).toHaveBeenCalledWith({ title: "원래 제목", content: "원래 내용" });
    await waitFor(() => expect(screen.getByText("다듬어진 제목")).toBeInTheDocument());
  });

  it("'적용' 클릭 시 onApply가 미리보기 결과로 호출되고 미리보기가 닫힌다", async () => {
    const onApply = vi.fn();
    vi.mocked(adminAiGenerate).mockResolvedValue({ title: "제목A", content: "내용A" });

    render(<AnnouncementAiPanel {...defaultProps} onApply={onApply} />);
    fireEvent.change(screen.getByPlaceholderText(/핵심 내용을 입력하세요/), { target: { value: "keyword" } });
    fireEvent.click(screen.getByText("AI로 작성"));
    await waitFor(() => expect(screen.getByText("제목A")).toBeInTheDocument());

    fireEvent.click(screen.getByText("적용"));

    expect(onApply).toHaveBeenCalledWith({ title: "제목A", content: "내용A" });
    expect(screen.queryByText("제목A")).not.toBeInTheDocument();
  });

  it("'취소' 클릭 시 onApply를 호출하지 않고 미리보기를 닫는다", async () => {
    const onApply = vi.fn();
    vi.mocked(adminAiGenerate).mockResolvedValue({ title: "제목B", content: "내용B" });

    render(<AnnouncementAiPanel {...defaultProps} onApply={onApply} />);
    fireEvent.change(screen.getByPlaceholderText(/핵심 내용을 입력하세요/), { target: { value: "keyword" } });
    fireEvent.click(screen.getByText("AI로 작성"));
    await waitFor(() => expect(screen.getByText("제목B")).toBeInTheDocument());

    fireEvent.click(screen.getByText("취소"));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByText("제목B")).not.toBeInTheDocument();
  });

  it("모든 버튼에 type=\"button\"이 명시되어 있다", () => {
    render(<AnnouncementAiPanel {...defaultProps} currentTitle="t" />);
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).toHaveAttribute("type", "button");
    }
  });
});
