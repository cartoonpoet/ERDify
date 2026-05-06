import { httpClient } from "./httpClient";

export type MemberRoleType = "owner" | "editor" | "viewer";

export interface MemberInfo {
  userId: string;
  email: string;
  name: string;
  role: MemberRoleType;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: MemberRoleType;
  expiresAt: string;
  createdAt: string;
}

export interface InviteResult {
  status: "added" | "pending";
}

export const getMembers = (orgId: string): Promise<MemberInfo[]> =>
  httpClient.get<MemberInfo[]>(`/organizations/${orgId}/members`).then((r) => r.data);

export const updateMemberRole = (
  orgId: string,
  userId: string,
  role: MemberRoleType
): Promise<void> =>
  httpClient.patch(`/organizations/${orgId}/members/${userId}`, { role }).then(() => undefined);

export const removeMember = (orgId: string, userId: string): Promise<void> =>
  httpClient.delete(`/organizations/${orgId}/members/${userId}`).then(() => undefined);

export const inviteMemberByEmail = (
  orgId: string,
  email: string,
  role: MemberRoleType
): Promise<InviteResult> =>
  httpClient
    .post<InviteResult>(`/organizations/${orgId}/members/invite`, { email, role })
    .then((r) => r.data);

export const getPendingInvites = (orgId: string): Promise<PendingInvite[]> =>
  httpClient.get<PendingInvite[]>(`/organizations/${orgId}/invites`).then((r) => r.data);

export const cancelInvite = (orgId: string, inviteId: string): Promise<void> =>
  httpClient.delete(`/organizations/${orgId}/invites/${inviteId}`).then(() => undefined);
