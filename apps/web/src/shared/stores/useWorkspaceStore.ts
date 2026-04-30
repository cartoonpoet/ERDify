import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WorkspaceState {
  selectedOrganizationId: string | null;
  selectedProjectId: string | null;
  selectOrganization: (organizationId: string) => void;
  selectProject: (projectId: string) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedOrganizationId: null,
      selectedProjectId: null,
      selectOrganization: (organizationId) =>
        set({ selectedOrganizationId: organizationId, selectedProjectId: null }),
      selectProject: (projectId) =>
        set({ selectedProjectId: projectId }),
      reset: () =>
        set({ selectedOrganizationId: null, selectedProjectId: null }),
    }),
    {
      name: "erdify-workspace",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        selectedOrganizationId: state.selectedOrganizationId,
        selectedProjectId: state.selectedProjectId,
      }),
    }
  )
);
