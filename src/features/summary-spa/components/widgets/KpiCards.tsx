/**
 * features/summary-spa/components/widgets/KpiCards.tsx
 * Top row of metric cards — revenue, leads, tasks, funnel.
 */
import { TrendingUp, TrendingDown, Users, CheckSquare, Briefcase } from 'lucide-react';
import { useSummaryStore } from '../../model/summary.store';
import s from './Widgets.module.css';

function delta(curr: number, prev: number): { pct: number; positive: boolean } | null {
  if (prev === 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { pct, positive: pct >= 0 };
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'М ₸';
  if (n >= 1_000)     return Math.round(n / 1_000) + 'к ₸';
  return n + ' ₸';
}

export function KpiCards() {
  const { dealsSnap, leadsSnap, tasksSnap, getPeriodAggregates, period } = useSummaryStore();
  const agg = getPeriodAggregates();

  const PERIOD_LABEL = { '7d': '7 дней', '14d': '14 дней', '30d': '30 дней' };
  const pLabel = PERIOD_LABEL[period];

  // ── Card data ──────────────────────────────────────────────
  const cards = [
    {
      id: 'revenue',
      title: 'Выручка',
      subtitle: `за ${pLabel}`,
      value: fmtMoney(agg.wonValue),
      delta: delta(agg.wonValue, agg.prev.wonValue),
      color: '#22c55e',
      bg: 'rgba(34,197,94,.08)',
      icon: <TrendingUp size={18} />,
    },
    {
      id: 'deals_won',
      title: 'Закрыто сделок',
      subtitle: `за ${pLabel}`,
      value: String(agg.wonCount),
      subValue: dealsSnap ? `${dealsSnap.totalActive} активных` : undefined,
      delta: delta(agg.wonCount, agg.prev.wonCount),
      color: '#3b82f6',
      bg: 'rgba(59,130,246,.08)',
      icon: <Briefcase size={18} />,
    },
    {
      id: 'leads',
      title: 'Новых лидов',
      subtitle: `за ${pLabel}`,
      value: String(agg.newLeads),
      subValue: leadsSnap ? `${leadsSnap.totalLeads} всего` : undefined,
      delta: delta(agg.newLeads, agg.prev.newLeads),
      color: '#f59e0b',
      bg: 'rgba(245,158,11,.08)',
      icon: <Users size={18} />,
    },
    {
      id: 'tasks',
      title: 'Задач выполнено',
      subtitle: `за ${pLabel}`,
      value: String(agg.tasksDone),
      subValue: tasksSnap ? `${tasksSnap.overdueCount} просрочено` : undefined,
      delta: delta(agg.tasksDone, agg.prev.tasksDone),
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,.08)',
      icon: <CheckSquare size={18} />,
    },
  ];

  // ── Pipeline / weighted ─────────────────────────────────────
  const pipelineCard = dealsSnap
    ? {
        id: 'pipeline',
        title: 'Воронка',
        subtitle: 'взвешенная сумма',
        value: fmtMoney(dealsSnap.weightedValue),
        subValue: `${fmtMoney(dealsSnap.pipelineValue)} общая`,
        color: '#ec4899',
        bg: 'rgba(236,72,153,.08)',
        icon: <TrendingUp size={18} />,
      }
    : null;

  return (
    <div className={s.kpiRow}>
      {cards.map(c => (
        <div key={c.id} className={s.kpiCard} style={{ '--card-color': c.color, '--card-bg': c.bg } as React.CSSProperties}>
          <div className={s.kpiCardTop}>
            <div className={s.kpiIconWrap} style={{ color: c.color, background: c.bg }}>
              {c.icon}
            </div>
            {c.delta !== null && c.delta !== undefined && (
              <div className={`${s.kpiDelta} ${c.delta.positive ? s.kpiDeltaPos : s.kpiDeltaNeg}`}>
                {c.delta.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {Math.abs(c.delta.pct)}%
              </div>
            )}
          </div>
          <div className={s.kpiValue}>{c.value}</div>
          <div className={s.kpiTitle}>{c.title}</div>
          <div className={s.kpiSubtitle}>{c.subtitle}</div>
          {c.subValue && <div className={s.kpiSubValue}>{c.subValue}</div>}
        </div>
      ))}

      {pipelineCard && (
        <div
          className={s.kpiCard}
          style={{ '--card-color': pipelineCard.color, '--card-bg': pipelineCard.bg } as React.CSSProperties}
        >
          <div className={s.kpiCardTop}>
            <div className={s.kpiIconWrap} style={{ color: pipelineCard.color, background: pipelineCard.bg }}>
              {pipelineCard.icon}
            </div>
          </div>
          <div className={s.kpiValue}>{pipelineCard.value}</div>
          <div className={s.kpiTitle}>{pipelineCard.title}</div>
          <div className={s.kpiSubtitle}>{pipelineCard.subtitle}</div>
          <div className={s.kpiSubValue}>{pipelineCard.subValue}</div>
        </div>
      )}
    </div>
  );
}
