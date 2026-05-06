import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "./ProtectedRoute";
import * as authApi from "../../shared/api/auth.api";

vi.mock("../../shared/api/auth.api");

let mockIsAuthenticated: boolean | null = null;
const mockSetAuthenticated = vi.fn();

vi.mock("../../shared/stores/useAuthStore", () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean | null; setAuthenticated: typeof mockSetAuthenticated }) => unknown) =>
    selector({ isAuthenticated: mockIsAuthenticated, setAuthenticated: mockSetAuthenticated }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    Outlet: () => <div>outlet</div>,
  };
});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderProtectedRoute(qc: QueryClient) {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute />} />
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = null;
  });

  it("renders Outlet when isAuthenticated is true", () => {
    mockIsAuthenticated = true;
    const qc = makeQueryClient();
    renderProtectedRoute(qc);
    expect(screen.getByText("outlet")).toBeInTheDocument();
  });

  it("renders nothing while getMe is pending (isAuthenticated === null)", async () => {
    mockIsAuthenticated = null;
    // Never-resolving promise to keep isPending = true
    vi.mocked(authApi.getMe).mockReturnValue(new Promise(() => {}));
    const qc = makeQueryClient();
    const { container } = renderProtectedRoute(qc);

    // The component returns null while pending, so container body should be empty
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("redirects to /login when getMe rejects (isAuthenticated === null)", async () => {
    mockIsAuthenticated = null;
    vi.mocked(authApi.getMe).mockRejectedValue(new Error("Unauthorized"));
    const qc = makeQueryClient();
    renderProtectedRoute(qc);

    await waitFor(() => {
      expect(screen.getByText("login")).toBeInTheDocument();
    });
  });

  it("calls setAuthenticated(true) when getMe resolves (isAuthenticated === null)", async () => {
    mockIsAuthenticated = null;
    vi.mocked(authApi.getMe).mockResolvedValue({ id: 1, name: "Test", email: "test@example.com" } as never);
    const qc = makeQueryClient();
    renderProtectedRoute(qc);

    await waitFor(() => {
      expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
    });
  });
});
