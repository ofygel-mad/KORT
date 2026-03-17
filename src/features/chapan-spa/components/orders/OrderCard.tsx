import {
  Clock, CreditCard, Package, AlertTriangle, Star, AlertCircle,
} from 'lucide-react';
import type { Order } from '../../api/types';
import {
  ORDER_STATUS_LABEL, ORDER_STATUS_COLOR,
  PAYMENT_STATUS_LABEL, PAYMENT_STATUS_COLOR,
  PRIORITY_COLOR, PRODUCTION_STATUS_LABEL,
} from '../../api/types';
import { useChapanStore } from '../../model/chapan.store';
import s from './OrderCard.module.css';

interface Props {
  order: Order;
  onClick: () => void;
}

function dueDateChip(dueDate: string, isOverdue: boolean) {
  if (isOverdue) {
    const days = Math.ceil((Date.now() - new Date(dueDate).getTime()) / 86_400_000);
    return { label: `${days}д. просрочен`, cls: s.dueOverdue };
  }
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  if (days === 0) return { label: 'Сегодня', cls: s.dueToday };
  if (days === 1) return { label: 'Завтра', cls: s.dueTomorrow };
  return { label: `${days}д.`, cls: '' };
}

/** Summarise production tasks as a compact label (e.g. "Пошив · 2/3") */
function productionLabel(order: Order): string | null {
  const tasks = order.productionTasks;
  if (tasks.length === 0) return null;
  const done = tasks.filter(t => t.status === 'done').length;
  if (done === tasks.length) return 'Всё готово';

  const blocked = tasks.filter(t => t.isBlocked).length;
  if (blocked > 0) return `${blocked} заблокировано`;

  // Find the most advanced active stage
  const stageOrder = ['quality_check', 'finishing', 'sewing', 'cutting', 'pending'];
  const activeTask = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => stageOrder.indexOf(a.status) - stageOrder.indexOf(b.status))[0];

  if (!activeTask) return null;
  return done > 0
    ? `${PRODUCTION_STATUS_LABEL[activeTask.status]} · ${done}/${tasks.length}`
    : PRODUCTION_STATUS_LABEL[activeTask.status];
}

export function OrderCard({ order, onClick }: Props) {
  const { confirmOrder } = useChapanStore();

  const isOverdue = !!(order.dueDate && new Date(order.dueDate) < new Date()
    && order.status !== 'completed' && order.status !== 'cancelled');

  const hasBlockedTasks = order.productionTasks.some(t => t.isBlocked);

  const needsDueDate = !order.dueDate
    && (order.status === 'confirmed' || order.status === 'in_production');

  const due = order.dueDate ? dueDateChip(order.dueDate, isOverdue) : null;

  const prodLabel = productionLabel(order);

  const hasConfirm  = order.status === 'new';
  const hasTransfer = order.status === 'ready';
  const hasPayment  = order.paymentStatus !== 'paid'
    && order.status !== 'new'
    && order.status !== 'cancelled'
    && order.status !== 'completed';
  const hasActions = hasConfirm || hasTransfer || hasPayment;

  return (
    <div
      className={[
        s.card,
        isOverdue       ? s.cardOverdue : '',
        order.priority === 'vip' ? s.cardVip : '',
        hasBlockedTasks ? s.cardBlocked : '',
      ].filter(Boolean).join(' ')}
    >
      <button className={s.cardBody} onClick={onClick}>
        {/* Top row: number + priority + status */}
        <div className={s.top}>
          <div className={s.topLeft}>
            <span className={s.orderNum}>{order.orderNumber}</span>
            {order.priority !== 'normal' && (
              <span
                className={s.priorityBadge}
                style={{ '--p-color': PRIORITY_COLOR[order.priority] } as React.CSSProperties}
              >
                {order.priority === 'vip' ? <Star size={10} /> : <AlertTriangle size={10} />}
                {order.priority === 'vip' ? 'VIP' : 'Срочно'}
              </span>
            )}
            {hasBlockedTasks && (
              <span className={s.blockedBadge}>
                <AlertCircle size={9} />
                Блок
              </span>
            )}
          </div>
          <span
            className={s.statusBadge}
            style={{ '--s-color': ORDER_STATUS_COLOR[order.status] } as React.CSSProperties}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>

        {/* Client */}
        <div className={s.client}>{order.clientName}</div>

        {/* Items summary */}
        <div className={s.items}>
          <Package size={12} />
          <span>
            {order.items.length} изд.
            {order.items.length <= 2
              ? `: ${order.items.map(i => i.productName).join(', ')}`
              : ''}
          </span>
        </div>

        {/* Bottom row: payment + due + production */}
        <div className={s.bottom}>
          <span
            className={s.payBadge}
            style={{ '--pay-color': PAYMENT_STATUS_COLOR[order.paymentStatus] } as React.CSSProperties}
          >
            <CreditCard size={11} />
            {PAYMENT_STATUS_LABEL[order.paymentStatus]}
          </span>

          {due && order.status !== 'completed' && order.status !== 'cancelled' && (
            <span className={`${s.dueBadge} ${due.cls}`}>
              <Clock size={11} />
              {due.label}
            </span>
          )}

          {needsDueDate && (
            <span className={s.noDueBadge} title="Срок не задан — рекомендуется указать">
              <AlertTriangle size={10} />
              Срок не задан
            </span>
          )}

          {prodLabel && order.status !== 'completed' && order.status !== 'cancelled' && (
            <span className={`${s.prodBadge} ${hasBlockedTasks ? s.prodBadgeBlocked : ''}`}>
              {prodLabel}
            </span>
          )}
        </div>

        {/* Amount */}
        <div className={s.amount}>
          {order.totalAmount.toLocaleString('ru-RU')} ₸
          {order.paidAmount > 0 && order.paidAmount < order.totalAmount && (
            <span className={s.amountPaid}>
              {' '}·{' '}оплачено {order.paidAmount.toLocaleString('ru-RU')} ₸
            </span>
          )}
        </div>
      </button>

      {/* Quick action strip */}
      {hasActions && (
        <div className={s.actions}>
          {hasConfirm && (
            <button
              className={s.actionBtn}
              onClick={(e) => { e.stopPropagation(); confirmOrder(order.id); }}
            >
              Подтвердить заказ
            </button>
          )}
          {hasTransfer && (
            <button
              className={`${s.actionBtn} ${s.actionBtnGreen}`}
              onClick={onClick}
            >
              Оформить передачу →
            </button>
          )}
          {hasPayment && (
            <button
              className={`${s.actionBtn} ${s.actionBtnAmber}`}
              onClick={onClick}
            >
              Принять оплату
            </button>
          )}
        </div>
      )}
    </div>
  );
}
