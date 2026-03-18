/**
 * Chapan SPA — Order-to-production-to-fulfillment pipeline
 * for the Chapan sewing workshop.
 */
import { useEffect, useState } from 'react';
import {
  Factory, LayoutDashboard, ClipboardList, Settings,
  Search, Plus, Filter, RefreshCw,
} from 'lucide-react';
import { useChapanStore } from '../../../../chapan-spa/model/chapan.store';
import { useTileChapanUI } from '../../../../chapan-spa/model/tile-ui.store';
import type { ChapanSection } from '../../../../chapan-spa/model/tile-ui.store';
import type { OrderStatus, OrderPriority, PaymentStatus, OrderSortBy } from '../../../../chapan-spa/api/types';
import {
  ORDER_STATUS_LABEL, ORDER_STATUS_ORDER,
  PRIORITY_LABEL, PAYMENT_STATUS_LABEL,
} from '../../../../chapan-spa/api/types';
import { OverviewDashboard } from '../../../../chapan-spa/components/overview/OverviewDashboard';
import { OrderList } from '../../../../chapan-spa/components/orders/OrderList';
import { CreateOrderModal } from '../../../../chapan-spa/components/orders/CreateOrderModal';
import { OrderDrawer } from '../../../../chapan-spa/components/drawer/OrderDrawer';
import { ProductionQueue } from '../../../../chapan-spa/components/production/ProductionQueue';
import { WorkshopSettings } from '../../../../chapan-spa/components/settings/WorkshopSettings';
import s from './ChapanSPA.module.css';

interface Props {
  tileId: string;
}

const SECTIONS: { id: ChapanSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview',   label: 'Обзор',       icon: LayoutDashboard },
  { id: 'orders',     label: 'Заказы',       icon: ClipboardList },
  { id: 'production', label: 'Производство', icon: Factory },
  { id: 'settings',   label: 'Настройки',    icon: Settings },
];

export function ChapanSPA({ tileId }: Props) {
  const { loading, load, orders } = useChapanStore();
  const ui = useTileChapanUI(tileId);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { load(); }, []);

  // Quick stats for header and status bar
  const activeCount    = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed').length;
  const inSewing       = orders.flatMap(o =>
    o.status !== 'cancelled' && o.status !== 'completed' ? o.productionTasks : [],
  ).filter(pt => pt.status !== 'done' && pt.status !== 'pending').length;
  const blockedCount   = orders.flatMap(o => o.productionTasks).filter(t => t.isBlocked).length;
  const readyCount     = orders.filter(o => o.status === 'ready').length;

  if (loading) {
    return (
      <div className={s.loading}>
        <RefreshCw size={20} className={s.spin} />
        <span>Загрузка...</span>
      </div>
    );
  }

  return (
    <div className={s.root} data-tile-id={tileId}>
      {/* ── Header ── */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <Factory size={18} className={s.headerIcon} />
          <span className={s.headerTitle}>Чапан</span>
          {activeCount > 0 && (
            <span className={s.statPill}>{activeCount} заказов</span>
          )}
          {inSewing > 0 && (
            <span className={s.statPillProd}>{inSewing} в пошиве</span>
          )}
          {blockedCount > 0 && (
            <span className={s.statPillBlocked}>{blockedCount} заблок.</span>
          )}
        </div>
        <div className={s.headerActions}>
          <button
            className={s.iconBtn}
            onClick={() => setFiltersOpen(v => !v)}
            aria-label="Поиск / Фильтры"
          >
            <Filter size={15} />
          </button>
          <button className={s.primaryBtn} onClick={ui.openCreateModal}>
            <Plus size={14} />
            <span>Заказ</span>
          </button>
        </div>
      </div>

      {/* ── Filters bar (for orders section) ── */}
      {filtersOpen && ui.section === 'orders' && (
        <div className={s.filtersBar}>
          <div className={s.filterGroup}>
            <Search size={13} className={s.filterIcon} />
            <input
              className={s.filterInput}
              placeholder="Поиск..."
              value={ui.searchQuery}
              onChange={e => ui.setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className={s.filterSelect}
            value={ui.filterStatus}
            onChange={e => ui.setFilterStatus(e.target.value as OrderStatus | 'all')}
          >
            <option value="all">Все статусы</option>
            {ORDER_STATUS_ORDER.map(st => (
              <option key={st} value={st}>{ORDER_STATUS_LABEL[st]}</option>
            ))}
            <option value="cancelled">Отменённые</option>
          </select>
          <select
            className={s.filterSelect}
            value={ui.filterPriority}
            onChange={e => ui.setFilterPriority(e.target.value as OrderPriority | 'all')}
          >
            <option value="all">Все приоритеты</option>
            {(Object.keys(PRIORITY_LABEL) as OrderPriority[]).map(p => (
              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
            ))}
          </select>
          <select
            className={s.filterSelect}
            value={ui.filterPayment}
            onChange={e => ui.setFilterPayment(e.target.value as PaymentStatus | 'all')}
          >
            <option value="all">Все оплаты</option>
            {(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map(p => (
              <option key={p} value={p}>{PAYMENT_STATUS_LABEL[p]}</option>
            ))}
          </select>
          <select
            className={s.filterSelect}
            value={ui.sortBy}
            onChange={e => ui.setSortBy(e.target.value as OrderSortBy)}
          >
            <option value="createdAt">По дате создания</option>
            <option value="dueDate">По сроку</option>
            <option value="totalAmount">По сумме</option>
            <option value="updatedAt">По обновлению</option>
          </select>
        </div>
      )}

      {/* ── Navigation tabs ── */}
      <nav className={s.nav}>
        {SECTIONS.map(sec => (
          <button
            key={sec.id}
            className={`${s.navItem} ${ui.section === sec.id ? s.navItemActive : ''}`}
            onClick={() => ui.setSection(sec.id)}
          >
            <sec.icon size={14} />
            <span>{sec.label}</span>
            {sec.id === 'production' && blockedCount > 0 && (
              <span className={s.navAlert}>{blockedCount}</span>
            )}
            {sec.id === 'orders' && readyCount > 0 && (
              <span className={s.navBadgeGreen}>{readyCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <div className={s.content}>
        {ui.section === 'overview'    && <OverviewDashboard tileId={tileId} />}
        {ui.section === 'orders'      && <OrderList tileId={tileId} />}
        {ui.section === 'production'  && <ProductionQueue />}
        {ui.section === 'settings'    && <WorkshopSettings />}
      </div>

      {/* ── Status bar ── */}
      <div className={s.statusBar}>
        <span className={s.statusCount}>
          {activeCount} активных · {readyCount > 0 ? `${readyCount} готово к выдаче · ` : ''}{orders.flatMap(o => o.productionTasks).length} заданий
        </span>
        {blockedCount > 0 && (
          <>
            <span className={s.statusSep} />
            <span className={s.statusBlocked}>{blockedCount} заблокировано</span>
          </>
        )}
      </div>

      {/* ── Overlays ── */}
      <OrderDrawer tileId={tileId} />
      <CreateOrderModal tileId={tileId} />
    </div>
  );
}
