/**
 * features/production-spa/WorkshopSPA.tsx
 *
 * Main SPA for any workshop — new OR Chapan (via adapter).
 * Three tabs: Доска / Timeline / Ресурсы.
 * Receives a ProductionAdapter — doesn't care where data comes from.
 */

import { useEffect, useState } from 'react';
import { ArrowLeft, BarChart2, Layers, RefreshCw, Users } from 'lucide-react';
import type { ProductionAdapter } from './adapter/types';
import type { ProductionOrder, OrderStatus, TaskStatus } from './api/types';
import { KanbanBoard } from './ui/KanbanBoard';
import { OrderDrawer } from './ui/OrderDrawer';
import { TimelineView } from './ui/TimelineView';
import { ResourceView } from './ui/ResourceView';
import { StatBar } from './ui/StatBar';
import s from './WorkshopSPA.module.css';

type Tab = 'board' | 'timeline' | 'resources';

interface Props {
  adapter: ProductionAdapter;
  onBack: () => void;
}

export function WorkshopSPA({ adapter, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('board');
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [isCheckingShortage, setIsCheckingShortage] = useState(false);

  useEffect(() => {
    void adapter.load();
  }, [adapter]);

  // ── Actions ──────────────────────────────────────────────

  async function handleMoveOrder(orderId: string, status: OrderStatus) {
    await adapter.moveOrderStatus(orderId, status);
    // Update selected order if it's the one being moved
    if (selectedOrder?.id === orderId) {
      const updated = adapter.orders.find((o) => o.id === orderId);
      if (updated) setSelectedOrder({ ...updated, status });
    }
  }

  async function handleMoveTask(taskId: string, status: TaskStatus) {
    await adapter.moveTaskStatus(taskId, status);
    refreshSelected();
  }

  async function handleAssignWorker(taskId: string, worker: string) {
    await adapter.assignWorker(taskId, worker);
    refreshSelected();
  }

  async function handleFlagTask(taskId: string, reason: string) {
    await adapter.flagTask(taskId, reason);
    refreshSelected();
  }

  async function handleUnflagTask(taskId: string) {
    await adapter.unflagTask(taskId);
    refreshSelected();
  }

  async function handleCheckShortage() {
    if (!selectedOrder) return;
    setIsCheckingShortage(true);
    try {
      await adapter.checkShortage(selectedOrder.id);
      refreshSelected();
    } finally {
      setIsCheckingShortage(false);
    }
  }

  function refreshSelected() {
    if (!selectedOrder) return;
    const updated = adapter.orders.find((o) => o.id === selectedOrder.id);
    if (updated) setSelectedOrder(updated);
  }

  // ── Loading state ─────────────────────────────────────────

  if (adapter.loading && adapter.orders.length === 0) {
    return (
      <div className={s.loading}>
        <RefreshCw size={18} className={s.spin} />
        <span>Загружаю производство...</span>
      </div>
    );
  }

  return (
    <div className={s.root}>
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className={s.topBar}>
        <div className={s.topLeft}>
          <button className={s.backBtn} onClick={onBack}>
            <ArrowLeft size={15} />
          </button>
          <div className={s.titleBlock}>
            <h1 className={s.title}>{adapter.profile.name}</h1>
            {adapter.profile.descriptor && (
              <span className={s.descriptor}>{adapter.profile.descriptor}</span>
            )}
          </div>
        </div>

        <StatBar orders={adapter.orders} />
      </div>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div className={s.tabBar}>
        <button className={s.tabBtn} data-active={tab === 'board'} onClick={() => setTab('board')}>
          <Layers size={14} />
          Доска
        </button>
        <button className={s.tabBtn} data-active={tab === 'timeline'} onClick={() => setTab('timeline')}>
          <BarChart2 size={14} />
          График
        </button>
        <button className={s.tabBtn} data-active={tab === 'resources'} onClick={() => setTab('resources')}>
          <Users size={14} />
          Ресурсы
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className={s.content}>
        {tab === 'board' && (
          <KanbanBoard
            orders={adapter.orders}
            onOrderClick={setSelectedOrder}
            onMoveOrder={handleMoveOrder}
          />
        )}
        {tab === 'timeline' && (
          <TimelineView orders={adapter.orders} />
        )}
        {tab === 'resources' && (
          <ResourceView
            workers={adapter.workers}
            equipment={adapter.equipment}
            orders={adapter.orders}
          />
        )}
      </div>

      {/* ── Order drawer ─────────────────────────────────────── */}
      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          workers={adapter.workers}
          onClose={() => setSelectedOrder(null)}
          onMoveTaskStatus={handleMoveTask}
          onAssignWorker={handleAssignWorker}
          onFlagTask={handleFlagTask}
          onUnflagTask={handleUnflagTask}
          onMoveOrderStatus={(status) => handleMoveOrder(selectedOrder.id, status as OrderStatus)}
          onCheckShortage={handleCheckShortage}
          isCheckingShortage={isCheckingShortage}
        />
      )}
    </div>
  );
}
