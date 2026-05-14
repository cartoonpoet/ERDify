import { describe, it, expect, vi, beforeEach } from "vitest";
import { httpClient } from "./httpClient";
import {
  getMembers,
  updateMemberRole,
  removeMember,
  inviteMemberByEmail,
  getPendingInvites,
  cancelInvite,
} from "./members.api";

vi.mock("./httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("members.api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getMembers calls GET /organizations/:id/members", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [] });
    await getMembers("org-1");
    expect(httpClient.get).toHaveBeenCalledWith("/organizations/org-1/members");
  });

  it("updateMemberRole calls PATCH /organizations/:id/members/:userId", async () => {
    vi.mocked(httpClient.patch).mockResolvedValue({});
    await updateMemberRole("org-1", "user-2", "editor");
    expect(httpClient.patch).toHaveBeenCalledWith(
      "/organizations/org-1/members/user-2",
      { role: "editor" }
    );
  });

  it("removeMember calls DELETE /organizations/:id/members/:userId", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue({});
    await removeMember("org-1", "user-2");
    expect(httpClient.delete).toHaveBeenCalledWith("/organizations/org-1/members/user-2");
  });

  it("inviteMemberByEmail calls POST and returns InviteResult", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: { status: "pending" } });
    const result = await inviteMemberByEmail("org-1", "x@x.com", "editor");
    expect(result).toEqual({ status: "pending" });
  });

  it("getPendingInvites calls GET /organizations/:id/invites", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [] });
    await getPendingInvites("org-1");
    expect(httpClient.get).toHaveBeenCalledWith("/organizations/org-1/invites");
  });

  it("cancelInvite calls DELETE /organizations/:id/invites/:inviteId", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue({});
    await cancelInvite("org-1", "inv-1");
    expect(httpClient.delete).toHaveBeenCalledWith("/organizations/org-1/invites/inv-1");
  });
});
