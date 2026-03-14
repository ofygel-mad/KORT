/**
 * features/tasks-spa/api/types.ts
 * All domain types for the Tasks SPA.
 */

// ── Status & Priority ─────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo:        'К выполнению',
  in_progress: 'В работе',
  review:      'На проверке',
  done:        'Выполнено',
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo:        '#6b7280',
  in_progress: '#3b82f6',
  review:      '#f59e0b',
  done:        '#22c55e',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low:      'Низкий',
  medium:   'Средний',
  high:     'Высокий',
  critical: 'Критический',
};

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low:      '#6b7280',
  medium:   '#3b82f6',
  high:     '#f59e0b',
  critical: '#ef4444',
};

export const PRIORITY_ORDER: TaskPriority[] = ['critical', 'high', 'medium', 'low'];
export const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

// ── Linked entity ─────────────────────────────────────────────

export type LinkedEntityType = 'lead' | 'deal' | 'standalone';

export interface LinkedEntity {
  type: LinkedEntityType;
  id: string;
  title: string; // human-readable name
}

// ── Subtask ───────────────────────────────────────────────────

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

// ── Comment / Activity ────────────────────────────────────────

export type TaskActivityType = 'comment' | 'status_change' | 'assign' | 'system';

export interface TaskActivity {
  id: string;
  type: TaskActivityType;
  content: string;
  author: string;
  createdAt: string;
}

// ── Tag ───────────────────────────────────────────────────────

export const TAGS = [
  { id: 'call',     label: 'Звонок',      color: '#22c55e' },
  { id: 'meeting',  label: 'Встреча',     color: '#3b82f6' },
  { id: 'docs',     label: 'Документы',   color: '#f59e0b' },
  { id: 'urgent',   label: 'Срочно',      color: '#ef4444' },
  { id: 'followup', label: 'Фолоу-ап',    color: '#8b5cf6' },
  { id: 'payment',  label: 'Оплата',      color: '#ec4899' },
];


// ── Task type (вид задачи) ────────────────────────────────────

export type TaskType = 'call' | 'callback' | 'manual';

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  call:     'Звонок',
  callback: 'Перезвонить',
  manual:   'Задача вручную',
};

export const TASK_TYPE_ICON: Record<TaskType, string> = {
  call:     '📞',
  callback: '🔄',
  manual:   '✏️',
};

// ── Main Task type ────────────────────────────────────────────

export interface Task {
  id: string;

  // Content
  title: string;
  description?: string;

  // Classification
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];  // tag ids

  // Assignment
  assignedTo?: string;
  assignedName?: string;
  createdBy: string;

  // Dates
  dueAt?: string;       // ISO
  remindAt?: string;    // ISO
  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  // Link to other SPA entities
  linkedEntity?: LinkedEntity;

  // Sub-items
  subtasks: Subtask[];
  activities: TaskActivity[];

  // Recurrence (future extension point)
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';

  // Task type
  taskType: TaskType;

  // Manual note / attachment text
  note?: string;

  // Timer
  timerEnabled: boolean;
  /** ISO — deadline for the timer countdown. Required when timerEnabled=true */
  timerDeadline?: string;
  /** true = red pulsing critical warning; false = calm single notification */
  timerWarning: boolean;
  /** Set to true once the timer notification has fired to avoid repeats */
  timerFired?: boolean;
}

// ── View grouping ─────────────────────────────────────────────

export type GroupBy = 'status' | 'priority' | 'assignee' | 'dueDate';
export type SortBy  = 'dueAt' | 'priority' | 'createdAt' | 'updatedAt';
export type ViewMode = 'kanban' | 'list';
