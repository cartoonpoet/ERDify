import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMembers, updateMemberRole, removeMember as removeMemberApi } from "../../../shared/api/members.api";
import type { MemberRoleType } from "../../../shared/api/members.api";

export const useMembers = (orgId: string) => {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", orgId],
    queryFn: () => getMembers(orgId),
    enabled: !!orgId,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRoleType }) =>
      updateMemberRole(orgId, userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members", orgId] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeMemberApi(orgId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members", orgId] });
    },
  });

  return {
    members,
    isLoading,
    updateRole: (userId: string, role: MemberRoleType) =>
      updateRoleMutation.mutate({ userId, role }),
    removeMember: (userId: string) => removeMemberMutation.mutate(userId),
  };
};
