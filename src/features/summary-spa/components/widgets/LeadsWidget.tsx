/**
 * features/summary-spa/components/widgets/LeadsWidget.tsx
 * Leads conversion rate + stage breakdown.
 */
import { useSummaryStore } from '../../model/summary.store';
import s from './Widgets.module.css';

type Tone = 'muted' | 'info' | 'danger' | 'warning' | 'positive' | 'violet' | 'magenta' | 'accent';

const STAGE_LABEL: Record<string, string> = {
  new: 'Новые',
  in_progress: 'В работе',
  no_answer: 'Нет ответа',
  thinking: 'Думают',
  meeting_set: 'Встреча назначена',
  junk: 'Мусор',
  awaiting_meeting: 'Ожидает встречи',
  meeting_done: 'Встреча проведена',
  proposal: 'КП',
  contract: 'Договор',
  awaiting_payment: 'Оплата',
};

const STAGE_TONE: Record<string, Tone> = {
  new: 'muted',
  in_progress: 'info',
  no_answer: 'danger',
  thinking: 'warning',
  meeting_set: 'positive',
  junk: 'muted',
  awaiting_meeting: 'violet',
  meeting_done: 'magenta',
  proposal: 'accent',
  contract: 'warning',
  awaiting_payment: 'positive',
};

const TONE_CLASS: Record<Tone, string> = {
  muted: s.toneMuted,
  info: s.toneInfo,
  danger: s.toneDanger,
  warning: s.toneWarning,
  positive: s.tonePositive,
  violet: s.toneViolet,
  magenta: s.toneMagenta,
  accent: s.toneAccent,
};

export function LeadsWidget() {
  const leadsSnap = useSummaryStore((state) => state.leadsSnap);

  if (!leadsSnap) {
    return (
      <div className={s.chartCard}>
        <div className={s.chartTitle}>Лиды</div>
        <div className={s.emptyFeed}>Ожидание данных от Leads SPA…</div>
      </div>
    );
  }

  const stages = Object.entries(leadsSnap.byStage).sort(([, a], [, b]) => b - a);
  const total = leadsSnap.totalLeads || 1;
  const convPct = total > 0 ? Math.round((leadsSnap.convertedThisMonth / total) * 100) : 0;

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progressLength = circumference * (convPct / 100);

  return (
    <div className={s.chartCard}>
      <div className={s.chartTitle}>Лиды</div>

      <div className={s.conversionWrap}>
        <div className={s.donutWrap}>
          <svg className={s.donutSvg} width={100} height={100} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={radius} fill="none" className={s.donutTrackCircle} strokeWidth={10} />
            <circle
              cx={50}
              cy={50}
              r={radius}
              fill="none"
              className={s.donutProgressCircle}
              strokeWidth={10}
              strokeDasharray={`${progressLength} ${circumference - progressLength}`}
              strokeLinecap="round"
            />
          </svg>
          <div className={s.donutCenter}>
            <div className={s.donutValue}>{convPct}%</div>
            <div className={s.donutLabel}>конверсия</div>
          </div>
        </div>

        <div className={s.conversionStats}>
          <div className={s.conversionStat}>
            <span>Всего лидов</span>
            <span className={s.conversionStatValue}>{leadsSnap.totalLeads}</span>
          </div>
          <div className={s.conversionStat}>
            <span>Передано в сделки</span>
            <span className={`${s.conversionStatValue} ${s.conversionPositive} ${s.tonePositive}`}>
              {leadsSnap.convertedThisMonth}
            </span>
          </div>
        </div>
      </div>

      <div className={`${s.funnelList} ${s.funnelListSpaced}`}>
        {stages.map(([stage, count]) => (
          <div key={stage} className={s.funnelRow}>
            <div className={s.funnelRowHeader}>
              <span className={s.funnelLabel}>{STAGE_LABEL[stage] ?? stage}</span>
              <span className={s.funnelValue}>{count}</span>
            </div>
            <div className={s.funnelTrack}>
              <div
                className={`${s.funnelFill} ${TONE_CLASS[STAGE_TONE[stage] ?? 'muted']}`}
                style={{ width: `${(count / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
