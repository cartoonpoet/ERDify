import { create } from "zustand";

export type DashboardModal = "org" | "project" | "diagram" | "import" | "profile";

interface DashboardState {
  activeModal: DashboardModal | null;
  searchQuery: string;
  searchProjectId: string | undefined;
  openModal: (modal: DashboardModal) => void;
  closeModal: () => void;
  setSearch: (projectId: string, query: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeModal: null,
  searchQuery: "",
  searchProjectId: undefined,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  setSearch: (projectId, query) => set({ searchProjectId: projectId, searchQuery: query }),
}));
