/**
 * leads-spa/model/rbac.store.ts
 * Role-Based Access Control for the Leads SPA.
 * Role is stored per-user in the org settings. Defaults to 'general'.
 * Never shown in UI — silently controls what's visible.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LeadsRole } from '../api/types';

interface RbacState {
  /** userId → role mapping, managed from Settings → Team section */
  roleMap: Record<string, LeadsRole>;
  /** Current session role (resolved from roleMap + current user) */
  currentRole: LeadsRole;
  setUserRole: (userId: string, role: LeadsRole) => void;
  resolveRole: (userId: string) => LeadsRole;
  setCurrentRole: (role: LeadsRole) => void;
}

export const useLeadsRbac = create<RbacState>()(
  persist(
    (set, get) => ({
      roleMap: {},
      currentRole: 'general',

      setUserRole: (userId, role) => set(s => ({
        roleMap: { ...s.roleMap, [userId]: role },
      })),

      resolveRole: (userId) => get().roleMap[userId] ?? 'general',

      setCurrentRole: (role) => set({ currentRole: role }),
    }),
    { name: 'kort-leads-rbac' },
  ),
);

// ── Permission helpers ────────────────────────────────────────
export function canSeeQualifierBoard(role: LeadsRole) {
  return role === 'qualifier' || role === 'manager' || role === 'general';
}
export function canSeeCloserBoard(role: LeadsRole) {
  return role === 'closer' || role === 'manager' || role === 'general';
}
export function canTransferLead(role: LeadsRole) {
  return role === 'qualifier' || role === 'manager' || role === 'general';
}
export function canSeeAnalytics(role: LeadsRole) {
  return role === 'manager';
}
