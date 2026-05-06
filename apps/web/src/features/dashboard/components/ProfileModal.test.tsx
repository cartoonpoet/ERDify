import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProfileModal } from "./ProfileModal";
import { getMe, updateProfile, uploadAvatar, changePassword } from "../../../shared/api/auth.api";

vi.mock("../../../shared/api/auth.api", () => ({
  getMe: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  changePassword: vi.fn(),
}));
vi.mock("../../../shared/api/httpClient", () => ({ API_BASE_URL: "" }));
vi.mock("./modal-form.css", () => ({ form: "", footer: "" }));
vi.mock("./ProfileModal.css", () => ({
  body: "", tabs: "", tab: "", tabActive: "", avatarSection: "", avatarCircle: "",
  avatarImg: "", avatarInitial: "", dropZone: "", dropZoneActive: "", dropIcon: "",
  dropLabel: "", dropHint: "", fileSelected: "", fileSelectedIcon: "", fileSelectedName: "",
  fileClearBtn: "", successMsg: "", errorMsg: "",
}));

vi.mock("../../../design-system", () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div role="dialog">{title && <div>{title}</div>}{children}</div> : null,
  Button: ({ children, disabled, onClick, type, ...props }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; type?: string; [k: string]: unknown }) =>
    <button type={type as "button" | "submit" | undefined} disabled={disabled} onClick={onClick}>{children}</button>,
  Input: ({ label, type, placeholder, value, onChange, error, required, autoFocus, id, ...props }: { label?: string; type?: string; placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string; required?: boolean; autoFocus?: boolean; id?: string; [k: string]: unknown }) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} type={type ?? "text"} placeholder={placeholder} value={value} onChange={onChange} required={required} autoFocus={autoFocus} />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));

const createQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = (ui: React.ReactElement, qc = createQc()) =>
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMe).mockResolvedValue({ id: "1", name: "홍길동", email: "test@test.com", avatarUrl: null });
});

describe("ProfileModal", () => {
  it("기본적으로 '프로필' 탭이 활성화된 상태로 렌더링된다", () => {
    wrap(<ProfileModal open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("프로필")).toBeInTheDocument();
    expect(screen.getByText("비밀번호 변경")).toBeInTheDocument();
  });

  it("'비밀번호 변경' 탭 클릭 시 비밀번호 폼으로 전환된다", () => {
    wrap(<ProfileModal open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("비밀번호 변경"));
    expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument();
    expect(screen.getByLabelText("새 비밀번호")).toBeInTheDocument();
    expect(screen.getByLabelText("새 비밀번호 확인")).toBeInTheDocument();
  });

  it("PasswordTab: 새 비밀번호가 일치하지 않으면 오류 메시지를 표시한다", async () => {
    wrap(<ProfileModal open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("비밀번호 변경"));

    fireEvent.change(screen.getByLabelText("현재 비밀번호"), { target: { value: "current123" } });
    fireEvent.change(screen.getByLabelText("새 비밀번호"), { target: { value: "newpass123" } });
    fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), { target: { value: "different123" } });

    fireEvent.submit(screen.getByLabelText("현재 비밀번호").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("새 비밀번호가 일치하지 않습니다.")).toBeInTheDocument();
    });
  });

  it("PasswordTab: 새 비밀번호가 8자 미만이면 오류 메시지를 표시한다", async () => {
    wrap(<ProfileModal open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("비밀번호 변경"));

    fireEvent.change(screen.getByLabelText("현재 비밀번호"), { target: { value: "current123" } });
    fireEvent.change(screen.getByLabelText("새 비밀번호"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), { target: { value: "short" } });

    fireEvent.submit(screen.getByLabelText("현재 비밀번호").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("비밀번호는 8자 이상이어야 합니다.")).toBeInTheDocument();
    });
  });

  it("PasswordTab: 유효한 값으로 submit 시 changePassword가 올바른 인자로 호출된다", async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined);
    wrap(<ProfileModal open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("비밀번호 변경"));

    fireEvent.change(screen.getByLabelText("현재 비밀번호"), { target: { value: "current123" } });
    fireEvent.change(screen.getByLabelText("새 비밀번호"), { target: { value: "newpassword1" } });
    fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), { target: { value: "newpassword1" } });

    fireEvent.submit(screen.getByLabelText("현재 비밀번호").closest("form")!);

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: "current123",
        newPassword: "newpassword1",
      });
    });
  });

  it("ProfileTab: 쿼리 캐시에서 이름을 로드하고 submit 시 updateProfile이 호출된다", async () => {
    const qc = createQc();
    qc.setQueryData(["me"], { id: "1", name: "홍길동", email: "test@test.com", avatarUrl: null });
    vi.mocked(getMe).mockResolvedValue({ id: "1", name: "홍길동", email: "test@test.com", avatarUrl: null });
    vi.mocked(updateProfile).mockResolvedValue({ id: "1", name: "새이름", email: "test@test.com", avatarUrl: null });

    wrap(<ProfileModal open={true} onClose={vi.fn()} />, qc);

    await waitFor(() => {
      expect(screen.getByLabelText("이름")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText("이름");
    fireEvent.change(nameInput, { target: { value: "새이름" } });
    fireEvent.submit(nameInput.closest("form")!);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ name: "새이름" });
    });
  });
});
