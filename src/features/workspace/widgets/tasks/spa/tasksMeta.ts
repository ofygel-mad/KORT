/**
 * src/features/workspace/widgets/tasks/spa/tasksMeta.ts
 * Re-exports / local copies of display constants for TasksSPA widget.
 */
export { TASK_TYPE_LABEL, TASK_TYPE_ICON } from '../../../../tasks-spa/api/types';

import type { TaskPriority } from '../../../../tasks-spa/api/types';

export const PRIORITY_META_MAP: Record<TaskPriority, { label: string; color: string }> = {
  low:      { label: 'Низкий',      color: '#22c55e' },
  medium:   { label: 'Средний',     color: '#f59e0b' },
  high:     { label: 'Высокий',     color: '#ef4444' },
  critical: { label: 'Критический', color: '#dc2626' },
};
