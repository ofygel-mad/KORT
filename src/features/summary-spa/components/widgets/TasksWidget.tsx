/**
 * features/summary-spa/components/widgets/TasksWidget.tsx
 * Tasks health bar + live event feed (won / done events).
 */
import { useSummaryStore } from '../../model/summary.store';
import s from './Widgets.module.css';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1)   return 'только что';
  if (min < 60)  return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'М ₸';
  if (n >= 1_000)     return Math.round(n / 1_000) + 'к ₸';
  return n + ' ₸';
}

export function TasksHealthWidget() {
  const tasksSnap = useSummaryStore(s => s.tasksSnap);

  if (!tasksSnap) {
    return (
      <div className={s.chartCard}>
        <div className={s.sectionTitle}>Задачи — здоровье</div>
        <div className={s.emptyFeed}>Ожидание данных от Tasks SPA…</div>
      </div>
    );
  }

  const { todo, inProgress, done, overdueCount, totalTasks, completionRateThisMonth } = tasksSnap;
  const safeTotal = totalTasks || 1;

  const segments = [
    { key: 'done',  color: '#22c55e', flex: done / safeTotal,        label: 'Выполнено',  count: done },
    { key: 'wip',   color: '#3b82f6', flex: inProgress / safeTotal,  label: 'В работе',   count: inProgress },
    { key: 'todo',  color: '#6b7280', flex: todo / safeTotal,         label: 'К выполнению', count: todo },
    ...(overdueCount > 0
      ? [{ key: 'over', color: '#ef4444', flex: overdueCount / safeTotal, label: 'Просрочено', count: overdueCount }]
      : []),
  ];

  return (
    <div className={s.chartCard}>
      <div className={s.chartHeader}>
        <div>
          <div className={s.chartTitle}>Задачи</div>
          <div className={s.chartSubtitle}>
            Выполнено за месяц: {completionRateThisMonth}%
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f3f4f6' }}>{totalTasks}</div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>всего</div>
        </div>
      </div>

      <div className={s.tasksHealth}>
        <div className={s.healthBar}>
          {segments.map(seg => (
            <div
              key={seg.key}
              className={s.healthSegment}
              style={{ flex: Math.max(seg.flex, 0.02), background: seg.color }}
            />
          ))}
        </div>
        <div className={s.healthLegend}>
          {segments.map(seg => (
            <div key={seg.key} className={s.healthLegendItem}>
              <div className={s.healthLegendDot} style={{ background: seg.color }} />
              {seg.label}: <strong style={{ color: '#d1d5db' }}>{seg.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LiveFeedWidget() {
  const wonEvents      = useSummaryStore(s => s.wonEvents);
  const taskDoneEvents = useSummaryStore(s => s.taskDoneEvents);
  const lostEvents     = useSummaryStore(s => s.lostEvents);

  // Merge and sort by time
  type FeedItem =
    | { kind: 'won';  at: string; name: string; value: number }
    | { kind: 'task'; at: string; title: string; who?: string }
    | { kind: 'lost'; at: string; name: string; reason: string };

  const items: FeedItem[] = [
    ...wonEvents.map(e => ({ kind: 'won'  as const, at: e.wonAt,  name: e.fullName, value: e.value })),
    ...taskDoneEvents.map(e => ({ kind: 'task' as const, at: e.doneAt, title: e.title, who: e.assignedName })),
    ...lostEvents.map(e => ({ kind: 'lost' as const, at: e.lostAt, name: e.fullName, reason: e.reason })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 30);

  return (
    <div className={s.feedCard}>
      <div className={s.chartTitle} style={{ marginBottom: 8 }}>Live-лента событий</div>
      <div className={s.feedList}>
        {items.length === 0 ? (
          <div className={s.emptyFeed}>
            События появятся здесь по мере работы в Лидах, Сделках и Задачах
          </div>
        ) : (
          items.map((item, i) => {
            if (item.kind === 'won') return (
              <div key={i} className={s.feedItem}>
                <div className={s.feedDot} style={{ background: '#22c55e' }} />
                <div className={s.feedContent}>
                  <div className={s.feedTitle}>Сделка выиграна — {item.name}</div>
                  <div className={s.feedMeta}>{relativeTime(item.at)}</div>
                </div>
                <div className={s.feedValue} style={{ color: '#22c55e' }}>+{fmtMoney(item.value)}</div>
              </div>
            );
            if (item.kind === 'task') return (
              <div key={i} className={s.feedItem}>
                <div className={s.feedDot} style={{ background: '#8b5cf6' }} />
                <div className={s.feedContent}>
                  <div className={s.feedTitle}>{item.title}</div>
                  <div className={s.feedMeta}>{item.who ? `${item.who} · ` : ''}{relativeTime(item.at)}</div>
                </div>
                <div className={s.feedValue} style={{ color: '#8b5cf6' }}>✓</div>
              </div>
            );
            if (item.kind === 'lost') return (
              <div key={i} className={s.feedItem}>
                <div className={s.feedDot} style={{ background: '#ef4444' }} />
                <div className={s.feedContent}>
                  <div className={s.feedTitle}>Сделка потеряна — {item.name}</div>
                  <div className={s.feedMeta}>{item.reason} · {relativeTime(item.at)}</div>
                </div>
              </div>
            );
            return null;
          })
        )}
      </div>
    </div>
  );
}
