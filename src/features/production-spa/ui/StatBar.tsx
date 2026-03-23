/**
 * features/production-spa/ui/StatBar.tsx
 *
 * Compact statistics bar — replaces AI dashboards and big tiles.
 * Shows only what matters at a glance.
 */

import { AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react';
import type { ProductionOrder } from '../api/types';
import s from './StatBar.module.css';

interface Props {
  orders: ProductionOrder[];
  workshopCapacity?: number;
}

export function StatBar({ orders, workshopCapacity = 20 }: Props) {
  const active = orders.filter((o) => !['cancelled', 'completed'].includes(o.status));
  const inProd = orders.filter((o) => o.status === 'in_production');
  const blocked = orders.filter((o) => o.shortage?.status === 'blocked');
  const ready = orders.filter((o) => o.status === 'ready');
  const overdue = active.filter((o) => o.dueDate && new Date(o.dueDate) < new Date());

  const loadPercent = Math.min(100, Math.round((inProd.length / workshopCapacity) * 100));
  const isOverloaded = loadPercent >= 80;

  return (
    <div className={s.bar}>
      <span className={s.pill} data-tone={isOverloaded ? 'warning' : 'default'}>
        <Package size={12} />
        <strong>{inProd.length}</strong>
        <span>в работе</span>
        {isOverloaded && <span className={s.loadBadge}>{loadPercent}%</span>}
      </span>

      {blocked.length > 0 && (
        <span className={s.pill} data-tone="danger">
          <AlertTriangle size={12} />
          <strong>{blocked.length}</strong>
          <span>нехватка</span>
        </span>
      )}

      {overdue.length > 0 && (
        <span className={s.pill} data-tone="warning">
          <Clock size={12} />
          <strong>{overdue.length}</strong>
          <span>просрочен{overdue.length === 1 ? '' : 'о'}</span>
        </span>
      )}

      {ready.length > 0 && (
        <span className={s.pill} data-tone="success">
          <CheckCircle size={12} />
          <strong>{ready.length}</strong>
          <span>готово</span>
        </span>
      )}

      <span className={s.pill} data-tone="muted">
        <strong>{active.length}</strong>
        <span>всего активных</span>
      </span>
    </div>
  );
}
