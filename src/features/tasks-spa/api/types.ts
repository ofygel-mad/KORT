/**
 * features/tasks-spa/api/types.ts
 * All domain types for the Tasks SPA.
 */

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskTone = 'muted' | 'info' | 'warning' | 'danger' | 'success' | 'accent';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Выполнено',
};

export const STATUS_TONE: Record<TaskStatus, TaskTone> = {
  todo: 'muted',
  in_progress: 'info',
  review: 'warning',
  done: 'success',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
};

export const PRIORITY_TONE: Record<TaskPriority, TaskTone> = {
  low: 'muted',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

export const PRIORITY_ORDER: TaskPriority[] = ['critical', 'high', 'medium', 'low'];
export const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

export type LinkedEntityType = 'lead' | 'deal' | 'standalone';

export interface LinkedEntity {
  type: LinkedEntityType;
  id: string;
  title: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

export type TaskActivityType = 'comment' | 'status_change' | 'assign' | 'system';

export interface TaskActivity {
  id: string;
  type: TaskActivityType;
  content: string;
  author: string;
  createdAt: string;
}

export const TAGS: Array<{ id: string; label: string; tone: TaskTone }> = [
  { id: 'call', label: 'Звонок', tone: 'success' },
  { id: 'meeting', label: 'Встреча', tone: 'info' },
  { id: 'docs', label: 'Документы', tone: 'warning' },
  { id: 'urgent', label: 'Срочно', tone: 'danger' },
  { id: 'followup', label: 'Фолоу-ап', tone: 'accent' },
  { id: 'payment', label: 'Оплата', tone: 'success' },
];

export type TaskType = 'call' | 'callback' | 'manual';

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  call: 'Звонок',
  callback: 'Перезвонить',
  manual: 'Задача вручную',
};

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  assignedTo?: string;
  assignedName?: string;
  createdBy: string;
  dueAt?: string;
  remindAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  linkedEntity?: LinkedEntity;
  subtasks: Subtask[];
  activities: TaskActivity[];
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  taskType: TaskType;
  note?: string;
  timerEnabled: boolean;
  timerDeadline?: string;
  timerWarning: boolean;
  timerFired?: boolean;
}

export type GroupBy = 'status' | 'priority' | 'assignee' | 'dueDate';
export type SortBy = 'dueAt' | 'priority' | 'createdAt' | 'updatedAt';
export type ViewMode = 'kanban' | 'list';
