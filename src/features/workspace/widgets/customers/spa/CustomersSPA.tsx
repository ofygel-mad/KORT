/**
 * Customers SPA — full working environment inside the tile modal.
 * Lives at: src/features/workspace/widgets/customers/spa/CustomersSPA.tsx
 */
import { useState } from 'react';
import { Search, Plus, ChevronRight, User, Building2, Tag } from 'lucide-react';
import type { WorkspaceSnapshot } from '../../../model/types';
import s from './CustomersSPA.module.css';

const STATUS_META: Record<string, { label: string; color: string }> = {
  active:   { label: 'Активный',    color: '#22c55e' },
  new:      { label: 'Новый',       color: '#3b82f6' },
  inactive: { label: 'Неактивный',  color: '#6b7280' },
  archived: { label: 'Архив',       color: '#9ca3af' },
};

interface Props { snapshot?: WorkspaceSnapshot; }

export function CustomersSPA({ snapshot }: Props) {
  const [query, setQuery] = useState('');
  const rows = snapshot?.recentCustomers ?? [];
  const filtered = rows.filter(r =>
    r.fullName.toLowerCase().includes(query.toLowerCase()) ||
    r.companyName?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={s.root}>
      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input
            className={s.search}
            placeholder="Поиск клиентов..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <button className={s.addBtn}>
          <Plus size={14} />
          Добавить
        </button>
      </div>

      {/* Stats bar */}
      <div className={s.statsBar}>
        <div className={s.stat}>
          <span className={s.statNum}>{snapshot?.customersCount ?? 0}</span>
          <span className={s.statLabel}>Всего клиентов</span>
        </div>
        <div className={s.stat}>
          <span className={s.statNum}>{rows.filter(r => r.status === 'active').length}</span>
          <span className={s.statLabel}>Активных</span>
        </div>
        <div className={s.stat}>
          <span className={s.statNum}>{rows.filter(r => r.status === 'new').length}</span>
          <span className={s.statLabel}>Новых</span>
        </div>
      </div>

      {/* Table */}
      <div className={s.tableWrap}>
        <div className={s.tableHead}>
          <span><User size={11} /> Клиент</span>
          <span><Building2 size={11} /> Компания</span>
          <span><Tag size={11} /> Статус</span>
          <span></span>
        </div>
        <div className={s.tableBody}>
          {filtered.length === 0 ? (
            <div className={s.empty}>
              {query ? 'Ничего не найдено' : 'Клиенты ещё не добавлены'}
            </div>
          ) : filtered.map(row => {
            const meta = STATUS_META[row.status] ?? { label: row.status, color: '#6b7280' };
            return (
              <div key={row.id} className={s.row}>
                <div className={s.rowName}>
                  <div className={s.avatar}>{row.fullName[0]}</div>
                  <span>{row.fullName}</span>
                </div>
                <span className={s.rowCompany}>{row.companyName || '—'}</span>
                <span className={s.badge} style={{ '--badge-color': meta.color } as React.CSSProperties}>
                  {meta.label}
                </span>
                <button className={s.rowAction}><ChevronRight size={14} /></button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
