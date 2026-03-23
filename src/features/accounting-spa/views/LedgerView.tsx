/**
 * views/LedgerView.tsx
 * Main ledger tab: filters + table + drill-down.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAccountingStore } from '../model/store';
import { accountingApi } from '../api/client';
import { LedgerTable } from '../ui/LedgerTable/LedgerTable';
import { DrillDownDrawer } from '../ui/DrillDownDrawer/DrillDownDrawer';
import s from './LedgerView.module.css';

const ENTRY_TYPES = [
  { value: '', label: 'Все типы' },
  { value: 'income', label: 'Выручка' },
  { value: 'expense', label: 'Расход' },
  { value: 'write_off', label: 'Списание' },
  { value: 'transfer', label: 'Перемещение' },
  { value: 'return', label: 'Возврат' },
];

export function LedgerView() {
  const { filters, setFilter, selectedEntryId, setSelectedEntry, setCreateEntryOpen } = useAccountingStore();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['accounting-entries', filters],
    queryFn: () => accountingApi.listEntries({
      period: filters.period || undefined,
      type: filters.type || undefined,
      search: filters.search || undefined,
      page: filters.page,
      limit: 60,
    }),
  });

  const reconcileMut = useMutation({
    mutationFn: (id: string) => accountingApi.reconcile(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-entries'] });
      toast.success('Сверено');
    },
  });

  const entries = data?.results ?? [];
  const total = data?.total ?? 0;

  const selectedEntry = selectedEntryId
    ? entries.find((e) => e.id === selectedEntryId) ?? null
    : null;

  return (
    <div className={s.root}>
      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={13} className={s.searchIcon} />
          <input
            className={`kort-input ${s.searchInput}`}
            placeholder="Поиск по контрагенту, источнику, категории…"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </div>

        <select
          className={`kort-input ${s.select}`}
          value={filters.type}
          onChange={(e) => setFilter('type', e.target.value)}
        >
          {ENTRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <input
          type="month"
          className={`kort-input ${s.monthInput}`}
          value={filters.period}
          onChange={(e) => setFilter('period', e.target.value)}
        />

        <button className={s.refreshBtn} onClick={() => refetch()} title="Обновить">
          <RefreshCw size={14} />
        </button>

        <button className={s.addBtn} onClick={() => setCreateEntryOpen(true)}>
          <Plus size={14} /> Проводка
        </button>
      </div>

      {/* Table + drawer layout */}
      <div className={`${s.tableArea} ${selectedEntry ? s.tableAreaNarrow : ''}`}>
        <LedgerTable
          entries={entries}
          loading={isLoading}
          onSelect={setSelectedEntry}
          selectedId={selectedEntryId}
          onReconcile={(id) => reconcileMut.mutate(id)}
        />

        {/* Pagination */}
        {total > 60 && (
          <div className={s.pagination}>
            <button
              className={s.pageBtn}
              disabled={filters.page <= 1}
              onClick={() => setFilter('page', filters.page - 1)}
            >← Назад</button>
            <span className={s.pageInfo}>
              {((filters.page - 1) * 60) + 1}–{Math.min(filters.page * 60, total)} из {total}
            </span>
            <button
              className={s.pageBtn}
              disabled={filters.page * 60 >= total}
              onClick={() => setFilter('page', filters.page + 1)}
            >Вперёд →</button>
          </div>
        )}

        {!isLoading && (
          <div className={s.footer}>
            Показано {entries.length} из {total} записей
          </div>
        )}
      </div>

      {/* Drill-down drawer */}
      <DrillDownDrawer
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}
