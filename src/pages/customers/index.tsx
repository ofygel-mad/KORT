import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, ChevronUp, ChevronDown, Phone, Mail,
  MoreHorizontal, Trash2, Edit3, Filter, Download,
  Users,
} from 'lucide-react';
import { api } from '../../shared/api/client';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Skeleton } from '../../shared/ui/Skeleton';
import { EmptyState } from '../../shared/ui/EmptyState';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './Customers.module.css';

interface Customer {
  id: string;
  full_name: string;
  company_name: string;
  phone: string;
  email: string;
  status: string;
  source: string;
  owner: { id: string; full_name: string } | null;
  created_at: string;
  last_contact_at?: string | null;
}

interface CustomerList {
  results: Customer[];
  count: number;
  next: string | null;
  previous: string | null;
}

const STATUS_MAP: Record<string, { variant: 'success' | 'info' | 'default' | 'warning'; label: string }> = {
  new:      { variant: 'info',    label: 'Новый' },
  active:   { variant: 'success', label: 'Активный' },
  inactive: { variant: 'default', label: 'Неактивный' },
  archived: { variant: 'default', label: 'Архив' },
};

const STATUS_FILTERS = [
  { key: '',         label: 'Все' },
  { key: 'new',      label: 'Новые' },
  { key: 'active',   label: 'Активные' },
  { key: 'inactive', label: 'Неактивные' },
];

type SortKey  = 'full_name' | 'company_name' | 'created_at' | 'last_contact_at';
type SortDir  = 'asc' | 'desc';

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export default function CustomersPage() {
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();

  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('');
  const [sortKey,   setSortKey]   = useState<SortKey>('created_at');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');
  const [page,      setPage]      = useState(1);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(search, 280);

  const { data, isLoading } = useQuery<CustomerList>({
    queryKey: ['customers', debouncedSearch, status, sortKey, sortDir, page],
    queryFn: () =>
      api.get('/customers/', {
        params: {
          search:   debouncedSearch || undefined,
          status:   status || undefined,
          ordering: `${sortDir === 'desc' ? '-' : ''}${sortKey}`,
          page,
          page_size: 20,
        },
      }),
    keepPreviousData: true,
  });

  const totalPages = Math.ceil((data?.count ?? 0) / 20);

  // Sorting
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Selection
  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const ids = data?.results.map(c => c.id) ?? [];
    setSelected(prev =>
      prev.size === ids.length ? new Set() : new Set(ids)
    );
  }, [data?.results]);

  const SortIcon = ({ col }: { col: SortKey }) => (
    sortKey === col
      ? (sortDir === 'asc' ? <ChevronUp size={12} className={`${styles.sortIcon} ${styles.sortIconActive}`} /> : <ChevronDown size={12} className={`${styles.sortIcon} ${styles.sortIconActive}`} />)
      : <ChevronDown size={12} className={styles.sortIcon} />
  );

  const customers = data?.results ?? [];
  const hasSelection = selected.size > 0;
  const hasActiveFilters = Boolean(search.trim() || status);

  return (
    <div className={styles.page}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            Клиенты
            {data?.count !== undefined && (
              <span className={styles.titleCount}>{data.count}</span>
            )}
          </h1>
          <p className={styles.subtitle}>Управляйте базой клиентов</p>
        </div>
        <div className={styles.headerActions}>
          {!isMobile && (
            <Button variant="secondary" size="sm" icon={<Download size={13} />}>
              Экспорт
            </Button>
          )}
          <Button
            size="sm"
            icon={<Plus size={13} />}
            onClick={() => window.dispatchEvent(new CustomEvent('kort:new-customer'))}
          >
            Добавить
          </Button>
        </div>
      </div>

      <div className={styles.scenarioRail}>
        <div className={styles.scenarioCopy}>
          <span className={styles.scenarioEyebrow}>List pattern</span>
          <div className={styles.scenarioText}>Поиск, фильтр, выбор и переход в карточку клиента собраны в один ритм без лишних ответвлений.</div>
        </div>
        <div className={styles.scenarioChips}>
          <span className={styles.scenarioChip}>Поиск</span>
          <span className={styles.scenarioChip}>Фильтр</span>
          <span className={styles.scenarioChip}>Открыть профиль</span>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Поиск по имени, компании, телефону…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className={styles.filterChips}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              className={`${styles.filterChip}${status === f.key ? ' ' + styles.filterChipActive : ''}`}
              onClick={() => { setStatus(f.key); setPage(1); }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className={styles.toolbarRight}>
          <Button variant="ghost" size="sm" icon={<Filter size={13} />}>
            Фильтры
          </Button>
        </div>
      </div>

      {/* ── Bulk bar ────────────────────────────────────────── */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={styles.bulkBar}
          >
            <span className={styles.bulkCount}>Выбрано: {selected.size}</span>
            <div className={styles.bulkActions}>
              <Button variant="ghost" size="sm">Изменить статус</Button>
              <Button variant="danger" size="sm" icon={<Trash2 size={13} />}>
                Удалить
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Отменить
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className={styles.tableWrap}>
        {isLoading ? (
          <div>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className={styles.skeletonTr}>
                <Skeleton width={15} height={15} className={styles.skeletonCheck} />
                <Skeleton width={30} height={30} className={styles.skeletonAvatar} />
                <div className={styles.skeletonCustomerMeta}>
                  <Skeleton height={13} width="45%" className={styles.skeletonLinePrimary} />
                  <Skeleton height={11} width="25%" />
                </div>
                <Skeleton height={11} width="18%" />
                <Skeleton height={20} width={60} />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className={styles.tableEmpty}>
            <EmptyState
              icon={<Users size={24} />}
              title={hasActiveFilters ? 'Ничего не найдено' : 'Клиентов пока нет'}
              description={hasActiveFilters ? 'Сузили выбор слишком сильно. Сбросьте фильтры или вернитесь к полному списку.' : 'Добавьте первого клиента или импортируйте базу'}
              action={!hasActiveFilters ? {
                label: 'Добавить клиента',
                onClick: () => window.dispatchEvent(new CustomEvent('kort:new-customer')),
              } : undefined}
            />
            {hasActiveFilters && (
              <div className={styles.emptyRecoveryRail}>
                <button className={styles.emptyRecoveryBtn} onClick={() => { setSearch(''); setStatus(''); setPage(1); }}>
                  Сбросить поиск и фильтры
                </button>
                <button className={styles.emptyRecoveryBtn} onClick={() => navigate('/imports')}>
                  Импортировать клиентов
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={`${styles.th} ${styles.thCheck}`}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selected.size === customers.length && customers.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className={`${styles.th} ${styles.thSortable} ${styles.thCustomer}`} onClick={() => handleSort('full_name')}>
                    Клиент <SortIcon col="full_name" />
                  </th>
                  {!isMobile && (
                    <th className={`${styles.th} ${styles.thPhone}`}>Телефон</th>
                  )}
                  {!isMobile && (
                    <th className={`${styles.th} ${styles.thStatus}`}>Статус</th>
                  )}
                  {!isMobile && (
                    <th className={`${styles.th} ${styles.thOwner}`}>Владелец</th>
                  )}
                  <th className={`${styles.th} ${styles.thSortable} ${styles.thCreated}`} onClick={() => handleSort('created_at')}>
                    Добавлен <SortIcon col="created_at" />
                  </th>
                  <th className={`${styles.th} ${styles.thActions}`}>
                    {/* actions */}
                  </th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {customers.map((c, idx) => {
                  const sm = STATUS_MAP[c.status] ?? STATUS_MAP.new;
                  const isSelected = selected.has(c.id);
                  return (
                    <motion.tr
                      key={c.id}
                      className={`${styles.tr}${isSelected ? ' ' + styles.trSelected : ''}`}
                      onClick={() => navigate(`/customers/${c.id}`)}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.025, duration: 0.2 }}
                    >
                      <td className={`${styles.td} ${styles.tdCheck}`} onClick={e => toggleSelect(c.id, e)}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={isSelected}
                          onChange={() => {}}
                        />
                      </td>
                      <td className={styles.td}>
                        <div className={styles.customerCell}>
                          <div className={styles.avatar}>{initials(c.full_name)}</div>
                          <div className={styles.customerInfo}>
                            <div className={styles.customerName}>{c.full_name}</div>
                            {c.company_name && (
                              <div className={styles.customerCompany}>{c.company_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {!isMobile && (
                        <td className={styles.td}>
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className={styles.phoneLink}
                              onClick={e => e.stopPropagation()}
                            >
                              {c.phone}
                            </a>
                          )}
                        </td>
                      )}
                      {!isMobile && (
                        <td className={styles.td}>
                          <Badge variant={sm.variant} size="sm">{sm.label}</Badge>
                        </td>
                      )}
                      {!isMobile && (
                        <td className={`${styles.td} ${styles.muted}`}>
                          {c.owner?.full_name ?? '—'}
                        </td>
                      )}
                      <td className={`${styles.td} ${styles.muted}`}>
                        {format(new Date(c.created_at), 'd MMM', { locale: ru })}
                      </td>
                      <td className={`${styles.td} ${styles.tdActions}`}>
                        <div className={styles.rowActions}>
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className={styles.rowActionBtn}
                              onClick={e => e.stopPropagation()}
                              title="Позвонить"
                            >
                              <Phone size={13} />
                            </a>
                          )}
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className={styles.rowActionBtn}
                              onClick={e => e.stopPropagation()}
                              title="Написать"
                            >
                              <Mail size={13} />
                            </a>
                          )}
                          <button
                            className={styles.rowActionBtn}
                            onClick={e => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}
                            title="Открыть"
                          >
                            <Edit3 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <span className={styles.paginationInfo}>
                  Показано {(page - 1) * 20 + 1}–{Math.min(page * 20, data?.count ?? 0)} из {data?.count ?? 0}
                </span>
                <div className={styles.paginationControls}>
                  <button
                    className={styles.pageBtn}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <button
                        key={p}
                        className={`${styles.pageBtn}${p === page ? ' ' + styles.pageBtnActive : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    className={styles.pageBtn}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
