/**
 * leads-spa/model/leads.store.ts
 * Central state for all leads data. Swap leadsApi calls for real API when ready.
 */
import { create } from 'zustand';
import { leadsApi } from '../api/mock';
import { useSharedBus } from '../../shared-bus';
import { useBadgeStore } from '../../shared-bus/badge.store';
import type { GlobalNotifEvent } from '../../shared-bus';
import type { Lead, LeadStage, QualifierStage, CloserStage } from '../api/types';

interface LeadsState {
  leads: Lead[];
  loading: boolean;
  activeLeadId: string | null;
  drawerOpen: boolean;
  handoffLeadId: string | null;

  load: () => Promise<void>;
  processInboundEvents: () => void;
  moveStage: (id: string, stage: LeadStage, pipeline: 'qualifier' | 'closer') => Promise<void>;
  toggleChecklist: (leadId: string, itemId: string) => Promise<void>;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  openHandoff: (id: string) => void;
  closeHandoff: () => void;
  completeHandoff: (leadId: string, closerId: string, meetingAt: string, comment: string) => Promise<void>;
  addLead: (data: Partial<Lead>) => Promise<void>;
  addComment: (leadId: string, comment: string, author: string) => Promise<void>;
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
    // Consume any deal-returned events queued while this SPA wasn't mounted
    get().processInboundEvents();
  },

  processInboundEvents: () => {
    const bus = useSharedBus.getState();
    const returned = bus.consumeDealReturned();
    for (const ev of returned) {
      // Check if this lead still exists in our store (moved to closer pipeline)
      const existing = get().leads.find(l => l.id === ev.leadId);
      if (existing) {
        // Reset it back to qualifier new stage
        set(s => ({
          leads: s.leads.map(l => l.id === ev.leadId ? {
            ...l, stage: 'new' as QualifierStage, pipeline: 'qualifier',
            updatedAt: new Date().toISOString(),
            history: [...l.history, {
              id: crypto.randomUUID(),
              author: 'Система', authorRole: 'general' as const,
              action: `Возвращён из сделок. Причина: ${ev.reason}`,
              comment: ev.comment,
              timestamp: ev.returnedAt,
            }],
          } : l),
        }));
      } else {
        // Lead not in store — create fresh from event data
        leadsApi.createLead({
          leadId: ev.leadId,
          fullName: ev.fullName,
          phone: ev.phone,
          source: ev.source,
          stage: 'new' as QualifierStage,
          pipeline: 'qualifier',
          comment: `Возвращён из сделок. Причина: ${ev.reason}${ev.comment ? ' — ' + ev.comment : ''}`,
        } as Parameters<typeof leadsApi.createLead>[0]).then(lead => {
          set(s => ({ leads: [lead, ...s.leads] }));
        });
      }
    }
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
    const lead = get().leads.find(l => l.id === leadId);
    if (!lead) return;

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

    // Notify Deals SPA via shared bus
    useSharedBus.getState().publishLeadConverted({
      leadId,
      fullName:      lead.fullName,
      phone:         lead.phone,
      email:         lead.email,
      companyName:   lead.companyName,
      source:        lead.source,
      budget:        lead.budget,
      assignedName:  closerId,   // closer id used as name placeholder; replace when staff map available
      qualifierName: 'Квалификатор',
      meetingAt,
      comment,
      convertedAt: new Date().toISOString(),
    });
  },

  addLead: async (data) => {
    const lead = await leadsApi.createLead(data);
    set(s => ({ leads: [lead, ...s.leads] }));

    // ── Badge: новый лид ────────────────────────────────────────
    useBadgeStore.getState().incrementBadge('customers');

    // ── Global notif → Topbar Bell ─────────────────────────────
    const notif: GlobalNotifEvent = {
      id: crypto.randomUUID(),
      title: 'Новый лид',
      body: lead.fullName,
      kind: 'info',
      source: 'leads',
      createdAt: new Date().toISOString(),
    };
    useSharedBus.getState().publishGlobalNotif(notif);
  },

  addComment: async (leadId, comment, author) => {
    const entry = {
      id: crypto.randomUUID(),
      author,
      authorRole: 'general' as const,
      action: comment,
      timestamp: new Date().toISOString(),
    };
    set(s => ({
      leads: s.leads.map(l => l.id === leadId
        ? { ...l, history: [...l.history, entry], updatedAt: new Date().toISOString() }
        : l
      ),
    }));
    await leadsApi.addHistoryEntry(leadId, { author, authorRole: 'general', action: comment, timestamp: entry.timestamp });
  },
}));
