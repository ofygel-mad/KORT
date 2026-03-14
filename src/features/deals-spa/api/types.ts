/**
 * features/deals-spa/api/types.ts
 * All domain types for the Deals SPA.
 */

// ── Stages ────────────────────────────────────────────────────

export type DealStage =
  | 'awaiting_meeting'
  | 'meeting_done'
  | 'proposal'
  | 'contract'
  | 'awaiting_payment'
  | 'won'
  | 'lost';

export const STAGE_LABEL: Record<DealStage, string> = {
  awaiting_meeting:  'Ожидает встречи',
  meeting_done:      'Встреча проведена',
  proposal:          'Подготовка КП',
  contract:          'Договор и счёт',
  awaiting_payment:  'Ожидание оплаты',
  won:               'Успешно',
  lost:              'Слив',
};

export const STAGE_ACCENT: Record<DealStage, string> = {
  awaiting_meeting:  '#3b82f6',
  meeting_done:      '#8b5cf6',
  proposal:          '#f59e0b',
  contract:          '#ec4899',
  awaiting_payment:  '#f97316',
  won:               '#22c55e',
  lost:              '#ef4444',
};

/** Default win probability % per stage */
export const STAGE_PROBABILITY: Record<DealStage, number> = {
  awaiting_meeting:  20,
  meeting_done:      40,
  proposal:          60,
  contract:          75,
  awaiting_payment:  90,
  won:               100,
  lost:              0,
};

export const ACTIVE_STAGES: DealStage[] = [
  'awaiting_meeting', 'meeting_done', 'proposal', 'contract', 'awaiting_payment',
];

// ── Activity ──────────────────────────────────────────────────

export type ActivityType = 'note' | 'call' | 'meeting' | 'email' | 'stage_change' | 'system';

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  note:         'Заметка',
  call:         'Звонок',
  meeting:      'Встреча',
  email:        'Письмо',
  stage_change: 'Смена стадии',
  system:       'Система',
};

export const ACTIVITY_COLOR: Record<ActivityType, string> = {
  note:         '#8b5cf6',
  call:         '#22c55e',
  meeting:      '#3b82f6',
  email:        '#f59e0b',
  stage_change: '#ec4899',
  system:       '#6b7280',
};

export interface DealActivity {
  id: string;
  type: ActivityType;
  content: string;
  author: string;
  createdAt: string;   // ISO
  durationMin?: number; // for calls
  outcome?: string;    // for calls/meetings: 'success' | 'no_answer' | 'rescheduled'
}

// ── Tasks ─────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high';

export interface DealTask {
  id: string;
  title: string;
  dueAt?: string;       // ISO
  done: boolean;
  priority: TaskPriority;
  createdAt: string;
}

// ── Deal ─────────────────────────────────────────────────────

export interface Deal {
  id: string;

  // Back-reference to originating lead
  leadId: string;

  // Contact
  fullName: string;
  phone: string;
  email?: string;
  companyName?: string;
  source: string;

  // Deal identity
  title: string;        // e.g. "Квартира 3к — Нурлан К."
  stage: DealStage;

  // Financials
  value: number;        // deal amount in currency
  probability: number;  // 0–100, can be manually overridden
  currency: 'KZT' | 'USD' | 'EUR';

  // People
  assignedTo?: string;
  assignedName?: string;
  qualifierName?: string;

  // Dates
  expectedCloseAt?: string;
  meetingAt?: string;
  stageEnteredAt: string;  // ISO — for aging calc
  createdAt: string;
  updatedAt: string;
  wonAt?: string;
  lostAt?: string;

  // Loss
  lostReason?: string;
  lostComment?: string;

  // Activity & tasks
  activities: DealActivity[];
  tasks: DealTask[];
  checklistDone: string[];

  // Extra notes
  notes?: string;
}

// ── Checklist ─────────────────────────────────────────────────

export const DEAL_CHECKLIST = [
  { id: 'kp_sent',    label: 'КП отправлено' },
  { id: 'kp_agreed',  label: 'КП согласовано' },
  { id: 'req_rcvd',   label: 'Реквизиты получены' },
  { id: 'contract_signed', label: 'Договор подписан' },
  { id: 'invoice_sent',    label: 'Счёт выставлен' },
];

// ── Lost reasons ──────────────────────────────────────────────

export const LOST_REASONS = [
  'Не устроила цена',
  'Выбрали конкурента',
  'Клиент передумал',
  'Нет бюджета',
  'Нет ответа / исчез',
  'Не целевой клиент',
  'Другое',
];
