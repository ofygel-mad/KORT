/**
 * features/deals-spa/api/client.ts
 * Real API client for Deals SPA — drop-in replacement for mock.ts.
 */
import { api } from '@/shared/api/client';
import type { Deal, DealStage, DealActivity, DealTask } from './types';
import { STAGE_PROBABILITY } from './types';

interface ListResponse<T> {
  count: number;
  results: T[];
}

export const dealsApi = {
  getDeals: async (): Promise<Deal[]> => {
    const res = await api.get<ListResponse<Deal>>('/deals');
    return res.results;
  },

  createDeal: async (data: Partial<Deal>): Promise<Deal> => {
    const customerId = (data as Partial<Deal> & { customerId?: string }).customerId;

    return api.post<Deal>('/deals', {
      fullName: data.fullName ?? 'Новая сделка',
      phone: data.phone,
      email: data.email,
      companyName: data.companyName,
      source: data.source,
      title: data.title ?? `Сделка — ${data.fullName ?? 'Новая'}`,
      value: data.value ?? 0,
      currency: data.currency,
      assignedTo: data.assignedTo,
      assignedName: data.assignedName,
      leadId: data.leadId,
      customerId,
    });
  },

  updateDeal: async (id: string, patch: Partial<Deal>): Promise<Deal> => {
    return api.patch<Deal>(`/deals/${id}`, patch);
  },

  moveStage: async (id: string, stage: DealStage): Promise<void> => {
    await api.patch(`/deals/${id}`, {
      stage,
      probability: STAGE_PROBABILITY[stage],
    });
  },

  addActivity: async (dealId: string, activity: Omit<DealActivity, 'id'>): Promise<DealActivity> => {
    return api.post<DealActivity>(`/deals/${dealId}/activities`, {
      type: activity.type,
      content: activity.content,
    });
  },

  addTask: async (dealId: string, task: Omit<DealTask, 'id' | 'createdAt'>): Promise<DealTask> => {
    return api.post<DealTask>('/tasks', {
      title: task.title,
      priority: task.priority,
      dueDate: task.dueAt,
      dealId,
      linkedEntityType: 'deal',
      linkedEntityId: dealId,
    });
  },

  toggleTask: async (_dealId: string, taskId: string, done: boolean): Promise<void> => {
    await api.patch(`/tasks/${taskId}`, {
      status: done ? 'done' : 'todo',
    });
  },

  toggleChecklist: async (dealId: string, _itemId: string, _done: boolean): Promise<void> => {
    // Checklist is computed client-side and persisted via updateDeal
    // The store already sends the full checklistDone array via updateDeal
  },

  deleteDeal: async (id: string): Promise<void> => {
    await api.delete(`/deals/${id}`);
  },
};
