/**
 * Reports SPA — Analytics dashboard with key metrics.
 * Lives at: src/features/workspace/widgets/reports/spa/ReportsSPA.tsx
 */
import type { WorkspaceSnapshot } from '../../../model/types';
import s from './ReportsSPA.module.css';

const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
const fmtCur = (n: number) => new Intl.NumberFormat('ru-RU', { style:'currency', currency:'KZT', maximumFractionDigits:0 }).format(n);

interface Props { snapshot?: WorkspaceSnapshot; }

export function ReportsSPA({ snapshot }: Props) {
  const s_snap = snapshot;
  const metrics = [
    { label: 'Клиентов', value: fmt(s_snap?.customersCount ?? 0), sub: 'в базе', color: '#3b82f6' },
    { label: 'Сделок',   value: fmt(s_snap?.dealsCount ?? 0),     sub: 'активных', color: '#8b5cf6' },
    { label: 'Задач',    value: fmt(s_snap?.tasksCount ?? 0),      sub: 'на сегодня', color: '#f59e0b' },
    { label: 'Выручка',  value: fmtCur(s_snap?.revenueMonth ?? 0), sub: 'за месяц', color: '#22c55e' },
  ];

  const tasksByPriority = {
    high:   (s_snap?.todayTasks ?? []).filter(t => t.priority === 'high').length,
    medium: (s_snap?.todayTasks ?? []).filter(t => t.priority === 'medium').length,
    low:    (s_snap?.todayTasks ?? []).filter(t => t.priority === 'low').length,
  };
  const maxTasks = Math.max(...Object.values(tasksByPriority), 1);

  return (
    <div className={s.root}>
      <div className={s.header}>
        <span className={s.title}>Сводка показателей</span>
        <span className={s.subtitle}>Обновлено только что</span>
      </div>

      <div className={s.metricsGrid}>
        {metrics.map(m => (
          <div key={m.label} className={s.metricCard} style={{ '--m-color': m.color } as React.CSSProperties}>
            <div className={s.metricValue}>{m.value}</div>
            <div className={s.metricLabel}>{m.label}</div>
            <div className={s.metricSub}>{m.sub}</div>
            <div className={s.metricGlow} />
          </div>
        ))}
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>Задачи по приоритету</div>
        <div className={s.bars}>
          {[
            { key: 'high',   label: 'Высокий', color: '#ef4444' },
            { key: 'medium', label: 'Средний',  color: '#f59e0b' },
            { key: 'low',    label: 'Низкий',   color: '#22c55e' },
          ].map(({ key, label, color }) => {
            const val = tasksByPriority[key as keyof typeof tasksByPriority];
            return (
              <div key={key} className={s.barRow}>
                <span className={s.barLabel}>{label}</span>
                <div className={s.barTrack}>
                  <div className={s.barFill} style={{ width: `${(val/maxTasks)*100}%`, background: color }} />
                </div>
                <span className={s.barVal}>{val}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>Последние сделки</div>
        {(s_snap?.stalledDeals ?? []).slice(0, 4).map(d => (
          <div key={d.id} className={s.dealRow}>
            <span className={s.dealName}>{d.title}</span>
            <span className={s.dealAmount}>{fmtCur(d.amount)}</span>
            <span className={s.dealDays}>{d.daysSilent != null ? `${d.daysSilent}д без активности` : d.stage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
