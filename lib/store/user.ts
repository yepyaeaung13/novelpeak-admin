import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id?: string;
  name?: string;
  email: string;
}

interface UserStore {
  user: User | null;
  accessToken: string | null;
  setUser: (user: User, accessToken: string) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setUser: (user, accessToken) => set({ user, accessToken }),
      clearUser: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "user-storage",
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    },
  ),
);
