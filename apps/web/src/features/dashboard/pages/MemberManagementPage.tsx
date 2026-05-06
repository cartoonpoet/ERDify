import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Skeleton } from "../../../design-system";
import { getMe } from "../../../shared/api/auth.api";
import { useMembers } from "../hooks/useMembers";
import { useInvites } from "../hooks/useInvites";
import { InviteOrgModal } from "../components/InviteOrgModal";
import * as css from "./member-management-page.css";

interface MemberManagementPageProps {
  orgId: string;
  orgName: string;
}

export const MemberManagementPage = ({ orgId, orgName }: MemberManagementPageProps) => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { members, isLoading: membersLoading, updateRole, removeMember } = useMembers(orgId);
  const { invites, isLoading: invitesLoading, cancelInvite } = useInvites(orgId);

  const myRole = members.find((m) => m.userId === me?.id)?.role ?? null;
  const isOwner = myRole === "owner";

  const formatExpiry = (expiresAt: string): { label: string; expired: boolean } => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return { label: "만료됨", expired: true };
    return { label: `만료: ${days}일 후`, expired: false };
  };

  const getInitial = (email: string): string =>
    (email.split("@")[0]?.[0] ?? "?").toUpperCase();

  return (
    <div className={css.page}>
      <div className={css.header}>
        <div>
          <h1 className={css.title}>멤버 관리</h1>
          <p className={css.subtitle}>{orgName}</p>
        </div>
        {!meLoading && !membersLoading && isOwner && (
          <Button variant="primary" size="md" onClick={() => setInviteOpen(true)}>
            + 멤버 초대
          </Button>
        )}
      </div>

      <div className={css.section}>
        <div className={css.sectionLabel}>현재 멤버 · {members.length}명</div>
        <div className={css.card}>
          {membersLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={css.memberRow}>
                  <Skeleton width={32} height={32} style={{ borderRadius: "50%" }} />
                  <Skeleton width={180} height={14} />
                </div>
              ))
            : members.map((member) => (
                <div key={member.userId} className={css.memberRow}>
                  <div className={css.avatar}>{getInitial(member.email)}</div>
                  <div className={css.memberInfo}>
                    <div className={css.memberEmail}>
                      {member.email}
                      {member.userId === me?.id && (
                        <span className={css.youBadge}>나</span>
                      )}
                    </div>
                  </div>
                  {!meLoading && isOwner && member.userId !== me?.id ? (
                    <>
                      <select
                        className={css.roleSelect}
                        value={member.role}
                        aria-label={`${member.email} 역할`}
                        onChange={(e) =>
                          updateRole(member.userId, e.target.value as "owner" | "editor" | "viewer")
                        }
                      >
                        <option value="owner">Owner</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`${member.email}을 조직에서 내보내시겠습니까?`)) {
                            removeMember(member.userId);
                          }
                        }}
                      >
                        내보내기
                      </Button>
                    </>
                  ) : (
                    <div className={css.roleBadge}>
                      {member.role === "owner" ? "Owner" : member.role === "editor" ? "Editor" : "Viewer"}
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>

      {(invitesLoading || invites.length > 0) && (
        <div className={css.section}>
          <div className={css.sectionLabel}>대기 중인 초대 · {invites.length}개</div>
          <div className={css.card}>
            {invitesLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className={css.memberRow}>
                    <Skeleton width={32} height={32} style={{ borderRadius: "50%" }} />
                    <Skeleton width={180} height={14} />
                  </div>
                ))
              : invites.map((invite) => {
                  const { label: expiryLabel, expired: isExpired } = formatExpiry(invite.expiresAt);
                  return (
                    <div key={invite.id} className={css.memberRow}>
                      <div className={css.avatarPending}>✉</div>
                      <div className={css.memberInfo}>
                        <div className={css.memberEmail}>{invite.email}</div>
                        <div className={isExpired ? css.expiryExpired : css.expiry}>
                          {expiryLabel}
                        </div>
                      </div>
                      <div className={css.pendingBadge}>
                        {invite.role === "owner" ? "Owner" : invite.role === "editor" ? "Editor" : "Viewer"} · 대기중
                      </div>
                      {!meLoading && isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelInvite(invite.id)}
                        >
                          취소
                        </Button>
                      )}
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      <InviteOrgModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        orgId={orgId}
      />
    </div>
  );
};
