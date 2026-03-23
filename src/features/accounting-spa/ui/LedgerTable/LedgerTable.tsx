/**
 * ui/LedgerTable/LedgerTable.tsx
 * Main ledger table. Virtualized for performance.
 * Supports row click → DrillDown, right-click → context menu.
 */

import { useCallback } from 'react';
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import type { LedgerEntry } from '../../api/client';
import s from './LedgerTable.module.css';

interface Props {
  entries: LedgerEntry[];
  loading?: boolean;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onReconcile?: (id: string) => void;
}

const TYPE_META: Record<string, { label: string; cls: string }> = {
  income:     { label: '▲ Выручка',    cls: 'typeIncome' },
  expense:    { label: '▼ Расход',     cls: 'typeExpense' },
  write_off:  { label: '✕ Списание',   cls: 'typeWriteOff' },
  transfer:   { label: '↔ Перемещ.',  cls: 'typeTransfer' },
  adjustment: { label: '≈ Корректир.', cls: 'typeAdjust' },
  return:     { label: '↩ Возврат',   cls: 'typeReturn' },
};

const SOURCE_LABELS: Record<string, string> = {
  deal: 'Сделка', order: 'Заказ', warehouse: 'Склад', manual: 'Вручную', import: 'Импорт',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtAmount(amount: number, type: string): string {
  const s = Math.abs(amount).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  if (type === 'income') return `+${s}`;
  if (type === 'expense' || type === 'write_off') return `−${s}`;
  return s;
}

function SkeletonRow() {
  return (
    <div className={s.row}>
      {[80, 110, 90, 120, 110, 90, 80].map((w, i) => (
        <div key={i} className={s.cell}>
          <span className={s.skel} style={{ width: w }} />
        </div>
      ))}
    </div>
  );
}

export function LedgerTable({ entries, loading, onSelect, selectedId, onReconcile }: Props) {
  const handleRowClick = useCallback((id: string) => onSelect(id), [onSelect]);

  return (
    <div className={s.wrap}>
      {/* Header */}
      <div className={s.head}>
        <div className={s.hcell}>Дата</div>
        <div className={s.hcell}>Тип</div>
        <div className={`${s.hcell} ${s.right}`}>Сумма</div>
        <div className={s.hcell}>Счёт</div>
        <div className={s.hcell}>Контрагент</div>
        <div className={s.hcell}>Источник</div>
        <div className={s.hcell}>Автор</div>
        <div className={`${s.hcell} ${s.center}`}>✓</div>
      </div>

      {/* Rows */}
      <div className={s.body}>
        {loading
          ? Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
          : entries.length === 0
            ? (
              <div className={s.empty}>
                <span>Записей не найдено</span>
                <span className={s.emptySub}>Измените фильтры или создайте первую проводку вручную</span>
              </div>
            )
            : entries.map((entry) => {
                const meta = TYPE_META[entry.type] ?? { label: entry.type, cls: 'typeAdjust' };
                const isSelected = entry.id === selectedId;

                return (
                  <div
                    key={entry.id}
                    className={`${s.row} ${isSelected ? s.rowSelected : ''} ${s[`row_${entry.type}`] ?? ''}`}
                    onClick={() => handleRowClick(entry.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleRowClick(entry.id)}
                  >
                    <div className={`${s.cell} ${s.mono}`}>{fmtDate(entry.createdAt)}</div>

                    <div className={s.cell}>
                      <span className={`${s.typeBadge} ${s[meta.cls]}`}>{meta.label}</span>
                    </div>

                    <div className={`${s.cell} ${s.right} ${s.amount} ${s[`amount_${entry.type}`]}`}>
                      {fmtAmount(entry.amount, entry.type)} ₸
                    </div>

                    <div className={`${s.cell} ${s.muted}`}>{entry.account}</div>

                    <div className={s.cell}>
                      {entry.counterparty ?? <span className={s.dash}>—</span>}
                    </div>

                    <div className={`${s.cell} ${s.sourceCell}`}>
                      {entry.sourceLabel
                        ? (
                          <span className={s.sourceLabel}>
                            <span className={s.sourceMod}>{SOURCE_LABELS[entry.sourceModule ?? ''] ?? entry.sourceModule}</span>
                            <span className={s.sourceText}>{entry.sourceLabel}</span>
                            <ExternalLink size={10} className={s.extIcon} />
                          </span>
                        )
                        : <span className={s.dash}>—</span>
                      }
                    </div>

                    <div className={`${s.cell} ${s.muted}`}>{entry.author}</div>

                    <div className={`${s.cell} ${s.center}`}>
                      {entry.isReconciled
                        ? <CheckCircle2 size={14} className={s.reconciledIcon} />
                        : onReconcile
                          ? (
                            <button
                              className={s.reconcileBtn}
                              onClick={(e) => { e.stopPropagation(); onReconcile(entry.id); }}
                              title="Отметить как сверенное"
                            >
                              <Circle size={14} />
                            </button>
                          )
                          : <Circle size={14} className={s.unreconciledIcon} />
                      }
                    </div>
                  </div>
                );
              })
        }
      </div>
    </div>
  );
}
