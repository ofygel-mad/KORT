/**
 * views/PnLView.tsx
 * P&L by category with drill-down.
 */

import { useQuery } from '@tanstack/react-query';
import { useAccountingStore } from '../model/store';
import { accountingApi } from '../api/client';
import s from './PnLView.module.css';

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className={s.barTrack}>
      <div className={s.barFill} style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

export function PnLView() {
  const { filters } = useAccountingStore();

  const { data, isLoading } = useQuery({
    queryKey: ['accounting-pnl', filters.period],
    queryFn: () => accountingApi.getPnL(filters.period),
  });

  if (isLoading) {
    return <div className={s.loading}>Загрузка…</div>;
  }

  if (!data) return null;

  const margin = data.grossMargin;
  const marginColor = margin >= 30 ? 'var(--fill-positive-text)' : margin >= 0 ? 'var(--fill-warning-text)' : 'var(--fill-negative-text)';

  return (
    <div className={s.root}>
      {/* Summary */}
      <div className={s.summaryRow}>
        <div className={s.summCard}>
          <span className={s.summLabel}>Выручка</span>
          <span className={`${s.summVal} ${s.income}`}>₸ {fmt(data.income.total)}</span>
        </div>
        <div className={s.divider}>−</div>
        <div className={s.summCard}>
          <span className={s.summLabel}>Расходы</span>
          <span className={`${s.summVal} ${s.expense}`}>₸ {fmt(data.expense.total)}</span>
        </div>
        <div className={s.divider}>=</div>
        <div className={s.summCard}>
          <span className={s.summLabel}>Прибыль</span>
          <span className={s.summVal} style={{ color: data.grossProfit >= 0 ? 'var(--fill-positive-text)' : 'var(--fill-negative-text)' }}>
            ₸ {fmt(data.grossProfit)}
          </span>
          <span className={s.margin} style={{ color: marginColor }}>{margin}% маржа</span>
        </div>
      </div>

      <div className={s.columns}>
        {/* Income */}
        <div className={s.col}>
          <div className={s.colHead}>
            <span className={s.colTitle}>Доходы</span>
            <span className={`${s.colTotal} ${s.income}`}>₸ {fmt(data.income.total)}</span>
          </div>
          {data.income.rows.map((row) => (
            <div key={row.category} className={s.catRow}>
              <div className={s.catInfo}>
                <span className={s.catName}>{row.category}</span>
                <span className={`${s.catAmount} ${s.income}`}>₸ {fmt(row.amount)}</span>
              </div>
              <Bar pct={row.pct} color="var(--fill-positive-text, #16a34a)" />
              <span className={s.catPct}>{row.pct}%</span>
            </div>
          ))}
          {data.income.rows.length === 0 && <div className={s.empty}>Нет доходов за период</div>}
        </div>

        {/* Expense */}
        <div className={s.col}>
          <div className={s.colHead}>
            <span className={s.colTitle}>Расходы</span>
            <span className={`${s.colTotal} ${s.expense}`}>₸ {fmt(data.expense.total)}</span>
          </div>
          {data.expense.rows.map((row) => (
            <div key={row.category} className={s.catRow}>
              <div className={s.catInfo}>
                <span className={s.catName}>{row.category}</span>
                <span className={`${s.catAmount} ${s.expense}`}>₸ {fmt(row.amount)}</span>
              </div>
              <Bar pct={row.pct} color="var(--fill-negative-text, #dc2626)" />
              <span className={s.catPct}>{row.pct}%</span>
            </div>
          ))}
          {data.expense.rows.length === 0 && <div className={s.empty}>Нет расходов за период</div>}
        </div>
      </div>
    </div>
  );
}
