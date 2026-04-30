import { create } from "zustand";
export const useWorkspaceStore = create((set) => ({
    selectedOrganizationId: null,
    selectedProjectId: null,
    selectOrganization: (organizationId) => set({
        selectedOrganizationId: organizationId,
        selectedProjectId: null
    }),
    selectProject: (projectId) => set({
        selectedProjectId: projectId
    })
}));
