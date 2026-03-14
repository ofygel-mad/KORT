/**
 * features/summary-spa/api/mock.ts
 * Historical seed data for trend charts.
 * In production replace with API calls to a reporting endpoint.
 */
import type { DailyDataPoint } from './types';

/** Generate 30 days of seeded history */
function seedHistory(): DailyDataPoint[] {
  const points: DailyDataPoint[] = [];
  const base = Date.now() - 29 * 86_400_000;

  // Pseudo-random but deterministic pattern
  const seed = [
    [2_400_000, 1, 3, 4], [0, 0, 2, 3], [3_100_000, 2, 4, 5],
    [1_800_000, 1, 3, 2], [5_200_000, 3, 6, 6], [0, 0, 1, 3],
    [0, 0, 0, 1], [4_100_000, 2, 4, 5], [2_600_000, 1, 3, 4],
    [0, 0, 2, 3], [3_800_000, 2, 5, 4], [1_500_000, 1, 2, 2],
    [6_200_000, 3, 7, 7], [0, 0, 1, 2], [0, 0, 0, 1],
    [4_500_000, 2, 4, 5], [2_900_000, 1, 3, 4], [0, 0, 2, 3],
    [3_400_000, 2, 4, 5], [1_200_000, 1, 2, 2], [5_800_000, 3, 6, 6],
    [0, 0, 1, 3], [0, 0, 0, 1], [4_800_000, 2, 5, 5],
    [2_200_000, 1, 3, 4], [0, 0, 2, 3], [3_600_000, 2, 4, 4],
    [1_700_000, 1, 2, 2], [6_500_000, 4, 7, 7], [0, 0, 1, 2],
  ];

  seed.forEach(([wonValue, wonCount, newLeads, tasksDone], i) => {
    const d = new Date(base + i * 86_400_000);
    points.push({
      date: d.toISOString().slice(0, 10),
      wonValue,
      wonCount,
      newLeads,
      tasksDone,
    });
  });

  return points;
}

export const historyData = seedHistory();

/**
 * Aggregate last N days from history.
 */
export function aggregateLast(days: number, data: DailyDataPoint[]) {
  const slice = data.slice(-days);
  return slice.reduce(
    (acc, p) => ({
      wonValue:  acc.wonValue  + p.wonValue,
      wonCount:  acc.wonCount  + p.wonCount,
      newLeads:  acc.newLeads  + p.newLeads,
      tasksDone: acc.tasksDone + p.tasksDone,
    }),
    { wonValue: 0, wonCount: 0, newLeads: 0, tasksDone: 0 }
  );
}

/** Previous period for delta calculation */
export function previousPeriod(days: number, data: DailyDataPoint[]) {
  return data.slice(-days * 2, -days).reduce(
    (acc, p) => ({
      wonValue:  acc.wonValue  + p.wonValue,
      wonCount:  acc.wonCount  + p.wonCount,
      newLeads:  acc.newLeads  + p.newLeads,
      tasksDone: acc.tasksDone + p.tasksDone,
    }),
    { wonValue: 0, wonCount: 0, newLeads: 0, tasksDone: 0 }
  );
}
