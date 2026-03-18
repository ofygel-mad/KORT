import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string | null;
  status?: string;
};

type Org = {
  id: string;
  name: string;
  slug: string;
  mode: 'basic' | 'advanced' | 'industrial';
  currency: string;
  onboarding_completed?: boolean;
};

type AuthState = {
  user: User | null;
  org: Org | null;
  token: string | null;
  refreshToken: string | null;
  role: string;
  capabilities: string[];
  isUnlocked: boolean;
  setAuth: (user: User, org: Org, token: string, refresh: string, caps: string[], role?: string) => void;
  setTokens: (access: string, refresh: string) => void;
  setRole: (role: string) => void;
  setUser: (user: Partial<User>) => void;
  setOrg: (org: Partial<Org>) => void;
  clearAuth: () => void;
  unlock: () => void;
  lock: () => void;   // end session — keeps user data, just locks workspace
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      org: null,
      token: null,
      refreshToken: null,
      role: 'viewer',
      capabilities: [],
      isUnlocked: false,
      setAuth: (user, org, token, refresh, capabilities, role = 'viewer') =>
        set({ user, org, token, refreshToken: refresh, capabilities, role }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      setRole: (role) => set({ role }),
      setUser: (partial) => set({ user: { ...get().user!, ...partial } }),
      setOrg: (partial) => set({ org: { ...get().org!, ...partial } }),
      clearAuth: () =>
        set({ user: null, org: null, token: null, refreshToken: null, role: 'viewer', capabilities: [], isUnlocked: false }),
      unlock: () => set({ isUnlocked: true }),
      lock: () => set({ isUnlocked: false }),
    }),
    {
      name: 'kort-auth',
      partialize: (state) => ({
        user: state.user,
        org: state.org,
        token: state.token,
        refreshToken: state.refreshToken,
        role: state.role,
        capabilities: state.capabilities,
        // isUnlocked is intentionally excluded — lock shows on every page load
      }),
    },
  ),
);
