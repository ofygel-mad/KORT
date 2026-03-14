/**
 * features/summary-spa/components/widgets/DealsWidget.tsx
 * Deals funnel breakdown, lost reasons, and win/loss stats.
 */
import { useSummaryStore } from '../../model/summary.store';
import s from './Widgets.module.css';

const STAGE_LABEL: Record<string, string> = {
  awaiting_meeting: 'Ожидает встречи',
  meeting_done:     'Встреча',
  proposal:         'КП',
  contract:         'Договор',
  awaiting_payment: 'Оплата',
};

const STAGE_COLORS: Record<string, string> = {
  awaiting_meeting: '#3b82f6',
  meeting_done:     '#8b5cf6',
  proposal:         '#f59e0b',
  contract:         '#ec4899',
  awaiting_payment: '#f97316',
};

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'М ₸';
  if (n >= 1_000)     return Math.round(n / 1_000) + 'к ₸';
  return n + ' ₸';
}

export function DealsFunnelWidget() {
  const dealsSnap = useSummaryStore(s => s.dealsSnap);

  if (!dealsSnap) {
    return (
      <div className={s.chartCard}>
        <div className={s.chartTitle}>Воронка сделок</div>
        <div className={s.emptyFeed}>Ожидание данных от Deals SPA…</div>
      </div>
    );
  }

  const stages = Object.entries(dealsSnap.byStage)
    .filter(([k]) => !['won', 'lost'].includes(k))
    .sort(([a], [b]) => {
      const order = ['awaiting_meeting', 'meeting_done', 'proposal', 'contract', 'awaiting_payment'];
      return order.indexOf(a) - order.indexOf(b);
    });

  const maxCount = Math.max(...stages.map(([, v]) => v.count), 1);

  return (
    <div className={s.chartCard}>
      <div className={s.chartHeader}>
        <div>
          <div className={s.chartTitle}>Воронка сделок</div>
          <div className={s.chartSubtitle}>{dealsSnap.totalActive} активных сделок</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>{dealsSnap.totalWon}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>выиграно</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{dealsSnap.totalLost}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>проиграно</div>
          </div>
        </div>
      </div>

      <div className={s.funnelList}>
        {stages.map(([stage, { count, value }]) => (
          <div key={stage} className={s.funnelRow}>
            <div className={s.funnelRowHeader}>
              <span className={s.funnelLabel}>{STAGE_LABEL[stage] ?? stage}</span>
              <span className={s.funnelValue}>
                {count} · {fmtMoney(value)}
              </span>
            </div>
            <div className={s.funnelTrack}>
              <div
                className={s.funnelFill}
                style={{
                  width: `${(count / maxCount) * 100}%`,
                  background: STAGE_COLORS[stage] ?? '#6b7280',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LostReasonsWidget() {
  const dealsSnap = useSummaryStore(s => s.dealsSnap);

  if (!dealsSnap || Object.keys(dealsSnap.lostReasonBreakdown).length === 0) {
    return (
      <div className={s.chartCard}>
        <div className={s.sectionTitle}>Причины слива</div>
        <div className={s.emptyFeed}>Нет данных</div>
      </div>
    );
  }

  const reasons = Object.entries(dealsSnap.lostReasonBreakdown)
    .sort(([, a], [, b]) => b - a);
  const maxCount = Math.max(...reasons.map(([, c]) => c), 1);

  return (
    <div className={s.chartCard}>
      <div className={s.sectionTitle}>Причины слива</div>
      <div className={s.reasonList}>
        {reasons.map(([reason, count]) => (
          <div key={reason} className={s.reasonRow}>
            <span className={s.reasonLabel}>{reason}</span>
            <div className={s.reasonTrack}>
              <div className={s.reasonFill} style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
            <span className={s.reasonCount}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
