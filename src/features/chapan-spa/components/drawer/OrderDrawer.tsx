import { useState } from 'react';
import {
  X, Clock, CreditCard, Package, User,
  CheckCircle2, AlertTriangle, Send, MessageSquare,
  Lock, Unlock, ArrowRight,
} from 'lucide-react';
import { useChapanStore } from '../../model/chapan.store';
import { useTileChapanUI } from '../../model/tile-ui.store';
import type { Order, OrderStatus, ProductionStatus } from '../../api/types';
import {
  ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, ORDER_STATUS_ORDER,
  PAYMENT_STATUS_LABEL, PAYMENT_STATUS_COLOR,
  PRODUCTION_STATUS_LABEL, PRODUCTION_STATUS_COLOR, PRODUCTION_STATUS_ORDER,
  PRIORITY_LABEL, PRIORITY_COLOR,
  PAYMENT_METHOD_LABEL,
} from '../../api/types';
import type { PaymentMethod } from '../../api/types';
import s from './OrderDrawer.module.css';

interface Props {
  tileId: string;
}

type DrawerTab = 'details' | 'production' | 'payments' | 'journal';

export function OrderDrawer({ tileId }: Props) {
  const { drawerOpen, activeOrderId, closeDrawer, cancelModalOpen, cancelOrderId, openCancelModal, closeCancelModal } =
    useTileChapanUI(tileId);
  const {
    orders, confirmOrder, moveOrderStatus, cancelOrder,
    addPayment, moveProductionStatus, assignWorker,
    initiateTransfer, confirmTransfer, addComment,
    flagTask, unflagTask, setTaskDefect, workers,
  } = useChapanStore();

  const [tab, setTab] = useState<DrawerTab>('details');
  const [comment, setComment] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [cancelReason, setCancelReason] = useState('');
  const [defectInputs, setDefectInputs] = useState<Record<string, string>>({});

  if (!drawerOpen || !activeOrderId) return null;

  const order = orders.find(o => o.id === activeOrderId);
  if (!order) return null;

  const tabs: { id: DrawerTab; label: string }[] = [
    { id: 'details',    label: 'Детали' },
    { id: 'production', label: `Пошив (${order.productionTasks.length})` },
    { id: 'payments',   label: `Оплата (${order.payments.length})` },
    { id: 'journal',    label: `Журнал (${order.activities.length})` },
  ];

  const nextStatuses: OrderStatus[] = [];
  if (order.status === 'new')         nextStatuses.push('confirmed');
  else if (order.status === 'confirmed')   nextStatuses.push('in_production');
  else if (order.status === 'ready')       nextStatuses.push('transferred');
  else if (order.status === 'transferred') nextStatuses.push('completed');

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    await addComment(order.id, comment.trim(), 'Менеджер');
    setComment('');
  };

  const handleAddPayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;
    await addPayment(order.id, amt, payMethod);
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
    const val = defectInputs[taskId] ?? '';
    await setTaskDefect(taskId, val);
    setDefectInputs(prev => { const n = { ...prev }; delete n[taskId]; return n; });
  };

  const remaining    = order.totalAmount - order.paidAmount;
  const payPct       = order.totalAmount > 0
    ? Math.min(100, Math.round((order.paidAmount / order.totalAmount) * 100))
    : 0;
  const isOverdue    = !!(order.dueDate && new Date(order.dueDate) < new Date()
    && order.status !== 'completed' && order.status !== 'cancelled');
  const dueDays      = order.dueDate
    ? Math.ceil((new Date(order.dueDate).getTime() - Date.now()) / 86_400_000)
    : null;

  const dueLabel = () => {
    if (!order.dueDate) return null;
    if (isOverdue) return { text: `${Math.abs(dueDays!)}д. просрочен`, cls: s.dueOverdue };
    if (dueDays === 0) return { text: 'Сегодня', cls: s.dueToday };
    if (dueDays === 1) return { text: 'Завтра',  cls: s.dueTomorrow };
    return { text: new Date(order.dueDate).toLocaleDateString('ru-RU'), cls: '' };
  };

  const due = dueLabel();

  // Transfer step helpers
  const transferDone = !!(order.transfer?.transferredAt);
  const mgDone       = order.transfer?.confirmedByManager ?? false;
  const clDone       = order.transfer?.confirmedByClient  ?? false;

  return (
    <>
      <div className={s.overlay} onClick={closeDrawer}>
        <div className={s.drawer} onClick={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <div className={s.header}>
            <div className={s.headerTop}>
              <span className={s.orderNum}>{order.orderNumber}</span>
              <span
                className={s.statusBadge}
                style={{ '--s-color': ORDER_STATUS_COLOR[order.status] } as React.CSSProperties}
              >
                {ORDER_STATUS_LABEL[order.status]}
              </span>
              <button className={s.closeBtn} onClick={closeDrawer}>
                <X size={16} />
              </button>
            </div>
            <div className={s.clientRow}>
              <User size={13} />
              <span className={s.clientName}>{order.clientName}</span>
              <span className={s.clientPhone}>{order.clientPhone}</span>
            </div>
            <div className={s.metaRow}>
              <span
                className={s.priorityTag}
                style={{ '--p-color': PRIORITY_COLOR[order.priority] } as React.CSSProperties}
              >
                {PRIORITY_LABEL[order.priority]}
              </span>
              <span
                className={s.payTag}
                style={{ '--pay-color': PAYMENT_STATUS_COLOR[order.paymentStatus] } as React.CSSProperties}
              >
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
                  <span className={`${s.dueTag} ${s.dueNone}`}>
                    <AlertTriangle size={10} />
                    Срок не задан
                  </span>
                )
              )}
              <span className={s.amountTag}>
                {order.totalAmount.toLocaleString('ru-RU')} ₸
              </span>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className={s.tabs}>
            {tabs.map(t => (
              <button
                key={t.id}
                className={`${s.tab} ${tab === t.id ? s.tabActive : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          <div className={s.content}>

            {/* ─── Details tab ─── */}
            {tab === 'details' && (
              <div className={s.detailsTab}>
                <div className={s.sectionLabel}>Изделия</div>
                {order.items.map((item) => (
                  <div key={item.id} className={s.itemRow}>
                    <Package size={13} className={s.itemIcon} />
                    <div className={s.itemBody}>
                      <div className={s.itemName}>{item.productName}</div>
                      <div className={s.itemMeta}>
                        {item.fabric} / {item.size} / ×{item.quantity}
                      </div>
                      {item.workshopNotes && (
                        <div className={s.itemNotes}>{item.workshopNotes}</div>
                      )}
                    </div>
                    <span className={s.itemPrice}>
                      {(item.unitPrice * item.quantity).toLocaleString('ru-RU')} ₸
                    </span>
                  </div>
                ))}

                {/* Transfer flow */}
                {order.transfer && (
                  <div className={s.transferSection}>
                    <div className={s.sectionLabel}>Передача клиенту</div>
                    <div className={s.transferSteps}>
                      <div className={`${s.transferStep} ${mgDone ? s.transferStepDone : ''}`}>
                        <div className={`${s.transferStepCircle} ${mgDone ? s.transferStepCircleDone : ''}`}>
                          {mgDone ? <CheckCircle2 size={12} /> : '1'}
                        </div>
                        <div className={s.transferStepBody}>
                          <div className={s.transferStepTitle}>Менеджер подтвердил</div>
                          {!mgDone && (
                            <button
                              className={s.transferConfirmBtn}
                              onClick={() => confirmTransfer(order.id, 'manager')}
                            >
                              Подтвердить
                            </button>
                          )}
                        </div>
                      </div>

                      <div className={s.transferConnector} />

                      <div className={`${s.transferStep} ${clDone ? s.transferStepDone : ''}`}>
                        <div className={`${s.transferStepCircle} ${clDone ? s.transferStepCircleDone : ''}`}>
                          {clDone ? <CheckCircle2 size={12} /> : '2'}
                        </div>
                        <div className={s.transferStepBody}>
                          <div className={s.transferStepTitle}>Клиент подтвердил</div>
                          {!clDone && (
                            <button
                              className={s.transferConfirmBtn}
                              onClick={() => confirmTransfer(order.id, 'client')}
                            >
                              Подтвердить
                            </button>
                          )}
                        </div>
                      </div>

                      {transferDone && (
                        <div className={s.transferDoneRow}>
                          <CheckCircle2 size={13} />
                          Передача завершена
                          {order.transfer!.transferredAt && (
                            <span className={s.transferDate}>
                              {new Date(order.transfer!.transferredAt).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {order.status !== 'completed' && order.status !== 'cancelled' && (
                  <div className={s.actionsSection}>
                    <div className={s.sectionLabel}>Действия</div>

                    {order.status === 'new' && (
                      <button className={s.actionBtn} onClick={() => confirmOrder(order.id)}>
                        <CheckCircle2 size={14} />
                        Подтвердить заказ
                      </button>
                    )}

                    {nextStatuses.filter(ns => ns !== 'confirmed').map(ns => (
                      <button
                        key={ns}
                        className={s.actionBtn}
                        onClick={() => moveOrderStatus(order.id, ns)}
                      >
                        <ArrowRight size={14} />
                        Перевести: {ORDER_STATUS_LABEL[ns]}
                      </button>
                    ))}

                    {order.status === 'ready' && !order.transfer && (
                      <button
                        className={`${s.actionBtn} ${s.actionBtnGreen}`}
                        onClick={() => initiateTransfer(order.id)}
                      >
                        <Send size={14} />
                        Начать передачу клиенту
                      </button>
                    )}

                    <button
                      className={`${s.actionBtn} ${s.dangerBtn}`}
                      onClick={() => openCancelModal(order.id)}
                    >
                      <AlertTriangle size={14} />
                      Отменить заказ
                    </button>
                  </div>
                )}

                {order.status === 'cancelled' && order.cancelReason && (
                  <div className={s.cancelReasonDisplay}>
                    <span className={s.cancelReasonLabel}>Причина отмены:</span>
                    {order.cancelReason}
                  </div>
                )}
              </div>
            )}

            {/* ─── Production tab ─── */}
            {tab === 'production' && (
              <div className={s.productionTab}>
                {order.productionTasks.length === 0 ? (
                  <div className={s.emptyTab}>
                    {order.status === 'new'
                      ? 'Подтвердите заказ для создания заданий'
                      : 'Нет производственных заданий'}
                  </div>
                ) : (
                  order.productionTasks.map(pt => (
                    <div
                      key={pt.id}
                      className={`${s.ptCard} ${pt.isBlocked ? s.ptCardBlocked : ''}`}
                    >
                      <div className={s.ptTop}>
                        <span className={s.ptName}>{pt.productName}</span>
                        <span
                          className={s.ptStatus}
                          style={{ '--ps-color': PRODUCTION_STATUS_COLOR[pt.status] } as React.CSSProperties}
                        >
                          {PRODUCTION_STATUS_LABEL[pt.status]}
                        </span>
                      </div>
                      <div className={s.ptMeta}>
                        {pt.fabric} / {pt.size} / ×{pt.quantity}
                      </div>
                      {pt.isBlocked && pt.blockReason && (
                        <div className={s.ptBlockReason}>
                          <Lock size={10} />
                          {pt.blockReason}
                        </div>
                      )}
                      {pt.defects && (
                        <div className={s.ptDefectNote}>
                          <AlertTriangle size={10} />
                          {pt.defects}
                        </div>
                      )}
                      <div className={s.ptActions}>
                        <select
                          className={s.ptSelect}
                          value={pt.assignedTo ?? ''}
                          onChange={e => assignWorker(pt.id, e.target.value)}
                        >
                          <option value="">Назначить</option>
                          {workers.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                        {pt.status !== 'done' && (
                          <select
                            className={s.ptSelect}
                            value={pt.status}
                            onChange={e => moveProductionStatus(pt.id, e.target.value as ProductionStatus)}
                          >
                            {PRODUCTION_STATUS_ORDER.map(ps => (
                              <option key={ps} value={ps}>{PRODUCTION_STATUS_LABEL[ps]}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Block / unblock */}
                      {pt.status !== 'done' && (
                        <div className={s.ptFlagRow}>
                          {pt.isBlocked ? (
                            <button className={s.ptUnblockBtn} onClick={() => unflagTask(pt.id)}>
                              <Unlock size={10} />
                              Снять блок
                            </button>
                          ) : (
                            <button
                              className={s.ptBlockBtn}
                              onClick={() => {
                                const r = prompt('Причина блокировки:');
                                if (r?.trim()) flagTask(pt.id, r.trim());
                              }}
                            >
                              <Lock size={10} />
                              Заблокировать
                            </button>
                          )}

                          {/* Defect */}
                          {defectInputs[pt.id] !== undefined ? (
                            <div className={s.ptDefectEdit}>
                              <input
                                className={s.ptDefectInput}
                                placeholder="Описание дефекта..."
                                value={defectInputs[pt.id]}
                                onChange={e => setDefectInputs(prev => ({ ...prev, [pt.id]: e.target.value }))}
                                autoFocus
                              />
                              <button className={s.ptDefectSave} onClick={() => handleDefectSave(pt.id)}>✓</button>
                              <button
                                className={s.ptDefectCancel}
                                onClick={() => setDefectInputs(prev => { const n = { ...prev }; delete n[pt.id]; return n; })}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              className={s.ptDefectToggle}
                              onClick={() => setDefectInputs(prev => ({ ...prev, [pt.id]: pt.defects ?? '' }))}
                            >
                              {pt.defects ? 'Изм. дефект' : '+ Дефект'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── Payments tab ─── */}
            {tab === 'payments' && (
              <div className={s.paymentsTab}>
                {/* Progress bar */}
                <div className={s.payProgressBlock}>
                  <div className={s.payProgressBar}>
                    <div
                      className={s.payProgressFill}
                      style={{ width: `${payPct}%` }}
                    />
                  </div>
                  <div className={s.payProgressLabels}>
                    <span>Оплачено {payPct}%</span>
                    <span className={s.payProgressAmt}>
                      {order.paidAmount.toLocaleString('ru-RU')} / {order.totalAmount.toLocaleString('ru-RU')} ₸
                    </span>
                  </div>
                  {remaining > 0 && (
                    <div className={s.payRemaining}>
                      Остаток: <strong>{remaining.toLocaleString('ru-RU')} ₸</strong>
                    </div>
                  )}
                </div>

                {order.payments.map(p => (
                  <div key={p.id} className={s.payRow}>
                    <CreditCard size={13} className={s.payRowIcon} />
                    <div className={s.payRowBody}>
                      <div className={s.payRowAmount}>{p.amount.toLocaleString('ru-RU')} ₸</div>
                      <div className={s.payRowMeta}>
                        {PAYMENT_METHOD_LABEL[p.method]}
                        {p.notes ? ` — ${p.notes}` : ''}
                        {' · '}
                        {new Date(p.paidAt).toLocaleDateString('ru-RU')}
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
                        placeholder="Сумма ₸"
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                      />
                      <select
                        className={s.formSelect}
                        value={payMethod}
                        onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                      >
                        {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map(m => (
                          <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
                        ))}
                      </select>
                      <button className={s.payBtn} onClick={handleAddPayment}>
                        Принять
                      </button>
                    </div>
                    {payAmount && parseFloat(payAmount) > 0 && (
                      <div className={s.payAfterNote}>
                        После: остаток {Math.max(0, remaining - parseFloat(payAmount)).toLocaleString('ru-RU')} ₸
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── Journal tab ─── */}
            {tab === 'journal' && (
              <div className={s.journalTab}>
                <div className={s.commentBox}>
                  <input
                    className={s.commentInput}
                    placeholder="Добавить комментарий..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                  />
                  <button className={s.commentSend} onClick={handleAddComment}>
                    <MessageSquare size={14} />
                  </button>
                </div>

                <div className={s.activityList}>
                  {[...order.activities].reverse().map(a => (
                    <div key={a.id} className={s.actRow}>
                      <div className={s.actDot} data-type={a.type} />
                      <div className={s.actBody}>
                        <div className={s.actContent}>{a.content}</div>
                        <div className={s.actMeta}>
                          {a.author} · {new Date(a.createdAt).toLocaleString('ru-RU', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
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

      {/* ── Cancel reason modal ── */}
      {cancelModalOpen && cancelOrderId === order.id && (
        <div className={s.cancelOverlay} onClick={closeCancelModal}>
          <div className={s.cancelModal} onClick={e => e.stopPropagation()}>
            <div className={s.cancelModalTitle}>
              <AlertTriangle size={15} />
              Отменить заказ {order.orderNumber}?
            </div>
            <div className={s.cancelModalSub}>
              Укажите причину — она сохранится в журнале заказа.
            </div>
            <input
              className={s.cancelInput}
              placeholder="Причина отмены (напр., клиент отказался, изменился срок...)"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCancelConfirm()}
            />
            <div className={s.cancelModalActions}>
              <button className={s.cancelModalClose} onClick={closeCancelModal}>
                Не отменять
              </button>
              <button
                className={s.cancelModalConfirm}
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
