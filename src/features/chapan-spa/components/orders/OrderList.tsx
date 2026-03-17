import { useMemo } from 'react';
import { useChapanStore } from '../../model/chapan.store';
import { useTileChapanUI } from '../../model/tile-ui.store';
import { OrderCard } from './OrderCard';
import type { Order } from '../../api/types';
import s from './OrderList.module.css';

interface Props {
  tileId: string;
}

export function OrderList({ tileId }: Props) {
  const { orders } = useChapanStore();
  const {
    filterStatus, filterPriority, filterPayment,
    searchQuery, sortBy, openDrawer,
  } = useTileChapanUI(tileId);

  const filtered = useMemo(() => {
    let list = [...orders];

    // Filter out cancelled unless specifically selected
    if (filterStatus === 'all') {
      list = list.filter(o => o.status !== 'cancelled');
    }

    if (filterStatus !== 'all') {
      list = list.filter(o => o.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      list = list.filter(o => o.priority === filterPriority);
    }
    if (filterPayment !== 'all') {
      list = list.filter(o => o.paymentStatus === filterPayment);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.clientName.toLowerCase().includes(q) ||
        o.items.some(i => i.productName.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9');
        case 'totalAmount':
          return b.totalAmount - a.totalAmount;
        case 'updatedAt':
          return b.updatedAt.localeCompare(a.updatedAt);
        case 'createdAt':
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });

    return list;
  }, [orders, filterStatus, filterPriority, filterPayment, searchQuery, sortBy]);

  if (filtered.length === 0) {
    return (
      <div className={s.empty}>
        <div className={s.emptyTitle}>Нет заказов</div>
        <div className={s.emptySub}>
          {searchQuery ? 'Попробуйте изменить запрос' : 'Создайте первый заказ'}
        </div>
      </div>
    );
  }

  return (
    <div className={s.list}>
      {filtered.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          onClick={() => openDrawer(order.id)}
        />
      ))}
    </div>
  );
}
