import { useState, useMemo } from 'react';
import { User, Package, Clock, AlertTriangle, Star, AlertCircle, Lock, Unlock, X } from 'lucide-react';
import { useChapanStore } from '../../model/chapan.store';
import type { Order, ProductionTask, ProductionStatus } from '../../api/types';
import {
  PRODUCTION_STATUS_LABEL, PRODUCTION_STATUS_COLOR, PRODUCTION_STATUS_ORDER,
  PRIORITY_COLOR,
} from '../../api/types';
import s from './ProductionQueue.module.css';

const PRIORITY_WEIGHT: Record<string, number> = { vip: 0, urgent: 1, normal: 2 };

function sortTasks(
  tasks: ProductionTask[],
  orderMap: Map<string, Order>,
): ProductionTask[] {
  return [...tasks].sort((a, b) => {
    const oa = orderMap.get(a.orderId);
    const ob = orderMap.get(b.orderId);

    // Blocked first
    if (a.isBlocked !== b.isBlocked) return a.isBlocked ? -1 : 1;

    // Then by priority
    const pa = PRIORITY_WEIGHT[oa?.priority ?? 'normal'];
    const pb = PRIORITY_WEIGHT[ob?.priority ?? 'normal'];
    if (pa !== pb) return pa - pb;

    // Then overdue first
    const now = Date.now();
    const aOverdue = oa?.dueDate ? new Date(oa.dueDate).getTime() < now : false;
    const bOverdue = ob?.dueDate ? new Date(ob.dueDate).getTime() < now : false;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    // Then by due date ascending
    const da = oa?.dueDate ? new Date(oa.dueDate).getTime() : Infinity;
    const db = ob?.dueDate ? new Date(ob.dueDate).getTime() : Infinity;
    return da - db;
  });
}

interface BlockModalState {
  taskId: string;
  productName: string;
  reason: string;
}

export function ProductionQueue() {
  const { orders, moveProductionStatus, assignWorker, flagTask, unflagTask, setTaskDefect, workers } =
    useChapanStore();

  const [blockModal, setBlockModal] = useState<BlockModalState | null>(null);
  const [defectInputs, setDefectInputs] = useState<Record<string, string>>({});

  // Collect active tasks + build parent order lookup
  const { allTasks, orderMap } = useMemo(() => {
    const tasks: ProductionTask[] = [];
    const map = new Map<string, Order>();
    for (const o of orders) {
      map.set(o.id, o);
      if (o.status === 'cancelled' || o.status === 'completed') continue;
      for (const pt of o.productionTasks) {
        tasks.push(pt);
      }
    }
    return { allTasks: tasks, orderMap: map };
  }, [orders]);

  const unassignedCount = allTasks.filter(t => !t.assignedTo && t.status !== 'done').length;
  const blockedCount    = allTasks.filter(t => t.isBlocked).length;

  // Group by production status (kanban columns) — sorted
  const columns = useMemo(() => {
    const cols: Record<ProductionStatus, ProductionTask[]> = {
      pending: [], cutting: [], sewing: [], finishing: [], quality_check: [], done: [],
    };
    for (const t of allTasks) {
      cols[t.status].push(t);
    }
    for (const key of Object.keys(cols) as ProductionStatus[]) {
      cols[key] = sortTasks(cols[key], orderMap);
    }
    return cols;
  }, [allTasks, orderMap]);

  const handleBlockConfirm = async () => {
    if (!blockModal || !blockModal.reason.trim()) return;
    await flagTask(blockModal.taskId, blockModal.reason.trim());
    setBlockModal(null);
  };

  const handleDefectSave = async (taskId: string) => {
    const val = defectInputs[taskId] ?? '';
    await setTaskDefect(taskId, val);
    setDefectInputs(prev => { const n = { ...prev }; delete n[taskId]; return n; });
  };

  if (allTasks.length === 0) {
    return (
      <div className={s.empty}>
        <Package size={32} className={s.emptyIcon} />
        <div className={s.emptyTitle}>Нет заданий в производстве</div>
        <div className={s.emptySub}>Подтвердите заказ для создания заданий</div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      {/* ── Warning banners ── */}
      {(unassignedCount > 0 || blockedCount > 0) && (
        <div className={s.banners}>
          {blockedCount > 0 && (
            <div className={s.bannerBlocked}>
              <AlertTriangle size={13} />
              <span><strong>{blockedCount} задания заблокированы</strong> — требуют решения</span>
            </div>
          )}
          {unassignedCount > 0 && (
            <div className={s.bannerUnassigned}>
              <User size={13} />
              <span>{unassignedCount} заданий без исполнителя</span>
            </div>
          )}
        </div>
      )}

      <div className={s.board}>
        {PRODUCTION_STATUS_ORDER.map(status => {
          const tasks = columns[status];
          return (
            <div key={status} className={s.column}>
              <div className={s.colHeader}>
                <span
                  className={s.colDot}
                  style={{ background: PRODUCTION_STATUS_COLOR[status] }}
                />
                <span className={s.colTitle}>{PRODUCTION_STATUS_LABEL[status]}</span>
                <span className={s.colCount}>{tasks.length}</span>
              </div>
              <div className={s.colBody}>
                {tasks.map(pt => {
                  const parentOrder = orderMap.get(pt.orderId);
                  const isOverdue = !!(parentOrder?.dueDate
                    && new Date(parentOrder.dueDate) < new Date()
                    && parentOrder.status !== 'completed');
                  const isUrgent = parentOrder && parentOrder.priority !== 'normal';
                  const daysInWork = pt.startedAt
                    ? Math.ceil((Date.now() - new Date(pt.startedAt).getTime()) / 86_400_000)
                    : null;
                  const dueDays = parentOrder?.dueDate
                    ? Math.ceil((new Date(parentOrder.dueDate).getTime() - Date.now()) / 86_400_000)
                    : null;
                  const isDefectEditing = taskId => defectInputs[taskId] !== undefined;

                  return (
                    <div
                      key={pt.id}
                      className={[
                        s.card,
                        isOverdue         ? s.cardOverdue : '',
                        parentOrder?.priority === 'vip' ? s.cardVip : '',
                        pt.isBlocked      ? s.cardBlocked : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {/* Card top: order number + flags */}
                      <div className={s.cardTop}>
                        <span className={s.cardOrder}>{pt.orderNumber}</span>
                        {isUrgent && parentOrder && (
                          <span
                            className={s.cardPriority}
                            style={{ color: PRIORITY_COLOR[parentOrder.priority] }}
                          >
                            {parentOrder.priority === 'vip'
                              ? <Star size={9} />
                              : <AlertTriangle size={9} />}
                          </span>
                        )}
                        {pt.isBlocked && (
                          <span className={s.blockedBadge}>
                            <Lock size={8} />
                            Блок
                          </span>
                        )}
                      </div>

                      {/* Product name */}
                      <div className={s.cardName}>{pt.productName}</div>
                      <div className={s.cardMeta}>
                        {pt.fabric} / {pt.size} / ×{pt.quantity}
                      </div>

                      {/* Block reason */}
                      {pt.isBlocked && pt.blockReason && (
                        <div className={s.blockReason}>
                          <AlertCircle size={9} />
                          {pt.blockReason}
                        </div>
                      )}

                      {/* Defect note */}
                      {pt.defects && (
                        <div className={s.defectNote}>
                          <AlertTriangle size={9} />
                          {pt.defects}
                        </div>
                      )}

                      {/* Worker assignment — always editable */}
                      <div className={s.cardWorkerRow}>
                        {pt.assignedTo && (
                          <span className={s.cardWorker}>
                            <User size={10} /> {pt.assignedTo}
                          </span>
                        )}
                        <select
                          className={s.assignSelect}
                          value={pt.assignedTo ?? ''}
                          onChange={e => assignWorker(pt.id, e.target.value)}
                          title="Сменить исполнителя"
                        >
                          <option value="">{pt.assignedTo ? 'Сменить...' : 'Назначить...'}</option>
                          {workers.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>

                      {/* Timing */}
                      {daysInWork !== null && (
                        <div className={s.cardTime}>
                          <Clock size={10} />
                          {daysInWork}д. в работе
                        </div>
                      )}

                      {parentOrder?.dueDate && (
                        <div className={`${s.cardDueRow} ${isOverdue ? s.cardDueOverdue : dueDays === 0 ? s.cardDueToday : dueDays === 1 ? s.cardDueTomorrow : ''}`}>
                          <Clock size={9} />
                          {isOverdue
                            ? `${Math.abs(dueDays!)}д. просрочен`
                            : dueDays === 0
                              ? 'Срок сегодня'
                              : dueDays === 1
                                ? 'Срок завтра'
                                : new Date(parentOrder.dueDate).toLocaleDateString('ru-RU', {
                                    day: 'numeric', month: 'short',
                                  })}
                        </div>
                      )}

                      {/* Actions */}
                      {pt.status !== 'done' && (
                        <div className={s.cardActions}>
                          {/* Move forward */}
                          {!pt.isBlocked && PRODUCTION_STATUS_ORDER
                            .filter(ps =>
                              PRODUCTION_STATUS_ORDER.indexOf(ps) ===
                              PRODUCTION_STATUS_ORDER.indexOf(pt.status) + 1
                            )
                            .map(next => (
                              <button
                                key={next}
                                className={s.moveBtn}
                                onClick={() => moveProductionStatus(pt.id, next)}
                              >
                                → {PRODUCTION_STATUS_LABEL[next]}
                              </button>
                            ))}

                          {/* Block / unblock */}
                          {pt.isBlocked ? (
                            <button
                              className={s.unblockBtn}
                              onClick={() => unflagTask(pt.id)}
                            >
                              <Unlock size={10} />
                              Снять блок
                            </button>
                          ) : (
                            <button
                              className={s.blockBtn}
                              onClick={() => setBlockModal({ taskId: pt.id, productName: pt.productName, reason: '' })}
                            >
                              <Lock size={10} />
                              Заблокировать
                            </button>
                          )}
                        </div>
                      )}

                      {/* Defect input */}
                      {pt.status !== 'done' && (
                        <div className={s.defectRow}>
                          {defectInputs[pt.id] !== undefined ? (
                            <>
                              <input
                                className={s.defectInput}
                                placeholder="Описание дефекта..."
                                value={defectInputs[pt.id]}
                                onChange={e => setDefectInputs(prev => ({ ...prev, [pt.id]: e.target.value }))}
                                autoFocus
                              />
                              <button className={s.defectSave} onClick={() => handleDefectSave(pt.id)}>✓</button>
                              <button
                                className={s.defectCancel}
                                onClick={() => setDefectInputs(prev => { const n = { ...prev }; delete n[pt.id]; return n; })}
                              >
                                <X size={10} />
                              </button>
                            </>
                          ) : (
                            <button
                              className={s.defectToggle}
                              onClick={() => setDefectInputs(prev => ({ ...prev, [pt.id]: pt.defects ?? '' }))}
                            >
                              {pt.defects ? 'Изменить дефект' : 'Дефект'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Block modal ── */}
      {blockModal && (
        <div className={s.modalOverlay} onClick={() => setBlockModal(null)}>
          <div className={s.blockModalBox} onClick={e => e.stopPropagation()}>
            <div className={s.blockModalTitle}>
              <Lock size={14} />
              Заблокировать: {blockModal.productName}
            </div>
            <input
              className={s.blockReasonInput}
              placeholder="Причина блокировки (нет ткани, клиент изменил заказ...)"
              value={blockModal.reason}
              onChange={e => setBlockModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleBlockConfirm()}
            />
            <div className={s.blockModalActions}>
              <button className={s.blockModalCancel} onClick={() => setBlockModal(null)}>
                Отмена
              </button>
              <button
                className={s.blockModalConfirm}
                disabled={!blockModal.reason.trim()}
                onClick={handleBlockConfirm}
              >
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
