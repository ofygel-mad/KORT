import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, CreditCard, MessageSquare, AlertTriangle, Pencil, ArchiveIcon, RotateCcw, Download } from 'lucide-react';
import { useOrder, useConfirmOrder, useChangeOrderStatus, useAddPayment, useAddOrderActivity, useRestoreOrder, useCloseOrder } from '../../../../entities/order/queries';
import type { ChapanOrder, OrderStatus, Priority } from '../../../../entities/order/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '../../../../shared/api/client';
import styles from './ChapanOrderDetail.module.css';

// в”Ђв”Ђ Helpers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'Новый', confirmed: 'Подтверждён', in_production: 'В цехе',
  ready: 'Готов', transferred: 'Передан', completed: 'Завершён', cancelled: 'Отменён',
};
const STATUS_COLOR: Record<OrderStatus, string> = {
  new: '#7C3AED', confirmed: '#C9A84C', in_production: '#E5922A',
  ready: '#4FC999', transferred: '#A78BFA', completed: 'rgba(240,232,212,.35)',
  cancelled: '#D94F4F',
};
const PAY_LABEL: Record<string, string> = {
  not_paid: 'Не оплачен', partial: 'Частично', paid: 'Оплачен',
};
const PAY_COLOR: Record<string, string> = {
  not_paid: '#D94F4F', partial: '#E5922A', paid: '#4FC999',
};
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  kaspi_qr: 'Kaspi QR',
  kaspi_terminal: 'Kaspi терминал',
  transfer: 'Перевод',
  mixed: 'Смешанный',
};
const PROD_STATUS_LABEL: Record<string, string> = {
  queued: 'Очередь',
  in_progress: 'В работе',
  done: 'Готово',
};
const PRIORITY_LABEL: Record<Priority, string> = {
  normal: 'Обычный', urgent: '🔴 Срочно', vip: '⭐ VIP',
};

function fmt(n: number) {
  return new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(n) + ' ₸';
}

function fmtDatetime(s: string) {
  return new Date(s).toLocaleString('ru-KZ', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatPaymentMethod(method: string) {
  return PAYMENT_METHOD_LABEL[method] ?? method;
}

async function downloadInvoice(orderId: string, orderNumber: string) {
  const response = await apiClient.get(`/chapan/orders/${orderId}/invoice`, {
    params: { style: 'branded' },
    responseType: 'blob',
  });
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nakladnaya-${orderNumber}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// в”Ђв”Ђ Payment form schema в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

const paySchema = z.object({
  amount: z.coerce.number().min(0.01, 'Сумма должна быть больше 0'),
  method: z.string().min(1),
  note: z.string().optional(),
});
type PayForm = z.infer<typeof paySchema>;

// в”Ђв”Ђ Main component в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

export default function ChapanOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, isError } = useOrder(id!);
  const confirmOrder = useConfirmOrder();
  const changeStatus = useChangeOrderStatus();
  const addPayment = useAddPayment();
  const addActivity = useAddOrderActivity();
  const restoreOrder = useRestoreOrder();
  const closeOrder = useCloseOrder();

  const [showPayForm, setShowPayForm] = useState(false);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [restorePromptOpen, setRestorePromptOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);

  const {
    register: registerPay,
    handleSubmit: handlePaySubmit,
    reset: resetPay,
    formState: { errors: payErrors },
  } = useForm<PayForm>({
    resolver: zodResolver(paySchema),
    defaultValues: { method: 'cash' },
  });

  async function onPaySubmit(data: PayForm) {
    if (!id) return;
    await addPayment.mutateAsync({ id, dto: data });
    resetPay({ method: 'cash' });
    setShowPayForm(false);
  }

  async function handleComment() {
    if (!comment.trim() || !id) return;
    setSubmittingComment(true);
    try {
      await addActivity.mutateAsync({ id, content: comment.trim() });
      setComment('');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleInvoiceDownload() {
    if (!id || !order || invoiceDownloading) return;
    setInvoiceDownloading(true);
    try {
      await downloadInvoice(id, order.orderNumber);
    } finally {
      setInvoiceDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <div className={styles.root}>
        <div className={styles.loadingSkeleton}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonBlock} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className={styles.root}>
        <div className={styles.errorState}>
          <AlertTriangle size={24} />
          <p>Заказ не найден</p>
          <button onClick={() => navigate('/workzone/chapan/orders')}>← Вернуться к заказам</button>
        </div>
      </div>
    );
  }

  const balance = order.totalAmount - order.paidAmount;
  const isOverdue = order.dueDate && new Date(order.dueDate) < new Date() && order.status !== 'completed';

  return (
    <div className={styles.root}>
      {/* в”Ђв”Ђ Header в”Ђв”Ђ */}
      <div className={styles.pageHeader}>
        <button className={styles.backLink} onClick={() => navigate('/workzone/chapan/orders')}>
          <ChevronLeft size={14} />
          <span>Заказы</span>
        </button>
        <div className={styles.orderMeta}>
          <h1 className={styles.orderNum}>#{order.orderNumber}</h1>
          <span
            className={styles.statusChip}
            style={{ '--sc': STATUS_COLOR[order.status] } as React.CSSProperties}
          >
            {STATUS_LABEL[order.status]}
          </span>
          {order.priority !== 'normal' && (
            <span className={styles.priorityChip}>{PRIORITY_LABEL[order.priority]}</span>
          )}
          {isOverdue && (
            <span className={styles.overdueChip}>⚠ Просрочен</span>
          )}
        </div>
      </div>

      {/* в”Ђв”Ђ Body (two columns) в”Ђв”Ђ */}
      <div className={styles.grid}>
        {/* в”Ђв”Ђ Left column в”Ђв”Ђ */}
        <div className={styles.col}>
          {/* Client card */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Клиент</div>
            <div className={styles.clientName}>{order.clientName}</div>
            <a href={`tel:${order.clientPhone}`} className={styles.clientPhone}>
              {order.clientPhone}
            </a>
            {order.dueDate && (
              <div className={styles.clientDeadline} style={{ color: isOverdue ? '#D94F4F' : 'rgba(240,232,212,.45)' }}>
                {isOverdue ? '⚠ ' : '📅 '}
                Дедлайн: {new Date(order.dueDate).toLocaleDateString('ru-KZ', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>

          {/* Items card */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Позиции заказа</div>
            <div className={styles.itemsList}>
              {(order.items ?? []).map(item => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.productName}</span>
                    <span className={styles.itemMeta}>
                      {[item.fabric, item.size].filter(Boolean).join(' В· ')}
                      {item.quantity > 1 && ` × ${item.quantity}`}
                    </span>
                    {item.workshopNotes && (
                      <span className={styles.itemNote}>↳ {item.workshopNotes}</span>
                    )}
                  </div>
                  <span className={styles.itemPrice}>{fmt(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
              {(order.items ?? []).length === 0 && (
                <div className={styles.noItems}>Позиции не указаны</div>
              )}
            </div>
            <div className={styles.itemsTotal}>
              <span>Итого:</span>
              <strong>{fmt(order.totalAmount)}</strong>
            </div>
          </div>

          {/* Finance card */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Финансы</div>
            <div className={styles.finTable}>
              <div className={styles.finRow}>
                <span>Сумма заказа</span>
                <strong>{fmt(order.totalAmount)}</strong>
              </div>
              <div className={styles.finRow}>
                <span>Оплачено</span>
                <strong style={{ color: '#4FC999' }}>{fmt(order.paidAmount)}</strong>
              </div>
              <div className={`${styles.finRow} ${styles.finRowBalance}`}>
                <span>Остаток</span>
                <strong style={{ color: balance > 0 ? '#E8C97A' : '#4FC999' }}>
                  {fmt(balance)}
                </strong>
              </div>
              <div className={styles.finRow}>
                <span>Статус оплаты</span>
                <span style={{ color: PAY_COLOR[order.paymentStatus], fontWeight: 500, fontSize: 12 }}>
                  {PAY_LABEL[order.paymentStatus]}
                </span>
              </div>
            </div>

            {/* Payment history */}
            {(order.payments ?? []).length > 0 && (
              <div className={styles.payHistory}>
                <div className={styles.payHistoryLabel}>История оплат</div>
                {(order.payments ?? []).map(p => (
                  <div key={p.id} className={styles.payRow}>
                    <span>{fmtDatetime(p.createdAt)}</span>
                    <span>{formatPaymentMethod(p.method)}</span>
                    {p.note && <span className={styles.payNote}>{p.note}</span>}
                    <strong style={{ color: '#4FC999', marginLeft: 'auto' }}>+{fmt(p.amount)}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Add payment */}
            {!showPayForm ? (
              <button
                className={styles.addPayBtn}
                onClick={() => setShowPayForm(true)}
              >
                <CreditCard size={13} />
                Добавить оплату
              </button>
            ) : (
              <form className={styles.payForm} onSubmit={handlePaySubmit(onPaySubmit)}>
                <div className={styles.payFormRow}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Сумма ₸</label>
                    <input
                      {...registerPay('amount')}
                      type="number"
                      min="0.01"
                      step="any"
                      className={`${styles.payInput} ${payErrors.amount ? styles.payInputError : ''}`}
                      placeholder="0"
                      autoFocus
                    />
                    {payErrors.amount && <span className={styles.payError}>{payErrors.amount.message}</span>}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Метод</label>
                    <select {...registerPay('method')} className={styles.payInput}>
                      {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <input
                  {...registerPay('note')}
                  className={styles.payInput}
                  placeholder="Примечание (необязательно)"
                />
                <div className={styles.payFormActions}>
                  <button type="submit" className={styles.paySubmit} disabled={addPayment.isPending}>
                    {addPayment.isPending ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button type="button" className={styles.payCancel} onClick={() => setShowPayForm(false)}>
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* в”Ђв”Ђ Right column в”Ђв”Ђ */}
        <div className={styles.col}>
          {/* Actions */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Действия</div>
            <div className={styles.actions}>
              {/* Edit button for active orders */}
              {!['completed', 'cancelled'].includes(order.status) && (
                <button
                  className={styles.actionBtn + ' ' + styles.actionEdit}
                  onClick={() => navigate(`/workzone/chapan/orders/${order.id}/edit`)}
                >
                  <Pencil size={13} />
                  Редактировать заказ
                </button>
              )}

              {['ready', 'transferred', 'completed'].includes(order.status) && (
                <button
                  className={styles.actionBtn + ' ' + styles.actionSecondary}
                  onClick={handleInvoiceDownload}
                  disabled={invoiceDownloading}
                >
                  <Download size={13} />
                  {invoiceDownloading ? 'Подготовка накладной...' : 'Скачать накладную'}
                </button>
              )}

              {order.status === 'new' && (
                <button
                  className={styles.actionBtn + ' ' + styles.actionPrimary}
                  onClick={() => confirmOrder.mutate(order.id)}
                  disabled={confirmOrder.isPending}
                >
                  <Check size={14} />
                  {confirmOrder.isPending ? 'Подтверждение...' : 'Подтвердить → отправить в цех'}
                </button>
              )}
              {order.status === 'ready' && (
                <button
                  className={styles.actionBtn + ' ' + styles.actionSecondary}
                  onClick={() => changeStatus.mutate({ id: order.id, status: 'transferred' })}
                  disabled={changeStatus.isPending}
                >
                  Передать клиенту
                </button>
              )}
              {order.status === 'transferred' && (
                <button
                  className={styles.actionBtn + ' ' + styles.actionSecondary}
                  onClick={() => changeStatus.mutate({ id: order.id, status: 'completed' })}
                  disabled={changeStatus.isPending}
                >
                  Завершить заказ
                </button>
              )}
              {['ready', 'transferred', 'completed'].includes(order.status) && !order.isArchived && (
                <button
                  className={styles.actionBtn + ' ' + styles.actionArchive}
                  onClick={() => closeOrder.mutate(order.id)}
                  disabled={closeOrder.isPending}
                >
                  <ArchiveIcon size={13} />
                  {closeOrder.isPending ? 'Закрытие...' : 'Закрыть сделку'}
                </button>
              )}
              {!['completed', 'cancelled'].includes(order.status) && (
                <button
                  className={styles.actionBtn + ' ' + styles.actionDanger}
                  onClick={() => setCancelConfirmOpen(true)}
                  disabled={changeStatus.isPending}
                >
                  Отменить заказ
                </button>
              )}

              {/* Terminal state badges + actions */}
              {order.status === 'completed' && (
                <>
                  <div className={styles.completedBadge}>✓ Заказ завершён</div>
                  {order.isArchived && (
                    <div className={styles.archivedBadge}>📦 В архиве</div>
                  )}
                </>
              )}
              {(order.status === 'cancelled' || order.isArchived) && (
                <>
                  <div className={styles.cancelledBadge}>
                    {order.status === 'cancelled' ? '✕ Заказ отменён' : '📦 Заказ в архиве'}
                  </div>
                  <button
                    className={styles.actionBtn + ' ' + styles.actionSecondary}
                    onClick={() => setRestorePromptOpen(true)}
                    disabled={restoreOrder.isPending}
                  >
                    <RotateCcw size={13} />
                    {restoreOrder.isPending ? 'Восстановление...' : 'Восстановить заказ'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Production tasks (if any) */}
          {(order.productionTasks ?? []).length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardLabel}>Производство</div>
              <div className={styles.prodList}>
                {(order.productionTasks ?? []).map(task => (
                  <div key={task.id} className={`${styles.prodTask} ${task.isBlocked ? styles.prodTaskBlocked : ''}`}>
                    <div className={styles.prodTaskLeft}>
                      <span className={styles.prodTaskName}>{task.productName}</span>
                      <span className={styles.prodTaskMeta}>
                        {[task.fabric, task.size].filter(Boolean).join(' В· ')}
                        {task.quantity > 1 && ` × ${task.quantity}`}
                      </span>
                      {task.assignedTo && (
                        <span className={styles.prodTaskWorker}>👤 {task.assignedTo}</span>
                      )}
                      {task.isBlocked && task.blockReason && (
                        <span className={styles.prodTaskBlock}>⚑ {task.blockReason}</span>
                      )}
                    </div>
                    <span className={`${styles.prodStatus} ${task.status === 'done' ? styles.prodStatusDone : ''}`}>
                      {PROD_STATUS_LABEL[task.status] ?? task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity / history */}
          <div className={styles.card}>
              <div className={styles.cardLabel}>История</div>
            <div className={styles.activityList}>
              {(order.activities ?? []).length === 0 && (
                <div className={styles.noActivity}>Нет записей</div>
              )}
              {(order.activities ?? []).map(a => (
                <div key={a.id} className={styles.actItem}>
                  <div className={styles.actMeta}>
                    <span className={styles.actAuthor}>{a.authorName}</span>
                    <span className={styles.actDate}>{fmtDatetime(a.createdAt)}</span>
                  </div>
                  {a.content && <div className={styles.actContent}>{a.content}</div>}
                </div>
              ))}
            </div>

            {/* Add comment */}
            <div className={styles.commentBox}>
              <input
                className={styles.commentInput}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Добавить комментарий..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
              />
              <button
                className={styles.commentBtn}
                onClick={handleComment}
                disabled={!comment.trim() || submittingComment}
              >
                <MessageSquare size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {cancelConfirmOpen && (
        <div className={styles.confirmOverlay} role="dialog" aria-modal="true" aria-labelledby="cancel-title" onClick={() => setCancelConfirmOpen(false)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmTitle} id="cancel-title">Отменить заказ?</div>
            <div className={styles.confirmText}>
              Заказ #{order.orderNumber} будет переведён в статус «Отменён». Это действие можно отменить через «Восстановить заказ».
            </div>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmSecondary}
                onClick={() => setCancelConfirmOpen(false)}
              >
                Не отменять
              </button>
              <button
                type="button"
                className={styles.confirmDanger}
                onClick={() => {
                  setCancelConfirmOpen(false);
                  changeStatus.mutate({ id: order.id, status: 'cancelled' });
                }}
                disabled={changeStatus.isPending}
              >
                Да, отменить
              </button>
            </div>
          </div>
        </div>
      )}

      {restorePromptOpen && (
        <div className={styles.confirmOverlay} role="dialog" aria-modal="true" aria-labelledby="restore-title">
          <div className={styles.confirmDialog}>
            <div className={styles.confirmTitle} id="restore-title">
              {order.status === 'cancelled' ? 'Восстановить заказ?' : 'Убрать заказ из архива?'}
            </div>
            <div className={styles.confirmText}>
              {order.status === 'cancelled'
                ? 'Заказ вернётся в статус "Новый".'
                : 'Заказ снова станет обычным активным заказом.'}
            </div>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmSecondary}
                onClick={() => setRestorePromptOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.confirmPrimary}
                  onClick={() => {
                  setRestorePromptOpen(false);
                  restoreOrder.mutate({ id: order.id, status: order.status });
                }}
                disabled={restoreOrder.isPending}
              >
                Восстановить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
