import {
  AlertCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  Package,
  Star,
} from 'lucide-react';
import type { Order, ProductionStatus, UITone } from '../../api/types';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  PRIORITY_TONE,
  PRODUCTION_STATUS_LABEL,
  PRODUCTION_STATUS_TONE,
} from '../../api/types';
import { useChapanStore } from '../../model/chapan.store';
import s from './OrderCard.module.css';

interface Props {
  order: Order;
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

function dueDateChip(dueDate: string, isOverdue: boolean) {
  if (isOverdue) {
    const days = Math.ceil((Date.now() - new Date(dueDate).getTime()) / 86_400_000);
    return { label: `${days} дн. просрочен`, cls: s.dueOverdue };
  }
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  if (days === 0) return { label: 'Сегодня', cls: s.dueToday };
  if (days === 1) return { label: 'Завтра', cls: s.dueTomorrow };
  return { label: `${days} дн.`, cls: '' };
}

function productionMeta(order: Order): { label: string; tone: UITone } | null {
  const tasks = order.productionTasks;
  if (tasks.length === 0) return null;

  const done = tasks.filter((task) => task.status === 'done').length;
  if (done === tasks.length) return { label: 'Всё готово', tone: 'success' };

  const blocked = tasks.filter((task) => task.isBlocked).length;
  if (blocked > 0) return { label: `${blocked} заблокировано`, tone: 'warning' };

  const stageOrder: ProductionStatus[] = ['quality_check', 'finishing', 'sewing', 'cutting', 'pending', 'done'];
  const activeTask = tasks
    .filter((task) => task.status !== 'done')
    .sort((a, b) => stageOrder.indexOf(a.status) - stageOrder.indexOf(b.status))[0];

  if (!activeTask) return null;

  return {
    label: done > 0
      ? `${PRODUCTION_STATUS_LABEL[activeTask.status]} · ${done}/${tasks.length}`
      : PRODUCTION_STATUS_LABEL[activeTask.status],
    tone: PRODUCTION_STATUS_TONE[activeTask.status],
  };
}

export function OrderCard({ order, onClick }: Props) {
  const { confirmOrder } = useChapanStore();

  const isOverdue = Boolean(
    order.dueDate
      && new Date(order.dueDate) < new Date()
      && order.status !== 'completed'
      && order.status !== 'cancelled',
  );

  const hasBlockedTasks = order.productionTasks.some((task) => task.isBlocked);
  const needsDueDate = !order.dueDate && (order.status === 'confirmed' || order.status === 'in_production');
  const due = order.dueDate ? dueDateChip(order.dueDate, isOverdue) : null;
  const production = productionMeta(order);

  const hasConfirm = order.status === 'new';
  const hasTransfer = order.status === 'ready';
  const hasPayment = order.paymentStatus !== 'paid'
    && order.status !== 'new'
    && order.status !== 'cancelled'
    && order.status !== 'completed';

  const hasActions = hasConfirm || hasTransfer || hasPayment;

  return (
    <div
      className={[
        s.card,
        isOverdue ? s.cardOverdue : '',
        order.priority === 'vip' ? s.cardVip : '',
        hasBlockedTasks ? s.cardBlocked : '',
      ].filter(Boolean).join(' ')}
    >
      <button className={s.cardBody} onClick={onClick}>
        <div className={s.top}>
          <div className={s.topLeft}>
            <span className={s.orderNum}>{order.orderNumber}</span>
            {order.priority !== 'normal' && (
              <span className={`${s.priorityBadge} ${TONE_CLASS[PRIORITY_TONE[order.priority]]}`}>
                {order.priority === 'vip' ? <Star size={10} /> : <AlertTriangle size={10} />}
                {order.priority === 'vip' ? 'VIP' : 'Срочно'}
              </span>
            )}
            {hasBlockedTasks && (
              <span className={`${s.blockedBadge} ${s.toneWarning}`}>
                <AlertCircle size={10} />
                Блок
              </span>
            )}
          </div>
          <span className={`${s.statusBadge} ${TONE_CLASS[ORDER_STATUS_TONE[order.status]]}`}>
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>

        <div className={s.client}>{order.clientName}</div>

        <div className={s.items}>
          <Package size={12} />
          <span>
            {order.items.length} изд.
            {order.items.length <= 2 ? `: ${order.items.map((item) => item.productName).join(', ')}` : ''}
          </span>
        </div>

        <div className={s.bottom}>
          <span className={`${s.payBadge} ${TONE_CLASS[PAYMENT_STATUS_TONE[order.paymentStatus]]}`}>
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
            <span className={s.noDueBadge} title="Срок не задан, рекомендуется указать дату">
              <AlertTriangle size={10} />
              Срок не задан
            </span>
          )}

          {production && order.status !== 'completed' && order.status !== 'cancelled' && (
            <span className={`${s.prodBadge} ${TONE_CLASS[production.tone]}`}>
              {production.label}
            </span>
          )}
        </div>

        <div className={s.amount}>
          {order.totalAmount.toLocaleString('ru-RU')} тг
          {order.paidAmount > 0 && order.paidAmount < order.totalAmount && (
            <span className={s.amountPaid}>
              {' '}· оплачено {order.paidAmount.toLocaleString('ru-RU')} тг
            </span>
          )}
        </div>
      </button>

      {hasActions && (
        <div className={s.actions}>
          {hasConfirm && (
            <button
              className={s.actionBtn}
              onClick={(event) => {
                event.stopPropagation();
                confirmOrder(order.id);
              }}
            >
              Подтвердить заказ
            </button>
          )}
          {hasTransfer && (
            <button className={`${s.actionBtn} ${s.actionBtnPositive}`} onClick={onClick}>
              Оформить передачу
            </button>
          )}
          {hasPayment && (
            <button className={`${s.actionBtn} ${s.actionBtnWarning}`} onClick={onClick}>
              Принять оплату
            </button>
          )}
        </div>
      )}
    </div>
  );
}
