import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import { getDiagram, listVersions, restoreVersion } from "@/shared/api/diagrams.api";
import type { DiagramVersionResponse } from "@/shared/api/diagrams.api";
import { listMcpSessions, revertMcpSession } from "@/shared/api/mcp-sessions.api";
import type { McpSessionResponse } from "@/shared/api/mcp-sessions.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";

export interface VersionActivityItem extends DiagramVersionResponse {
  kind: "version";
}

export interface AiActivityItem extends McpSessionResponse {
  kind: "ai";
}

export type ActivityItem = VersionActivityItem | AiActivityItem;

export interface UseActivityFeedResult {
  items: ActivityItem[];
  isLoading: boolean;
  restoreVersion: (versionId: string) => void;
  isRestoring: boolean;
  revertSession: (sessionId: string) => void;
  isReverting: boolean;
}

export const useActivityFeed = (diagramId: string): UseActivityFeedResult => {
  const queryClient = useQueryClient();
  const setDocument = useEditorStore((s) => s.setDocument);

  const versionsQuery = useQuery({
    queryKey: queryKeys.diagramVersions(diagramId),
    queryFn: () => listVersions(diagramId),
    enabled: !!diagramId,
  });

  const sessionsQuery = useQuery({
    queryKey: queryKeys.mcpSessions(diagramId),
    queryFn: () => listMcpSessions(diagramId),
    enabled: !!diagramId,
  });

  const isLoading = versionsQuery.isLoading || sessionsQuery.isLoading;

  const versionItems: VersionActivityItem[] = (versionsQuery.data ?? []).map(
    (v) => ({ ...v, kind: "version" as const })
  );
  const sessionItems: AiActivityItem[] = (sessionsQuery.data ?? []).map(
    (s) => ({ ...s, kind: "ai" as const })
  );

  const items: ActivityItem[] = [...versionItems, ...sessionItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreVersion(diagramId, versionId),
    onSuccess: (diagram) => {
      setDocument(diagram.content);
      queryClient.invalidateQueries({ queryKey: queryKeys.diagram(diagramId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.diagramVersions(diagramId) });
    },
  });

  const revertMutation = useMutation({
    mutationFn: (sessionId: string) => revertMcpSession(diagramId, sessionId),
    onSuccess: async () => {
      const diagram = await getDiagram(diagramId);
      setDocument(diagram.content);
      queryClient.invalidateQueries({ queryKey: queryKeys.diagram(diagramId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpSessions(diagramId) });
    },
  });

  return {
    items,
    isLoading,
    restoreVersion: restoreMutation.mutate,
    isRestoring: restoreMutation.isPending,
    revertSession: revertMutation.mutate,
    isReverting: revertMutation.isPending,
  };
};
