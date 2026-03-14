/**
 * features/shared-bus/index.ts
 *
 * Lightweight Zustand event bus — the "local network" between independent SPAs.
 * Each SPA publishes events here; other SPAs consume their own queue on mount.
 *
 * Design principles:
 *   • Zero coupling — SPAs only import types, never each other's stores.
 *   • Queue-based — if the target SPA isn't mounted, events wait.
 *   • Idempotent — consuming clears the queue, no double-processing.
 *   • No persistence — bus is session-only (no zustand/persist).
 */
import { create } from 'zustand';

// ── Event payloads ───────────────────────────────────────────

/** Fired when a Lead is successfully handed off → becomes a Deal */
export interface LeadConvertedEvent {
  leadId: string;
  fullName: string;
  phone: string;
  email?: string;
  companyName?: string;
  source: string;
  budget?: number;
  assignedTo?: string;
  assignedName?: string;
  qualifierName?: string;
  meetingAt?: string;
  comment?: string;
  convertedAt: string; // ISO
}

/** Fired when a Deal is returned to the lead pool (lost or manual) */
export interface DealReturnedEvent {
  dealId: string;
  leadId: string;          // original lead id to reactivate
  fullName: string;
  phone: string;
  source: string;
  reason: string;          // lost reason text
  comment?: string;
  returnedAt: string;
}

/** Fired when a Deal is marked Won (for cross-SPA stats) */
export interface DealWonEvent {
  dealId: string;
  leadId: string;
  fullName: string;
  value: number;
  wonAt: string;
}

// ── Bus store ────────────────────────────────────────────────

interface SharedBusState {
  leadConvertedQueue:  LeadConvertedEvent[];
  dealReturnedQueue:   DealReturnedEvent[];
  dealWonQueue:        DealWonEvent[];

  // Publishers (called by source SPA)
  publishLeadConverted: (event: LeadConvertedEvent) => void;
  publishDealReturned:  (event: DealReturnedEvent)  => void;
  publishDealWon:       (event: DealWonEvent)        => void;

  // Consumers (called by target SPA on mount / useEffect)
  // Returns all pending events AND clears the queue atomically.
  consumeLeadConverted: () => LeadConvertedEvent[];
  consumeDealReturned:  () => DealReturnedEvent[];
  consumeDealWon:       () => DealWonEvent[];
}

export const useSharedBus = create<SharedBusState>((set, get) => ({
  leadConvertedQueue: [],
  dealReturnedQueue:  [],
  dealWonQueue:       [],

  publishLeadConverted: (event) =>
    set(s => ({ leadConvertedQueue: [...s.leadConvertedQueue, event] })),

  publishDealReturned: (event) =>
    set(s => ({ dealReturnedQueue: [...s.dealReturnedQueue, event] })),

  publishDealWon: (event) =>
    set(s => ({ dealWonQueue: [...s.dealWonQueue, event] })),

  consumeLeadConverted: () => {
    const events = get().leadConvertedQueue;
    set({ leadConvertedQueue: [] });
    return events;
  },

  consumeDealReturned: () => {
    const events = get().dealReturnedQueue;
    set({ dealReturnedQueue: [] });
    return events;
  },

  consumeDealWon: () => {
    const events = get().dealWonQueue;
    set({ dealWonQueue: [] });
    return events;
  },
}));
