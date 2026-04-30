import { create } from "zustand";

interface WorkspaceState {
  selectedOrganizationId: string | null;
  selectedProjectId: string | null;
  selectOrganization: (organizationId: string) => void;
  selectProject: (projectId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedOrganizationId: null,
  selectedProjectId: null,
  selectOrganization: (organizationId) =>
    set({
      selectedOrganizationId: organizationId,
      selectedProjectId: null
    }),
  selectProject: (projectId) =>
    set({
      selectedProjectId: projectId
    })
}));
