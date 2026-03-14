/**
 * AllLeadsView — replaces the broken double-kanban.
 * Clean table with filter bar, sortable columns, opens LeadDrawer on row click.
 */
import { useState, useMemo } from 'react';
import type { Lead } from '../api/types';
import s from './AllLeads.module.css';

// ── helpers ──────────────────────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  new: 'Новый', in_progress: 'В работе', no_answer: 'Недозвон',
  thinking: 'Думает', meeting_set: 'Встреча назн.', junk: 'Брак',
  awaiting_meeting: 'Ожидает встречи', meeting_done: 'Встреча пров.',
  proposal: 'Подготовка КП', contract: 'Договор',
  awaiting_payment: 'Ожидание оплаты', won: 'Успешно', lost: 'Слив',
};

const STAGE_COLOR: Record<string, string> = {
  new: '#3b82f6', in_progress: '#8b5cf6', no_answer: '#f59e0b',
  thinking: '#ec4899', meeting_set: '#22c55e', junk: '#6b7280',
  awaiting_meeting: '#3b82f6', meeting_done: '#8b5cf6', proposal: '#f59e0b',
  contract: '#ec4899', awaiting_payment: '#f97316', won: '#22c55e', lost: '#ef4444',
};

const SOURCE_LABEL: Record<string, string> = {
  instagram: 'Instagram', site: 'Сайт', referral: 'Реферал', ad: 'Реклама',
};

function fmt(n?: number) {
  if (!n) return '—';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₸';
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: 'short' });
}

function isStale(lead: Lead) {
  return (Date.now() - new Date(lead.updatedAt).getTime()) / 3600000 > 24;
}

// ── filter options ────────────────────────────────────────────
const PIPELINE_OPTIONS = [
  { value: '', label: 'Все воронки' },
  { value: 'qualifier', label: 'Лидогенерация' },
  { value: 'closer', label: 'Сделки' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Все источники' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'site', label: 'Сайт' },
  { value: 'referral', label: 'Реферал' },
  { value: 'ad', label: 'Реклама' },
];

// ── component ─────────────────────────────────────────────────
export function AllLeadsView({ leads, onOpenDrawer }: { leads: Lead[]; onOpenDrawer: (id: string) => void }) {
  const [pipeline, setPipeline] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'budget' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let r = [...leads];
    if (pipeline) r = r.filter(l => l.pipeline === pipeline);
    if (source)   r = r.filter(l => l.source === source);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(l =>
        l.fullName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.assignedName ?? '').toLowerCase().includes(q)
      );
    }
    r.sort((a, b) => {
      let va: number, vb: number;
      if (sortKey === 'name') {
        va = a.fullName.localeCompare(b.fullName, 'ru');
        return sortDir === 'asc' ? va : -va;
      }
      if (sortKey === 'budget') {
        va = a.budget ?? 0; vb = b.budget ?? 0;
      } else {
        va = new Date(a.updatedAt).getTime();
        vb = new Date(b.updatedAt).getTime();
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return r;
  }, [leads, pipeline, source, search, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortArrow = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? <span className={s.arrow}>{sortDir === 'asc' ? '↑' : '↓'}</span> : null;

  return (
    <div className={s.root}>
      {/* Filter bar */}
      <div className={s.filterBar}>
        <input
          className={s.filterSearch}
          placeholder="Поиск по имени, телефону..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className={s.filterSelect} value={pipeline} onChange={e => setPipeline(e.target.value)}>
          {PIPELINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={s.filterSelect} value={source} onChange={e => setSource(e.target.value)}>
          {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className={s.filterCount}>{filtered.length} лид{filtered.length === 1 ? '' : 'ов'}</div>
      </div>

      {/* Table */}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.thead}>
            <tr>
              <th className={s.th} style={{ width: 36 }}></th>
              <th className={`${s.th} ${s.sortable}`} onClick={() => toggleSort('name')}>
                Имя <SortArrow k="name" />
              </th>
              <th className={s.th}>Телефон</th>
              <th className={s.th}>Источник</th>
              <th className={s.th}>Стадия</th>
              <th className={s.th}>Воронка</th>
              <th className={`${s.th} ${s.sortable}`} onClick={() => toggleSort('budget')}>
                Бюджет <SortArrow k="budget" />
              </th>
              <th className={s.th}>Ответственный</th>
              <th className={`${s.th} ${s.sortable}`} onClick={() => toggleSort('date')}>
                Обновлён <SortArrow k="date" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className={s.empty}>Нет лидов по выбранным фильтрам</td>
              </tr>
            )}
            {filtered.map(lead => (
              <tr
                key={lead.id}
                className={`${s.row} ${isStale(lead) ? s.rowStale : ''}`}
                onClick={() => onOpenDrawer(lead.id)}
              >
                <td className={s.td}>
                  <div className={s.avatar}>{lead.fullName[0]}</div>
                </td>
                <td className={s.td}>
                  <div className={s.name}>{lead.fullName}</div>
                  {isStale(lead) && <div className={s.staleTag}>Без движения 24ч+</div>}
                </td>
                <td className={`${s.td} ${s.mono}`}>{lead.phone}</td>
                <td className={s.td}>
                  <span className={s.sourceBadge}>{SOURCE_LABEL[lead.source] ?? lead.source}</span>
                </td>
                <td className={s.td}>
                  <span
                    className={s.stageDot}
                    style={{ background: STAGE_COLOR[lead.stage] ?? '#6b7280' }}
                  />
                  <span className={s.stageLabel}>{STAGE_LABELS[lead.stage] ?? lead.stage}</span>
                </td>
                <td className={s.td}>
                  <span className={s.pipelineBadge}>
                    {lead.pipeline === 'qualifier' ? 'Лидогенерация' : 'Сделки'}
                  </span>
                </td>
                <td className={`${s.td} ${s.budget}`}>{fmt(lead.budget)}</td>
                <td className={`${s.td} ${s.assignee}`}>{lead.assignedName ?? '—'}</td>
                <td className={`${s.td} ${s.dateCell}`}>{fmtDate(lead.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
