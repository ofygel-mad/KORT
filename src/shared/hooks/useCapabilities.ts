import { useMemo } from 'react';
import { useAuthStore } from '../stores/auth';

type ProductMode = 'basic' | 'advanced' | 'industrial';
type Role = 'owner' | 'admin' | 'manager' | 'viewer';

const IMPLIED_BY_ROLE: Record<Role, string[]> = {
  owner: [
    'billing.manage',
    'integrations.manage',
    'audit.read',
    'team.manage',
    'automations.manage',
    'admin.mode',
  ],
  admin: [
    'integrations.manage',
    'audit.read',
    'team.manage',
    'automations.manage',
    'admin.mode',
  ],
  manager: [],
  viewer: [],
};

export function useCapabilities() {
  const rawCapabilities = useAuthStore(s => s.capabilities);
  const role = (useAuthStore(s => s.role) ?? 'viewer') as Role;
  const mode = (useAuthStore(s => s.org?.mode) ?? 'basic') as ProductMode;

  const capabilities = useMemo(() => {
    return Array.from(new Set([...(rawCapabilities ?? []), ...IMPLIED_BY_ROLE[role]]));
  }, [rawCapabilities, role]);

  const can = (cap: string) => capabilities.includes(cap);

  return {
    can,
    capabilities,
    role,
    mode,
    isBasic: mode === 'basic',
    isAdvanced: mode === 'advanced',
    isIndustrial: mode === 'industrial',
    canManageBilling: can('billing.manage') || role === 'owner',
    canManageIntegrations: can('integrations.manage'),
    canViewAudit: can('audit.read'),
    canManageTeam: can('team.manage'),
    canRunAutomations: can('automations.manage'),
    canUseAdminMode: can('admin.mode'),
  };
}
