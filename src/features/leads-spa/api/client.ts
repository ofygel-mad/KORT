/**
 * features/leads-spa/api/client.ts
 * Real API client for Leads SPA — drop-in replacement for mock.ts.
 */
import { api } from '@/shared/api/client';
import type { Lead, StaffMember, Notification, LeadStage } from './types';

interface ListResponse<T> {
  count: number;
  results: T[];
}

export const leadsApi = {
  getLeads: async (): Promise<Lead[]> => {
    const res = await api.get<ListResponse<Lead>>('/leads');
    return res.results;
  },

  updateLeadStage: async (id: string, stage: LeadStage, pipeline: 'qualifier' | 'closer'): Promise<Lead> => {
    return api.patch<Lead>(`/leads/${id}`, { stage, pipeline });
  },

  addHistoryEntry: async (leadId: string, entry: Omit<Lead['history'][0], 'id'>): Promise<void> => {
    await api.post(`/leads/${leadId}/history`, {
      type: 'comment',
      content: entry.action,
      author: entry.author,
    });
  },

  updateChecklist: async (leadId: string, itemId: string, done: boolean): Promise<void> => {
    await api.post(`/leads/${leadId}/checklist`, { itemId, done });
  },

  createLead: async (data: Partial<Lead>): Promise<Lead> => {
    return api.post<Lead>('/leads', {
      fullName: data.fullName ?? 'Новый лид',
      phone: data.phone ?? '',
      source: data.source ?? 'site',
      pipeline: data.pipeline,
      assignedTo: data.assignedTo,
      assignedName: data.assignedName,
      budget: data.budget,
      comment: data.comment,
      email: data.email,
      companyName: data.companyName,
    });
  },
};

export const staffApi = {
  getStaff: async (): Promise<StaffMember[]> => {
    const res = await api.get<{ results: StaffMember[] }>('/users/team');
    return res.results;
  },

  updateRole: async (userId: string, role: StaffMember['role']): Promise<void> => {
    await api.patch(`/users/${userId}/role`, { role });
  },
};

export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    return [];
  },

  markRead: async (_id: string): Promise<void> => {
    // Notifications are handled via shared-bus in production
  },
};
