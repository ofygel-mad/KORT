import { useState, useMemo } from 'react';
import type { Deal, DealStage } from '../api/types';
import { STAGE_LABEL, STAGE_ACCENT } from '../api/types';
import s from './AllDeals.module.css';

const SOURCE_LABEL: Record<string, string> = {
  instagram: 'Instagram', site: 'Сайт', referral: 'Реферал', ad: 'Реклама',
};

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₸';
}
function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: 'short' });
}
function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

type ViewTab = 'active' | 'won' | 'lost';
type SortKey = 'value' | 'date' | 'probability' | 'name';

export function AllDealsView({ deals, onOpenDrawer }: { deals: Deal[]; onOpenDrawer: (id: string) => void }) {
  const [tab,     setTab]     = useState<ViewTab>('active');
  const [search,  setSearch]  = useState('');
  const [stage,   setStage]   = useState<DealStage | ''>('');
  const [assignee,setAssignee]= useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const assignees = useMemo(() =>
    [...new Set(deals.map(d => d.assignedName).filter(Boolean))] as string[],
    [deals]
  );

  const filtered = useMemo(() => {
    let r = deals.filter(d =>
      tab === 'active' ? (d.stage !== 'won' && d.stage !== 'lost') :
      tab === 'won'    ? d.stage === 'won' :
                         d.stage === 'lost'
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(d =>
        d.fullName.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        (d.assignedName ?? '').toLowerCase().includes(q)
      );
    }
    if (stage)   r = r.filter(d => d.stage === stage);
    if (assignee) r = r.filter(d => d.assignedName === assignee);

    r.sort((a, b) => {
      let va: number, vb: number;
      if (sortKey === 'name') {
        const c = a.fullName.localeCompare(b.fullName, 'ru');
        return sortDir === 'asc' ? c : -c;
      }
      if (sortKey === 'value')       { va = a.value; vb = b.value; }
      else if (sortKey === 'probability') { va = a.probability; vb = b.probability; }
      else { va = new Date(a.updatedAt).getTime(); vb = new Date(b.updatedAt).getTime(); }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return r;
  }, [deals, tab, search, stage, assignee, sortKey, sortDir]);

  const totalValue = filtered.reduce((a, d) => a + d.value, 0);
  const weightedValue = filtered.filter(d => d.stage !== 'won' && d.stage !== 'lost')
    .reduce((a, d) => a + d.value * (d.probability / 100), 0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const Arr = ({ k }: { k: SortKey }) =>
    sortKey === k ? <span className={s.arr}>{sortDir === 'asc' ? '↑' : '↓'}</span> : null;

  const ACTIVE_STAGE_OPTIONS: DealStage[] = [
    'awaiting_meeting','meeting_done','proposal','contract','awaiting_payment',
  ];

  return (
    <div className={s.root}>
      {/* Tab row */}
      <div className={s.tabRow}>
        {(['active','won','lost'] as ViewTab[]).map(t => (
          <button
            key={t}
            className={`${s.tab} ${tab === t ? s.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'active' ? 'Активные' : t === 'won' ? '✓ Выигранные' : '✕ Проигранные'}
            <span className={s.tabCount}>
              {deals.filter(d =>
                t === 'active' ? (d.stage !== 'won' && d.stage !== 'lost') :
                t === 'won' ? d.stage === 'won' : d.stage === 'lost'
              ).length}
            </span>
          </button>
        ))}
        {/* Summary chips */}
        <div className={s.tabSpacer} />
        <div className={s.summaryChip}>
          <span className={s.summaryLabel}>Сумма</span>
          <span className={s.summaryVal}>{fmt(totalValue)}</span>
        </div>
        {tab === 'active' && weightedValue > 0 && (
          <div className={s.summaryChip}>
            <span className={s.summaryLabel}>Взвешенная</span>
            <span className={s.summaryVal} style={{ color: 'rgba(134,239,172,0.8)' }}>~{fmt(weightedValue)}</span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className={s.filterBar}>
        <input
          className={s.search}
          placeholder="Поиск по имени, телефону..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {tab === 'active' && (
          <select className={s.sel} value={stage} onChange={e => setStage(e.target.value as DealStage | '')}>
            <option value="">Все стадии</option>
            {ACTIVE_STAGE_OPTIONS.map(st => (
              <option key={st} value={st}>{STAGE_LABEL[st]}</option>
            ))}
          </select>
        )}
        <select className={s.sel} value={assignee} onChange={e => setAssignee(e.target.value)}>
          <option value="">Все менеджеры</option>
          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className={s.countChip}>{filtered.length} сделок</div>
      </div>

      {/* Table */}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.thead}>
            <tr>
              <th className={s.th} style={{ width: 34 }} />
              <th className={`${s.th} ${s.sortable}`} onClick={() => toggleSort('name')}>
                Контакт <Arr k="name" />
              </th>
              {tab === 'active' && <th className={s.th}>Стадия</th>}
              <th className={`${s.th} ${s.sortable}`} onClick={() => toggleSort('value')}>
                Сумма <Arr k="value" />
              </th>
              {tab === 'active' && (
                <th className={`${s.th} ${s.sortable}`} onClick={() => toggleSort('probability')}>
                  Вер-ть <Arr k="probability" />
                </th>
              )}
              <th className={s.th}>Источник</th>
              <th className={s.th}>Ответственный</th>
              <th className={`${s.th} ${s.sortable}`} onClick={() => toggleSort('date')}>
                {tab === 'won' ? 'Закрыта' : tab === 'lost' ? 'Проиграна' : 'Обновлена'} <Arr k="date" />
              </th>
              {tab === 'active' && <th className={s.th}>Закрытие</th>}
              {tab === 'lost'   && <th className={s.th}>Причина</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className={s.empty}>Нет сделок</td></tr>
            )}
            {filtered.map(deal => (
              <tr key={deal.id} className={s.row} onClick={() => onOpenDrawer(deal.id)}>
                <td className={s.td}>
                  <div className={s.avatar}>{deal.fullName[0]}</div>
                </td>
                <td className={s.td}>
                  <div className={s.name}>{deal.fullName}</div>
                  <div className={s.phone}>{deal.phone}</div>
                </td>
                {tab === 'active' && (
                  <td className={s.td}>
                    <span className={s.stagePill} style={{ color: STAGE_ACCENT[deal.stage], borderColor: `color-mix(in srgb, ${STAGE_ACCENT[deal.stage]} 30%, rgba(255,255,255,0.06))` }}>
                      <span className={s.stageDot} style={{ background: STAGE_ACCENT[deal.stage] }} />
                      {STAGE_LABEL[deal.stage]}
                    </span>
                  </td>
                )}
                <td className={s.td}>
                  <span className={s.value}>{fmt(deal.value)}</span>
                </td>
                {tab === 'active' && (
                  <td className={s.td}>
                    <div className={s.probWrap}>
                      <div className={s.probBar}>
                        <div className={s.probFill} style={{
                          width: `${deal.probability}%`,
                          background: deal.probability >= 75 ? '#22c55e' : deal.probability >= 45 ? '#f59e0b' : '#ef4444',
                        }} />
                      </div>
                      <span className={s.probVal}>{deal.probability}%</span>
                    </div>
                  </td>
                )}
                <td className={s.td}>
                  <span className={s.source}>{SOURCE_LABEL[deal.source] ?? deal.source}</span>
                </td>
                <td className={s.td}>
                  <span className={s.assignee}>{deal.assignedName ?? '—'}</span>
                </td>
                <td className={s.td}>
                  <span className={s.dateVal}>
                    {tab === 'won'  ? fmtDate(deal.wonAt) :
                     tab === 'lost' ? fmtDate(deal.lostAt) :
                     `${daysAgo(deal.updatedAt)}д назад`}
                  </span>
                </td>
                {tab === 'active' && (
                  <td className={s.td}>
                    <span className={deal.expectedCloseAt && new Date(deal.expectedCloseAt) < new Date() ? s.overdueDate : s.dateVal}>
                      {fmtDate(deal.expectedCloseAt)}
                    </span>
                  </td>
                )}
                {tab === 'lost' && (
                  <td className={s.td}>
                    <span className={s.lostReason}>{deal.lostReason ?? '—'}</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
