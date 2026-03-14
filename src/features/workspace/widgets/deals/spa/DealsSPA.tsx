/**
 * Deals SPA — Kanban + list view for deal pipeline management.
 * Lives at: src/features/workspace/widgets/deals/spa/DealsSPA.tsx
 */
import { useState } from 'react';
import { Search, Plus, TrendingUp, Circle } from 'lucide-react';
import type { WorkspaceSnapshot } from '../../../model/types';
import s from './DealsSPA.module.css';

const STAGES = ['Первый контакт', 'Переговоры', 'Предложение', 'Закрытие'];
const STAGE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e'];

interface Props { snapshot?: WorkspaceSnapshot; }

export function DealsSPA({ snapshot }: Props) {
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [query, setQuery] = useState('');
  const deals = snapshot?.stalledDeals ?? [];
  const filtered = deals.filter(d =>
    d.title.toLowerCase().includes(query.toLowerCase()) ||
    d.customerName?.toLowerCase().includes(query.toLowerCase())
  );

  const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input className={s.search} placeholder="Поиск сделок..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className={s.viewToggle}>
          {(['list','kanban'] as const).map(v => (
            <button key={v} className={`${s.viewBtn} ${view === v ? s.viewBtnActive : ''}`} onClick={() => setView(v)}>
              {v === 'list' ? 'Список' : 'Канбан'}
            </button>
          ))}
        </div>
        <button className={s.addBtn}><Plus size={14} /> Сделка</button>
      </div>

      <div className={s.summary}>
        <div className={s.summaryItem}>
          <TrendingUp size={14} />
          <span>Открытых: <strong>{deals.length}</strong></span>
        </div>
        <div className={s.summaryItem}>
          <span>Сумма: <strong>{fmt(deals.reduce((a, d) => a + (d.amount || 0), 0))}</strong></span>
        </div>
      </div>

      {view === 'list' ? (
        <div className={s.list}>
          <div className={s.listHead}>
            <span>Сделка</span><span>Клиент</span><span>Стадия</span><span>Сумма</span>
          </div>
          {filtered.length === 0 ? (
            <div className={s.empty}>{query ? 'Ничего не найдено' : 'Сделок нет'}</div>
          ) : filtered.map(deal => (
            <div key={deal.id} className={s.listRow}>
              <div className={s.dealTitle}>{deal.title}</div>
              <span className={s.dealCustomer}>{deal.customerName}</span>
              <span className={s.dealStage}>
                <Circle size={8} fill={STAGE_COLORS[STAGES.indexOf(deal.stage)] ?? '#6b7280'} color="transparent" />
                {deal.stage}
              </span>
              <span className={s.dealAmount}>{fmt(deal.amount)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={s.kanban}>
          {STAGES.map((stage, i) => (
            <div key={stage} className={s.kanbanCol}>
              <div className={s.kanbanColHeader} style={{ '--col-color': STAGE_COLORS[i] } as React.CSSProperties}>
                <span className={s.kanbanColDot} />
                <span>{stage}</span>
                <span className={s.kanbanColCount}>{deals.filter(d => d.stage === stage).length}</span>
              </div>
              <div className={s.kanbanCards}>
                {deals.filter(d => d.stage === stage).map(deal => (
                  <div key={deal.id} className={s.kanbanCard}>
                    <div className={s.kanbanCardTitle}>{deal.title}</div>
                    <div className={s.kanbanCardMeta}>{deal.customerName} · {fmt(deal.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
