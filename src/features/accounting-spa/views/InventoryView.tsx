/**
 * views/InventoryView.tsx
 * Stоimostnaya otsenka sklada po kategoriyam.
 */

import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { accountingApi } from '../api/client';
import s from './InventoryView.module.css';

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

export function InventoryView() {
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-inventory'],
    queryFn: () => accountingApi.getInventoryValue(),
  });

  if (isLoading) return <div className={s.loading}>Загрузка…</div>;
  if (!data) return null;

  return (
    <div className={s.root}>
      {/* Header stat */}
      <div className={s.totalCard}>
        <div className={s.totalLeft}>
          <Package size={20} className={s.totalIcon} />
          <div>
            <div className={s.totalLabel}>Общая стоимость склада</div>
            <div className={s.totalValue}>₸ {fmt(data.grandTotal)}</div>
          </div>
        </div>
        <div className={s.totalRight}>
          <span className={s.totalMeta}>{data.itemCount} позиций</span>
          <span className={s.totalMeta}>{data.rows.length} категорий</span>
        </div>
      </div>

      {/* Table */}
      <div className={s.table}>
        <div className={s.thead}>
          <div className={s.th}>Категория</div>
          <div className={`${s.th} ${s.right}`}>Позиций</div>
          <div className={`${s.th} ${s.right}`}>Ед. кол-во</div>
          <div className={`${s.th} ${s.right}`}>Стоимость</div>
          <div className={s.th}>Доля</div>
        </div>

        {data.rows.map((row) => (
          <div key={row.name} className={s.row}>
            <div className={s.cell}>
              <span className={s.catDot} style={{ background: row.color }} />
              {row.name}
            </div>
            <div className={`${s.cell} ${s.right} ${s.muted}`}>{row.itemCount}</div>
            <div className={`${s.cell} ${s.right} ${s.muted}`}>{fmt(row.totalQty)}</div>
            <div className={`${s.cell} ${s.right} ${s.bold}`}>₸ {fmt(row.totalValue)}</div>
            <div className={s.cell}>
              <div className={s.barTrack}>
                <div
                  className={s.barFill}
                  style={{ width: `${row.pct}%`, background: row.color }}
                />
              </div>
              <span className={s.pct}>{row.pct}%</span>
            </div>
          </div>
        ))}

        {data.rows.length === 0 && (
          <div className={s.empty}>Нет данных о стоимости. Добавьте себестоимость к позициям склада.</div>
        )}

        {/* Footer total */}
        {data.rows.length > 0 && (
          <div className={`${s.row} ${s.rowTotal}`}>
            <div className={s.cell}><strong>Итого</strong></div>
            <div className={`${s.cell} ${s.right}`}>{data.itemCount}</div>
            <div className={`${s.cell} ${s.right}`} />
            <div className={`${s.cell} ${s.right} ${s.bold}`}>₸ {fmt(data.grandTotal)}</div>
            <div className={s.cell} />
          </div>
        )}
      </div>
    </div>
  );
}
