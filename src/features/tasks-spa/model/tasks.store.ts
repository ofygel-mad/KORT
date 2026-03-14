/**
 * features/tasks-spa/model/tasks.store.ts
 * Central state for Tasks SPA.
 * Subscribes to shared-bus for cross-SPA task requests.
 * Publishes snapshots so Summary SPA stays up-to-date.
 */
import { create } from 'zustand';
import { tasksApi } from '../api/mock';
import { useSharedBus } from '../../shared-bus';
import { useBadgeStore } from '../../shared-bus/badge.store';
import type { GlobalNotifEvent } from '../../shared-bus';
import type {
  Task, TaskStatus, TaskPriority, ViewMode, GroupBy, SortBy,
} from '../api/types';
import { STATUS_LABEL } from '../api/types';

interface TasksState {
  tasks: Task[];
  loading: boolean;


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

}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,
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
    bus.consumeTaskRequests();
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

    // ── Badge: новая задача → +1 на плитке Задачи ──────────────
    useBadgeStore.getState().incrementBadge('tasks');

    // ── Global notif → Topbar Bell ─────────────────────────────
    const notif: GlobalNotifEvent = {
      id: crypto.randomUUID(),
      title: 'Новая задача',
      body: task.title,
      kind: task.priority === 'critical' ? 'error' : 'info',
      source: 'tasks',
      createdAt: new Date().toISOString(),
    };
    useSharedBus.getState().publishGlobalNotif(notif);

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
          linkedEntityType: task.linkedEntity?.type === 'standalone' ? undefined : task.linkedEntity?.type,
          linkedEntityId: task.linkedEntity?.id,
          doneAt: now,
        });
      }

      // ── Badge: задача выполнена → -1 ──────────────────────────
      useBadgeStore.getState().decrementBadge('tasks');

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

    // ── Badge: задача удалена → -1 ──────────────────────────────
    // Уменьшаем только если задача НЕ была выполнена (done уже уменьшил)
    const task = get().tasks.find(t => t.id === id);
    if (task && task.status !== 'done') {
      useBadgeStore.getState().decrementBadge('tasks');
    }

    set(s => ({
      tasks: s.tasks.filter(t => t.id !== id),
    }));
    get().publishSnapshot();
  },

}));
