/**
 * features/summary-spa/model/summary.store.ts
 * Aggregates snapshots from all other SPAs via shared-bus.
 * Never imports Leads / Deals / Tasks stores directly.
 *
 * Extension point:
 *   When a new SPA is added, it publishes a SpaSnapshot with its own
 *   source key. This store picks it up in processSnapshots() and
 *   stores it under latestSnapshots[source]. The UI can then render
 *   it in a dedicated widget without touching existing code.
 */
import { create } from 'zustand';
import { useSharedBus } from '../../shared-bus';
import type {
  LeadsSnapshot, DealsSnapshot, TasksSnapshot, DailyDataPoint, ReportSection,
} from '../api/types';
import type { DealWonEvent, DealLostEvent, TaskDoneEvent } from '../../shared-bus';
import { historyData, aggregateLast, previousPeriod } from '../api/mock';

// ── Period filter ─────────────────────────────────────────────

export type PeriodFilter = '7d' | '14d' | '30d';

const PERIOD_DAYS: Record<PeriodFilter, number> = { '7d': 7, '14d': 14, '30d': 30 };

// ── State ─────────────────────────────────────────────────────

interface SummaryState {
  // Latest snapshots per source (updated whenever bus delivers one)
  leadsSnap:  LeadsSnapshot  | null;
  dealsSnap:  DealsSnapshot  | null;
  tasksSnap:  TasksSnapshot  | null;
  /** Extension slot: future SPAs go here */
  extraSnaps: Record<string, unknown>;

  // Live event feeds (last 50)
  wonEvents:  DealWonEvent[];
  lostEvents: DealLostEvent[];
  taskDoneEvents: TaskDoneEvent[];

  // Historical trend data (seeded + runtime appended)
  history: DailyDataPoint[];

  // Period selector
  period: PeriodFilter;

  // Registered report sections (future SPAs can self-register)
  reportSections: ReportSection[];

  // Actions
  processSnapshots: () => void;
  processEventQueues: () => void;
  setPeriod: (p: PeriodFilter) => void;
  registerReportSection: (section: ReportSection) => void;

  // Derived helpers (called by UI — not stored)
  getPeriodAggregates: () => ReturnType<typeof aggregateLast> & { prev: ReturnType<typeof aggregateLast> };
}

export const useSummaryStore = create<SummaryState>((set, get) => ({
  leadsSnap:  null,
  dealsSnap:  null,
  tasksSnap:  null,
  extraSnaps: {},
  wonEvents:  [],
  lostEvents: [],
  taskDoneEvents: [],
  history: historyData,
  period: '30d',
  reportSections: [],

  processSnapshots: () => {
    const snaps = useSharedBus.getState().consumeSnapshots();
    for (const snap of snaps) {
      if (snap.source === 'leads') set({ leadsSnap: snap as LeadsSnapshot });
      else if (snap.source === 'deals') set({ dealsSnap: snap as DealsSnapshot });
      else if (snap.source === 'tasks') set({ tasksSnap: snap as TasksSnapshot });
      else {
        // Unknown future source — store generically
        set(s => ({ extraSnaps: { ...s.extraSnaps, [snap.source]: snap } }));
      }
    }
  },

  processEventQueues: () => {
    const bus = useSharedBus.getState();

    const won  = bus.consumeDealWon();
    const lost = bus.consumeDealLost();
    const done = bus.consumeTaskDone();

    if (won.length > 0) {
      set(s => ({
        wonEvents: [...won, ...s.wonEvents].slice(0, 50),
        // Append to today's history point
        history: appendToToday(s.history, { wonValue: won.reduce((a, e) => a + e.value, 0), wonCount: won.length }),
      }));
    }

    if (lost.length > 0) {
      set(s => ({ lostEvents: [...lost, ...s.lostEvents].slice(0, 50) }));
    }

    if (done.length > 0) {
      set(s => ({
        taskDoneEvents: [...done, ...s.taskDoneEvents].slice(0, 50),
        history: appendToToday(s.history, { tasksDone: done.length }),
      }));
    }
  },

  setPeriod: (period) => set({ period }),

  registerReportSection: (section) =>
    set(s => ({
      reportSections: s.reportSections.some(r => r.id === section.id)
        ? s.reportSections
        : [...s.reportSections, section],
    })),

  getPeriodAggregates: () => {
    const { period, history } = get();
    const days = PERIOD_DAYS[period];
    const curr = aggregateLast(days, history);
    const prev = previousPeriod(days, history);
    return { ...curr, prev };
  },
}));

// ── Helper: append values to the last history point (today) ───

function appendToToday(
  history: DailyDataPoint[],
  delta: Partial<Omit<DailyDataPoint, 'date'>>
): DailyDataPoint[] {
  if (history.length === 0) return history;
  const today = new Date().toISOString().slice(0, 10);
  const last = history[history.length - 1];
  if (last.date === today) {
    return [
      ...history.slice(0, -1),
      {
        ...last,
        wonValue:  last.wonValue  + (delta.wonValue  ?? 0),
        wonCount:  last.wonCount  + (delta.wonCount  ?? 0),
        tasksDone: last.tasksDone + (delta.tasksDone ?? 0),
        newLeads:  last.newLeads  + (delta.newLeads  ?? 0),
      },
    ];
  }
  return [
    ...history,
    {
      date: today,
      wonValue:  delta.wonValue  ?? 0,
      wonCount:  delta.wonCount  ?? 0,
      tasksDone: delta.tasksDone ?? 0,
      newLeads:  delta.newLeads  ?? 0,
    },
  ];
}
