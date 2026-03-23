/**
 * ui/SummaryBar/SummaryBar.tsx
 * Top KPI strip: Income / Expense / Profit / Debt / Gaps
 */

import type { AccountingSummary } from '../../api/client';
import s from './SummaryBar.module.css';

interface Props {
  data?: AccountingSummary;
  loading?: boolean;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `₸${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₸${Math.round(n / 1_000)}K`;
  return `₸${Math.round(n).toLocaleString('ru-RU')}`;
}

function Pct({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return <span className={s.pctNeutral}>—</span>;
  const cls = v > 0 ? s.pctUp : v < 0 ? s.pctDown : s.pctNeutral;
  const sign = v > 0 ? '▲' : v < 0 ? '▼' : '↔';
  return <span className={cls}>{sign} {Math.abs(v)}%</span>;
}

interface KPICardProps {
  label: string;
  value: string;
  pct?: number | null;
  accent?: 'positive' | 'negative' | 'warning' | 'neutral';
  loading?: boolean;
}

function KPICard({ label, value, pct, accent = 'neutral', loading }: KPICardProps) {
  return (
    <div className={`${s.card} ${s[`card_${accent}`]}`}>
      <span className={s.cardLabel}>{label}</span>
      {loading
        ? <span className={s.skeleton} />
        : <span className={s.cardValue}>{value}</span>
      }
      {!loading && pct !== undefined && <Pct v={pct} />}
    </div>
  );
}

export function SummaryBar({ data, loading }: Props) {
  return (
    <div className={s.bar}>
      <KPICard
        label="Выручка"
        value={data ? fmt(data.income) : '—'}
        pct={data?.incomePct}
        accent="positive"
        loading={loading}
      />
      <KPICard
        label="Расходы"
        value={data ? fmt(data.expense) : '—'}
        pct={data?.expensePct}
        accent="negative"
        loading={loading}
      />
      <KPICard
        label="Прибыль"
        value={data ? fmt(data.profit) : '—'}
        pct={data?.profitPct}
        accent={data && data.profit >= 0 ? 'positive' : 'negative'}
        loading={loading}
      />
      <KPICard
        label="Долги"
        value={data ? fmt(data.totalDebt) : '—'}
        accent={data && data.totalDebt > 0 ? 'warning' : 'neutral'}
        loading={loading}
      />
      {data && data.openGaps > 0 && (
        <div className={s.gapBadge}>
          <span className={s.gapIcon}>⚠</span>
          <span>{data.openGaps} разрыв{data.openGaps > 1 ? 'а' : ''}</span>
        </div>
      )}
    </div>
  );
}
