import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SocialOnboardingPage } from "./SocialOnboardingPage";
import * as authApi from "@/shared/api/auth.api";

vi.mock("@/shared/api/auth.api");

const mockSetAuthenticated = vi.fn();
vi.mock("@/shared/store/useAuthStore", () => ({
  useAuthStore: (selector: (s: { setAuthenticated: typeof mockSetAuthenticated }) => unknown) =>
    selector({ setAuthenticated: mockSetAuthenticated })
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage(state: { token?: string } | null = { token: "onboard-tok" }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/onboarding", state }]}>
      <SocialOnboardingPage />
    </MemoryRouter>
  );
}

describe("SocialOnboardingPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSetAuthenticated.mockClear();
  });

  it("location state에 token이 없으면 /login으로 리다이렉트한다", () => {
    renderPage(null);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("이름을 입력해 제출하면 completeOnboarding 호출 후 인증 처리한다", async () => {
    vi.mocked(authApi.completeOnboarding).mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("이름"), { target: { value: "홍길동" } });
    fireEvent.submit(screen.getByRole("form", { name: "온보딩" }));

    await waitFor(() => {
      expect(authApi.completeOnboarding).toHaveBeenCalledWith({
        onboardToken: "onboard-tok",
        name: "홍길동"
      });
    });
    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("실패하면 에러 메시지를 보여준다", async () => {
    vi.mocked(authApi.completeOnboarding).mockRejectedValue(new Error("fail"));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("이름"), { target: { value: "홍길동" } });
    fireEvent.submit(screen.getByRole("form", { name: "온보딩" }));

    await waitFor(() => {
      expect(screen.getByText("이름 등록에 실패했습니다. 다시 시도해 주세요.")).toBeInTheDocument();
    });
  });
});
