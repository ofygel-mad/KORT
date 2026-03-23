/**
 * features/production-spa/ui/KanbanBoard.tsx
 *
 * Universal Kanban board.
 * Columns = OrderStatus. Each column shows OrderCards.
 * Drag-and-drop moves orders between status columns.
 */

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ProductionOrder, OrderStatus } from '../api/types';
import { ORDER_STATUS_LABEL, ORDER_STATUS_ORDER } from '../api/types';
import { OrderCard } from './OrderCard';
import s from './KanbanBoard.module.css';

// We exclude terminal statuses from the board
const BOARD_COLUMNS: OrderStatus[] = ['new', 'confirmed', 'in_production', 'ready'];

interface Props {
  orders: ProductionOrder[];
  onOrderClick: (order: ProductionOrder) => void;
  onMoveOrder: (orderId: string, status: OrderStatus) => void;
  onCreateOrder?: () => void;
}

interface DragState {
  orderId: string;
  sourceStatus: OrderStatus;
}

export function KanbanBoard({ orders, onOrderClick, onMoveOrder, onCreateOrder }: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overCol, setOverCol] = useState<OrderStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleDragStart(order: ProductionOrder) {
    setDrag({ orderId: order.id, sourceStatus: order.status });
  }

  function handleDragOver(e: React.DragEvent, col: OrderStatus) {
    e.preventDefault();
    setOverCol(col);
  }

  function handleDrop(col: OrderStatus) {
    if (drag && drag.sourceStatus !== col) {
      onMoveOrder(drag.orderId, col);
    }
    setDrag(null);
    setOverCol(null);
  }

  function handleDragEnd() {
    setDrag(null);
    setOverCol(null);
  }

  const colCounts = Object.fromEntries(
    BOARD_COLUMNS.map((col) => [col, orders.filter((o) => o.status === col).length]),
  );

  return (
    <div className={s.root} ref={scrollRef}>
      {BOARD_COLUMNS.map((col) => {
        const colOrders = orders
          .filter((o) => o.status === col)
          .sort((a, b) => {
            // VIP first, then urgent, then normal; within priority sort by due date
            const p = { vip: 0, urgent: 1, normal: 2 };
            const pd = p[a.priority] - p[b.priority];
            if (pd !== 0) return pd;
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          });

        const isOver = overCol === col && drag?.sourceStatus !== col;

        return (
          <div
            key={col}
            className={s.col}
            data-over={isOver}
            onDragOver={(e) => handleDragOver(e, col)}
            onDrop={() => handleDrop(col)}
          >
            {/* Column header */}
            <div className={s.colHeader}>
              <span className={s.colTitle}>{ORDER_STATUS_LABEL[col]}</span>
              <span className={s.colCount}>{colCounts[col]}</span>
              {col === 'new' && onCreateOrder && (
                <button className={s.addBtn} onClick={onCreateOrder} title="Новый заказ">
                  <Plus size={14} />
                </button>
              )}
            </div>

            {/* Cards */}
            <div className={s.cardList}>
              {colOrders.length === 0 && (
                <div className={s.empty}>
                  {isOver ? 'Перетащите сюда' : 'Нет заказов'}
                </div>
              )}
              {colOrders.map((order) => (
                <div
                  key={order.id}
                  className={s.cardWrap}
                  draggable
                  onDragStart={() => handleDragStart(order)}
                  onDragEnd={handleDragEnd}
                  data-dragging={drag?.orderId === order.id}
                >
                  <OrderCard order={order} onClick={() => onOrderClick(order)} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
