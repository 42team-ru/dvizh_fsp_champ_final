import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export interface AuthState {
  _hasHydrated: boolean;
  accessToken?: string;
  setAccessToken: (token: string) => void;
  setHasHydrated: (value: boolean) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        _hasHydrated: false,
        accessToken: undefined,
        setAccessToken: (token) => set({ accessToken: token }),
        setHasHydrated: (value) => set({ _hasHydrated: value }),
        logout: () => set({ accessToken: undefined }),
      }),
      {
        name: "auth-storage",
        partialize: (state) => ({ accessToken: state.accessToken }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      },
    ),
  ),
);

export default useAuthStore;
