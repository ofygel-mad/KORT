import { useMemo } from 'react';
import { AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { useChapanStore } from '../../model/chapan.store';
import { useTileChapanUI } from '../../model/tile-ui.store';
import s from './OverviewDashboard.module.css';

interface Props {
  tileId: string;
}

const PIPE_STAGES = [
  { status: 'cutting',       label: 'Раскрой',  color: '#f59e0b' },
  { status: 'sewing',        label: 'Пошив',    color: '#3b82f6' },
  { status: 'finishing',     label: 'Отделка',  color: '#8b5cf6' },
  { status: 'quality_check', label: 'Проверка', color: '#ec4899' },
] as const;

function dueDateLabel(dueDate: string): { label: string; urgency: 'overdue' | 'today' | 'tomorrow' | null } {
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0)  return { label: `${Math.abs(days)}д. просрочен`, urgency: 'overdue' };
  if (days === 0) return { label: 'Срок сегодня', urgency: 'today' };
  if (days === 1) return { label: 'Срок завтра', urgency: 'tomorrow' };
  return { label: `${days}д.`, urgency: null };
}

export function OverviewDashboard({ tileId }: Props) {
  const { orders, confirmOrder } = useChapanStore();
  const { openDrawer, setSection } = useTileChapanUI(tileId);

  const data = useMemo(() => {
    const now = new Date();
    const active = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed');

    const newOrders          = active.filter(o => o.status === 'new');
    const readyOrders        = active.filter(o => o.status === 'ready');
    const awaitingTransfer   = readyOrders.filter(o => !o.transfer);
    const overdueOrders      = active.filter(o => o.dueDate && new Date(o.dueDate) < now);
    const dueTodayOrders     = active.filter(o => {
      if (!o.dueDate) return false;
      const days = Math.ceil((new Date(o.dueDate).getTime() - now.getTime()) / 86_400_000);
      return days === 0 && o.status !== 'ready';
    });
    const unpaidOrders       = active.filter(
      o => o.paymentStatus === 'not_paid' && o.status !== 'new',
    );

    const allTasks = orders.flatMap(o =>
      o.status !== 'cancelled' && o.status !== 'completed' ? o.productionTasks : [],
    );
    const blockedTasks = allTasks.filter(t => t.isBlocked);
    const taskCounts: Record<string, number> = {};
    for (const st of PIPE_STAGES) {
      taskCounts[st.status] = allTasks.filter(t => t.status === st.status && !t.isBlocked).length;
    }

    const totalRevenue   = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingPayment = active.reduce((sum, o) => sum + (o.totalAmount - o.paidAmount), 0);

    return {
      activeCount:  active.length,
      inProdCount:  orders.filter(o => o.status === 'in_production').length,
      readyCount:   readyOrders.length,
      overdueCount: overdueOrders.length,
      newOrders, readyOrders, awaitingTransfer, overdueOrders, dueTodayOrders,
      unpaidOrders, blockedTasks, taskCounts, totalRevenue, pendingPayment,
    };
  }, [orders]);

  const hasAttention =
    data.newOrders.length > 0 ||
    data.awaitingTransfer.length > 0 ||
    data.overdueOrders.length > 0 ||
    data.dueTodayOrders.length > 0;

  return (
    <div className={s.dashboard}>

      {/* ── Stats strip ── */}
      <div className={s.statsStrip}>
        <div className={s.statChip}>
          <span className={s.statVal}>{data.activeCount}</span>
          <span className={s.statLbl}>активных</span>
        </div>
        <div className={s.sep} />
        <div className={s.statChip}>
          <span className={s.statVal}>{data.inProdCount}</span>
          <span className={s.statLbl}>в пошиве</span>
        </div>
        <div className={s.sep} />
        <div className={`${s.statChip} ${data.readyCount > 0 ? s.green : ''}`}>
          <span className={s.statVal}>{data.readyCount}</span>
          <span className={s.statLbl}>готово</span>
        </div>
        <div className={s.sep} />
        <div className={`${s.statChip} ${data.overdueCount > 0 ? s.red : ''}`}>
          <span className={s.statVal}>{data.overdueCount}</span>
          <span className={s.statLbl}>просрочено</span>
        </div>
        <div className={s.stretchSep} />
        <div className={s.finItem}>
          <span className={s.finLbl}>Ждёт оплаты</span>
          <span className={s.finVal}>{(data.pendingPayment / 1000).toFixed(0)}K ₸</span>
        </div>
        <div className={s.sep} />
        <div className={s.finItem}>
          <span className={s.finLbl}>Выручка</span>
          <span className={s.finVal}>{(data.totalRevenue / 1000).toFixed(0)}K ₸</span>
        </div>
      </div>

      {/* ── Blocked tasks alert ── */}
      {data.blockedTasks.length > 0 && (
        <div className={s.blockedAlert}>
          <AlertTriangle size={13} className={s.blockedAlertIcon} />
          <span>
            <strong>{data.blockedTasks.length} заблокировано</strong>
            {' '}в производстве — требуется вмешательство
          </span>
          <button className={s.blockedAlertLink} onClick={() => setSection('production')}>
            Открыть →
          </button>
        </div>
      )}

      {/* ── Requires action ── */}
      {hasAttention && (
        <div className={s.attentionZone}>
          <div className={s.zoneHeader}>
            <AlertCircle size={13} />
            <span>Требует действия</span>
          </div>

          {/* Due today */}
          {data.dueTodayOrders.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={s.groupLabel} style={{ color: 'rgba(239,68,68,.85)' }}>
                  Срок истекает сегодня
                </span>
                <span className={s.groupCount}>{data.dueTodayOrders.length}</span>
              </div>
              {data.dueTodayOrders.map(o => (
                <button key={o.id} className={`${s.overdueRow} ${s.todayRow}`} onClick={() => openDrawer(o.id)}>
                  <span className={s.rowNum}>{o.orderNumber}</span>
                  <span className={s.rowName}>{o.clientName}</span>
                  <span className={s.todayDays}>сегодня</span>
                </button>
              ))}
            </div>
          )}

          {/* New orders awaiting confirmation */}
          {data.newOrders.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={s.groupLabel}>Ожидают подтверждения</span>
                <span className={s.groupCount}>{data.newOrders.length}</span>
              </div>
              {data.newOrders.slice(0, 3).map(o => {
                const due = o.dueDate ? dueDateLabel(o.dueDate) : null;
                return (
                  <div key={o.id} className={s.actionRow}>
                    <button className={s.rowMain} onClick={() => openDrawer(o.id)}>
                      <span className={s.rowNum}>{o.orderNumber}</span>
                      <span className={s.rowName}>{o.clientName}</span>
                      {due && (
                        <span className={`${s.rowDue} ${due.urgency ? s[`due_${due.urgency}`] : ''}`}>
                          <Clock size={9} />
                          {due.label}
                        </span>
                      )}
                      <span className={s.rowAmt}>{(o.totalAmount / 1000).toFixed(0)}K ₸</span>
                    </button>
                    <button className={s.qBtn} onClick={() => confirmOrder(o.id)}>
                      Подтвердить
                    </button>
                  </div>
                );
              })}
              {data.newOrders.length > 3 && (
                <button className={s.moreBtn} onClick={() => setSection('orders')}>
                  Ещё {data.newOrders.length - 3} →
                </button>
              )}
            </div>
          )}

          {/* Ready for pickup — awaiting transfer initiation */}
          {data.awaitingTransfer.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={s.groupLabel} style={{ color: 'rgba(34,197,94,.8)' }}>
                  Готовы к выдаче
                </span>
                <span className={s.groupCount}>{data.awaitingTransfer.length}</span>
              </div>
              {data.awaitingTransfer.slice(0, 3).map(o => (
                <div key={o.id} className={s.actionRow}>
                  <button className={s.rowMain} onClick={() => openDrawer(o.id)}>
                    <span className={s.rowNum}>{o.orderNumber}</span>
                    <span className={s.rowName}>{o.clientName}</span>
                    <span className={s.rowPhone}>{o.clientPhone}</span>
                  </button>
                  <button
                    className={`${s.qBtn} ${s.qBtnGreen}`}
                    onClick={() => openDrawer(o.id)}
                  >
                    Передать →
                  </button>
                </div>
              ))}
              {data.awaitingTransfer.length > 3 && (
                <button className={s.moreBtn} onClick={() => setSection('orders')}>
                  Ещё {data.awaitingTransfer.length - 3} →
                </button>
              )}
            </div>
          )}

          {/* Overdue */}
          {data.overdueOrders.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={s.groupLabel} style={{ color: 'rgba(239,68,68,.8)' }}>
                  Просрочено
                </span>
                <span className={s.groupCount}>{data.overdueOrders.length}</span>
              </div>
              {data.overdueOrders.slice(0, 3).map(o => {
                const days = Math.ceil(
                  (Date.now() - new Date(o.dueDate!).getTime()) / 86_400_000,
                );
                return (
                  <button key={o.id} className={s.overdueRow} onClick={() => openDrawer(o.id)}>
                    <span className={s.rowNum}>{o.orderNumber}</span>
                    <span className={s.rowName}>{o.clientName}</span>
                    <span className={s.overdueDays}>{days}д. просрочен</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Production pipeline ── */}
      <div className={s.pipelineSection}>
        <div className={s.pipelineHead}>
          <span className={s.pipelineTitle}>Производство</span>
          {data.blockedTasks.length > 0 && (
            <span className={s.pipelineBlocked}>
              <AlertTriangle size={10} />
              {data.blockedTasks.length} блок
            </span>
          )}
          <button className={s.pipelineLink} onClick={() => setSection('production')}>
            Открыть →
          </button>
        </div>
        <div className={s.pipeline}>
          {PIPE_STAGES.map(({ status, label, color }) => (
            <button
              key={status}
              className={s.pipelineStage}
              onClick={() => setSection('production')}
            >
              <div className={s.stageDot} style={{ background: color }} />
              <div className={s.stageCount} style={{ color }}>
                {data.taskCounts[status] ?? 0}
              </div>
              <div className={s.stageLabel}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Unpaid orders ── */}
      {data.unpaidOrders.length > 0 && (
        <div className={s.unpaidSection}>
          <div className={s.groupHead}>
            <span className={s.groupLabel}>Не оплачено</span>
            <span className={s.groupCount}>{data.unpaidOrders.length}</span>
          </div>
          {data.unpaidOrders.slice(0, 5).map(o => (
            <button key={o.id} className={s.unpaidRow} onClick={() => openDrawer(o.id)}>
              <span className={s.rowNum}>{o.orderNumber}</span>
              <span className={s.rowName}>{o.clientName}</span>
              <span className={s.unpaidDebt}>
                {(o.totalAmount - o.paidAmount).toLocaleString('ru-RU')} ₸
              </span>
            </button>
          ))}
          {data.unpaidOrders.length > 5 && (
            <button className={s.moreBtn} onClick={() => setSection('orders')}>
              Ещё {data.unpaidOrders.length - 5} →
            </button>
          )}
        </div>
      )}

    </div>
  );
}
