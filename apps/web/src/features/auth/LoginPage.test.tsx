import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import * as authApi from "../../shared/api/auth.api";

vi.mock("../../shared/api/auth.api");
vi.mock("../../shared/stores/useAuthStore", () => ({
  useAuthStore: (selector: (s: { token: null; setToken: ReturnType<typeof vi.fn>; clearToken: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ token: null, setToken: vi.fn(), clearToken: vi.fn() })
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  it("renders login form", () => {
    renderLoginPage();
    expect(screen.getByRole("form", { name: "로그인" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("이메일")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("비밀번호")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  });

  it("shows error when login fails", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error("Unauthorized"));
    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "bad@example.com" }
    });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "wrongpass" }
    });
    fireEvent.submit(screen.getByRole("form", { name: "로그인" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "이메일 또는 비밀번호가 올바르지 않습니다."
      );
    });
  });
});
