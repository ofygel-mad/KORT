/**
 * features/production-spa/ui/TimelineView.tsx
 *
 * Gantt-lite timeline — shows active orders on a date axis.
 * Built on SVG/HTML without heavy libraries.
 */

import { useMemo } from 'react';
import type { ProductionOrder } from '../api/types';
import { ORDER_STATUS_TONE } from '../api/types';
import s from './TimelineView.module.css';

interface Props {
  orders: ProductionOrder[];
}

const TONE_COLORS: Record<string, string> = {
  muted:   'var(--text-tertiary)',
  info:    'var(--fill-info)',
  warning: 'var(--fill-warning)',
  danger:  'var(--fill-danger)',
  success: 'var(--fill-positive)',
  accent:  'var(--fill-accent)',
};

const DAY_WIDTH = 40; // px per day
const ROW_HEIGHT = 48;
const LABEL_WIDTH = 140;
const HEADER_HEIGHT = 36;
const PADDING = 8;

export function TimelineView({ orders }: Props) {
  const active = orders.filter((o) => !['cancelled', 'completed'].includes(o.status));

  const { days, startDate } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    const dates: Date[] = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return { days: dates, startDate: start };
  }, []);

  const totalWidth = LABEL_WIDTH + days.length * DAY_WIDTH + PADDING * 2;
  const totalHeight = HEADER_HEIGHT + active.length * ROW_HEIGHT + PADDING;
  const todayX = LABEL_WIDTH + DAY_WIDTH + PADDING;

  function orderToBar(order: ProductionOrder) {
    const created = new Date(order.createdAt);
    const due = order.dueDate ? new Date(order.dueDate) : new Date(startDate.getTime() + 7 * 86400000);

    const startOffset = Math.max(0, (created.getTime() - startDate.getTime()) / 86400000);
    const endOffset = Math.max(startOffset + 0.5, (due.getTime() - startDate.getTime()) / 86400000);

    const x = LABEL_WIDTH + startOffset * DAY_WIDTH + PADDING;
    const width = Math.max(DAY_WIDTH * 0.5, (endOffset - startOffset) * DAY_WIDTH);
    const tone = ORDER_STATUS_TONE[order.status];
    const color = TONE_COLORS[tone] ?? TONE_COLORS.muted;

    const isOverdue = order.dueDate ? new Date(order.dueDate) < new Date() : false;

    return { x, width, color, isOverdue };
  }

  const dayNames = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  return (
    <div className={s.root}>
      <div className={s.scroll}>
        <svg
          width={totalWidth}
          height={totalHeight}
          style={{ display: 'block', minWidth: totalWidth }}
        >
          {/* Day columns background */}
          {days.map((day, i) => {
            const x = LABEL_WIDTH + i * DAY_WIDTH + PADDING;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <rect
                key={i}
                x={x}
                y={HEADER_HEIGHT}
                width={DAY_WIDTH}
                height={totalHeight - HEADER_HEIGHT}
                fill={
                  isToday
                    ? 'color-mix(in srgb, var(--fill-info-soft) 30%, transparent)'
                    : isWeekend
                    ? 'color-mix(in srgb, var(--bg-surface-inset) 60%, transparent)'
                    : 'transparent'
                }
              />
            );
          })}

          {/* Today line */}
          <line
            x1={todayX}
            y1={HEADER_HEIGHT}
            x2={todayX}
            y2={totalHeight}
            stroke="var(--fill-info)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.6}
          />

          {/* Header — day labels */}
          {days.map((day, i) => {
            const x = LABEL_WIDTH + i * DAY_WIDTH + DAY_WIDTH / 2 + PADDING;
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <g key={i}>
                <text
                  x={x}
                  y={16}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={isToday ? 700 : 400}
                  fill={isToday ? 'var(--fill-info)' : 'var(--text-tertiary)'}
                >
                  {day.getDate()} {day.getDate() === 1 ? monthNames[day.getMonth()] : ''}
                </text>
                <text
                  x={x}
                  y={29}
                  textAnchor="middle"
                  fontSize={9}
                  fill={isToday ? 'var(--fill-info)' : 'var(--text-tertiary)'}
                  opacity={0.6}
                >
                  {dayNames[day.getDay()]}
                </text>
              </g>
            );
          })}

          {/* Rows */}
          {active.map((order, rowIdx) => {
            const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT;
            const bar = orderToBar(order);
            const barHeight = ROW_HEIGHT - 16;
            const barY = y + 8;

            return (
              <g key={order.id}>
                {/* Row separator */}
                <line
                  x1={0}
                  y1={y + ROW_HEIGHT}
                  x2={totalWidth}
                  y2={y + ROW_HEIGHT}
                  stroke="var(--border-subtle)"
                  strokeWidth={0.5}
                />

                {/* Order label */}
                <text
                  x={LABEL_WIDTH - 8}
                  y={y + ROW_HEIGHT / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={500}
                  fill="var(--text-primary)"
                >
                  {order.orderNumber}
                </text>
                <text
                  x={LABEL_WIDTH - 8}
                  y={y + ROW_HEIGHT / 2 + 13}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={10}
                  fill="var(--text-secondary)"
                >
                  {order.clientName.split(' ')[0]}
                </text>

                {/* Bar */}
                <rect
                  x={bar.x}
                  y={barY}
                  width={bar.width}
                  height={barHeight}
                  rx={6}
                  fill={bar.color}
                  opacity={bar.isOverdue ? 1 : 0.7}
                  stroke={bar.isOverdue ? 'var(--fill-danger)' : 'none'}
                  strokeWidth={bar.isOverdue ? 1.5 : 0}
                />

                {/* Priority marker */}
                {order.priority !== 'normal' && (
                  <circle
                    cx={bar.x + bar.width - 8}
                    cy={barY + barHeight / 2}
                    r={4}
                    fill={order.priority === 'vip' ? '#f59e0b' : '#ef4444'}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {active.length === 0 && (
        <div className={s.empty}>Нет активных заказов для отображения</div>
      )}
    </div>
  );
}
