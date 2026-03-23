/**
 * features/production-spa/ui/OrderCard.tsx
 *
 * Universal order card for the Kanban board.
 * Used by both ChapanSPA (via adapter) and WorkshopSPA.
 */

import { AlertTriangle, Clock, CreditCard, Star, Zap } from 'lucide-react';
import type { ProductionOrder, UITone } from '../api/types';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  PRIORITY_TONE,
} from '../api/types';
import { ShortagePanel } from './ShortagePanel';
import s from './OrderCard.module.css';

interface Props {
  order: ProductionOrder;
  onClick: () => void;
}

const TONE_CLASS: Record<UITone, string> = {
  muted: s.toneMuted,
  info: s.toneInfo,
  warning: s.toneWarning,
  danger: s.toneDanger,
  success: s.toneSuccess,
  accent: s.toneAccent,
};

function dueDateLabel(dueDate: string) {
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return { text: `${Math.abs(diff)} дн. просрочен`, cls: s.dueOverdue };
  if (diff === 0) return { text: 'Сегодня', cls: s.dueToday };
  if (diff === 1) return { text: 'Завтра', cls: s.dueSoon };
  return { text: `${diff} дн.`, cls: '' };
}

function taskProgress(order: ProductionOrder) {
  const tasks = order.tasks;
  if (!tasks.length) return null;
  const done = tasks.filter((t) => t.status === 'done').length;
  const blocked = tasks.filter((t) => t.isBlocked || t.status === 'blocked').length;
  return { done, blocked, total: tasks.length };
}

export function OrderCard({ order, onClick }: Props) {
  const statusTone = ORDER_STATUS_TONE[order.status];
  const paymentTone = PAYMENT_STATUS_TONE[order.paymentStatus];
  const priorityTone = PRIORITY_TONE[order.priority];
  const progress = taskProgress(order);
  const due = order.dueDate ? dueDateLabel(order.dueDate) : null;
  const isOverdue = due?.cls === s.dueOverdue;
  const hasShortage = order.shortage?.status === 'blocked' || order.shortage?.status === 'partial';

  return (
    <button
      className={s.card}
      data-priority={order.priority}
      data-shortage={hasShortage ? order.shortage?.status : undefined}
      onClick={onClick}
    >
      {/* Priority stripe */}
      {order.priority !== 'normal' && (
        <span className={`${s.priorityStripe} ${TONE_CLASS[priorityTone]}`}>
          {order.priority === 'vip' ? <Star size={10} /> : <Zap size={10} />}
          {order.priority === 'vip' ? 'VIP' : 'Срочно'}
        </span>
      )}

      {/* Header */}
      <div className={s.header}>
        <span className={s.orderNum}>{order.orderNumber}</span>
        <span className={`${s.statusBadge} ${TONE_CLASS[statusTone]}`}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* Client */}
      <div className={s.client}>{order.clientName}</div>

      {/* Task progress bar */}
      {progress && (
        <div className={s.progressRow}>
          <div className={s.progressTrack}>
            <div
              className={s.progressFill}
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
              data-blocked={progress.blocked > 0}
            />
          </div>
          <span className={s.progressLabel}>
            {progress.blocked > 0 && <AlertTriangle size={10} className={s.blockIcon} />}
            {progress.done}/{progress.total}
          </span>
        </div>
      )}

      {/* Shortage banner (compact) */}
      {hasShortage && (
        <ShortagePanel shortage={order.shortage} compact />
      )}

      {/* Footer */}
      <div className={s.footer}>
        {due && (
          <span className={`${s.due} ${due.cls}`}>
            <Clock size={11} />
            {due.text}
          </span>
        )}
        {isOverdue && <span className={s.overdueFlag} />}
        <span className={`${s.payment} ${TONE_CLASS[paymentTone]}`}>
          <CreditCard size={11} />
          {PAYMENT_STATUS_LABEL[order.paymentStatus]}
        </span>
        <span className={s.amount}>
          {order.totalAmount.toLocaleString('ru-KZ')} ₸
        </span>
      </div>
    </button>
  );
}
