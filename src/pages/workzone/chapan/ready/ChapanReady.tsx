import { useDeferredValue, useEffect, useRef, useState, type CSSProperties, type ElementType } from 'react';
import { Check, CheckCheck, CheckCircle2, LayoutGrid, Layers, List, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChangeOrderStatus, useCloseOrder, useOrders } from '../../../../entities/order/queries';
import type { ChapanOrder, OrderStatus, Priority } from '../../../../entities/order/types';
import { useAuthStore } from '@/shared/stores/auth';
import styles from './ChapanReady.module.css';

type ReadyStatus = Extract<OrderStatus, 'ready' | 'transferred' | 'completed'>;
type ViewMode = 'grid' | 'list';
type ReadyOrder = ChapanOrder & { status: ReadyStatus };
type DisplayGroup =
  | { kind: 'single'; order: ReadyOrder }
  | { kind: 'batch'; orders: ReadyOrder[] };

const STATUS_LABEL: Record<ReadyStatus, string> = {
  ready: 'Готово',
  transferred: 'Передан',
  completed: 'Завершен',
};

const STATUS_COLOR: Record<ReadyStatus, string> = {
  ready: '#4FC999',
  transferred: '#9B87F5',
  completed: '#C9A84C',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  normal: '',
  urgent: 'Срочно',
  vip: 'VIP',
};

const VIEW_OPTIONS: { key: ViewMode; label: string; icon: ElementType }[] = [
  { key: 'grid', label: 'Плитки', icon: LayoutGrid },
  { key: 'list', label: 'Список', icon: List },
];

const BATCH_WINDOW_DAYS = 2;

function viewStorageKey(userId?: string) {
  return `chapan_ready_view_${userId ?? 'guest'}`;
}

function groupStorageKey(userId?: string) {
  return `chapan_ready_grouped_${userId ?? 'guest'}`;
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(value)} ₸`;
}

function formatDate(value: string | null) {
  if (!value) return 'Без даты';
  return new Date(value).toLocaleDateString('ru-KZ', { day: '2-digit', month: 'short' });
}

function isOverdue(date: string | null) {
  return !!date && new Date(date) < new Date();
}

function groupSignature(order: ChapanOrder) {
  const firstItem = order.items?.[0];
  return [
    firstItem?.productName?.toLowerCase().trim() ?? '',
    firstItem?.fabric?.toLowerCase().trim() ?? '',
    firstItem?.size?.toLowerCase().trim() ?? '',
    order.status,
    order.priority,
  ].join('|');
}

function buildGroups(orders: ReadyOrder[]): DisplayGroup[] {
  const buckets = new Map<string, ReadyOrder[]>();

  for (const order of orders) {
    const key = groupSignature(order);
    buckets.set(key, [...(buckets.get(key) ?? []), order]);
  }

  const result: DisplayGroup[] = [];

  for (const [, bucket] of buckets) {
    if (bucket.length === 1) {
      result.push({ kind: 'single', order: bucket[0] });
      continue;
    }

    const withDate = bucket
      .filter((order) => order.dueDate)
      .sort((a, b) => +new Date(a.dueDate!) - +new Date(b.dueDate!));
    const withoutDate = bucket.filter((order) => !order.dueDate);
    const clusters: ReadyOrder[][] = [];
    let current: ReadyOrder[] = [];

    for (const order of withDate) {
      if (!current.length) {
        current.push(order);
        continue;
      }

      const diffDays = (+new Date(order.dueDate!) - +new Date(current[0].dueDate!)) / 86_400_000;
      if (diffDays <= BATCH_WINDOW_DAYS) current.push(order);
      else {
        clusters.push(current);
        current = [order];
      }
    }

    if (current.length) clusters.push(current);
    if (withoutDate.length) clusters.push(withoutDate);

    for (const cluster of clusters) {
      if (cluster.length === 1) result.push({ kind: 'single', order: cluster[0] });
      else result.push({ kind: 'batch', orders: cluster });
    }
  }

  return result;
}

function getStageActionLabel(status: ReadyStatus) {
  if (status === 'ready') return 'Передать';
  if (status === 'transferred') return 'Завершить';
  return null;
}

function getNextStage(status: ReadyStatus): ReadyStatus | null {
  if (status === 'ready') return 'transferred';
  if (status === 'transferred') return 'completed';
  return null;
}

export default function ChapanReadyPage() {
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadyStatus | ''>('');
  const [viewMode, setViewModeState] = useState<ViewMode>('grid');
  const [grouped, setGroupedState] = useState(true);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const viewPickerRef = useRef<HTMLDivElement>(null);

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const savedView = localStorage.getItem(viewStorageKey(userId));
    if (savedView === 'grid' || savedView === 'list') {
      setViewModeState(savedView);
    }

    const savedGroup = localStorage.getItem(groupStorageKey(userId));
    if (savedGroup !== null) {
      setGroupedState(savedGroup !== 'false');
    }
  }, [userId]);

  useEffect(() => {
    if (!showViewMenu) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!viewPickerRef.current?.contains(event.target as Node)) {
        setShowViewMenu(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showViewMenu]);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    setShowViewMenu(false);
    localStorage.setItem(viewStorageKey(userId), mode);
  };

  const toggleGrouped = () => {
    setGroupedState((value) => {
      localStorage.setItem(groupStorageKey(userId), String(!value));
      return !value;
    });
  };

  const requestedStatuses = statusFilter ? statusFilter : 'ready,transferred,completed';
  const { data, isLoading, isError } = useOrders({
    archived: false,
    statuses: requestedStatuses,
    search: deferredSearch || undefined,
    limit: 200,
  });

  const changeStatus = useChangeOrderStatus();
  const closeOrder = useCloseOrder();

  const orders = (data?.results ?? []).filter((order): order is ReadyOrder => (
    order.status === 'ready' || order.status === 'transferred' || order.status === 'completed'
  ));

  const displayGroups = grouped
    ? buildGroups(orders)
    : orders.map((order) => ({ kind: 'single' as const, order }));

  async function handleAdvance(order: ReadyOrder) {
    const nextStatus = getNextStage(order.status);
    if (!nextStatus) return;
    await changeStatus.mutateAsync({ id: order.id, status: nextStatus });
  }

  async function handleClose(orderId: string) {
    await closeOrder.mutateAsync(orderId);
  }

  async function handleAdvanceMany(batchOrders: ReadyOrder[]) {
    for (const order of batchOrders) {
      const nextStatus = getNextStage(order.status);
      if (nextStatus) {
        await changeStatus.mutateAsync({ id: order.id, status: nextStatus });
      }
    }
  }

  async function handleCloseMany(batchOrders: ReadyOrder[]) {
    for (const order of batchOrders) {
      await closeOrder.mutateAsync(order.id);
    }
  }

  const currentView = VIEW_OPTIONS.find((option) => option.key === viewMode)!;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <CheckCheck size={18} />
          <span>Готовые заказы</span>
        </div>
        <div className={styles.headerSub}>Передача клиенту и закрытие сделок</div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Номер, клиент, изделие..."
          />
        </div>

        <div className={styles.toolbarRight}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ReadyStatus | '')}
          >
            <option value="">Все стадии</option>
            <option value="ready">Только готово</option>
            <option value="transferred">Только передано</option>
            <option value="completed">Только завершено</option>
          </select>

          <div className={styles.viewPickerWrap} ref={viewPickerRef}>
            <button
              className={`${styles.viewBtn} ${showViewMenu ? styles.viewBtnOpen : ''}`}
              onClick={() => setShowViewMenu((value) => !value)}
            >
              <currentView.icon size={13} />
              <span>Вид</span>
            </button>

            {showViewMenu && (
              <div className={styles.viewMenu}>
                <div className={styles.viewMenuTitle}>Отображение</div>
                {VIEW_OPTIONS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={`${styles.viewMenuItem} ${viewMode === key ? styles.viewMenuItemActive : ''}`}
                    onClick={() => setViewMode(key)}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                    {viewMode === key && <Check size={11} className={styles.viewMenuCheck} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className={`${styles.groupToggle} ${grouped ? styles.groupToggleActive : ''}`}
            onClick={toggleGrouped}
          >
            <Layers size={13} />
            <span>Группировать</span>
          </button>
        </div>
      </div>

      {!isLoading && (
        <div className={styles.count}>
          {data?.count ?? 0} заказов в работе после пошива
        </div>
      )}

      {isLoading && (
        <div className={styles.loadingGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={styles.skeleton} />
          ))}
        </div>
      )}

      {isError && <div className={styles.error}>Не удалось загрузить раздел «Готово»</div>}

      {!isLoading && !isError && orders.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Пока пусто</div>
          <div className={styles.emptyText}>
            Как только швея завершит карточку, заказ появится здесь.
          </div>
        </div>
      )}

      {!isLoading && !isError && orders.length > 0 && (
        viewMode === 'grid' ? (
          <div className={styles.grid}>
            {displayGroups.map((group, index) => (
              group.kind === 'single' ? (
                <ReadyCard
                  key={group.order.id}
                  order={group.order}
                  onOpen={() => navigate(`/workzone/chapan/orders/${group.order.id}`)}
                  onAdvance={() => handleAdvance(group.order)}
                  onClose={() => handleClose(group.order.id)}
                />
              ) : (
                <ReadyBatchCard
                  key={`batch-${index}`}
                  orders={group.orders}
                  onOpen={(id) => navigate(`/workzone/chapan/orders/${id}`)}
                  onAdvance={() => handleAdvanceMany(group.orders)}
                  onClose={() => handleCloseMany(group.orders)}
                />
              )
            ))}
          </div>
        ) : (
          <div className={styles.list}>
            {displayGroups.map((group, index) => (
              group.kind === 'single' ? (
                <ReadyRow
                  key={group.order.id}
                  order={group.order}
                  onOpen={() => navigate(`/workzone/chapan/orders/${group.order.id}`)}
                  onAdvance={() => handleAdvance(group.order)}
                  onClose={() => handleClose(group.order.id)}
                />
              ) : (
                <ReadyBatchRow
                  key={`batch-row-${index}`}
                  orders={group.orders}
                  onOpen={(id) => navigate(`/workzone/chapan/orders/${id}`)}
                  onAdvance={() => handleAdvanceMany(group.orders)}
                  onClose={() => handleCloseMany(group.orders)}
                />
              )
            ))}
          </div>
        )
      )}
    </div>
  );
}

function ReadyCard({
  order,
  onOpen,
  onAdvance,
  onClose,
}: {
  order: ReadyOrder;
  onOpen: () => void;
  onAdvance: () => void;
  onClose: () => void;
}) {
  const firstItem = order.items?.[0];
  const moreItems = (order.items?.length ?? 0) - 1;
  const nextStageLabel = getStageActionLabel(order.status);

  return (
    <div
      className={styles.card}
      style={{ '--status-color': STATUS_COLOR[order.status] } as CSSProperties}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className={styles.cardHead}>
        <span className={styles.orderNumber}>#{order.orderNumber}</span>
        <span className={styles.statusBadge}>{STATUS_LABEL[order.status]}</span>
        {order.priority !== 'normal' && (
          <span className={styles.priorityBadge}>{PRIORITY_LABEL[order.priority]}</span>
        )}
      </div>

      <div className={styles.clientName}>{order.clientName}</div>
      <div className={styles.phone}>{order.clientPhone}</div>

      {firstItem && (
        <div className={styles.itemBlock}>
          <span className={styles.itemName}>{firstItem.productName}</span>
          <span className={styles.itemMeta}>
            {[firstItem.fabric, firstItem.size].filter(Boolean).join(' · ')}
            {firstItem.quantity > 1 && ` × ${firstItem.quantity}`}
          </span>
          {moreItems > 0 && <span className={styles.itemMore}>+ еще {moreItems}</span>}
        </div>
      )}

      <div className={styles.cardFoot}>
        <span className={styles.amount}>{formatMoney(order.totalAmount)}</span>
        <span className={styles.deadline} style={{ color: isOverdue(order.dueDate) ? '#D94F4F' : undefined }}>
          {formatDate(order.dueDate)}
        </span>
      </div>

      <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
        {nextStageLabel && (
          <button className={styles.secondaryAction} onClick={onAdvance}>
            {nextStageLabel}
          </button>
        )}
        <button className={styles.primaryAction} onClick={onClose}>
          <CheckCircle2 size={13} />
          Закрыть сделку
        </button>
      </div>
    </div>
  );
}

function ReadyBatchCard({
  orders,
  onOpen,
  onAdvance,
  onClose,
}: {
  orders: ReadyOrder[];
  onOpen: (id: string) => void;
  onAdvance: () => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const firstOrder = orders[0];
  const firstItem = firstOrder.items?.[0];
  const totalQuantity = orders.reduce((sum, order) => sum + (order.items?.[0]?.quantity ?? 1), 0);
  const nextStageLabel = getStageActionLabel(firstOrder.status);

  return (
    <div
      className={styles.batchCard}
      style={{ '--status-color': STATUS_COLOR[firstOrder.status] } as CSSProperties}
    >
      <button className={styles.batchSummary} onClick={() => setExpanded((value) => !value)}>
        <div className={styles.batchHead}>
          <span className={styles.batchCount}>{orders.length}</span>
          <span className={styles.statusBadge}>{STATUS_LABEL[firstOrder.status]}</span>
        </div>

        {firstItem && (
          <div className={styles.batchProduct}>
            <span className={styles.itemName}>{firstItem.productName}</span>
            <span className={styles.itemMeta}>{[firstItem.fabric, firstItem.size].filter(Boolean).join(' · ')}</span>
          </div>
        )}

        <div className={styles.batchMeta}>
          <span>{totalQuantity} шт.</span>
          <span>{formatDate(firstOrder.dueDate)}</span>
        </div>
      </button>

      <div className={styles.actions}>
        {nextStageLabel && (
          <button className={styles.secondaryAction} onClick={onAdvance}>
            {nextStageLabel} ×{orders.length}
          </button>
        )}
        <button className={styles.primaryAction} onClick={onClose}>
          <CheckCircle2 size={13} />
          Закрыть ×{orders.length}
        </button>
      </div>

      {expanded && (
        <div className={styles.batchExpanded}>
          {orders.map((order) => (
            <button key={order.id} className={styles.batchItem} onClick={() => onOpen(order.id)}>
              <span>#{order.orderNumber}</span>
              <span>{order.clientName}</span>
              <span>{formatMoney(order.totalAmount)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReadyRow({
  order,
  onOpen,
  onAdvance,
  onClose,
}: {
  order: ReadyOrder;
  onOpen: () => void;
  onAdvance: () => void;
  onClose: () => void;
}) {
  const firstItem = order.items?.[0];
  const nextStageLabel = getStageActionLabel(order.status);

  return (
    <div
      className={styles.row}
      style={{ '--status-color': STATUS_COLOR[order.status] } as CSSProperties}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <span className={styles.rowStripe} />
      <div className={styles.rowMain}>
        <div className={styles.rowTop}>
          <span className={styles.orderNumber}>#{order.orderNumber}</span>
          <span className={styles.statusBadge}>{STATUS_LABEL[order.status]}</span>
        </div>
        <div className={styles.rowClient}>{order.clientName}</div>
        <div className={styles.rowMeta}>
          <span>{firstItem?.productName ?? 'Без позиции'}</span>
          <span>{formatMoney(order.totalAmount)}</span>
          <span>{formatDate(order.dueDate)}</span>
        </div>
      </div>

      <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
        {nextStageLabel && (
          <button className={styles.secondaryAction} onClick={onAdvance}>
            {nextStageLabel}
          </button>
        )}
        <button className={styles.primaryAction} onClick={onClose}>
          Закрыть сделку
        </button>
      </div>
    </div>
  );
}

function ReadyBatchRow({
  orders,
  onOpen,
  onAdvance,
  onClose,
}: {
  orders: ReadyOrder[];
  onOpen: (id: string) => void;
  onAdvance: () => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const firstOrder = orders[0];
  const firstItem = firstOrder.items?.[0];
  const nextStageLabel = getStageActionLabel(firstOrder.status);

  return (
    <div className={styles.batchRowWrap}>
      <div
        className={styles.row}
        style={{ '--status-color': STATUS_COLOR[firstOrder.status] } as CSSProperties}
        onClick={() => setExpanded((value) => !value)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((value) => !value);
          }
        }}
      >
        <span className={styles.rowStripe} />
        <div className={styles.rowMain}>
          <div className={styles.rowTop}>
            <span className={styles.batchCount}>{orders.length}</span>
            <span className={styles.statusBadge}>{STATUS_LABEL[firstOrder.status]}</span>
          </div>
          <div className={styles.rowClient}>{firstItem?.productName ?? 'Без позиции'}</div>
          <div className={styles.rowMeta}>
            <span>{orders.length} заказов</span>
            <span>{formatDate(firstOrder.dueDate)}</span>
          </div>
        </div>

        <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
          {nextStageLabel && (
            <button className={styles.secondaryAction} onClick={onAdvance}>
              {nextStageLabel} ×{orders.length}
            </button>
          )}
          <button className={styles.primaryAction} onClick={onClose}>
            Закрыть ×{orders.length}
          </button>
        </div>
      </div>

      {expanded && (
        <div className={styles.batchExpandedRows}>
          {orders.map((order) => (
            <button key={order.id} className={styles.batchItem} onClick={() => onOpen(order.id)}>
              <span>#{order.orderNumber}</span>
              <span>{order.clientName}</span>
              <span>{formatMoney(order.totalAmount)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
