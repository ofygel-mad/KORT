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

export type DealTone = 'accent' | 'info' | 'warning' | 'success' | 'danger' | 'muted';

export const STAGE_LABEL: Record<DealStage, string> = {
  awaiting_meeting:  'Ожидает встречи',
  meeting_done:      'Встреча проведена',
  proposal:          'Подготовка КП',
  contract:          'Договор и счёт',
  awaiting_payment:  'Ожидание оплаты',
  won:               'Успешно',
  lost:              'Слив',
};

export const STAGE_TONE: Record<DealStage, DealTone> = {
  awaiting_meeting:  'info',
  meeting_done:      'accent',
  proposal:          'warning',
  contract:          'accent',
  awaiting_payment:  'warning',
  won:               'success',
  lost:              'danger',
};

export const STAGE_ACCENT: Record<DealStage, string> = {
  awaiting_meeting:  'var(--fill-info)',
  meeting_done:      'var(--fill-accent)',
  proposal:          'var(--fill-warning)',
  contract:          'var(--fill-accent)',
  awaiting_payment:  'var(--fill-warning)',
  won:               'var(--fill-positive)',
  lost:              'var(--fill-negative)',
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

export const ACTIVITY_TONE: Record<ActivityType, DealTone> = {
  note:         'accent',
  call:         'success',
  meeting:      'info',
  email:        'warning',
  stage_change: 'accent',
  system:       'muted',
};

export const ACTIVITY_COLOR: Record<ActivityType, string> = {
  note:         'var(--fill-accent)',
  call:         'var(--fill-positive)',
  meeting:      'var(--fill-info)',
  email:        'var(--fill-warning)',
  stage_change: 'var(--fill-accent)',
  system:       'var(--text-tertiary)',
};

export function getDealProbabilityTone(probability: number): DealTone {
  if (probability >= 75) return 'success';
  if (probability >= 45) return 'warning';
  return 'danger';
}

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
