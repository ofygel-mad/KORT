/**
 * features/deals-spa/model/deals.store.ts
 * Central state for all deals. Subscribes to shared-bus for cross-SPA events.
 */
import { create } from 'zustand';
import { dealsApi } from '../api/mock';
import { useSharedBus } from '../../shared-bus';
import { useBadgeStore } from '../../shared-bus/badge.store';
import type { GlobalNotifEvent } from '../../shared-bus';
import type { Deal, DealStage, DealActivity, DealTask, ActivityType } from '../api/types';
import { STAGE_PROBABILITY, STAGE_LABEL } from '../api/types';

// ── Snapshot publisher (called after any state change) ────────
function _publishDealsSnapshot(deals: Deal[]) {
  const now = new Date().toISOString();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const active = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
  const won    = deals.filter(d => d.stage === 'won');
  const lost   = deals.filter(d => d.stage === 'lost');

  const wonThisMonth  = won.filter(d => d.wonAt  && new Date(d.wonAt)  >= startOfMonth);
  const lostThisMonth = lost.filter(d => d.lostAt && new Date(d.lostAt) >= startOfMonth);

  const byStage: Record<string, { count: number; value: number }> = {};
  for (const d of active) {
    if (!byStage[d.stage]) byStage[d.stage] = { count: 0, value: 0 };
    byStage[d.stage].count++;
    byStage[d.stage].value += d.value;
  }

  const lostReasonBreakdown: Record<string, number> = {};
  for (const d of lost) {
    if (d.lostReason) {
      lostReasonBreakdown[d.lostReason] = (lostReasonBreakdown[d.lostReason] ?? 0) + 1;
    }
  }

  useSharedBus.getState().publishSnapshot({
    source: 'deals',
    totalActive:        active.length,
    totalWon:           won.length,
    totalLost:          lost.length,
    pipelineValue:      active.reduce((a, d) => a + d.value, 0),
    weightedValue:      active.reduce((a, d) => a + d.value * (d.probability / 100), 0),
    wonValueThisMonth:  wonThisMonth.reduce((a, d) => a + d.value, 0),
    wonCountThisMonth:  wonThisMonth.length,
    lostCountThisMonth: lostThisMonth.length,
    byStage,
    lostReasonBreakdown,
    snapshotAt: now,
  });
}

interface DealsState {
  deals: Deal[];
  loading: boolean;

  // Drawer
  activeId: string | null;
  drawerOpen: boolean;

  // Modals
  lostModalId: string | null;
  wonModalId: string | null;
  deleteConfirmId: string | null;

  // Actions — data
  load: () => Promise<void>;
  processInboundEvents: () => void; // consume shared-bus queue
  moveStage: (id: string, stage: DealStage) => Promise<void>;
  updateDeal: (id: string, patch: Partial<Deal>) => Promise<void>;
  addActivity: (dealId: string, type: ActivityType, content: string, author: string, durationMin?: number) => Promise<void>;
  addTask: (dealId: string, title: string, priority: DealTask['priority'], dueAt?: string) => Promise<void>;
  toggleTask: (dealId: string, taskId: string) => Promise<void>;
  toggleChecklist: (dealId: string, itemId: string) => Promise<void>;
  markLost: (id: string, reason: string, comment: string, returnToLeads: boolean) => Promise<void>;
  markWon: (id: string, finalValue: number) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
  createFromLead: (payload: Parameters<typeof dealsApi.createDeal>[0]) => Promise<void>;

  // Actions — UI
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  openLostModal: (id: string) => void;
  closeLostModal: () => void;
  openWonModal: (id: string) => void;
  closeWonModal: () => void;
  openDeleteConfirm: (id: string) => void;
  closeDeleteConfirm: () => void;
}

export const useDealsStore = create<DealsState>((set, get) => ({
  deals: [],
  loading: false,
  activeId: null,
  drawerOpen: false,
  lostModalId: null,
  wonModalId: null,
  deleteConfirmId: null,

  load: async () => {
    set({ loading: true });
    const deals = await dealsApi.getDeals();
    set({ deals, loading: false });
    // Process any events that arrived before we mounted
    get().processInboundEvents();
    // Publish snapshot for Summary SPA
    _publishDealsSnapshot(deals);
  },

  processInboundEvents: () => {
    const bus = useSharedBus.getState();

    // Lead → Deal conversions
    const conversions = bus.consumeLeadConverted();
    for (const ev of conversions) {
      const alreadyExists = get().deals.some(d => d.leadId === ev.leadId);
      if (!alreadyExists) {
        dealsApi.createDeal({
          leadId: ev.leadId,
          fullName: ev.fullName,
          phone: ev.phone,
          email: ev.email,
          companyName: ev.companyName,
          source: ev.source,
          value: ev.budget ?? 0,
          assignedName: ev.assignedName,
          qualifierName: ev.qualifierName,
          meetingAt: ev.meetingAt,
          notes: ev.comment,
        }).then(deal => {
          set(s => ({ deals: [deal, ...s.deals] }));
        });
      }
    }
  },

  moveStage: async (id, stage) => {
    const prev = get().deals.find(d => d.id === id);
    if (!prev) return;

    const now = new Date().toISOString();
    // Optimistic update
    set(s => ({
      deals: s.deals.map(d => d.id === id ? {
        ...d, stage, updatedAt: now, stageEnteredAt: now,
        probability: d.probability === STAGE_PROBABILITY[d.stage]
          ? STAGE_PROBABILITY[stage]
          : d.probability,
      } : d),
    }));

    await dealsApi.moveStage(id, stage);

    // Log activity
    const entry: DealActivity = {
      id: crypto.randomUUID(),
      type: 'stage_change',
      content: `Перемещено в стадию: ${STAGE_LABEL[stage]}`,
      author: 'Менеджер',
      createdAt: now,
    };
    set(s => ({
      deals: s.deals.map(d => d.id === id
        ? { ...d, activities: [...d.activities, entry] }
        : d
      ),
    }));
  },

  updateDeal: async (id, patch) => {
    set(s => ({
      deals: s.deals.map(d => d.id === id
        ? { ...d, ...patch, updatedAt: new Date().toISOString() }
        : d
      ),
    }));
    await dealsApi.updateDeal(id, patch);
  },

  addActivity: async (dealId, type, content, author, durationMin) => {
    const now = new Date().toISOString();
    const entry: DealActivity = {
      id: crypto.randomUUID(), type, content, author,
      createdAt: now, durationMin,
    };
    set(s => ({
      deals: s.deals.map(d => d.id === dealId
        ? { ...d, activities: [...d.activities, entry], updatedAt: now }
        : d
      ),
    }));
    await dealsApi.addActivity(dealId, { type, content, author, createdAt: now, durationMin });
  },

  addTask: async (dealId, title, priority, dueAt) => {
    const task = await dealsApi.addTask(dealId, { title, priority, dueAt, done: false });
    set(s => ({
      deals: s.deals.map(d => d.id === dealId
        ? { ...d, tasks: [...d.tasks, task], updatedAt: new Date().toISOString() }
        : d
      ),
    }));
  },

  toggleTask: async (dealId, taskId) => {
    const deal = get().deals.find(d => d.id === dealId);
    const task = deal?.tasks.find(t => t.id === taskId);
    if (!task) return;
    const done = !task.done;
    set(s => ({
      deals: s.deals.map(d => d.id === dealId
        ? { ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, done } : t) }
        : d
      ),
    }));
    await dealsApi.toggleTask(dealId, taskId, done);
  },

  toggleChecklist: async (dealId, itemId) => {
    const deal = get().deals.find(d => d.id === dealId);
    if (!deal) return;
    const done = !(deal.checklistDone ?? []).includes(itemId);
    set(s => ({
      deals: s.deals.map(d => {
        if (d.id !== dealId) return d;
        const cur = d.checklistDone ?? [];
        return { ...d, checklistDone: done ? [...cur, itemId] : cur.filter(i => i !== itemId) };
      }),
    }));
    await dealsApi.toggleChecklist(dealId, itemId, done);
  },

  markLost: async (id, reason, comment, returnToLeads) => {
    const deal = get().deals.find(d => d.id === id);
    if (!deal) return;
    const now = new Date().toISOString();

    await dealsApi.moveStage(id, 'lost');
    await dealsApi.updateDeal(id, { lostReason: reason, lostComment: comment });

    set(s => ({
      deals: s.deals.map(d => d.id === id ? {
        ...d, stage: 'lost', lostAt: now, lostReason: reason, lostComment: comment,
        probability: 0, updatedAt: now,
        activities: [...d.activities, {
          id: crypto.randomUUID(), type: 'stage_change' as const,
          content: `Сделка проиграна. Причина: ${reason}${comment ? ` — ${comment}` : ''}`,
          author: 'Менеджер', createdAt: now,
        }],
      } : d),
      lostModalId: null,
    }));

    if (returnToLeads) {
      useSharedBus.getState().publishDealReturned({
        dealId: id, leadId: deal.leadId,
        fullName: deal.fullName, phone: deal.phone,
        source: deal.source,
        reason, comment,
        returnedAt: now,
      });
    }

    // Always notify Summary about lost deal
    useSharedBus.getState().publishDealLost({
      dealId: id,
      leadId: deal.leadId,
      fullName: deal.fullName,
      value: deal.value,
      reason,
      lostAt: now,
    });
    _publishDealsSnapshot(get().deals);
  },

  markWon: async (id, finalValue) => {
    const now = new Date().toISOString();
    await dealsApi.moveStage(id, 'won');
    await dealsApi.updateDeal(id, { value: finalValue });

    set(s => ({
      deals: s.deals.map(d => d.id === id ? {
        ...d, stage: 'won', wonAt: now, value: finalValue,
        probability: 100, updatedAt: now,
        activities: [...d.activities, {
          id: crypto.randomUUID(), type: 'stage_change' as const,
          content: `Сделка закрыта! Сумма: ${new Intl.NumberFormat('ru-RU').format(finalValue)} ₸`,
          author: 'Менеджер', createdAt: now,
        }],
      } : d),
      wonModalId: null,
    }));

    const deal = get().deals.find(d => d.id === id);
    if (deal) {
      useSharedBus.getState().publishDealWon({
        dealId: id, leadId: deal.leadId,
        fullName: deal.fullName, value: finalValue, wonAt: now,
      });
    }
    _publishDealsSnapshot(get().deals);
  },

  deleteDeal: async (id) => {
    await dealsApi.deleteDeal(id);
    set(s => ({
      deals: s.deals.filter(d => d.id !== id),
      deleteConfirmId: null,
      activeId: s.activeId === id ? null : s.activeId,
      drawerOpen: s.activeId === id ? false : s.drawerOpen,
    }));
  },

  createFromLead: async (payload) => {
    const deal = await dealsApi.createDeal(payload);
    set(s => ({ deals: [deal, ...s.deals] }));

    // ── Badge: новая сделка в воронке ────────────────────────────
    useBadgeStore.getState().incrementBadge('deals');

    // ── Global notif → Topbar Bell ─────────────────────────────
    const notif: GlobalNotifEvent = {
      id: crypto.randomUUID(),
      title: 'Новая сделка',
      body: deal.title ?? deal.fullName,
      kind: 'success',
      source: 'deals',
      createdAt: new Date().toISOString(),
    };
    useSharedBus.getState().publishGlobalNotif(notif);
  },

  openDrawer:  (id) => set({ activeId: id, drawerOpen: true }),
  closeDrawer: ()  => set({ drawerOpen: false, activeId: null }),
  openLostModal:      (id) => set({ lostModalId: id }),
  closeLostModal:     ()   => set({ lostModalId: null }),
  openWonModal:       (id) => set({ wonModalId: id }),
  closeWonModal:      ()   => set({ wonModalId: null }),
  openDeleteConfirm:  (id) => set({ deleteConfirmId: id }),
  closeDeleteConfirm: ()   => set({ deleteConfirmId: null }),
}));
