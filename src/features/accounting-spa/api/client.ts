/**
 * features/accounting-spa/api/client.ts
 * All accounting API calls.
 */

import { api } from '../../../shared/api/client';

export interface LedgerEntry {
  id: string;
  seq: number;
  type: 'income' | 'expense' | 'transfer' | 'adjustment' | 'write_off' | 'return';
  amount: number;
  currency: string;
  category: string;
  account: string;
  counterparty?: string;
  sourceModule?: string;
  sourceId?: string;
  sourceLabel?: string;
  period: string;
  author: string;
  prevHash?: string;
  hash: string;
  isReconciled: boolean;
  reconciledAt?: string;
  reconciledBy?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
}

export interface AccountingSummary {
  period: string;
  income: number;
  expense: number;
  profit: number;
  incomePct: number | null;
  expensePct: number | null;
  profitPct: number | null;
  totalDebt: number;
  openGaps: number;
  lastEntry?: { createdAt: string; amount: number; type: string } | null;
}

export interface PnLRow { category: string; amount: number; pct: number; }
export interface PnLData {
  period: string;
  income: { total: number; rows: PnLRow[] };
  expense: { total: number; rows: PnLRow[] };
  grossProfit: number;
  grossMargin: number;
}

export interface CashFlowDay { date: string; income: number; expense: number; net: number; }

export interface InventoryRow {
  name: string; color: string; itemCount: number; totalQty: number; totalValue: number; pct: number;
}
export interface InventoryValue { rows: InventoryRow[]; grandTotal: number; itemCount: number; }

export interface DebtEntry {
  id: string; label: string; counterparty: string; amount: number;
  dueDate?: string; daysSince: number; sourceModule: string; sourceId?: string;
}
export interface Debts {
  receivable: DebtEntry[]; payable: DebtEntry[];
  totalReceivable: number; totalPayable: number;
}

export interface AccountingGap {
  id: string; type: string; severity: 'info' | 'warning' | 'error';
  description: string; sourceModule: string; sourceId: string;
  status: 'open' | 'ignored' | 'resolved'; createdAt: string;
}

export interface EntriesResponse { results: LedgerEntry[]; total: number; page: number; limit: number; }

export type EntryType = 'income' | 'expense' | 'transfer' | 'adjustment' | 'write_off' | 'return';

// ─────────────────────────────────────────────────────────────

export const accountingApi = {
  getSummary: (period?: string) =>
    api.get<AccountingSummary>('/accounting/summary', period ? { period } : {}),

  listEntries: (params: {
    period?: string; from?: string; to?: string; type?: string;
    sourceModule?: string; search?: string; page?: number; limit?: number;
  }) => api.get<EntriesResponse>('/accounting/entries', params),

  createEntry: (body: {
    type: EntryType; amount: number; category: string; account: string;
    counterparty?: string; notes?: string; tags?: string[];
  }) => api.post<LedgerEntry>('/accounting/entries', body),

  reconcile: (id: string) =>
    api.patch<LedgerEntry>(`/accounting/entries/${id}/reconcile`, {}),

  getPnL: (period?: string) =>
    api.get<PnLData>('/accounting/pnl', period ? { period } : {}),

  getCashFlow: (from?: string, to?: string) =>
    api.get<CashFlowDay[]>('/accounting/cashflow', { from, to }),

  getInventoryValue: () =>
    api.get<InventoryValue>('/accounting/inventory-value'),

  getDebts: () =>
    api.get<Debts>('/accounting/debts'),

  getGaps: () =>
    api.get<AccountingGap[]>('/accounting/gaps'),

  resolveGap: (id: string, action: 'resolve' | 'ignore') =>
    api.patch<AccountingGap>(`/accounting/gaps/${id}`, { action }),

  verifyIntegrity: () =>
    api.get<{ valid: boolean; brokenAt?: number }>('/accounting/integrity'),
};
