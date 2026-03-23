/**
 * views/CashFlowView.tsx
 * Daily cash flow chart — income vs expense bars + net line.
 * Pure CSS bars (no chart lib dependency).
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountingApi } from '../api/client';
import s from './CashFlowView.module.css';

type Range = '7' | '30' | '90';

function fmt(n: number) {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}K`;
  return String(Math.round(n));
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

export function CashFlowView() {
  const [range, setRange] = useState<Range>('30');

  const from = new Date(Date.now() - Number(range) * 86_400_000).toISOString().slice(0, 10);
  const to   = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['accounting-cashflow', range],
    queryFn: () => accountingApi.getCashFlow(from, to),
  });

  const days = data ?? [];
  const maxVal = Math.max(1, ...days.flatMap((d) => [d.income, d.expense]));

  const totalIncome  = days.reduce((s, d) => s + d.income, 0);
  const totalExpense = days.reduce((s, d) => s + d.expense, 0);
  const totalNet     = totalIncome - totalExpense;

  return (
    <div className={s.root}>
      {/* Controls */}
      <div className={s.controls}>
        <div className={s.rangeGroup}>
          {(['7', '30', '90'] as Range[]).map((r) => (
            <button
              key={r}
              className={`${s.rangeBtn} ${range === r ? s.rangeBtnActive : ''}`}
              onClick={() => setRange(r)}
            >
              {r} дн.
            </button>
          ))}
        </div>

        <div className={s.totals}>
          <span className={s.totalItem}>
            <span className={s.dot} style={{ background: 'var(--fill-positive-text)' }} />
            Доходы: ₸ {totalIncome.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
          </span>
          <span className={s.totalItem}>
            <span className={s.dot} style={{ background: 'var(--fill-negative-text)' }} />
            Расходы: ₸ {totalExpense.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
          </span>
          <span className={`${s.totalItem} ${totalNet >= 0 ? s.netPos : s.netNeg}`}>
            Нетто: {totalNet >= 0 ? '+' : ''}₸ {totalNet.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className={s.chartWrap}>
        {isLoading ? (
          <div className={s.loading}>Загрузка…</div>
        ) : days.length === 0 ? (
          <div className={s.empty}>Нет данных за выбранный период</div>
        ) : (
          <div className={s.chart}>
            {days.map((day) => {
              const incH = (day.income  / maxVal) * 100;
              const expH = (day.expense / maxVal) * 100;
              const netIsPos = day.net >= 0;

              return (
                <div key={day.date} className={s.dayCol} title={`${fmtDate(day.date)}: +${day.income.toLocaleString()} / -${day.expense.toLocaleString()}`}>
                  <div className={s.barGroup}>
                    <div
                      className={s.barIncome}
                      style={{ height: `${incH}%` }}
                    />
                    <div
                      className={s.barExpense}
                      style={{ height: `${expH}%` }}
                    />
                  </div>
                  <div className={`${s.netDot} ${netIsPos ? s.netDotPos : s.netDotNeg}`} />
                  {days.length <= 30 && (
                    <div className={s.dayLabel}>{fmtDate(day.date).slice(0, 5)}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={s.legend}>
        <span className={s.legendItem}>
          <span className={s.legendBar} style={{ background: 'var(--fill-positive-text)' }} />
          Доход
        </span>
        <span className={s.legendItem}>
          <span className={s.legendBar} style={{ background: 'var(--fill-negative-text)' }} />
          Расход
        </span>
        <span className={s.legendItem}>
          <span className={s.legendDot} /> Нетто
        </span>
      </div>
    </div>
  );
}
