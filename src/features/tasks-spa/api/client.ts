/**
 * features/tasks-spa/api/client.ts
 * Real API client for Tasks SPA — drop-in replacement for mock.ts.
 */
import { api } from '@/shared/api/client';
import type { Task, TaskStatus, Subtask, TaskActivity } from './types';

interface ListResponse<T> {
  count: number;
  results: T[];
}

export const tasksApi = {
  getTasks: async (): Promise<Task[]> => {
    const res = await api.get<ListResponse<Task>>('/tasks');
    return res.results;
  },

  createTask: async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'activities'>): Promise<Task> => {
    return api.post<Task>('/tasks', {
      title: data.title,
      description: data.description,
      priority: data.priority,
      assignedTo: data.assignedTo,
      assignedName: data.assignedName,
      createdBy: data.createdBy,
      taskType: data.taskType,
      dueDate: data.dueAt,
      tags: data.tags,
      linkedEntityType: data.linkedEntity?.type,
      linkedEntityId: data.linkedEntity?.id,
      linkedEntityTitle: data.linkedEntity?.title,
    });
  },

  updateTask: async (id: string, patch: Partial<Task>): Promise<Task> => {
    return api.patch<Task>(`/tasks/${id}`, {
      title: patch.title,
      description: patch.description,
      priority: patch.priority,
      assignedTo: patch.assignedTo,
      assignedName: patch.assignedName,
      dueDate: patch.dueAt,
      status: patch.status,
      tags: patch.tags,
    });
  },

  moveStatus: async (id: string, status: TaskStatus): Promise<void> => {
    await api.patch(`/tasks/${id}/status`, { status });
  },

  addSubtask: async (taskId: string, title: string): Promise<Subtask> => {
    return api.post<Subtask>(`/tasks/${taskId}/subtasks`, { title });
  },

  toggleSubtask: async (taskId: string, subtaskId: string, done: boolean): Promise<void> => {
    await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, { done });
  },

  addActivity: async (taskId: string, entry: Omit<TaskActivity, 'id'>): Promise<TaskActivity> => {
    return api.post<TaskActivity>(`/tasks/${taskId}/activities`, {
      type: entry.type,
      content: entry.content,
      author: entry.author,
    });
  },

  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
};

export const ASSIGNEES = ['Акбар А.', 'Сауле М.', 'Алибек Н.', 'Камила Р.'];
