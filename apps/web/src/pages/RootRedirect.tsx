import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyOrganizations } from "@/api/organizations.api";
import { CreateOrgModal } from "../components/CreateOrgModal";

export const RootRedirect = () => {
  const queryClient = useQueryClient();
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["orgs"],
    queryFn: listMyOrganizations,
  });

  if (isLoading) return null;
  const firstOrg = orgs[0];
  if (firstOrg) return <Navigate to={`/${firstOrg.id}`} replace />;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <button onClick={() => setOrgModalOpen(true)}>+ 새 조직 만들기</button>
      </div>
      <CreateOrgModal
        open={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ["orgs"] })}
      />
    </>
  );
};
