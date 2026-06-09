import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMyOrganizations } from "@/shared/api/organizations.api";
import { useDashboardStore } from "@/features/dashboard/store/useDashboardStore";
import { queryKeys } from "@/shared/lib/queryKeys";

export const RootRedirect = () => {
  const { data: orgs = [], isLoading } = useQuery({
    queryKey: queryKeys.orgs(),
    queryFn: listMyOrganizations,
  });
  const openModal = useDashboardStore((s) => s.openModal);

  useEffect(() => {
    if (!isLoading && orgs.length === 0) openModal("org");
  }, [isLoading, orgs.length, openModal]);

  if (isLoading) return null;
  const firstOrg = orgs[0];
  if (firstOrg?.id) return <Navigate to={`/${firstOrg.id}`} replace />;

  return null;
};
