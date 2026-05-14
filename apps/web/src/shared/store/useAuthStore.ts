import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean | null; // null = 확인 중
  setAuthenticated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: null,
  setAuthenticated: (v) => set({ isAuthenticated: v }),
}));
