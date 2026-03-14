/**
 * leads-spa/api/types.ts
 * All domain types for the Leads SPA.
 * When connecting a real backend, only this file + api/*.ts needs to change.
 */

export type LeadsRole = 'qualifier' | 'closer' | 'manager' | 'general';

// ── Lead ──────────────────────────────────────────────────────
export type QualifierStage =
  | 'new'
  | 'in_progress'
  | 'no_answer'
  | 'thinking'
  | 'meeting_set'
  | 'junk';

export type CloserStage =
  | 'awaiting_meeting'
  | 'meeting_done'
  | 'proposal'
  | 'contract'
  | 'awaiting_payment'
  | 'won'
  | 'lost';

export type LeadStage = QualifierStage | CloserStage;

export interface LeadHistoryEntry {
  id: string;
  author: string;
  authorRole: LeadsRole;
  action: string;
  comment?: string;
  timestamp: string; // ISO
}

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  source: string;       // 'instagram' | 'site' | 'referral' | 'ad'
  stage: LeadStage;
  pipeline: 'qualifier' | 'closer';
  assignedTo?: string;  // user id
  assignedName?: string;
  callbackAt?: string;  // ISO — for 'thinking' stage
  meetingAt?: string;   // ISO — for meeting stages
  budget?: number;
  comment?: string;
  checklistDone?: string[]; // completed checklist item ids
  history: LeadHistoryEntry[];
  createdAt: string;    // ISO
  updatedAt: string;    // ISO — for SLA coloring
  companyName?: string;
  email?: string;
}

// ── Staff / Users ─────────────────────────────────────────────
export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: LeadsRole;
  avatarUrl?: string;
}

// ── Notifications ─────────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'meeting_assigned' | 'lead_moved' | 'callback_reminder';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// ── Checklist items per stage ─────────────────────────────────
export const CONTRACT_CHECKLIST = [
  { id: 'req',   label: 'Запросить реквизиты' },
  { id: 'draft', label: 'Отправить черновик' },
  { id: 'sign',  label: 'Получить подпись' },
];
