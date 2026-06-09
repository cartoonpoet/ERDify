import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
  listVersions,
  restoreVersion,
  saveVersion
} from "@/shared/api/diagrams.api";
import type { DiagramVersionResponse } from "@/shared/api/diagrams.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";

export interface UseVersionHistoryResult {
  versions: DiagramVersionResponse[];
  isLoadingVersions: boolean;
  saveVersion: () => void;
  isSavingVersion: boolean;
  restoreVersion: (versionId: string) => void;
  isRestoring: boolean;
}

export function useVersionHistory(diagramId: string, enabled = true): UseVersionHistoryResult {
  const queryClient = useQueryClient();
  const setDocument = useEditorStore((s) => s.setDocument);

  const versionsQuery = useQuery({
    queryKey: queryKeys.diagramVersions(diagramId),
    queryFn: () => listVersions(diagramId),
    enabled: !!diagramId && enabled,
  });

  const saveVersionMutation = useMutation({
    mutationFn: () => saveVersion(diagramId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.diagramVersions(diagramId) })
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreVersion(diagramId, versionId),
    onSuccess: (diagram) => {
      setDocument(diagram.content);
      queryClient.invalidateQueries({ queryKey: queryKeys.diagram(diagramId) });
    }
  });

  return {
    versions: versionsQuery.data ?? [],
    isLoadingVersions: versionsQuery.isLoading,
    saveVersion: saveVersionMutation.mutate,
    isSavingVersion: saveVersionMutation.isPending,
    restoreVersion: restoreMutation.mutate,
    isRestoring: restoreMutation.isPending
  };
}
