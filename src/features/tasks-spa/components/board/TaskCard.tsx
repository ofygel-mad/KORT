import { memo } from 'react';
import { AlertCircle, Calendar, CheckSquare, Link2 } from 'lucide-react';
import type { Task, TaskTone } from '../../api/types';
import { PRIORITY_LABEL, PRIORITY_TONE, TAGS } from '../../api/types';
import s from './Board.module.css';

const TONE_CLASS: Record<TaskTone, string> = {
  muted: s.toneMuted,
  info: s.toneInfo,
  warning: s.toneWarning,
  danger: s.toneDanger,
  success: s.toneSuccess,
  accent: s.toneAccent,
};

function formatDue(iso?: string): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const dueAt = new Date(iso);
  const now = new Date();
  const overdue = dueAt < now;
  const diffDays = Math.ceil((dueAt.getTime() - now.getTime()) / 86_400_000);

  if (diffDays === 0) return { label: 'Сегодня', overdue };
  if (diffDays === 1) return { label: 'Завтра', overdue: false };
  if (diffDays === -1) return { label: 'Вчера', overdue: true };
  if (overdue) return { label: `${Math.abs(diffDays)} дн. назад`, overdue: true };
  return { label: `${diffDays} дн.`, overdue: false };
}

const ENTITY_TYPE_LABEL: Record<string, string> = {
  deal: 'Сделка',
  lead: 'Лид',
  standalone: '',
};

export const TaskCard = memo(function TaskCard({
  task,
  onDragStart,
  onDragEnd,
  onOpenDrawer,
}: {
  task: Task;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpenDrawer: (id: string) => void;
}) {
  const due = formatDue(task.dueAt);
  const doneSubs = task.subtasks.filter((subtask) => subtask.done).length;
  const totalSubs = task.subtasks.length;
  const taskTags = TAGS.filter((tag) => task.tags.includes(tag.id));

  return (
    <div
      className={`${s.card} ${TONE_CLASS[PRIORITY_TONE[task.priority]]}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpenDrawer(task.id)}
    >
      <div className={s.cardPriorityStripe} />

      <div className={s.cardHeader}>
        <span className={s.cardPriorityBadge}>
          {task.priority === 'critical' && <AlertCircle size={10} />}
          {PRIORITY_LABEL[task.priority]}
        </span>
        {task.linkedEntity && (
          <span className={s.cardEntityBadge}>
            <Link2 size={10} />
            {ENTITY_TYPE_LABEL[task.linkedEntity.type]}
          </span>
        )}
      </div>

      <p className={s.cardTitle}>{task.title}</p>

      {taskTags.length > 0 && (
        <div className={s.cardTags}>
          {taskTags.map((tag) => (
            <span key={tag.id} className={`${s.cardTag} ${TONE_CLASS[tag.tone]}`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      <div className={s.cardFooter}>
        <div className={s.cardFooterLeft}>
          {due && (
            <span className={`${s.cardDue} ${due.overdue ? s.cardDueOverdue : ''}`}>
              <Calendar size={11} />
              {due.label}
            </span>
          )}
          {totalSubs > 0 && (
            <span className={`${s.cardSubs} ${doneSubs === totalSubs ? s.cardSubsDone : ''}`}>
              <CheckSquare size={11} />
              {doneSubs}/{totalSubs}
            </span>
          )}
        </div>

        <div className={s.cardFooterRight}>
          {task.assignedName && (
            <span className={s.cardAvatar} title={task.assignedName}>
              {task.assignedName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
