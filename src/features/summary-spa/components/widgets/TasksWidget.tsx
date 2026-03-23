/**
 * features/summary-spa/components/widgets/TasksWidget.tsx
 * Tasks health bar + live event feed (won / done events).
 */
import { useSummaryStore } from '../../model/summary.store';
import s from './Widgets.module.css';

type Tone = 'positive' | 'info' | 'muted' | 'danger' | 'violet';

const TONE_CLASS: Record<Tone, string> = {
  positive: s.tonePositive,
  info: s.toneInfo,
  muted: s.toneMuted,
  danger: s.toneDanger,
  violet: s.toneViolet,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'М ₸';
  if (n >= 1_000) return Math.round(n / 1_000) + 'к ₸';
  return n + ' ₸';
}

export function TasksHealthWidget() {
  const tasksSnap = useSummaryStore((state) => state.tasksSnap);

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
    { key: 'done', tone: 'positive' as const, flex: done / safeTotal, label: 'Выполнено', count: done },
    { key: 'wip', tone: 'info' as const, flex: inProgress / safeTotal, label: 'В работе', count: inProgress },
    { key: 'todo', tone: 'muted' as const, flex: todo / safeTotal, label: 'К выполнению', count: todo },
    ...(overdueCount > 0
      ? [{ key: 'over', tone: 'danger' as const, flex: overdueCount / safeTotal, label: 'Просрочено', count: overdueCount }]
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
        <div className={s.chartMetric}>
          <div className={s.chartMetricValue}>{totalTasks}</div>
          <div className={s.chartMetricLabel}>всего</div>
        </div>
      </div>

      <div className={s.tasksHealth}>
        <div className={s.healthBar}>
          {segments.map((segment) => (
            <div
              key={segment.key}
              className={`${s.healthSegment} ${TONE_CLASS[segment.tone]}`}
              style={{ flex: Math.max(segment.flex, 0.02) }}
            />
          ))}
        </div>
        <div className={s.healthLegend}>
          {segments.map((segment) => (
            <div key={segment.key} className={s.healthLegendItem}>
              <div className={`${s.healthLegendDot} ${TONE_CLASS[segment.tone]}`} />
              {segment.label}: <strong className={s.healthLegendValue}>{segment.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LiveFeedWidget() {
  const wonEvents = useSummaryStore((state) => state.wonEvents);
  const taskDoneEvents = useSummaryStore((state) => state.taskDoneEvents);
  const lostEvents = useSummaryStore((state) => state.lostEvents);

  type FeedItem =
    | { kind: 'won'; at: string; name: string; value: number }
    | { kind: 'task'; at: string; title: string; who?: string }
    | { kind: 'lost'; at: string; name: string; reason: string };

  const items: FeedItem[] = [
    ...wonEvents.map((event) => ({ kind: 'won' as const, at: event.wonAt, name: event.fullName, value: event.value })),
    ...taskDoneEvents.map((event) => ({ kind: 'task' as const, at: event.doneAt, title: event.title, who: event.assignedName })),
    ...lostEvents.map((event) => ({ kind: 'lost' as const, at: event.lostAt, name: event.fullName, reason: event.reason })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 30);

  return (
    <div className={s.feedCard}>
      <div className={s.feedTitleRow}>
        <div className={s.chartTitle}>Live-лента событий</div>
      </div>
      <div className={s.feedList}>
        {items.length === 0 ? (
          <div className={s.emptyFeed}>
            События появятся здесь по мере работы в Лидах, Сделках и Задачах.
          </div>
        ) : (
          items.map((item, index) => {
            if (item.kind === 'won') {
              return (
                <div key={index} className={s.feedItem}>
                  <div className={`${s.feedDot} ${s.tonePositive}`} />
                  <div className={s.feedContent}>
                    <div className={s.feedTitle}>Сделка выиграна — {item.name}</div>
                    <div className={s.feedMeta}>{relativeTime(item.at)}</div>
                  </div>
                  <div className={`${s.feedValue} ${s.tonePositive}`}>+{fmtMoney(item.value)}</div>
                </div>
              );
            }

            if (item.kind === 'task') {
              return (
                <div key={index} className={s.feedItem}>
                  <div className={`${s.feedDot} ${s.toneViolet}`} />
                  <div className={s.feedContent}>
                    <div className={s.feedTitle}>{item.title}</div>
                    <div className={s.feedMeta}>{item.who ? `${item.who} · ` : ''}{relativeTime(item.at)}</div>
                  </div>
                  <div className={`${s.feedValue} ${s.toneViolet}`}>✓</div>
                </div>
              );
            }

            return (
              <div key={index} className={s.feedItem}>
                <div className={`${s.feedDot} ${s.toneDanger}`} />
                <div className={s.feedContent}>
                  <div className={s.feedTitle}>Сделка потеряна — {item.name}</div>
                  <div className={s.feedMeta}>{item.reason} · {relativeTime(item.at)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
