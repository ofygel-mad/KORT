import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Search, SlidersHorizontal, Users } from 'lucide-react';
import type { Lead } from '../api/types';
import { PIPELINE_META, getLeadStageMeta } from '../model/stage-meta';
import s from './AllLeads.module.css';

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

function getLeadWord(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return 'лид';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'лида';
  return 'лидов';
}

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

  const SortArrow = ({ column }: { column: typeof sortKey }) => {
    if (sortKey !== column) return null;
    return sortDir === 'asc'
      ? <ArrowUp size={13} className={s.arrow} />
      : <ArrowDown size={13} className={s.arrow} />;
  };

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        <div className={s.toolbarIntro}>
          <span className={s.toolbarBadge}>
            <SlidersHorizontal size={12} />
            Каталог лидов
          </span>
          <div className={s.toolbarSummary}>
            <span className={s.toolbarValue}>{filtered.length}</span>
            <span className={s.toolbarLabel}>{getLeadWord(filtered.length)} после фильтров</span>
          </div>
        </div>

        <div className={s.controls}>
          <label className={s.searchField}>
            <Search size={14} className={s.searchIcon} />
            <input
              className={s.filterSearch}
              placeholder="Поиск по имени, телефону или ответственному"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>

          <select className={s.filterSelect} value={pipeline} onChange={e => setPipeline(e.target.value)}>
            {PIPELINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className={s.filterSelect} value={source} onChange={e => setSource(e.target.value)}>
            {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.thead}>
            <tr>
              <th className={s.th} style={{ width: 52 }}></th>
              <th className={`${s.th} ${s.sortable}`} onClick={() => toggleSort('name')}>
                Имя <SortArrow column="name" />
              </th>
              <th className={s.th}>Телефон</th>
              <th className={s.th}>Источник</th>
              <th className={s.th}>Стадия</th>
              <th className={s.th}>Воронка</th>
              <th className={`${s.th} ${s.sortable}`} onClick={() => toggleSort('budget')}>
                Бюджет <SortArrow column="budget" />
              </th>
              <th className={s.th}>Ответственный</th>
              <th className={`${s.th} ${s.sortable}`} onClick={() => toggleSort('date')}>
                Обновлён <SortArrow column="date" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className={s.emptyCell}>
                  <div className={s.emptyState}>
                    <Users size={26} className={s.emptyIcon} />
                    <div className={s.emptyTitle}>Ничего не найдено</div>
                    <div className={s.emptyText}>
                      Смените фильтры или расширьте запрос, чтобы снова увидеть поток лидов.
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(lead => {
              const stageMeta = getLeadStageMeta(lead.stage);
              const pipelineMeta = PIPELINE_META[lead.pipeline];

              return (
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
                    <span className={s.stageBadge} data-tone={stageMeta.tone}>
                      <span className={s.stageDot} />
                      {stageMeta.shortLabel}
                    </span>
                  </td>
                  <td className={s.td}>
                    <span className={s.pipelineBadge} data-tone={pipelineMeta.tone}>
                      {pipelineMeta.label}
                    </span>
                  </td>
                  <td className={`${s.td} ${s.budget}`}>{fmt(lead.budget)}</td>
                  <td className={`${s.td} ${s.assignee}`}>{lead.assignedName ?? '—'}</td>
                  <td className={`${s.td} ${s.dateCell}`}>{fmtDate(lead.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
