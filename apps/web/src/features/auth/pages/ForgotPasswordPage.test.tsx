import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import * as authApi from "@/shared/api/auth.api";

vi.mock("@/shared/api/auth.api");

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <ForgotPasswordPage />
    </MemoryRouter>
  );
}

describe("ForgotPasswordPage", () => {
  it("renders the request form", () => {
    renderPage();
    expect(screen.getByRole("form", { name: "비밀번호 찾기" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@company.com")).toBeInTheDocument();
  });

  it("submits and shows the sent confirmation", async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("name@company.com"), {
      target: { value: "user@example.com" }
    });
    fireEvent.submit(screen.getByRole("form", { name: "비밀번호 찾기" }));

    await waitFor(() => {
      expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
    });
    expect(authApi.forgotPassword).toHaveBeenCalledWith("user@example.com");
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValue(new Error("network error"));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("name@company.com"), {
      target: { value: "user@example.com" }
    });
    fireEvent.submit(screen.getByRole("form", { name: "비밀번호 찾기" }));

    await waitFor(() => {
      expect(
        screen.getByText("요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
      ).toBeInTheDocument();
    });
  });
});
