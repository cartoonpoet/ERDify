import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPendingInvites,
  inviteMemberByEmail,
  cancelInvite,
} from "../../../shared/api/members.api";
import type { InviteResult, MemberRoleType } from "../../../shared/api/members.api";

export const useInvites = (orgId: string) => {
  const queryClient = useQueryClient();

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["invites", orgId],
    queryFn: () => getPendingInvites(orgId),
    enabled: !!orgId,
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: MemberRoleType }) =>
      inviteMemberByEmail(orgId, email, role),
    onSuccess: (result: InviteResult) => {
      if (result.status === "added") {
        void queryClient.invalidateQueries({ queryKey: ["members", orgId] });
      }
      void queryClient.invalidateQueries({ queryKey: ["invites", orgId] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancelInvite(orgId, inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invites", orgId] });
    },
  });

  return {
    invites,
    isLoading,
    invite: (email: string, role: MemberRoleType) =>
      inviteMutation.mutateAsync({ email, role }),
    cancelInvite: (inviteId: string) => cancelMutation.mutate(inviteId),
    isInviting: inviteMutation.isPending,
  };
};
