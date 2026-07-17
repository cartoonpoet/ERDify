import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ResetPasswordPage } from "./ResetPasswordPage";
import * as authApi from "@/shared/api/auth.api";

vi.mock("@/shared/api/auth.api");

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage(search = "?token=tok123") {
  return render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <ResetPasswordPage />
    </MemoryRouter>
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("token이 없으면 유효하지 않은 링크 메시지를 보여준다", () => {
    renderPage("");
    expect(screen.getByText("유효하지 않은 링크입니다")).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("비밀번호가 일치하지 않으면 제출을 막고 에러를 보여준다", () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("8자 이상"), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText("비밀번호 재입력"), { target: { value: "password2" } });
    fireEvent.submit(screen.getByRole("form", { name: "비밀번호 재설정" }));

    expect(screen.getAllByText("비밀번호가 일치하지 않습니다.").length).toBeGreaterThan(0);
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it("비밀번호가 일치하면 resetPassword를 호출하고 로그인 페이지로 이동한다", async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("8자 이상"), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText("비밀번호 재입력"), { target: { value: "password1" } });
    fireEvent.submit(screen.getByRole("form", { name: "비밀번호 재설정" }));

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith("tok123", "password1");
    });
    expect(mockNavigate).toHaveBeenCalledWith("/login?reason=password-reset");
  });
});
