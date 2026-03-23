/**
 * features/warehouse-spa/index.tsx
 *
 * Main Warehouse SPA — мounts inside the workspace tile modal.
 * Tabs: Остатки | Движения | Алерты | Состав (BOM)
 *
 * Connects to:
 *  - warehouseStore: shared data layer
 *  - tileWarehouseState: per-tile UI state
 *  - shared-bus: publishes WAREHOUSE_SHORTAGE for Production tiles
 */

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArchiveX,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Box,
  ChevronLeft,
  ClipboardList,
  Filter,
  Layers,
  Minus,
  Package,
  PackagePlus,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react';
import { useWarehouseStore } from './model/warehouse.store';
import { useTileWarehouseState } from './model/tile-ui.store';
import type { WarehouseItem, WarehouseAlert } from './api/types';
import s from './WarehouseSPA.module.css';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function availableQty(item: WarehouseItem) {
  return item.qty - item.qtyReserved;
}

function stockStatus(item: WarehouseItem): 'ok' | 'low' | 'empty' {
  const avail = availableQty(item);
  if (avail <= 0) return 'empty';
  if (item.qtyMin > 0 && avail <= item.qtyMin) return 'low';
  return 'ok';
}

function movementTypeLabel(type: string) {
  const map: Record<string, string> = {
    in: 'Поступление',
    out: 'Расход',
    adjustment: 'Коррекция',
    write_off: 'Списание',
    return: 'Возврат',
    reserved: 'Резерв',
    reservation_released: 'Снят резерв',
  };
  return map[type] ?? type;
}

function movementIconClass(type: string, css: typeof s) {
  if (['in', 'return', 'reservation_released'].includes(type)) return css.movementIconIn;
  if (['out', 'write_off'].includes(type)) return css.movementIconOut;
  if (['reserved'].includes(type)) return css.movementIconReserved;
  return css.movementIconAdjust;
}

function MovementIcon({ type }: { type: string }) {
  const size = 14;
  if (type === 'in') return <ArrowDownLeft size={size} />;
  if (type === 'out') return <ArrowUpRight size={size} />;
  if (type === 'return') return <RotateCcw size={size} />;
  if (type === 'write_off') return <Trash2 size={size} />;
  if (type === 'reserved') return <Box size={size} />;
  return <ArrowDownRight size={size} />;
}

function alertTypeLabel(type: string) {
  const map: Record<string, string> = {
    low_stock: 'Низкий остаток',
    shortage_for_order: 'Нехватка для заказа',
    predicted_shortage: 'Прогноз нехватки',
    expired_lot: 'Истекает партия',
  };
  return map[type] ?? type;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────────────
//  Item Drawer (detail + movements + actions)
// ─────────────────────────────────────────────────────────────

function ItemDrawer({
  item,
  tileId,
  onClose,
}: {
  item: WarehouseItem;
  tileId: string;
  onClose: () => void;
}) {
  const { movements, loadingMovements, loadMovements, addMovement, deleteItem, categories, locations } =
    useWarehouseStore();
  const { setAddMovementItemId } = useTileWarehouseState(tileId);

  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movType, setMovType] = useState<'in' | 'out' | 'adjustment' | 'write_off' | 'return'>('in');
  const [movQty, setMovQty] = useState('');
  const [movReason, setMovReason] = useState('');
  const [savingMov, setSavingMov] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void loadMovements(item.id);
  }, [item.id, loadMovements]);

  const itemMovements = movements.filter((m) => m.itemId === item.id);
  const avail = availableQty(item);
  const status = stockStatus(item);
  const cat = categories.find((c) => c.id === item.categoryId);
  const loc = locations.find((l) => l.id === item.locationId);

  async function handleAddMovement() {
    const qty = parseFloat(movQty);
    if (!qty || isNaN(qty) || qty <= 0) return;
    setSavingMov(true);
    try {
      await addMovement({ itemId: item.id, type: movType, qty, reason: movReason || undefined });
      setShowMovementModal(false);
      setMovQty('');
      setMovReason('');
    } finally {
      setSavingMov(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Удалить «${item.name}»?`)) return;
    setDeleting(true);
    try {
      await deleteItem(item.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={s.drawer}>
      <div className={s.drawerHeader}>
        <button className={s.drawerBack} onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
        <div className={s.drawerTitle}>{item.name}</div>
        <button className={s.rowActionBtn} onClick={() => setShowQR((v) => !v)} title="QR-код">
          <QrCode size={15} />
        </button>
      </div>

      <div className={s.drawerBody}>
        {/* QR code display */}
        {showQR && item.qrCode && (
          <div className={s.qrContainer}>
            <div className={s.qrCode}>{item.qrCode}</div>
            <div className={s.qrHint}>Отсканируйте код для быстрого доступа к позиции</div>
          </div>
        )}

        {/* Stats */}
        <div className={s.statRow}>
          <div className={s.statCard}>
            <span className={s.statLabel}>Остаток</span>
            <span
              className={`${s.statValue} ${status === 'empty' ? s.qtyDanger : status === 'low' ? s.qtyLow : ''}`}
            >
              {avail.toFixed(avail % 1 === 0 ? 0 : 2)}
            </span>
            <span className={s.statUnit}>{item.unit}</span>
          </div>
          <div className={s.statCard}>
            <span className={s.statLabel}>Резерв</span>
            <span className={s.statValue}>{item.qtyReserved.toFixed(item.qtyReserved % 1 === 0 ? 0 : 2)}</span>
            <span className={s.statUnit}>{item.unit}</span>
          </div>
          <div className={s.statCard}>
            <span className={s.statLabel}>Всего</span>
            <span className={s.statValue}>{item.qty.toFixed(item.qty % 1 === 0 ? 0 : 2)}</span>
            <span className={s.statUnit}>{item.unit}</span>
          </div>
        </div>

        {/* Info */}
        <div className={s.section}>
          <div className={s.sectionTitle}>Параметры</div>
          <div className={s.statRow}>
            {item.sku && (
              <div className={s.field}>
                <span className={s.fieldLabel}>Артикул</span>
                <span className={s.fieldValue}>{item.sku}</span>
              </div>
            )}
            {cat && (
              <div className={s.field}>
                <span className={s.fieldLabel}>Категория</span>
                <span className={s.fieldValue} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className={s.categoryDot} style={{ background: cat.color }} />
                  {cat.name}
                </span>
              </div>
            )}
            {loc && (
              <div className={s.field}>
                <span className={s.fieldLabel}>Локация</span>
                <span className={s.fieldValue}>{loc.name}</span>
              </div>
            )}
          </div>
          {item.notes && (
            <div className={s.field}>
              <span className={s.fieldLabel}>Заметка</span>
              <span className={s.fieldValue}>{item.notes}</span>
            </div>
          )}
        </div>

        {/* Movements history */}
        <div className={s.section}>
          <div className={s.sectionTitle}>История движений</div>
          {loadingMovements && (
            <div className={s.loading}>
              <RefreshCw size={14} className={s.spin} />
              <span>Загрузка...</span>
            </div>
          )}
          {itemMovements.slice(0, 20).map((m) => (
            <div key={m.id} className={s.movementItem}>
              <div className={`${s.movementIcon} ${movementIconClass(m.type, s)}`}>
                <MovementIcon type={m.type} />
              </div>
              <div className={s.movementBody}>
                <div className={s.movementTitle}>{movementTypeLabel(m.type)}</div>
                <div className={s.movementMeta}>
                  {m.reason && `${m.reason} · `}
                  {m.author} · {formatDate(m.createdAt)}
                </div>
              </div>
              <div
                className={`${s.movementQty} ${m.qty > 0 ? s.movementQtyPositive : s.movementQtyNegative}`}
              >
                {m.qty > 0 ? '+' : ''}
                {m.qty.toFixed(m.qty % 1 === 0 ? 0 : 2)} {item.unit}
              </div>
            </div>
          ))}
          {itemMovements.length === 0 && !loadingMovements && (
            <div className={s.loading} style={{ padding: 16 }}>Нет движений</div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className={s.actionRow}>
        <button className={s.actionPrimary} onClick={() => setShowMovementModal(true)}>
          <Plus size={14} style={{ marginRight: 4 }} /> Движение
        </button>
        <button className={s.actionSecondary} onClick={handleDelete} disabled={deleting}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* Movement modal */}
      {showMovementModal && (
        <div className={s.modalOverlay} onClick={() => setShowMovementModal(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalTitle}>Добавить движение — {item.name}</div>

            {/* Type selector */}
            <div className={s.field}>
              <span className={s.fieldLabel}>Тип</span>
              <div className={s.segmented}>
                {(['in', 'out', 'adjustment', 'write_off', 'return'] as const).map((t) => (
                  <button
                    key={t}
                    className={`${s.segmentBtn} ${movType === t ? s.segmentBtnActive : ''}`}
                    onClick={() => setMovType(t)}
                  >
                    {t === 'in' ? 'Приход' : t === 'out' ? 'Расход' : t === 'adjustment' ? 'Корр.' : t === 'write_off' ? 'Списание' : 'Возврат'}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.field}>
              <span className={s.fieldLabel}>Количество ({item.unit})</span>
              <input
                type="number"
                min="0.001"
                step="0.001"
                className={s.fieldInput}
                placeholder="0"
                value={movQty}
                onChange={(e) => setMovQty(e.target.value)}
                autoFocus
              />
            </div>

            <div className={s.field}>
              <span className={s.fieldLabel}>Причина / комментарий</span>
              <input
                type="text"
                className={s.fieldInput}
                placeholder="Опционально"
                value={movReason}
                onChange={(e) => setMovReason(e.target.value)}
              />
            </div>

            <div className={s.actionRow} style={{ padding: 0 }}>
              <button className={s.actionPrimary} onClick={handleAddMovement} disabled={savingMov || !movQty}>
                {savingMov ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button className={s.actionSecondary} onClick={() => setShowMovementModal(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Add Item Modal
// ─────────────────────────────────────────────────────────────

function AddItemModal({
  onClose,
  tileId,
}: {
  onClose: () => void;
  tileId: string;
}) {
  const { createItem, categories, locations } = useWarehouseStore();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('шт');
  const [qty, setQty] = useState('0');
  const [qtyMin, setQtyMin] = useState('0');
  const [costPrice, setCostPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const UNITS = ['шт', 'кг', 'м', 'л', 'пар', 'рулон', 'лист', 'упак.'];

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createItem({
        name: name.trim(),
        sku: sku || undefined,
        unit,
        qty: parseFloat(qty) || 0,
        qtyMin: parseFloat(qtyMin) || 0,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        notes: notes || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalTitle}>Новая позиция</div>

        <div className={s.field}>
          <span className={s.fieldLabel}>Наименование *</span>
          <input
            autoFocus
            type="text"
            className={s.fieldInput}
            placeholder="Ткань хлопок белая"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className={s.field}>
            <span className={s.fieldLabel}>Артикул</span>
            <input
              type="text"
              className={s.fieldInput}
              placeholder="SKU-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div className={s.field}>
            <span className={s.fieldLabel}>Единица</span>
            <select className={s.fieldInput} value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div className={s.field}>
            <span className={s.fieldLabel}>Кол-во</span>
            <input type="number" className={s.fieldInput} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className={s.field}>
            <span className={s.fieldLabel}>Мин. порог</span>
            <input type="number" className={s.fieldInput} value={qtyMin} onChange={(e) => setQtyMin(e.target.value)} />
          </div>
          <div className={s.field}>
            <span className={s.fieldLabel}>Цена прихода</span>
            <input type="number" className={s.fieldInput} value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </div>
        </div>

        {categories.length > 0 && (
          <div className={s.field}>
            <span className={s.fieldLabel}>Категория</span>
            <select className={s.fieldInput} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— без категории —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {locations.length > 0 && (
          <div className={s.field}>
            <span className={s.fieldLabel}>Локация</span>
            <select className={s.fieldInput} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">— без локации —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={s.field}>
          <span className={s.fieldLabel}>Заметка</span>
          <input
            type="text"
            className={s.fieldInput}
            placeholder="Опционально"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className={s.actionRow} style={{ padding: 0 }}>
          <button className={s.actionPrimary} onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Создание...' : 'Создать позицию'}
          </button>
          <button className={s.actionSecondary} onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Stock View
// ─────────────────────────────────────────────────────────────

function StockView({ tileId }: { tileId: string }) {
  const {
    items,
    categories,
    locations,
    loading,
    searchQuery,
    filterCategoryId,
    filterLocationId,
    filterLowStock,
    setSearch,
    setFilterCategory,
    setFilterLocation,
    setFilterLowStock,
    resetFilters,
  } = useWarehouseStore();
  const { openItem } = useTileWarehouseState(tileId);

  const hasFilters = !!filterCategoryId || !!filterLocationId || filterLowStock || !!searchQuery;

  if (loading && items.length === 0) {
    return (
      <div className={s.loading}>
        <RefreshCw size={16} className={s.spin} />
        <span>Загрузка позиций...</span>
      </div>
    );
  }

  if (items.length === 0 && !hasFilters) {
    return (
      <div className={s.emptyState}>
        <Package size={36} className={s.emptyIcon} strokeWidth={1.2} />
        <div className={s.emptyTitle}>Склад пуст</div>
        <div className={s.emptyText}>Добавьте первую позицию, нажав «+ Добавить» в верхней панели</div>
      </div>
    );
  }

  return (
    <div className={s.stockView}>
      {/* Filter bar */}
      <div className={s.filterBar}>
        <button
          className={`${s.filterChip} ${filterLowStock ? s.filterChipActive : ''}`}
          onClick={() => setFilterLowStock(!filterLowStock)}
        >
          <TrendingDown size={11} /> Низкий остаток
        </button>

        {categories.map((c) => (
          <button
            key={c.id}
            className={`${s.filterChip} ${filterCategoryId === c.id ? s.filterChipActive : ''}`}
            onClick={() => setFilterCategory(filterCategoryId === c.id ? null : c.id)}
          >
            <span
              className={s.categoryDot}
              style={{ background: c.color, display: 'inline-block', width: 7, height: 7 }}
            />
            {c.name}
          </button>
        ))}

        {hasFilters && (
          <button className={s.filterChip} onClick={resetFilters}>
            <X size={11} /> Сброс
          </button>
        )}
      </div>

      {/* Table */}
      <div className={s.tableHeader}>
        <span>Наименование</span>
        <span style={{ textAlign: 'right' }}>Доступно</span>
        <span style={{ textAlign: 'right' }}>Резерв</span>
        <span style={{ textAlign: 'right' }}>Мин.</span>
        <span>Ед.</span>
        <span />
      </div>

      <div className={s.itemsTable}>
        {items.map((item) => {
          const avail = availableQty(item);
          const status = stockStatus(item);
          const cat = categories.find((c) => c.id === item.categoryId);

          return (
            <div
              key={item.id}
              className={`${s.tableRow} ${status === 'low' || status === 'empty' ? s.tableRowLow : ''}`}
              onClick={() => openItem(item.id)}
            >
              <div className={s.itemNameCell}>
                <span className={s.itemName}>
                  {cat && (
                    <span
                      className={s.categoryDot}
                      style={{ background: cat.color, display: 'inline-block', marginRight: 5 }}
                    />
                  )}
                  {item.name}
                </span>
                {item.sku && <span className={s.itemSku}>{item.sku}</span>}
              </div>

              <div
                className={`${s.qtyCell} ${status === 'empty' ? s.qtyDanger : status === 'low' ? s.qtyLow : s.qtyAvail}`}
              >
                {avail.toFixed(avail % 1 === 0 ? 0 : 2)}
              </div>

              <div className={s.qtyCell} style={{ color: 'var(--text-tertiary)' }}>
                {item.qtyReserved > 0 ? item.qtyReserved.toFixed(item.qtyReserved % 1 === 0 ? 0 : 2) : '—'}
              </div>

              <div className={s.qtyCell} style={{ color: 'var(--text-tertiary)' }}>
                {item.qtyMin > 0 ? item.qtyMin.toFixed(item.qtyMin % 1 === 0 ? 0 : 2) : '—'}
              </div>

              <span className={s.unitBadge}>{item.unit}</span>

              <div className={s.rowActions}>
                <button
                  className={s.rowActionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    openItem(item.id);
                  }}
                  title="Открыть"
                >
                  <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && hasFilters && (
          <div className={s.emptyState}>
            <ArchiveX size={28} className={s.emptyIcon} strokeWidth={1.2} />
            <div className={s.emptyTitle}>Ничего не найдено</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Movements View
// ─────────────────────────────────────────────────────────────

function MovementsView() {
  const { movements, loadingMovements, loadMovements, items } = useWarehouseStore();

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  if (loadingMovements && movements.length === 0) {
    return (
      <div className={s.loading}>
        <RefreshCw size={16} className={s.spin} />
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className={s.emptyState}>
        <Layers size={36} className={s.emptyIcon} strokeWidth={1.2} />
        <div className={s.emptyTitle}>Нет движений</div>
        <div className={s.emptyText}>Все приходы и расходы будут отображаться здесь</div>
      </div>
    );
  }

  return (
    <div className={s.movementsView}>
      {movements.map((m) => {
        const itemName = m.item?.name ?? items.find((i) => i.id === m.itemId)?.name ?? '—';
        const unit = m.item?.unit ?? items.find((i) => i.id === m.itemId)?.unit ?? '';
        return (
          <div key={m.id} className={s.movementItem}>
            <div className={`${s.movementIcon} ${movementIconClass(m.type, s)}`}>
              <MovementIcon type={m.type} />
            </div>
            <div className={s.movementBody}>
              <div className={s.movementTitle}>
                {movementTypeLabel(m.type)} — {itemName}
              </div>
              <div className={s.movementMeta}>
                {m.reason && `${m.reason} · `}
                {m.author} · {formatDate(m.createdAt)}
              </div>
            </div>
            <div className={`${s.movementQty} ${m.qty > 0 ? s.movementQtyPositive : s.movementQtyNegative}`}>
              {m.qty > 0 ? '+' : ''}
              {m.qty.toFixed(m.qty % 1 === 0 ? 0 : 2)} {unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Alerts View
// ─────────────────────────────────────────────────────────────

function AlertsView() {
  const { alerts, loadingAlerts, resolveAlert, items, addMovement } = useWarehouseStore();
  const [receivingAlertId, setReceivingAlertId] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);

  if (loadingAlerts && alerts.length === 0) {
    return (
      <div className={s.loading}>
        <RefreshCw size={16} className={s.spin} />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className={s.emptyState}>
        <Box size={36} className={s.emptyIcon} strokeWidth={1.2} />
        <div className={s.emptyTitle}>Алертов нет</div>
        <div className={s.emptyText}>Когда запасы упадут ниже порога или придёт заказ без материалов — они появятся здесь</div>
      </div>
    );
  }

  async function handleResolve(alert: WarehouseAlert) {
    setResolving(alert.id);
    try {
      await resolveAlert(alert.id);
    } finally {
      setResolving(null);
    }
  }

  async function handleReceive(alert: WarehouseAlert) {
    const qty = parseFloat(receiveQty);
    if (!qty || qty <= 0) return;
    await addMovement({
      itemId: alert.itemId,
      type: 'in',
      qty,
      reason: 'Пополнение по алерту',
    });
    setReceivingAlertId(null);
    setReceiveQty('');
  }

  return (
    <div className={s.alertsView}>
      {alerts.map((alert) => {
        const itemName = alert.item?.name ?? items.find((i) => i.id === alert.itemId)?.name ?? '—';
        const unit = alert.item?.unit ?? items.find((i) => i.id === alert.itemId)?.unit ?? '';
        const isDanger =
          alert.type === 'shortage_for_order' || (alert.qtyHave !== null && alert.qtyHave <= 0);

        return (
          <div key={alert.id} className={`${s.alertCard} ${isDanger ? s.alertCardDanger : s.alertCardWarning}`}>
            <AlertTriangle
              size={16}
              className={s.alertIcon}
              color={isDanger ? 'var(--color-danger, #e53e3e)' : 'var(--color-warning, #c87d0e)'}
            />
            <div className={s.alertBody}>
              <div className={s.alertTitle}>{alertTypeLabel(alert.type)} — {itemName}</div>
              <div className={s.alertDesc}>
                {alert.type === 'shortage_for_order' &&
                  alert.qtyNeed !== null &&
                  alert.qtyHave !== null &&
                  `Нужно: ${alert.qtyNeed} ${unit}, есть: ${alert.qtyHave} ${unit} · нехватка: ${(alert.qtyNeed - alert.qtyHave).toFixed(2)} ${unit}`}
                {alert.type === 'low_stock' &&
                  alert.qtyHave !== null &&
                  `Остаток: ${alert.qtyHave} ${unit}`}
              </div>

              {/* Receive inline */}
              {receivingAlertId === alert.id ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
                  <input
                    type="number"
                    autoFocus
                    className={s.fieldInput}
                    style={{ maxWidth: 100 }}
                    placeholder={`кол-во ${unit}`}
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(e.target.value)}
                  />
                  <button className={s.alertReceiveBtn} onClick={() => handleReceive(alert)}>
                    Оприходовать
                  </button>
                  <button className={s.alertResolveBtn} onClick={() => setReceivingAlertId(null)}>
                    Отмена
                  </button>
                </div>
              ) : (
                <div className={s.alertActions}>
                  <button className={s.alertReceiveBtn} onClick={() => setReceivingAlertId(alert.id)}>
                    <PackagePlus size={12} /> Принять товар
                  </button>
                  <button
                    className={s.alertResolveBtn}
                    onClick={() => handleResolve(alert)}
                    disabled={resolving === alert.id}
                  >
                    {resolving === alert.id ? 'Закрытие...' : 'Закрыть алерт'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  BOM View
// ─────────────────────────────────────────────────────────────

function BOMView() {
  const { items, getBOM, setBOM } = useWarehouseStore();
  const [products, setProducts] = useState<Array<{ productKey: string; lineCount: number }>>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [bomLines, setBomLines] = useState<Array<{ itemId: string; qtyPerUnit: number; name: string; unit: string }>>([]);
  const [newProductKey, setNewProductKey] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemId, setNewItemId] = useState('');
  const [newQty, setNewQty] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load BOM product list from API
    void (async () => {
      try {
        const { warehouseApi } = await import('./api/client');
        const res = await warehouseApi.listBOMProducts();
        setProducts(res);
      } catch { /* ok */ }
    })();
  }, []);

  async function loadBOM(productKey: string) {
    const lines = await getBOM(productKey);
    setSelectedProduct(productKey);
    setBomLines(lines.map((l) => ({
      itemId: l.itemId,
      qtyPerUnit: l.qtyPerUnit,
      name: l.item.name,
      unit: l.item.unit,
    })));
  }

  async function saveBOM() {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      await setBOM(selectedProduct, bomLines.map((l) => ({ itemId: l.itemId, qtyPerUnit: l.qtyPerUnit })));
    } finally {
      setSaving(false);
    }
  }

  function addLine() {
    const item = items.find((i) => i.id === newItemId);
    if (!item || !newQty) return;
    setBomLines((prev) => [
      ...prev.filter((l) => l.itemId !== newItemId),
      { itemId: item.id, qtyPerUnit: parseFloat(newQty), name: item.name, unit: item.unit },
    ]);
    setNewItemId('');
    setNewQty('');
  }

  function removeLine(itemId: string) {
    setBomLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  return (
    <div className={s.bomView}>
      <div className={s.bomHeader}>
        <span className={s.bomHeaderTitle}>Состав изделий (BoM)</span>
        <button className={s.filterBtn} onClick={() => setShowAddForm(true)}>
          <Plus size={13} /> Добавить продукт
        </button>
      </div>

      {showAddForm && (
        <div className={s.modalOverlay} onClick={() => setShowAddForm(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalTitle}>Новый продукт в BoM</div>
            <div className={s.field}>
              <span className={s.fieldLabel}>Название продукта</span>
              <input
                autoFocus
                type="text"
                className={s.fieldInput}
                placeholder="Например: Чапан XL"
                value={newProductKey}
                onChange={(e) => setNewProductKey(e.target.value)}
              />
            </div>
            <div className={s.actionRow} style={{ padding: 0 }}>
              <button
                className={s.actionPrimary}
                disabled={!newProductKey.trim()}
                onClick={() => {
                  setSelectedProduct(newProductKey.trim());
                  setBomLines([]);
                  setProducts((p) => [...p, { productKey: newProductKey.trim(), lineCount: 0 }]);
                  setShowAddForm(false);
                  setNewProductKey('');
                }}
              >
                Создать
              </button>
              <button className={s.actionSecondary} onClick={() => setShowAddForm(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div className={s.bomList}>
        {/* Product list if nothing selected */}
        {!selectedProduct && products.map((p) => (
          <div key={p.productKey} className={s.bomCard} style={{ cursor: 'pointer' }} onClick={() => loadBOM(p.productKey)}>
            <div className={s.bomCardHeader}>
              <span className={s.bomProductName}>{p.productKey}</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.lineCount} позиций →</span>
            </div>
          </div>
        ))}

        {!selectedProduct && products.length === 0 && (
          <div className={s.emptyState}>
            <ClipboardList size={32} className={s.emptyIcon} strokeWidth={1.2} />
            <div className={s.emptyTitle}>BoM не настроен</div>
            <div className={s.emptyText}>Добавьте продукты и укажите, какие материалы нужны для их производства. Тогда Производство будет автоматически знать, хватит ли запасов.</div>
          </div>
        )}

        {/* Selected product editor */}
        {selectedProduct && (
          <div className={s.bomCard}>
            <div className={s.bomCardHeader}>
              <span className={s.bomProductName}>{selectedProduct}</span>
              <button className={s.rowActionBtn} onClick={() => setSelectedProduct(null)} title="Назад">
                <X size={14} />
              </button>
            </div>

            <div className={s.bomLines}>
              {bomLines.map((l) => (
                <div key={l.itemId} className={s.bomLine}>
                  <span>{l.name}</span>
                  <span className={s.bomLineQty}>
                    {l.qtyPerUnit} {l.unit}
                    <button
                      className={s.rowActionBtn}
                      style={{ marginLeft: 6 }}
                      onClick={() => removeLine(l.itemId)}
                    >
                      <Minus size={12} />
                    </button>
                  </span>
                </div>
              ))}
            </div>

            {/* Add line */}
            <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'flex-end' }}>
              <div className={s.field} style={{ flex: 2 }}>
                <span className={s.fieldLabel}>Позиция</span>
                <select className={s.fieldInput} value={newItemId} onChange={(e) => setNewItemId(e.target.value)}>
                  <option value="">Выбрать...</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div className={s.field} style={{ flex: 1 }}>
                <span className={s.fieldLabel}>Кол-во</span>
                <input type="number" className={s.fieldInput} value={newQty} onChange={(e) => setNewQty(e.target.value)} />
              </div>
              <button className={s.filterBtn} onClick={addLine} disabled={!newItemId || !newQty}>
                <Plus size={13} />
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <button className={s.actionPrimary} onClick={saveBOM} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить BoM'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main WarehouseSPA
// ─────────────────────────────────────────────────────────────

interface Props {
  tileId: string;
}

export function WarehouseSPA({ tileId }: Props) {
  const { loadAll, alerts, searchQuery, setSearch, items } = useWarehouseStore();
  const { activeTab, setTab, openItemId, openItem, addItemOpen, setAddItemOpen } =
    useTileWarehouseState(tileId);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openItemData = openItemId ? items.find((i) => i.id === openItemId) ?? null : null;

  return (
    <div className={s.root}>
      {/* Top bar */}
      <div className={s.topbar}>
        <div className={s.topbarLeft}>
          <div className={s.searchWrap}>
            <Search size={13} color="var(--text-tertiary)" />
            <input
              type="text"
              className={s.searchInput}
              placeholder="Поиск позиций..."
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searchQuery && (
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }} onClick={() => setSearch('')}>
                <X size={13} color="var(--text-tertiary)" />
              </button>
            )}
          </div>
        </div>
        <div className={s.topbarRight}>
          <button className={s.addBtn} onClick={() => setAddItemOpen(true)}>
            <Plus size={13} /> Добавить
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={s.tabs}>
        {(
          [
            { key: 'stock', label: 'Остатки', icon: <Package size={13} /> },
            { key: 'movements', label: 'Движения', icon: <Layers size={13} /> },
            { key: 'alerts', label: 'Алерты', icon: <AlertTriangle size={13} /> },
            { key: 'bom', label: 'Состав (BoM)', icon: <ClipboardList size={13} /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            className={`${s.tab} ${activeTab === tab.key ? s.tabActive : ''}`}
            onClick={() => setTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'alerts' && alerts.length > 0 && (
              <span className={s.tabBadge}>{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className={s.body}>
        {activeTab === 'stock' && <StockView tileId={tileId} />}
        {activeTab === 'movements' && <MovementsView />}
        {activeTab === 'alerts' && <AlertsView />}
        {activeTab === 'bom' && <BOMView />}
      </div>

      {/* Item detail drawer */}
      {openItemData && (
        <ItemDrawer item={openItemData} tileId={tileId} onClose={() => openItem(null)} />
      )}

      {/* Add item modal */}
      {addItemOpen && <AddItemModal onClose={() => setAddItemOpen(false)} tileId={tileId} />}
    </div>
  );
}
