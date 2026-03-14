/**
 * features/summary-spa/index.tsx
 * Summary (Сводка) SPA shell.
 *
 * Architecture:
 *   - Polls shared-bus every 3s for snapshots and live events
 *   - Renders a dashboard of KPI cards + charts from received data
 *   - "Extra sections" slot: future SPAs can self-register report sections
 *     by calling `registerReportSection` — they'll appear as cards here
 *     without any changes to this file
 */
import { useEffect } from 'react';
import { BarChart2, RefreshCw, Zap } from 'lucide-react';
import { useSummaryStore } from './model/summary.store';
import { KpiCards }          from './components/widgets/KpiCards';
import { RevenueTrend }      from './components/charts/RevenueTrend';
import { DealsFunnelWidget, LostReasonsWidget } from './components/widgets/DealsWidget';
import { TasksHealthWidget, LiveFeedWidget }     from './components/widgets/TasksWidget';
import { LeadsWidget }       from './components/widgets/LeadsWidget';
import type { PeriodFilter } from './model/summary.store';
import s from './SummarySPA.module.css';

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '7d',  label: '7 дней'  },
  { value: '14d', label: '14 дней' },
  { value: '30d', label: '30 дней' },
];

export function SummarySPA() {
  const {
    period, setPeriod,
    processSnapshots, processEventQueues,
    leadsSnap, dealsSnap, tasksSnap,
    reportSections, extraSnaps,
  } = useSummaryStore();

  // Poll bus for new data
  useEffect(() => {
    // Initial sweep
    processSnapshots();
    processEventQueues();

    const id = setInterval(() => {
      processSnapshots();
      processEventQueues();
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const connected = [
    leadsSnap  ? 'Лиды'   : null,
    dealsSnap  ? 'Сделки' : null,
    tasksSnap  ? 'Задачи' : null,
  ].filter(Boolean);

  const extraKeys = Object.keys(extraSnaps);

  return (
    <div className={s.root}>
      {/* ── Header ──────────────────────────────────────── */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <BarChart2 size={18} className={s.icon} />
          <span className={s.title}>Сводка</span>

          {connected.length > 0 ? (
            <div className={s.connectedPills}>
              <Zap size={11} style={{ color: '#22c55e' }} />
              {connected.map(name => (
                <span key={name} className={s.connectedPill}>{name}</span>
              ))}
            </div>
          ) : (
            <span className={s.waitingBadge}>
              <RefreshCw size={11} className={s.spinSlow} />
              Ожидание данных от SPA…
            </span>
          )}
        </div>

        {/* Period selector */}
        <div className={s.periodGroup}>
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${s.periodBtn} ${period === opt.value ? s.periodBtnActive : ''}`}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dashboard ───────────────────────────────────── */}
      <div className={s.dashboard}>
        {/* KPI row */}
        <section className={s.section}>
          <KpiCards />
        </section>

        {/* Main row: Revenue + Funnel */}
        <div className={s.row}>
          <div className={s.col2}>
            <RevenueTrend />
          </div>
          <div className={s.col1}>
            <DealsFunnelWidget />
          </div>
        </div>

        {/* Second row: Leads + Tasks + Lost reasons */}
        <div className={s.row}>
          <div className={s.col1}>
            <LeadsWidget />
          </div>
          <div className={s.col1}>
            <TasksHealthWidget />
          </div>
          <div className={s.col1}>
            <LostReasonsWidget />
          </div>
        </div>

        {/* Live feed */}
        <div className={s.row}>
          <div className={s.colFull}>
            <LiveFeedWidget />
          </div>
        </div>

        {/* ── Extension slot: future SPAs self-register here ─────── */}
        {reportSections.length > 0 && (
          <div className={s.row}>
            {reportSections.map(sec => (
              <div key={sec.id} className={s.col1}>
                <div className={s.extensionCard}>
                  <div className={s.extensionTitle}>{sec.title}</div>
                  <div className={s.extensionSource}>{sec.source}</div>
                  {/* Future SPA renders its component here via renderKey lookup */}
                  <div className={s.extensionPlaceholder}>
                    Данные от «{sec.source}» подключены
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generic extra snapshots from unknown future SPAs */}
        {extraKeys.length > 0 && (
          <div className={s.row}>
            {extraKeys.map(key => (
              <div key={key} className={s.col1}>
                <div className={s.extensionCard}>
                  <div className={s.extensionTitle}>{key}</div>
                  <div className={s.extensionSource}>Новый SPA-источник</div>
                  <pre className={s.extensionJson}>
                    {JSON.stringify(extraSnaps[key], null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
