/**
 * features/summary-spa/components/charts/RevenueTrend.tsx
 * SVG sparkline bar chart — won revenue over time.
 */
import { useSummaryStore } from '../../model/summary.store';
import s from '../widgets/Widgets.module.css';

const PERIOD_DAYS = { '7d': 7, '14d': 14, '30d': 30 };

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'М';
  if (n >= 1_000)     return Math.round(n / 1_000) + 'к';
  return n === 0 ? '0' : String(n);
}

function fmtDate(s: string): string {
  const d = new Date(s);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function RevenueTrend() {
  const { history, period } = useSummaryStore();
  const days = PERIOD_DAYS[period];
  const slice = history.slice(-days);

  const maxVal = Math.max(...slice.map(p => p.wonValue), 1);
  const total  = slice.reduce((a, p) => a + p.wonValue, 0);
  const avg    = Math.round(total / days);

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

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 72 }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(r => (
          <line
            key={r}
            x1={0} y1={H - H * r}
            x2={W} y2={H - H * r}
            stroke="rgba(255,255,255,.05)"
            strokeWidth={1}
          />
        ))}

        {slice.map((p, i) => {
          const h = Math.max(2, (p.wonValue / maxVal) * (H - 4));
          const x = i * (W / slice.length) + 1;
          const y = H - h;
          const isRecent = i >= slice.length - 3;
          return (
            <g key={p.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={2}
                fill={p.wonValue > 0
                  ? isRecent ? 'rgba(34,197,94,.75)' : 'rgba(34,197,94,.4)'
                  : 'rgba(255,255,255,.06)'
                }
              />
              {p.wonValue > 0 && i === slice.length - 1 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#22c55e"
                  fontWeight="600"
                >
                  {fmtMoney(p.wonValue)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Date labels - first, middle, last */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {[slice[0], slice[Math.floor(slice.length / 2)], slice[slice.length - 1]]
          .filter(Boolean)
          .map((p, i) => (
            <span key={i} style={{ fontSize: 10, color: '#4b5563' }}>
              {fmtDate(p.date)}
            </span>
          ))}
      </div>
    </div>
  );
}
