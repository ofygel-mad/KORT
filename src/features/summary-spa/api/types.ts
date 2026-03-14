/**
 * features/summary-spa/api/types.ts
 * Domain types for Summary (Сводка) SPA.
 *
 * This SPA never imports Leads/Deals/Tasks stores directly.
 * All data arrives via the shared-bus snapshot queue.
 * Own historical data is stored in summaryStore for trend charts.
 */

// ── Source snapshot mirrors (same shape as SpaSnapshot union) ─

export interface LeadsSnapshot {
  source: 'leads';
  totalLeads: number;
  byStage: Record<string, number>;
  convertedThisMonth: number;
  snapshotAt: string;
}

export interface DealsSnapshot {
  source: 'deals';
  totalActive: number;
  totalWon: number;
  totalLost: number;
  pipelineValue: number;
  weightedValue: number;
  wonValueThisMonth: number;
  wonCountThisMonth: number;
  lostCountThisMonth: number;
  byStage: Record<string, { count: number; value: number }>;
  lostReasonBreakdown: Record<string, number>;
  snapshotAt: string;
}

export interface TasksSnapshot {
  source: 'tasks';
  totalTasks: number;
  todo: number;
  inProgress: number;
  done: number;
  overdueCount: number;
  completionRateThisMonth: number;
  snapshotAt: string;
}

// ── Historical data point (for trend charts) ──────────────────

export interface DailyDataPoint {
  date: string;          // 'YYYY-MM-DD'
  wonValue: number;
  wonCount: number;
  newLeads: number;
  tasksDone: number;
}

// ── KPI Card ──────────────────────────────────────────────────

export interface KpiCard {
  id: string;
  title: string;
  value: string;
  subValue?: string;
  delta?: {
    value: number;    // absolute or percentage
    isPercent: boolean;
    positive: boolean;
  };
  color: string;
  icon: string;
}

// ── Report placeholder (future SPAs will push here) ───────────

export interface ReportSection {
  id: string;
  source: string;
  title: string;
  /** Filled by the specific SPA. Summary renders it in a slot. */
  renderKey: string;
  addedAt: string;
}
