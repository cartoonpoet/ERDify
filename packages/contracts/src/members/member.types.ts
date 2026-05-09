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
