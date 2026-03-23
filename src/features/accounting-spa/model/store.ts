/**
 * features/accounting-spa/model/store.ts
 * Zustand store: active view, period, filters.
 */

import { create } from 'zustand';

export type AccountingView = 'ledger' | 'pnl' | 'cashflow' | 'inventory' | 'debts' | 'gaps';

interface AccountingFilters {
  period: string;           // YYYY-MM
  type: string;             // '' = all
  search: string;
  page: number;
}

interface AccountingStore {
  view: AccountingView;
  setView: (v: AccountingView) => void;

  filters: AccountingFilters;
  setFilter: <K extends keyof AccountingFilters>(key: K, value: AccountingFilters[K]) => void;
  resetFilters: () => void;

  selectedEntryId: string | null;
  setSelectedEntry: (id: string | null) => void;

  createEntryOpen: boolean;
  setCreateEntryOpen: (open: boolean) => void;
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const useAccountingStore = create<AccountingStore>((set) => ({
  view: 'ledger',
  setView: (view) => set({ view, selectedEntryId: null }),

  filters: { period: currentPeriod(), type: '', search: '', page: 1 },
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value, page: key !== 'page' ? 1 : (value as number) } })),
  resetFilters: () => set({ filters: { period: currentPeriod(), type: '', search: '', page: 1 } }),

  selectedEntryId: null,
  setSelectedEntry: (id) => set({ selectedEntryId: id }),

  createEntryOpen: false,
  setCreateEntryOpen: (open) => set({ createEntryOpen: open }),
}));
