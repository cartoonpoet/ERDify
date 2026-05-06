import { register, login, logout, getMe, updateProfile, uploadAvatar, changePassword } from "./auth.api";
import { httpClient } from "./httpClient";

vi.mock("./httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe("auth.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("register는 POST /auth/register를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: undefined });
    const result = await register({ email: "a@b.com", password: "pw", name: "Alice" });
    expect(httpClient.post).toHaveBeenCalledWith("/auth/register", { email: "a@b.com", password: "pw", name: "Alice" });
    expect(result).toBeUndefined();
  });

  it("login은 POST /auth/login를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: undefined });
    const result = await login({ email: "a@b.com", password: "pw" });
    expect(httpClient.post).toHaveBeenCalledWith("/auth/login", { email: "a@b.com", password: "pw" });
    expect(result).toBeUndefined();
  });

  it("logout은 POST /auth/logout를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: undefined });
    const result = await logout();
    expect(httpClient.post).toHaveBeenCalledWith("/auth/logout");
    expect(result).toBeUndefined();
  });

  it("getMe는 GET /auth/me를 호출하고 r.data를 반환한다", async () => {
    const profile = { id: "u1", email: "a@b.com", name: "Alice", avatarUrl: null };
    vi.mocked(httpClient.get).mockResolvedValue({ data: profile });
    const result = await getMe();
    expect(httpClient.get).toHaveBeenCalledWith("/auth/me");
    expect(result).toEqual(profile);
  });

  it("updateProfile은 PATCH /auth/profile를 호출하고 r.data를 반환한다", async () => {
    const profile = { id: "u1", email: "a@b.com", name: "Bob", avatarUrl: null };
    vi.mocked(httpClient.patch).mockResolvedValue({ data: profile });
    const result = await updateProfile({ name: "Bob" });
    expect(httpClient.patch).toHaveBeenCalledWith("/auth/profile", { name: "Bob" });
    expect(result).toEqual(profile);
  });

  it("uploadAvatar는 POST /auth/avatar를 FormData와 함께 호출하고 r.data를 반환한다", async () => {
    const profile = { id: "u1", email: "a@b.com", name: "Alice", avatarUrl: "http://example.com/avatar.png" };
    vi.mocked(httpClient.post).mockResolvedValue({ data: profile });
    const file = new File(["content"], "avatar.png", { type: "image/png" });
    const result = await uploadAvatar(file);
    expect(httpClient.post).toHaveBeenCalledWith(
      "/auth/avatar",
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    const callArg = vi.mocked(httpClient.post).mock.calls[0][1] as FormData;
    expect(callArg.get("file")).toBe(file);
    expect(result).toEqual(profile);
  });

  it("changePassword는 PATCH /auth/password를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.patch).mockResolvedValue({ data: undefined });
    const result = await changePassword({ currentPassword: "old", newPassword: "new" });
    expect(httpClient.patch).toHaveBeenCalledWith("/auth/password", { currentPassword: "old", newPassword: "new" });
    expect(result).toBeUndefined();
  });
});
