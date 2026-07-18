import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProfileTab } from "./ProfileTab";
import { getMe, updateProfile, uploadAvatar } from "@/shared/api/auth.api";
import { queryKeys } from "@/shared/lib/queryKeys";

vi.mock("./modal-form.css", () => ({ form: "", footer: "" }));
vi.mock("./ProfileModal.css", () => ({
  body: "", tabs: "", tab: "", tabActive: "", avatarSection: "", avatarCircle: "",
  avatarImg: "", avatarInitial: "", dropZone: "", dropZoneActive: "", dropIcon: "",
  dropLabel: "", dropHint: "", fileSelected: "", fileSelectedIcon: "", fileSelectedName: "",
  fileClearBtn: "", successMsg: "", errorMsg: "",
}));

vi.mock("@/shared/api/auth.api", () => ({
  getMe: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
}));

const mockUser = {
  id: "1",
  name: "홍길동",
  email: "test@test.com",
  phone: null,
  avatarUrl: null,
  isAdmin: false,
};

const renderProfileTab = (onClose = vi.fn()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(queryKeys.me(), mockUser);
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ProfileTab onClose={onClose} />
    </QueryClientProvider>
  );
  return { ...utils, onClose, queryClient };
};

const getFileInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement;

describe("ProfileTab", () => {
  beforeEach(() => {
    vi.mocked(getMe).mockResolvedValue(mockUser);
    vi.mocked(updateProfile).mockResolvedValue(mockUser);
    vi.mocked(uploadAvatar).mockResolvedValue(mockUser);
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("기존 사용자 이름이 미리 채워져서 렌더링된다", () => {
    renderProfileTab();
    expect(screen.getByLabelText("이름")).toHaveValue("홍길동");
  });

  it("이름 입력란에 타이핑하면 값이 업데이트된다", () => {
    renderProfileTab();
    const nameInput = screen.getByLabelText("이름");
    fireEvent.change(nameInput, { target: { value: "김철수" } });
    expect(nameInput).toHaveValue("김철수");
  });

  it("'닫기' 버튼을 클릭하면 onClose가 호출된다", () => {
    const { onClose } = renderProfileTab();
    fireEvent.click(screen.getByText("닫기"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("이미지가 아닌 파일을 선택하면 에러 메시지가 표시된다", () => {
    const { container } = renderProfileTab();
    const fileInput = getFileInput(container);
    const invalidFile = new File(["dummy"], "test.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    expect(screen.getByText("이미지 파일만 업로드할 수 있습니다.")).toBeInTheDocument();
  });

  it("유효한 이미지 파일을 선택하면 파일 선택 칩과 제거(✕) 버튼이 표시된다", () => {
    const { container } = renderProfileTab();
    const fileInput = getFileInput(container);
    const validFile = new File(["dummy"], "test.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(screen.getByText("test.png")).toBeInTheDocument();
    const clearBtn = screen.getByText("✕");
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(screen.queryByText("test.png")).not.toBeInTheDocument();
  });

  it("이름을 변경하고 제출하면 updateProfile mutation이 호출된다", async () => {
    renderProfileTab();
    const nameInput = screen.getByLabelText("이름");
    fireEvent.change(nameInput, { target: { value: "김철수" } });

    const submitBtn = screen.getByRole("button", { name: /저장/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ name: "김철수" });
    });
  });
});
