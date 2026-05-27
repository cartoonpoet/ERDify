import { useQuery } from "@tanstack/react-query";
import { getActiveDiagramUsers } from "@/shared/api/diagrams.api";
import type { ActiveUser } from "@erdify/contracts";

export const useActiveDiagramUsers = (
  diagramIds: string[]
): Record<string, ActiveUser[]> => {
  const key = diagramIds.join(",");
  const { data } = useQuery({
    queryKey: ["active-diagram-users", key],
    queryFn: () => getActiveDiagramUsers(diagramIds),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    enabled: diagramIds.length > 0,
    throwOnError: false,
  });

  return data ?? {};
};
