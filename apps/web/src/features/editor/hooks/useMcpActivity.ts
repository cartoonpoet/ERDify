import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import { listMcpSessions, revertMcpSession } from "@/shared/api/mcp-sessions.api";
import type { McpSessionResponse } from "@/shared/api/mcp-sessions.api";

export interface UseMcpActivityResult {
  sessions: McpSessionResponse[];
  isLoading: boolean;
  revertSession: (sessionId: string) => void;
  isReverting: boolean;
}

export const useMcpActivity = (diagramId: string): UseMcpActivityResult => {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: queryKeys.mcpSessions(diagramId),
    queryFn: () => listMcpSessions(diagramId),
    enabled: !!diagramId,
    refetchInterval: 10000,
  });

  const revertMutation = useMutation({
    mutationFn: (sessionId: string) => revertMcpSession(diagramId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diagram(diagramId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpSessions(diagramId) });
    },
  });

  return {
    sessions: sessionsQuery.data ?? [],
    isLoading: sessionsQuery.isLoading,
    revertSession: revertMutation.mutate,
    isReverting: revertMutation.isPending,
  };
};
