/**
 * features/tasks-spa/index.tsx
 * Tasks SPA shell — mounts inside the workspace tile modal.
 * Communicates only via shared-bus; never imports Leads/Deals SPA.
 */
import { useEffect, useState } from 'react';
import {
  CheckSquare, List, LayoutGrid, Plus, Search,
  Filter, SortAsc, RefreshCw,
} from 'lucide-react';
import { useTasksStore } from './model/tasks.store';
import { TaskKanbanBoard }  from './components/board/KanbanBoard';
import { TaskDrawer }       from './components/drawer/TaskDrawer';
import { CreateTaskModal }  from './components/modals/CreateTaskModal';
import { ListView }         from './views/ListView';
import {
  PRIORITY_ORDER, PRIORITY_LABEL, STATUS_ORDER, STATUS_LABEL,
} from './api/types';
import type { TaskPriority, TaskStatus } from './api/types';
import { ASSIGNEES } from './api/mock';
import s from './TasksSPA.module.css';

export function TasksSPA() {
  const {
    tasks, loading, load, processInboundEvents,
    viewMode, setViewMode,
    groupBy, setGroupBy,
    sortBy, setSortBy,
    filterStatus, setFilterStatus,
    filterAssignee, setFilterAssignee,
    filterPriority, setFilterPriority,
    searchQuery, setSearchQuery,
    openCreateModal,
  } = useTasksStore();

  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { load(); }, []);

  // Poll for incoming bus requests every 2s
  useEffect(() => {
    const id = setInterval(() => processInboundEvents(), 2000);
    return () => clearInterval(id);
  }, []);

  // Quick stats
  const total      = tasks.length;
  const overdue    = tasks.filter(t => t.status !== 'done' && t.dueAt && new Date(t.dueAt) < new Date()).length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const done       = tasks.filter(t => t.status === 'done').length;
  const critical   = tasks.filter(t => t.priority === 'critical' && t.status !== 'done').length;

  const fmtPct = (n: number, of: number) => of > 0 ? Math.round((n / of) * 100) : 0;

  if (loading) {
    return (
      <div className={s.loading}>
        <RefreshCw size={20} className={s.spin} />
        <span>Загрузка задач...</span>
      </div>
    );
  }

  return (
    <div className={s.root}>
      {/* ── Top bar ─────────────────────────────────────── */}
      <div className={s.topBar}>
        <div className={s.topBarLeft}>
          <CheckSquare size={18} className={s.icon} />
          <span className={s.spaTitle}>Задачи</span>

          {/* Quick stats pills */}
          <div className={s.statPills}>
            {overdue > 0 && (
              <span className={`${s.pill} ${s.pillRed}`}>
                {overdue} просрочено
              </span>
            )}
            {critical > 0 && (
              <span className={`${s.pill} ${s.pillOrange}`}>
                {critical} критических
              </span>
            )}
            <span className={s.pill}>
              {done}/{total} выполнено
            </span>
          </div>
        </div>

        <div className={s.topBarRight}>
          {/* Search */}
          <div className={s.searchBox}>
            <Search size={13} className={s.searchIcon} />
            <input
              className={s.searchInput}
              value={searchQuery}
              placeholder="Поиск задач..."
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter toggle */}
          <button
            className={`${s.iconBtn} ${filtersOpen ? s.iconBtnActive : ''}`}
            onClick={() => setFiltersOpen(v => !v)}
            title="Фильтры"
          >
            <Filter size={14} />
          </button>

          {/* View mode */}
          <div className={s.viewToggle}>
            <button
              className={`${s.viewBtn} ${viewMode === 'kanban' ? s.viewBtnActive : ''}`}
              onClick={() => setViewMode('kanban')}
              title="Kanban"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              className={`${s.viewBtn} ${viewMode === 'list' ? s.viewBtnActive : ''}`}
              onClick={() => setViewMode('list')}
              title="Список"
            >
              <List size={14} />
            </button>
          </div>

          {/* Create */}
          <button className={s.createBtn} onClick={() => openCreateModal()}>
            <Plus size={14} />
            Задача
          </button>
        </div>
      </div>

      {/* ── Filters bar ─────────────────────────────────── */}
      {filtersOpen && (
        <div className={s.filtersBar}>
          <div className={s.filterGroup}>
            <span className={s.filterLabel}>Статус</span>
            <select className={s.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | 'all')}>
              <option value="all">Все</option>
              {STATUS_ORDER.map(st => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
            </select>
          </div>

          <div className={s.filterGroup}>
            <span className={s.filterLabel}>Приоритет</span>
            <select className={s.filterSelect} value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | 'all')}>
              <option value="all">Все</option>
              {PRIORITY_ORDER.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </div>

          <div className={s.filterGroup}>
            <span className={s.filterLabel}>Исполнитель</span>
            <select className={s.filterSelect} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
              <option value="all">Все</option>
              {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className={s.filterGroup}>
            <span className={s.filterLabel}>Сортировка</span>
            <select className={s.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="dueAt">По сроку</option>
              <option value="priority">По приоритету</option>
              <option value="createdAt">По дате создания</option>
              <option value="updatedAt">По обновлению</option>
            </select>
          </div>

          {viewMode === 'list' && (
            <div className={s.filterGroup}>
              <span className={s.filterLabel}>Группировка</span>
              <select className={s.filterSelect} value={groupBy} onChange={e => setGroupBy(e.target.value as any)}>
                <option value="status">По статусу</option>
                <option value="priority">По приоритету</option>
                <option value="assignee">По исполнителю</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────── */}
      <div className={s.content}>
        {viewMode === 'kanban' ? <TaskKanbanBoard /> : <ListView />}
      </div>

      {/* ── Overlays ────────────────────────────────────── */}
      <TaskDrawer />
      <CreateTaskModal />
    </div>
  );
}
