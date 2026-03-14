/**
 * features/tasks-spa/model/tasks.store.ts
 * Central state for Tasks SPA.
 * Subscribes to shared-bus for cross-SPA task requests.
 * Publishes snapshots so Summary SPA stays up-to-date.
 */
import { create } from 'zustand';
import { tasksApi } from '../api/mock';
import { useSharedBus } from '../../shared-bus';
import type {
  Task, TaskStatus, TaskPriority, ViewMode, GroupBy, SortBy,
} from '../api/types';
import { STATUS_LABEL } from '../api/types';

interface TasksState {
  tasks: Task[];
  loading: boolean;

  // UI state
  activeId: string | null;
  drawerOpen: boolean;
  createModalOpen: boolean;
  /** Pre-fill for create modal (from bus request) */
  createPreset: Partial<Task> | null;

  // Filters / view
  viewMode: ViewMode;
  groupBy: GroupBy;
  sortBy: SortBy;
  filterStatus: TaskStatus | 'all';
  filterAssignee: string | 'all';
  filterPriority: TaskPriority | 'all';
  searchQuery: string;

  // Actions — data
  load: () => Promise<void>;
  processInboundEvents: () => void;
  publishSnapshot: () => void;

  createTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'activities'>) => Promise<void>;
  moveStatus: (id: string, status: TaskStatus) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addComment: (taskId: string, content: string, author: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Actions — UI
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  openCreateModal: (preset?: Partial<Task>) => void;
  closeCreateModal: () => void;
  setViewMode: (mode: ViewMode) => void;
  setGroupBy: (g: GroupBy) => void;
  setSortBy: (s: SortBy) => void;
  setFilterStatus: (s: TaskStatus | 'all') => void;
  setFilterAssignee: (a: string | 'all') => void;
  setFilterPriority: (p: TaskPriority | 'all') => void;
  setSearchQuery: (q: string) => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,
  activeId: null,
  drawerOpen: false,
  createModalOpen: false,
  createPreset: null,

  viewMode: 'kanban',
  groupBy: 'status',
  sortBy: 'dueAt',
  filterStatus: 'all',
  filterAssignee: 'all',
  filterPriority: 'all',
  searchQuery: '',

  // ── Load ──────────────────────────────────────────────────

  load: async () => {
    set({ loading: true });
    const tasks = await tasksApi.getTasks();
    set({ tasks, loading: false });
    get().processInboundEvents();
    get().publishSnapshot();
  },

  // ── Consume events from other SPAs ────────────────────────

  processInboundEvents: () => {
    const bus = useSharedBus.getState();
    const requests = bus.consumeTaskRequests();

    for (const req of requests) {
      // Open create modal pre-filled with request data
      const preset: Partial<Task> = {
        linkedEntity: req.linkedEntityId
          ? {
              type: req.linkedEntityType ?? 'standalone',
              id: req.linkedEntityId,
              title: req.linkedEntityTitle ?? '',
            }
          : undefined,
        title: req.suggestedTitle ?? '',
        assignedName: req.suggestedAssignee,
        dueAt: req.suggestedDueAt,
        priority: req.priority ?? 'medium',
      };
      set({ createModalOpen: true, createPreset: preset });
    }
  },

  // ── Publish snapshot → Summary ────────────────────────────

  publishSnapshot: () => {
    const tasks = get().tasks;
    const now = new Date().toISOString();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const doneThisMonth = tasks.filter(
      t => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= startOfMonth
    ).length;
    const totalThisMonth = tasks.filter(
      t => t.createdAt && new Date(t.createdAt) >= startOfMonth
    ).length;

    useSharedBus.getState().publishSnapshot({
      source: 'tasks',
      totalTasks: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdueCount: tasks.filter(
        t => t.status !== 'done' && t.dueAt && new Date(t.dueAt) < new Date()
      ).length,
      completionRateThisMonth: totalThisMonth > 0
        ? Math.round((doneThisMonth / totalThisMonth) * 100)
        : 0,
      snapshotAt: now,
    });
  },

  // ── CRUD ──────────────────────────────────────────────────

  createTask: async (data) => {
    const task = await tasksApi.createTask(data);
    set(s => ({ tasks: [task, ...s.tasks] }));
    get().publishSnapshot();
  },

  moveStatus: async (id, status) => {
    const prev = get().tasks.find(t => t.id === id);
    if (!prev) return;

    const now = new Date().toISOString();
    const prevLabel = STATUS_LABEL[prev.status];
    const nextLabel = STATUS_LABEL[status];

    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === id
          ? {
              ...t,
              status,
              updatedAt: now,
              completedAt: status === 'done' ? now : t.completedAt,
              activities: [
                ...t.activities,
                {
                  id: crypto.randomUUID(),
                  type: 'status_change' as const,
                  content: `${prevLabel} → ${nextLabel}`,
                  author: 'Менеджер',
                  createdAt: now,
                },
              ],
            }
          : t
      ),
    }));

    await tasksApi.moveStatus(id, status);

    // Notify Summary when task is done
    if (status === 'done') {
      const task = get().tasks.find(t => t.id === id);
      if (task) {
        useSharedBus.getState().publishTaskDone({
          taskId: id,
          title: task.title,
          assignedName: task.assignedName,
          linkedEntityType: task.linkedEntity?.type,
          linkedEntityId: task.linkedEntity?.id,
          doneAt: now,
        });
      }
      get().publishSnapshot();
    }
  },

  updateTask: async (id, patch) => {
    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
      ),
    }));
    await tasksApi.updateTask(id, patch);
  },

  addSubtask: async (taskId, title) => {
    const sub = await tasksApi.addSubtask(taskId, title);
    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === taskId ? { ...t, subtasks: [...t.subtasks, sub] } : t
      ),
    }));
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    const sub = task?.subtasks.find(s => s.id === subtaskId);
    if (!sub) return;
    const done = !sub.done;
    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, done } : s) }
          : t
      ),
    }));
    await tasksApi.toggleSubtask(taskId, subtaskId, done);
  },

  addComment: async (taskId, content, author) => {
    const now = new Date().toISOString();
    const act = await tasksApi.addActivity(taskId, {
      type: 'comment', content, author, createdAt: now,
    });
    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === taskId
          ? { ...t, activities: [...t.activities, act], updatedAt: now }
          : t
      ),
    }));
  },

  deleteTask: async (id) => {
    await tasksApi.deleteTask(id);
    set(s => ({
      tasks: s.tasks.filter(t => t.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
      drawerOpen: s.activeId === id ? false : s.drawerOpen,
    }));
    get().publishSnapshot();
  },

  // ── UI actions ────────────────────────────────────────────

  openDrawer: (id) => set({ activeId: id, drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  openCreateModal: (preset) => set({ createModalOpen: true, createPreset: preset ?? null }),
  closeCreateModal: () => set({ createModalOpen: false, createPreset: null }),
  setViewMode: (viewMode) => set({ viewMode }),
  setGroupBy: (groupBy) => set({ groupBy }),
  setSortBy: (sortBy) => set({ sortBy }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setFilterAssignee: (filterAssignee) => set({ filterAssignee }),
  setFilterPriority: (filterPriority) => set({ filterPriority }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
