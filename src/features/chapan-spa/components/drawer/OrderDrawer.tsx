import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Lock,
  MessageSquare,
  Package,
  Send,
  Unlock,
  User,
  X,
} from 'lucide-react';
import { useChapanStore } from '../../model/chapan.store';
import { useTileChapanUI } from '../../model/tile-ui.store';
import type { OrderStatus, PaymentMethod, ProductionStatus, UITone } from '../../api/types';
import {
  ACTIVITY_TONE,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  PRODUCTION_STATUS_LABEL,
  PRODUCTION_STATUS_ORDER,
  PRODUCTION_STATUS_TONE,
} from '../../api/types';
import s from './OrderDrawer.module.css';

interface Props {
  tileId: string;
}

type DrawerTab = 'details' | 'production' | 'payments' | 'journal';

const TONE_CLASS: Record<UITone, string> = {
  muted: s.toneMuted,
  info: s.toneInfo,
  warning: s.toneWarning,
  danger: s.toneDanger,
  success: s.toneSuccess,
  accent: s.toneAccent,
};

export function OrderDrawer({ tileId }: Props) {
  const {
    drawerOpen,
    activeOrderId,
    closeDrawer,
    cancelModalOpen,
    cancelOrderId,
    openCancelModal,
    closeCancelModal,
  } = useTileChapanUI(tileId);

  const {
    orders,
    confirmOrder,
    moveOrderStatus,
    cancelOrder,
    addPayment,
    moveProductionStatus,
    assignWorker,
    initiateTransfer,
    confirmTransfer,
    addComment,
    flagTask,
    unflagTask,
    setTaskDefect,
    workers,
  } = useChapanStore();

  const [tab, setTab] = useState<DrawerTab>('details');
  const [comment, setComment] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [cancelReason, setCancelReason] = useState('');
  const [defectInputs, setDefectInputs] = useState<Record<string, string>>({});
  const [blockModal, setBlockModal] = useState<{ taskId: string } | null>(null);
  const [blockReason, setBlockReason] = useState('');

  if (!drawerOpen || !activeOrderId) return null;

  const order = orders.find((item) => item.id === activeOrderId);
  if (!order) return null;

  const tabs: Array<{ id: DrawerTab; label: string }> = [
    { id: 'details', label: 'Детали' },
    { id: 'production', label: `Пошив (${order.productionTasks.length})` },
    { id: 'payments', label: `Оплата (${order.payments.length})` },
    { id: 'journal', label: `Журнал (${order.activities.length})` },
  ];

  const nextStatuses: OrderStatus[] = [];
  if (order.status === 'new') nextStatuses.push('confirmed');
  else if (order.status === 'confirmed') nextStatuses.push('in_production');
  else if (order.status === 'ready') nextStatuses.push('transferred');
  else if (order.status === 'transferred') nextStatuses.push('completed');

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    await addComment(order.id, comment.trim(), 'Менеджер');
    setComment('');
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    await addPayment(order.id, amount, payMethod);
    setPayAmount('');
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) return;
    await cancelOrder(order.id, cancelReason.trim());
    setCancelReason('');
    closeCancelModal();
    closeDrawer();
  };

  const handleDefectSave = async (taskId: string) => {
    const value = defectInputs[taskId] ?? '';
    await setTaskDefect(taskId, value);
    setDefectInputs((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  const remaining = order.totalAmount - order.paidAmount;
  const payPct = order.totalAmount > 0
    ? Math.min(100, Math.round((order.paidAmount / order.totalAmount) * 100))
    : 0;
  const isOverdue = Boolean(
    order.dueDate
      && new Date(order.dueDate) < new Date()
      && order.status !== 'completed'
      && order.status !== 'cancelled',
  );
  const dueDays = order.dueDate
    ? Math.ceil((new Date(order.dueDate).getTime() - Date.now()) / 86_400_000)
    : null;

  const dueLabel = () => {
    if (!order.dueDate) return null;
    if (isOverdue) return { text: `${Math.abs(dueDays ?? 0)} дн. просрочен`, cls: s.dueOverdue };
    if (dueDays === 0) return { text: 'Сегодня', cls: s.dueToday };
    if (dueDays === 1) return { text: 'Завтра', cls: s.dueTomorrow };
    return { text: new Date(order.dueDate).toLocaleDateString('ru-RU'), cls: '' };
  };

  const due = dueLabel();
  const transferDone = Boolean(order.transfer?.transferredAt);
  const managerDone = order.transfer?.confirmedByManager ?? false;
  const clientDone = order.transfer?.confirmedByClient ?? false;

  return (
    <>
      <div className={s.overlay} onClick={closeDrawer}>
        <div className={s.drawer} onClick={(event) => event.stopPropagation()}>
          <div className={s.header}>
            <div className={s.headerTop}>
              <span className={s.orderNum}>{order.orderNumber}</span>
              <span className={`${s.statusBadge} ${TONE_CLASS[ORDER_STATUS_TONE[order.status]]}`}>
                {ORDER_STATUS_LABEL[order.status]}
              </span>
              <button className={s.closeBtn} onClick={closeDrawer} aria-label="Закрыть карточку">
                <X size={16} />
              </button>
            </div>

            <div className={s.clientRow}>
              <User size={13} />
              <span className={s.clientName}>{order.clientName}</span>
              <span className={s.clientPhone}>{order.clientPhone}</span>
            </div>

            <div className={s.metaRow}>
              <span className={`${s.priorityTag} ${TONE_CLASS[PRIORITY_TONE[order.priority]]}`}>
                {PRIORITY_LABEL[order.priority]}
              </span>
              <span className={`${s.payTag} ${TONE_CLASS[PAYMENT_STATUS_TONE[order.paymentStatus]]}`}>
                <CreditCard size={11} />
                {PAYMENT_STATUS_LABEL[order.paymentStatus]}
              </span>
              {due ? (
                <span className={`${s.dueTag} ${due.cls}`}>
                  <Clock size={11} />
                  {due.text}
                </span>
              ) : (
                order.status !== 'completed' && order.status !== 'cancelled' && (
                  <span className={s.dueNone}>
                    <AlertTriangle size={10} />
                    Срок не задан
                  </span>
                )
              )}
              <span className={s.amountTag}>{order.totalAmount.toLocaleString('ru-RU')} тг</span>
            </div>
          </div>

          <div className={s.tabs}>
            {tabs.map((item) => (
              <button
                key={item.id}
                className={`${s.tab} ${tab === item.id ? s.tabActive : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={s.content}>
            {tab === 'details' && (
              <div className={s.detailsTab}>
                <div className={s.sectionLabel}>Изделия</div>
                {order.items.map((item) => (
                  <div key={item.id} className={s.itemRow}>
                    <Package size={13} className={s.itemIcon} />
                    <div className={s.itemBody}>
                      <div className={s.itemName}>{item.productName}</div>
                      <div className={s.itemMeta}>{item.fabric} / {item.size} / ×{item.quantity}</div>
                      {item.workshopNotes && <div className={s.itemNotes}>{item.workshopNotes}</div>}
                    </div>
                    <span className={s.itemPrice}>
                      {(item.unitPrice * item.quantity).toLocaleString('ru-RU')} тг
                    </span>
                  </div>
                ))}

                {order.transfer && (
                  <div className={s.transferSection}>
                    <div className={s.sectionLabel}>Передача клиенту</div>
                    <div className={s.transferSteps}>
                      <div className={`${s.transferStep} ${managerDone ? s.transferStepDone : ''}`}>
                        <div className={`${s.transferStepCircle} ${managerDone ? s.transferStepCircleDone : ''}`}>
                          {managerDone ? <CheckCircle2 size={12} /> : '1'}
                        </div>
                        <div className={s.transferStepBody}>
                          <div className={s.transferStepTitle}>Менеджер подтвердил</div>
                          {!managerDone && (
                            <button className={s.transferConfirmBtn} onClick={() => confirmTransfer(order.id, 'manager')}>
                              Подтвердить
                            </button>
                          )}
                        </div>
                      </div>

                      <div className={s.transferConnector} />

                      <div className={`${s.transferStep} ${clientDone ? s.transferStepDone : ''}`}>
                        <div className={`${s.transferStepCircle} ${clientDone ? s.transferStepCircleDone : ''}`}>
                          {clientDone ? <CheckCircle2 size={12} /> : '2'}
                        </div>
                        <div className={s.transferStepBody}>
                          <div className={s.transferStepTitle}>Клиент подтвердил</div>
                          {!clientDone && (
                            <button className={s.transferConfirmBtn} onClick={() => confirmTransfer(order.id, 'client')}>
                              Подтвердить
                            </button>
                          )}
                        </div>
                      </div>

                      {transferDone && (
                        <div className={s.transferDoneRow}>
                          <CheckCircle2 size={13} />
                          Передача завершена
                          {order.transfer?.transferredAt && (
                            <span className={s.transferDate}>
                              {new Date(order.transfer.transferredAt).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {order.status !== 'completed' && order.status !== 'cancelled' && (
                  <div className={s.actionsSection}>
                    <div className={s.sectionLabel}>Действия</div>

                    {order.status === 'new' && (
                      <button className={s.actionBtn} onClick={() => confirmOrder(order.id)}>
                        <CheckCircle2 size={14} />
                        Подтвердить заказ
                      </button>
                    )}

                    {nextStatuses.filter((status) => status !== 'confirmed').map((status) => (
                      <button key={status} className={s.actionBtn} onClick={() => moveOrderStatus(order.id, status)}>
                        <ArrowRight size={14} />
                        Перевести: {ORDER_STATUS_LABEL[status]}
                      </button>
                    ))}

                    {order.status === 'ready' && !order.transfer && (
                      <button className={`${s.actionBtn} ${s.actionBtnPositive}`} onClick={() => initiateTransfer(order.id)}>
                        <Send size={14} />
                        Начать передачу клиенту
                      </button>
                    )}

                    <button className={`${s.actionBtn} ${s.dangerBtn}`} onClick={() => openCancelModal(order.id)}>
                      <AlertTriangle size={14} />
                      Отменить заказ
                    </button>
                  </div>
                )}

                {order.status === 'cancelled' && order.cancelReason && (
                  <div className={s.cancelReasonDisplay}>
                    <span className={s.cancelReasonLabel}>Причина отмены</span>
                    {order.cancelReason}
                  </div>
                )}
              </div>
            )}

            {tab === 'production' && (
              <div className={s.productionTab}>
                {order.productionTasks.length === 0 ? (
                  <div className={s.emptyTab}>
                    {order.status === 'new'
                      ? 'Подтвердите заказ, чтобы создать производственные задания'
                      : 'Нет производственных заданий'}
                  </div>
                ) : (
                  order.productionTasks.map((task) => (
                    <div key={task.id} className={`${s.ptCard} ${task.isBlocked ? s.ptCardBlocked : ''}`}>
                      <div className={s.ptTop}>
                        <span className={s.ptName}>{task.productName}</span>
                        <span className={`${s.ptStatus} ${TONE_CLASS[PRODUCTION_STATUS_TONE[task.status]]}`}>
                          {PRODUCTION_STATUS_LABEL[task.status]}
                        </span>
                      </div>

                      <div className={s.ptMeta}>{task.fabric} / {task.size} / ×{task.quantity}</div>

                      {task.isBlocked && task.blockReason && (
                        <div className={s.ptBlockReason}>
                          <Lock size={10} />
                          {task.blockReason}
                        </div>
                      )}

                      {task.defects && (
                        <div className={s.ptDefectNote}>
                          <AlertTriangle size={10} />
                          {task.defects}
                        </div>
                      )}

                      <div className={s.ptActions}>
                        <select
                          className={s.ptSelect}
                          value={task.assignedTo ?? ''}
                          onChange={(event) => assignWorker(task.id, event.target.value)}
                        >
                          <option value="">Назначить</option>
                          {workers.map((worker) => (
                            <option key={worker} value={worker}>{worker}</option>
                          ))}
                        </select>

                        {task.status !== 'done' && (
                          <select
                            className={s.ptSelect}
                            value={task.status}
                            onChange={(event) => moveProductionStatus(task.id, event.target.value as ProductionStatus)}
                          >
                            {PRODUCTION_STATUS_ORDER.map((status) => (
                              <option key={status} value={status}>{PRODUCTION_STATUS_LABEL[status]}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {task.status !== 'done' && (
                        <div className={s.ptFlagRow}>
                          {task.isBlocked ? (
                            <button className={s.ptUnblockBtn} onClick={() => unflagTask(task.id)}>
                              <Unlock size={10} />
                              Снять блок
                            </button>
                          ) : (
                            <button
                              className={s.ptBlockBtn}
                              onClick={() => {
                                setBlockReason('');
                                setBlockModal({ taskId: task.id });
                              }}
                            >
                              <Lock size={10} />
                              Заблокировать
                            </button>
                          )}

                          {defectInputs[task.id] !== undefined ? (
                            <div className={s.ptDefectEdit}>
                              <input
                                className={s.ptDefectInput}
                                placeholder="Описание дефекта..."
                                value={defectInputs[task.id]}
                                onChange={(event) => setDefectInputs((prev) => ({ ...prev, [task.id]: event.target.value }))}
                                autoFocus
                              />
                              <button className={s.ptDefectSave} onClick={() => handleDefectSave(task.id)} aria-label="Сохранить дефект">
                                <Check size={12} />
                              </button>
                              <button
                                className={s.ptDefectCancel}
                                onClick={() => setDefectInputs((prev) => {
                                  const next = { ...prev };
                                  delete next[task.id];
                                  return next;
                                })}
                                aria-label="Отменить редактирование дефекта"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className={s.ptDefectToggle}
                              onClick={() => setDefectInputs((prev) => ({ ...prev, [task.id]: task.defects ?? '' }))}
                            >
                              {task.defects ? 'Изменить дефект' : 'Добавить дефект'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'payments' && (
              <div className={s.paymentsTab}>
                <div className={s.payProgressBlock}>
                  <div className={s.payProgressBar}>
                    <div className={s.payProgressFill} style={{ width: `${payPct}%` }} />
                  </div>
                  <div className={s.payProgressLabels}>
                    <span>Оплачено {payPct}%</span>
                    <span className={s.payProgressAmt}>
                      {order.paidAmount.toLocaleString('ru-RU')} / {order.totalAmount.toLocaleString('ru-RU')} тг
                    </span>
                  </div>
                  {remaining > 0 && (
                    <div className={s.payRemaining}>
                      Остаток: <strong>{remaining.toLocaleString('ru-RU')} тг</strong>
                    </div>
                  )}
                </div>

                {order.payments.map((payment) => (
                  <div key={payment.id} className={s.payRow}>
                    <CreditCard size={13} className={s.payRowIcon} />
                    <div className={s.payRowBody}>
                      <div className={s.payRowAmount}>{payment.amount.toLocaleString('ru-RU')} тг</div>
                      <div className={s.payRowMeta}>
                        {PAYMENT_METHOD_LABEL[payment.method]}
                        {payment.notes ? ` — ${payment.notes}` : ''}
                        {' · '}
                        {new Date(payment.paidAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                ))}

                {remaining > 0 && order.status !== 'cancelled' && (
                  <div className={s.addPaymentForm}>
                    <div className={s.sectionLabel}>Добавить оплату</div>
                    <div className={s.row}>
                      <input
                        className={s.formInput}
                        type="number"
                        min={0}
                        placeholder="Сумма тг"
                        value={payAmount}
                        onChange={(event) => setPayAmount(event.target.value)}
                      />
                      <select
                        className={s.formSelect}
                        value={payMethod}
                        onChange={(event) => setPayMethod(event.target.value as PaymentMethod)}
                      >
                        {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((method) => (
                          <option key={method} value={method}>{PAYMENT_METHOD_LABEL[method]}</option>
                        ))}
                      </select>
                      <button className={s.payBtn} onClick={handleAddPayment}>Принять</button>
                    </div>
                    {payAmount && parseFloat(payAmount) > 0 && (
                      <div className={s.payAfterNote}>
                        После оплаты останется {Math.max(0, remaining - parseFloat(payAmount)).toLocaleString('ru-RU')} тг
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === 'journal' && (
              <div className={s.journalTab}>
                <div className={s.commentBox}>
                  <input
                    className={s.commentInput}
                    placeholder="Добавить комментарий..."
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleAddComment()}
                  />
                  <button className={s.commentSend} onClick={handleAddComment} aria-label="Отправить комментарий">
                    <MessageSquare size={14} />
                  </button>
                </div>

                <div className={s.activityList}>
                  {[...order.activities].reverse().map((activity) => (
                    <div key={activity.id} className={s.actRow}>
                      <div className={`${s.actDot} ${TONE_CLASS[ACTIVITY_TONE[activity.type]]}`} />
                      <div className={s.actBody}>
                        <div className={s.actContent}>{activity.content}</div>
                        <div className={s.actMeta}>
                          {activity.author} · {new Date(activity.createdAt).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {blockModal && (
        <div className={s.modalOverlay} onClick={() => setBlockModal(null)}>
          <div className={s.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={s.modalTitle}>
              <Lock size={15} />
              Заблокировать задание
            </div>
            <div className={s.modalSub}>Укажите причину блокировки.</div>
            <input
              className={s.modalInput}
              placeholder="Причина блокировки"
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter' && blockReason.trim()) {
                  flagTask(blockModal.taskId, blockReason.trim());
                  setBlockModal(null);
                  setBlockReason('');
                }
              }}
            />
            <div className={s.modalActions}>
              <button className={s.modalCloseBtn} onClick={() => setBlockModal(null)}>Отмена</button>
              <button
                className={s.modalConfirmBtn}
                disabled={!blockReason.trim()}
                onClick={() => {
                  flagTask(blockModal.taskId, blockReason.trim());
                  setBlockModal(null);
                  setBlockReason('');
                }}
              >
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModalOpen && cancelOrderId === order.id && (
        <div className={s.modalOverlay} onClick={closeCancelModal}>
          <div className={s.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={s.modalTitle}>
              <AlertTriangle size={15} />
              Отменить заказ {order.orderNumber}?
            </div>
            <div className={s.modalSub}>Причина сохранится в журнале заказа.</div>
            <input
              className={s.modalInput}
              placeholder="Причина отмены"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              autoFocus
              onKeyDown={(event) => event.key === 'Enter' && handleCancelConfirm()}
            />
            <div className={s.modalActions}>
              <button className={s.modalCloseBtn} onClick={closeCancelModal}>Не отменять</button>
              <button
                className={s.modalConfirmBtn}
                disabled={!cancelReason.trim()}
                onClick={handleCancelConfirm}
              >
                Отменить заказ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
