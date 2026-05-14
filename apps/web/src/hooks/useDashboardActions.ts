import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteOrganization } from "@/shared/api/organizations.api";
import { deleteProject } from "@/shared/api/projects.api";
import { deleteDiagram } from "@/shared/api/diagrams.api";
import { logout } from "@/shared/api/auth.api";
import { useAuthStore } from "@/store/useAuthStore";

export const useDashboardActions = () => {
  const navigate = useNavigate();
  const { orgId, projectId } = useParams<{ orgId: string; projectId?: string }>();
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const deleteOrgMutation = useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: (_data, deletedOrgId) => {
      if (orgId === deletedOrgId) navigate("/");
      void queryClient.invalidateQueries({ queryKey: ["orgs"] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (pid: string) => {
      if (!orgId) return Promise.reject(new Error("no org"));
      return deleteProject(orgId, pid);
    },
    onSuccess: (_data, deletedProjectId) => {
      if (projectId === deletedProjectId) navigate(`/${orgId}`);
      void queryClient.invalidateQueries({ queryKey: ["projects", orgId] });
    },
  });

  const deleteDiagramMutation = useMutation({
    mutationFn: (id: string) => deleteDiagram(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["diagrams", projectId] });
    },
  });

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    setAuthenticated(false);
    queryClient.clear();
    navigate("/login");
  };

  return {
    deleteOrg: (id: string) => deleteOrgMutation.mutate(id),
    deleteProject: (id: string) => deleteProjectMutation.mutate(id),
    deleteDiagram: (id: string) => deleteDiagramMutation.mutate(id),
    handleLogout,
    onOrgCreated: () => void queryClient.invalidateQueries({ queryKey: ["orgs"] }),
    onProjectCreated: () => void queryClient.invalidateQueries({ queryKey: ["projects", orgId] }),
    onDiagramCreated: (id: string) => navigate(`/diagrams/${id}`),
    onDiagramImported: (id: string) => navigate(`/diagrams/${id}`),
  };
};
