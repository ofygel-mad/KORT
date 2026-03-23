/**
 * features/production-spa/ui/ShortagePanel.tsx
 *
 * Shortage Radar — shows material shortages for an order.
 * Revolutionary feature: actionable shortage info inline.
 */

import { AlertTriangle, CheckCircle, Package, RefreshCw } from 'lucide-react';
import type { ShortageResult, MaterialCheck } from '../api/types';
import s from './ShortagePanel.module.css';

interface Props {
  shortage: ShortageResult | undefined;
  isChecking?: boolean;
  onRefresh?: () => void;
  compact?: boolean;
}

const STATUS_ICON = {
  ok: <CheckCircle size={14} />,
  low: <AlertTriangle size={14} />,
  shortage: <Package size={14} />,
};

function MaterialRow({ item }: { item: MaterialCheck }) {
  return (
    <div className={s.materialRow} data-status={item.status}>
      <span className={s.materialIcon}>{STATUS_ICON[item.status]}</span>
      <span className={s.materialName}>{item.name}</span>
      <span className={s.materialQty}>
        {item.status === 'ok' ? (
          <span className={s.qtyOk}>{item.available} {item.unit}</span>
        ) : (
          <span className={s.qtyShort}>
            {item.available}/{item.required} {item.unit}
          </span>
        )}
      </span>
    </div>
  );
}

export function ShortagePanel({ shortage, isChecking, onRefresh, compact }: Props) {
  if (isChecking) {
    return (
      <div className={s.root} data-status="checking">
        <RefreshCw size={13} className={s.spin} />
        <span className={s.checkingText}>Проверяю наличие материалов...</span>
      </div>
    );
  }

  if (!shortage) return null;

  if (shortage.status === 'ok') {
    if (compact) return null;
    return (
      <div className={s.root} data-status="ok">
        <CheckCircle size={13} />
        <span>Все материалы в наличии</span>
      </div>
    );
  }

  const shortages = shortage.items.filter((i) => i.status === 'shortage');
  const lows = shortage.items.filter((i) => i.status === 'low');

  if (compact) {
    return (
      <div className={s.rootCompact} data-status={shortage.status}>
        <AlertTriangle size={12} />
        <span>
          {shortage.status === 'blocked'
            ? `Нет ${shortages.length} матер.`
            : `Мало ${lows.length} матер.`}
        </span>
      </div>
    );
  }

  return (
    <div className={s.panel} data-status={shortage.status}>
      <div className={s.panelHeader}>
        <span className={s.panelIcon}>
          <AlertTriangle size={15} />
        </span>
        <span className={s.panelTitle}>
          {shortage.status === 'blocked' ? 'Нехватка материалов' : 'Материалы на исходе'}
        </span>
        {onRefresh && (
          <button className={s.refreshBtn} onClick={onRefresh} title="Обновить">
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      <div className={s.materialList}>
        {shortages.map((item) => (
          <MaterialRow key={item.sku} item={item} />
        ))}
        {lows.map((item) => (
          <MaterialRow key={item.sku} item={item} />
        ))}
      </div>

      <div className={s.panelFooter}>
        <span className={s.footerNote}>
          Склад будет синхронизирован автоматически
        </span>
      </div>
    </div>
  );
}
