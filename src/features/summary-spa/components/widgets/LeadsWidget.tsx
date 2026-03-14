/**
 * features/summary-spa/components/widgets/LeadsWidget.tsx
 * Leads conversion rate + stage breakdown.
 */
import { useSummaryStore } from '../../model/summary.store';
import s from './Widgets.module.css';

const STAGE_LABEL: Record<string, string> = {
  new:              'Новые',
  in_progress:      'В работе',
  no_answer:        'Нет ответа',
  thinking:         'Думают',
  meeting_set:      'Встреча назначена',
  junk:             'Мусор',
  awaiting_meeting: 'Ожидает встречи',
  meeting_done:     'Встреча проведена',
  proposal:         'КП',
  contract:         'Договор',
  awaiting_payment: 'Оплата',
};

const STAGE_COLOR: Record<string, string> = {
  new:              '#6b7280',
  in_progress:      '#3b82f6',
  no_answer:        '#ef4444',
  thinking:         '#f59e0b',
  meeting_set:      '#22c55e',
  junk:             '#374151',
  awaiting_meeting: '#8b5cf6',
  meeting_done:     '#ec4899',
  proposal:         '#f97316',
  contract:         '#f59e0b',
  awaiting_payment: '#22c55e',
};

export function LeadsWidget() {
  const leadsSnap = useSummaryStore(s => s.leadsSnap);

  if (!leadsSnap) {
    return (
      <div className={s.chartCard}>
        <div className={s.chartTitle}>Лиды</div>
        <div className={s.emptyFeed}>Ожидание данных от Leads SPA…</div>
      </div>
    );
  }

  const stages = Object.entries(leadsSnap.byStage).sort(([, a], [, b]) => b - a);
  const total  = leadsSnap.totalLeads || 1;

  // Conversion rate: converted / total
  const convPct = total > 0
    ? Math.round((leadsSnap.convertedThisMonth / total) * 100)
    : 0;

  // SVG donut
  const R = 36;
  const CIRC = 2 * Math.PI * R;
  const greenLen = CIRC * (convPct / 100);

  return (
    <div className={s.chartCard}>
      <div className={s.chartTitle}>Лиды</div>

      <div className={s.conversionWrap}>
        {/* Donut */}
        <div className={s.donutWrap}>
          <svg
            className={s.donutSvg}
            width={100}
            height={100}
            viewBox="0 0 100 100"
          >
            <circle cx={50} cy={50} r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={10} />
            <circle
              cx={50} cy={50} r={R}
              fill="none"
              stroke="#22c55e"
              strokeWidth={10}
              strokeDasharray={`${greenLen} ${CIRC - greenLen}`}
              strokeLinecap="round"
            />
          </svg>
          <div className={s.donutCenter}>
            <div className={s.donutValue}>{convPct}%</div>
            <div className={s.donutLabel}>конверсия</div>
          </div>
        </div>

        {/* Stats */}
        <div className={s.conversionStats}>
          <div className={s.conversionStat}>
            <span>Всего лидов</span>
            <span className={s.conversionStatValue}>{leadsSnap.totalLeads}</span>
          </div>
          <div className={s.conversionStat}>
            <span>Передано в сделки</span>
            <span className={s.conversionStatValue} style={{ color: '#22c55e' }}>
              {leadsSnap.convertedThisMonth}
            </span>
          </div>
        </div>
      </div>

      {/* Stage breakdown */}
      <div className={s.funnelList} style={{ marginTop: 8 }}>
        {stages.map(([stage, count]) => (
          <div key={stage} className={s.funnelRow}>
            <div className={s.funnelRowHeader}>
              <span className={s.funnelLabel}>{STAGE_LABEL[stage] ?? stage}</span>
              <span className={s.funnelValue}>{count}</span>
            </div>
            <div className={s.funnelTrack}>
              <div
                className={s.funnelFill}
                style={{
                  width: `${(count / total) * 100}%`,
                  background: STAGE_COLOR[stage] ?? '#6b7280',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
