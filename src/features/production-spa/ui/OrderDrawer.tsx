/**
 * features/production-spa/ui/OrderDrawer.tsx
 *
 * Full-screen order detail drawer.
 * Shows: order info, BOM inline preview, shortage panel, tasks, actions.
 */

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Package,
  User,
  X,
} from 'lucide-react';
import type {
  ProductionOrder,
  ProductionTask,
  UITone,
  WorkshopWorker,
  TaskStatus,
} from '../api/types';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
} from '../api/types';
import { ShortagePanel } from './ShortagePanel';
import s from './OrderDrawer.module.css';

const TONE_CLASS: Record<UITone, string> = {
  muted: s.toneMuted,
  info: s.toneInfo,
  warning: s.toneWarning,
  danger: s.toneDanger,
  success: s.toneSuccess,
  accent: s.toneAccent,
};

interface Props {
  order: ProductionOrder;
  workers: WorkshopWorker[];
  onClose: () => void;
  onMoveTaskStatus: (taskId: string, status: TaskStatus) => void;
  onAssignWorker: (taskId: string, worker: string) => void;
  onFlagTask: (taskId: string, reason: string) => void;
  onUnflagTask: (taskId: string) => void;
  onMoveOrderStatus: (status: Parameters<ProductionOrder['status'] extends infer S ? (s: S) => void : never>[0]) => void;
  onCheckShortage: () => void;
  isCheckingShortage?: boolean;
}

function TaskRow({
  task,
  workers,
  onMoveStatus,
  onAssign,
  onFlag,
  onUnflag,
}: {
  task: ProductionTask;
  workers: WorkshopWorker[];
  onMoveStatus: (status: TaskStatus) => void;
  onAssign: (worker: string) => void;
  onFlag: (reason: string) => void;
  onUnflag: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const statusTone = TASK_STATUS_TONE[task.status];

  return (
    <div className={s.taskRow} data-blocked={task.isBlocked}>
      <div className={s.taskHeader} onClick={() => setExpanded((p) => !p)}>
        <span className={s.taskIndex}>{task.stageIndex + 1}</span>
        <span className={s.taskName}>{task.stageName}</span>
        <span className={`${s.taskStatus} ${TONE_CLASS[statusTone]}`}>
          {TASK_STATUS_LABEL[task.status]}
        </span>
        {task.assignedTo && (
          <span className={s.taskAssignee}>
            <User size={11} />
            {task.assignedTo}
          </span>
        )}
        {expanded ? <ChevronUp size={14} className={s.chevron} /> : <ChevronDown size={14} className={s.chevron} />}
      </div>

      {expanded && (
        <div className={s.taskBody}>
          {task.isBlocked && task.blockReason && (
            <div className={s.blockNote}>
              <AlertTriangle size={12} />
              <span>{task.blockReason}</span>
            </div>
          )}

          <div className={s.taskActions}>
            {/* Status buttons */}
            {task.status === 'pending' && !task.isBlocked && (
              <button className={s.actionBtn} data-tone="info" onClick={() => onMoveStatus('in_progress')}>
                Начать
              </button>
            )}
            {task.status === 'in_progress' && (
              <button className={s.actionBtn} data-tone="success" onClick={() => onMoveStatus('done')}>
                <CheckCircle size={13} /> Завершить
              </button>
            )}

            {/* Assign worker */}
            {workers.length > 0 && task.status !== 'done' && (
              <select
                className={s.workerSelect}
                value={task.assignedTo ?? ''}
                onChange={(e) => e.target.value && onAssign(e.target.value)}
              >
                <option value="">Назначить исполнителя</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            )}

            {/* Block / unblock */}
            {!task.isBlocked && task.status !== 'done' && (
              <div className={s.blockGroup}>
                <input
                  className={s.blockInput}
                  placeholder="Причина блокировки..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && blockReason && onFlag(blockReason)}
                />
                <button
                  className={s.actionBtn}
                  data-tone="danger"
                  disabled={!blockReason}
                  onClick={() => { onFlag(blockReason); setBlockReason(''); }}
                >
                  <AlertTriangle size={12} /> Заблокировать
                </button>
              </div>
            )}
            {task.isBlocked && (
              <button className={s.actionBtn} data-tone="warning" onClick={onUnflag}>
                Снять блокировку
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function OrderDrawer({
  order,
  workers,
  onClose,
  onMoveTaskStatus,
  onAssignWorker,
  onFlagTask,
  onUnflagTask,
  onCheckShortage,
  isCheckingShortage,
}: Props) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'info'>('tasks');
  const statusTone = ORDER_STATUS_TONE[order.status];

  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
  const tasksDone = order.tasks.filter((t) => t.status === 'done').length;

  return (
    <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={s.drawer}>
        {/* Header */}
        <div className={s.drawerHeader}>
          <button className={s.closeBtn} onClick={onClose}>
            <ArrowLeft size={16} />
          </button>
          <div className={s.headerMain}>
            <span className={s.orderNum}>{order.orderNumber}</span>
            <span className={`${s.statusBadge} ${TONE_CLASS[statusTone]}`}>
              {ORDER_STATUS_LABEL[order.status]}
            </span>
          </div>
          <button className={s.closeBtnX} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Client & meta */}
        <div className={s.clientBlock}>
          <div className={s.clientName}>{order.clientName}</div>
          <div className={s.clientPhone}>{order.clientPhone}</div>
          <div className={s.metaRow}>
            {order.dueDate && (
              <span className={s.metaChip}>
                <Clock size={12} />
                {new Date(order.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </span>
            )}
            <span className={s.metaChip}>
              <Package size={12} />
              {totalItems} {totalItems === 1 ? 'изделие' : 'изделий'}
            </span>
            <span className={s.metaChip}>
              <CreditCard size={12} />
              {PAYMENT_STATUS_LABEL[order.paymentStatus]}
            </span>
            <span className={s.metaAmount}>
              {order.paidAmount.toLocaleString('ru-KZ')} / {order.totalAmount.toLocaleString('ru-KZ')} ₸
            </span>
          </div>
        </div>

        {/* Shortage panel */}
        <div className={s.shortageWrap}>
          <ShortagePanel
            shortage={order.shortage}
            isChecking={isCheckingShortage}
            onRefresh={onCheckShortage}
          />
          {!order.shortage && !isCheckingShortage && (
            <button className={s.checkBtn} onClick={onCheckShortage}>
              <Package size={13} />
              Проверить наличие материалов
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className={s.tabs}>
          <button className={s.tab} data-active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}>
            Этапы ({tasksDone}/{order.tasks.length})
          </button>
          <button className={s.tab} data-active={activeTab === 'info'} onClick={() => setActiveTab('info')}>
            Состав заказа
          </button>
        </div>

        {/* Tab content */}
        <div className={s.tabContent}>
          {activeTab === 'tasks' && (
            <div className={s.taskList}>
              {order.tasks.length === 0 && (
                <div className={s.emptyTasks}>Этапы производства не назначены</div>
              )}
              {order.tasks
                .sort((a, b) => a.stageIndex - b.stageIndex)
                .map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    workers={workers}
                    onMoveStatus={(status) => onMoveTaskStatus(task.id, status)}
                    onAssign={(worker) => onAssignWorker(task.id, worker)}
                    onFlag={(reason) => onFlagTask(task.id, reason)}
                    onUnflag={() => onUnflagTask(task.id)}
                  />
                ))}
            </div>
          )}

          {activeTab === 'info' && (
            <div className={s.itemList}>
              {order.items.map((item) => (
                <div key={item.id} className={s.itemRow}>
                  <div className={s.itemName}>{item.productName}</div>
                  <div className={s.itemMeta}>
                    <span>{item.quantity} шт.</span>
                    <span className={s.itemPrice}>{item.unitPrice.toLocaleString('ru-KZ')} ₸</span>
                  </div>
                  {item.notes && <div className={s.itemNotes}>{item.notes}</div>}
                </div>
              ))}
              <div className={s.itemTotal}>
                <span>Итого</span>
                <span>{order.totalAmount.toLocaleString('ru-KZ')} ₸</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
