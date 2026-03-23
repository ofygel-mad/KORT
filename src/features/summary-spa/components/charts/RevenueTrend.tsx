/**
 * features/summary-spa/components/charts/RevenueTrend.tsx
 * SVG sparkline bar chart — won revenue over time.
 */
import { useSummaryStore } from '../../model/summary.store';
import s from '../widgets/Widgets.module.css';

const PERIOD_DAYS = { '7d': 7, '14d': 14, '30d': 30 };

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'М';
  if (n >= 1_000) return Math.round(n / 1_000) + 'к';
  return n === 0 ? '0' : String(n);
}

function fmtDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function RevenueTrend() {
  const { history, period } = useSummaryStore();
  const days = PERIOD_DAYS[period];
  const slice = history.slice(-days);

  if (slice.length === 0) {
    return (
      <div className={s.chartCard}>
        <div className={s.chartTitle}>Выручка за период</div>
        <div className={s.emptyFeed}>История для графика ещё не накоплена.</div>
      </div>
    );
  }

  const maxVal = Math.max(...slice.map((point) => point.wonValue), 1);
  const total = slice.reduce((sum, point) => sum + point.wonValue, 0);
  const avg = Math.round(total / days);

  const W = 280;
  const H = 72;
  const barW = Math.max(3, Math.floor(W / slice.length) - 2);

  return (
    <div className={s.chartCard}>
      <div className={s.chartHeader}>
        <div>
          <div className={s.chartTitle}>Выручка за период</div>
          <div className={s.chartSubtitle}>Всего: {fmtMoney(total)} ₸ · Ср/день: {fmtMoney(avg)} ₸</div>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={s.revenueSvg}>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            y1={H - H * ratio}
            x2={W}
            y2={H - H * ratio}
            className={s.revenueGridLine}
          />
        ))}

        {slice.map((point, index) => {
          const height = Math.max(2, (point.wonValue / maxVal) * (H - 4));
          const x = index * (W / slice.length) + 1;
          const y = H - height;
          const isRecent = index >= slice.length - 3;

          return (
            <g key={point.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={height}
                rx={2}
                className={
                  point.wonValue > 0
                    ? isRecent ? s.revenueBarRecent : s.revenueBar
                    : s.revenueBarMuted
                }
              />
              {point.wonValue > 0 && index === slice.length - 1 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className={s.revenueValue}
                >
                  {fmtMoney(point.wonValue)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className={s.revenueAxis}>
        {[slice[0], slice[Math.floor(slice.length / 2)], slice[slice.length - 1]]
          .filter(Boolean)
          .map((point, index) => (
            <span key={index} className={s.revenueAxisLabel}>
              {fmtDate(point.date)}
            </span>
          ))}
      </div>
    </div>
  );
}
