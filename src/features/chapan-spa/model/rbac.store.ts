import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore, type MembershipRole } from '../../../shared/stores/auth';

export type ChapanRole = 'manager' | 'workshop_lead' | 'worker' | 'viewer';

interface ChapanRbacState {
  roleMap: Record<string, ChapanRole>;
  aliasMap: Record<string, string>;
  setUserRole: (userId: string, role: ChapanRole) => void;
  clearUserRole: (userId: string) => void;
  resolveRole: (userId: string, fallbackRole?: MembershipRole | 'viewer' | null) => ChapanRole;
  setUserAlias: (userId: string, alias: string) => void;
  resolveAlias: (userId: string, fallbackName?: string | null) => string;
}

function deriveFallbackChapanRole(fallbackRole?: MembershipRole | 'viewer' | null): ChapanRole {
  if (fallbackRole === 'owner' || fallbackRole === 'admin' || fallbackRole === 'manager') {
    return 'manager';
  }

  if (fallbackRole === 'viewer') {
    return 'worker';
  }

  return 'viewer';
}

export const useChapanRbac = create<ChapanRbacState>()(
  persist(
    (set, get) => ({
      roleMap: {},
      aliasMap: {},

      setUserRole: (userId, role) => set((state) => ({
        roleMap: { ...state.roleMap, [userId]: role },
      })),

      clearUserRole: (userId) => set((state) => {
        const next = { ...state.roleMap };
        delete next[userId];
        return { roleMap: next };
      }),

      resolveRole: (userId, fallbackRole) => {
        if (!userId) return 'viewer';
        return get().roleMap[userId] ?? deriveFallbackChapanRole(fallbackRole);
      },

      setUserAlias: (userId, alias) => set((state) => ({
        aliasMap: {
          ...state.aliasMap,
          [userId]: alias.trim(),
        },
      })),

      resolveAlias: (userId, fallbackName) => {
        const alias = get().aliasMap[userId];
        return alias?.trim() || fallbackName?.trim() || 'Сотрудник цеха';
      },
    }),
    { name: 'kort-chapan-rbac' },
  ),
);

export function canSeeManagerConsole(role: ChapanRole) {
  return role === 'manager';
}

export function canSeeWorkshopConsole(role: ChapanRole) {
  return role === 'manager' || role === 'workshop_lead' || role === 'worker';
}

export function canManageWorkshop(role: ChapanRole) {
  return role === 'manager' || role === 'workshop_lead';
}

export function canChangeAssignments(role: ChapanRole) {
  return role === 'manager' || role === 'workshop_lead';
}

export function canSeeSettings(role: ChapanRole) {
  return role === 'manager';
}

export function useResolvedChapanRole() {
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const membershipRole = useAuthStore((state) => state.membership.role);
  const fallbackRole = useAuthStore((state) => state.role as MembershipRole | 'viewer');
  const resolveRole = useChapanRbac((state) => state.resolveRole);

  return resolveRole(userId, membershipRole ?? fallbackRole);
}

export function useResolvedChapanAlias() {
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const fullName = useAuthStore((state) => state.user?.full_name ?? 'Сотрудник цеха');
  const resolveAlias = useChapanRbac((state) => state.resolveAlias);

  return resolveAlias(userId, fullName);
}
