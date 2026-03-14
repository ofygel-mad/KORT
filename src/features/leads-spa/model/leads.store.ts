/**
 * leads-spa/model/leads.store.ts
 * Central state for all leads data. Swap leadsApi calls for real API when ready.
 */
import { create } from 'zustand';
import { leadsApi } from '../api/mock';
import type { Lead, LeadStage, QualifierStage, CloserStage } from '../api/types';

interface LeadsState {
  leads: Lead[];
  loading: boolean;
  activeLeadId: string | null;
  drawerOpen: boolean;
  handoffLeadId: string | null;

  load: () => Promise<void>;
  moveStage: (id: string, stage: LeadStage, pipeline: 'qualifier' | 'closer') => Promise<void>;
  toggleChecklist: (leadId: string, itemId: string) => Promise<void>;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  openHandoff: (id: string) => void;
  closeHandoff: () => void;
  completeHandoff: (leadId: string, closerId: string, meetingAt: string, comment: string) => Promise<void>;
  addLead: (data: Partial<Lead>) => Promise<void>;
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  loading: false,
  activeLeadId: null,
  drawerOpen: false,
  handoffLeadId: null,

  load: async () => {
    set({ loading: true });
    const leads = await leadsApi.getLeads();
    set({ leads, loading: false });
  },

  moveStage: async (id, stage, pipeline) => {
    // Optimistic update
    set(s => ({
      leads: s.leads.map(l => l.id === id ? { ...l, stage, pipeline, updatedAt: new Date().toISOString() } : l),
    }));
    await leadsApi.updateLeadStage(id, stage, pipeline);
    await leadsApi.addHistoryEntry(id, {
      author: 'Менеджер', authorRole: 'general',
      action: `Перемещён в стадию: ${stage}`,
      timestamp: new Date().toISOString(),
    });
  },

  toggleChecklist: async (leadId, itemId) => {
    const lead = get().leads.find(l => l.id === leadId);
    if (!lead) return;
    const done = !(lead.checklistDone ?? []).includes(itemId);
    set(s => ({
      leads: s.leads.map(l => {
        if (l.id !== leadId) return l;
        const current = l.checklistDone ?? [];
        return { ...l, checklistDone: done ? [...current, itemId] : current.filter(i => i !== itemId) };
      }),
    }));
    await leadsApi.updateChecklist(leadId, itemId, done);
  },

  openDrawer: (id) => set({ activeLeadId: id, drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false, activeLeadId: null }),
  openHandoff: (id) => set({ handoffLeadId: id }),
  closeHandoff: () => set({ handoffLeadId: null }),

  completeHandoff: async (leadId, closerId, meetingAt, comment) => {
    set(s => ({
      leads: s.leads.map(l => l.id === leadId ? {
        ...l, stage: 'awaiting_meeting' as CloserStage, pipeline: 'closer',
        meetingAt, comment,
        history: [...l.history, {
          id: crypto.randomUUID(), author: 'Квалификатор', authorRole: 'qualifier' as const,
          action: 'Лид передан на закрытие', comment,
          timestamp: new Date().toISOString(),
        }],
        updatedAt: new Date().toISOString(),
      } : l),
      handoffLeadId: null,
    }));
  },

  addLead: async (data) => {
    const lead = await leadsApi.createLead(data);
    set(s => ({ leads: [lead, ...s.leads] }));
  },
}));
