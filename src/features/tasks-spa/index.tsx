/**
 * features/tasks-spa/index.tsx
 * Tasks SPA shell — mounts inside the workspace tile modal.
 * Communicates only via shared-bus; never imports Leads/Deals SPA.
 */
import { useEffect, useState, useMemo } from 'react';
import {
  CheckSquare, List, LayoutGrid, Plus, Search,
  Filter, SortAsc, RefreshCw,
} from 'lucide-react';
import { useTasksStore } from './model/tasks.store';
import { useTileTasksUI } from './model/tile-ui.store';
import type { Task } from './api/types';
import { TaskKanbanBoard }  from './components/board/KanbanBoard';
import { TaskDrawer }       from './components/drawer/TaskDrawer';
import { CreateTaskModal }  from './components/modals/CreateTaskModal';
import { ListView }         from './views/ListView';
import {
  PRIORITY_ORDER, PRIORITY_LABEL, STATUS_ORDER, STATUS_LABEL,
} from './api/types';
import type { TaskPriority, TaskStatus } from './api/types';
import { ASSIGNEES } from './api/client';
import { useSharedBus } from '../shared-bus';
import s from './TasksSPA.module.css';

interface Props { tileId: string; }

export function TasksSPA({ tileId }: Props) {
  const { tasks, loading, load } = useTasksStore();
  const {
    viewMode, setViewMode,
    groupBy, setGroupBy,
    sortBy, setSortBy,
    filterStatus, setFilterStatus,
    filterAssignee, setFilterAssignee,
    filterPriority, setFilterPriority,
    searchQuery, setSearchQuery,
    openCreateModal,
  } = useTileTasksUI(tileId);

  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { load(); }, []);

  // Poll bus and open per-tile create modal
  useEffect(() => {
    const id = setInterval(() => {
      const requests = useSharedBus.getState().consumeTaskRequests();
      for (const req of requests) {
        const preset: Partial<Task> = {
          linkedEntity: req.linkedEntityId ? { type: req.linkedEntityType ?? 'standalone', id: req.linkedEntityId, title: req.linkedEntityTitle ?? '' } : undefined,
          title: req.suggestedTitle ?? '',
          assignedName: req.suggestedAssignee,
          dueAt: req.suggestedDueAt,
          priority: req.priority ?? 'medium',
        };
        openCreateModal(preset);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [openCreateModal]);

  // Quick stats — computed in a single pass
  const { total, overdue, inProgress, done, critical } = useMemo(() => {
    let _overdue = 0, _inProgress = 0, _done = 0, _critical = 0;
    const now = Date.now();
    for (const t of tasks) {
      if (t.status === 'done') { _done += 1; continue; }
      if (t.status === 'in_progress') _inProgress += 1;
      if (t.dueAt && new Date(t.dueAt).getTime() < now) _overdue += 1;
      if (t.priority === 'critical') _critical += 1;
    }
    return { total: tasks.length, overdue: _overdue, inProgress: _inProgress, done: _done, critical: _critical };
  }, [tasks]);

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
        {viewMode === 'kanban' ? <TaskKanbanBoard tileId={tileId} /> : <ListView tileId={tileId} />}
      </div>

      {/* ── Overlays ────────────────────────────────────── */}
      <TaskDrawer tileId={tileId} />
      <CreateTaskModal tileId={tileId} />
    </div>
  );
}
