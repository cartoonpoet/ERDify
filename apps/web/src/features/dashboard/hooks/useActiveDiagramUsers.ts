import { useQuery } from "@tanstack/react-query";
import { getActiveDiagramUsers } from "@/shared/api/diagrams.api";
import type { ActiveUser } from "@erdify/contracts";
import { queryKeys } from "@/shared/lib/queryKeys";

export const useActiveDiagramUsers = (
  diagramIds: string[]
): Record<string, ActiveUser[]> => {
  const key = diagramIds.join(",");
  const { data } = useQuery({
    queryKey: queryKeys.activeDiagramUsers(key),
    queryFn: () => getActiveDiagramUsers(diagramIds),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    enabled: diagramIds.length > 0,
    throwOnError: false,
  });

  return data ?? {};
};
