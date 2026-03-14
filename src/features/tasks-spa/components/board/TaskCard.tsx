/**
 * features/tasks-spa/components/board/TaskCard.tsx
 */
import { Calendar, Link2, CheckSquare, AlertCircle } from 'lucide-react';
import type { Task } from '../../api/types';
import {
  PRIORITY_COLOR, PRIORITY_LABEL, TAGS,
} from '../../api/types';
import s from './Board.module.css';

function formatDue(iso?: string): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const overdue = d < now;
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);

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

export function TaskCard({ task, onDragStart, onDragEnd, onOpenDrawer }: {
  task: Task;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpenDrawer: (id: string) => void;
}) {
  const due = formatDue(task.dueAt);
  const doneSubs = task.subtasks.filter(st => st.done).length;
  const totalSubs = task.subtasks.length;
  const taskTags = TAGS.filter(tg => task.tags.includes(tg.id));

  const priorityColor = PRIORITY_COLOR[task.priority];

  return (
    <div
      className={s.card}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpenDrawer(task.id)}
      style={{ '--priority-color': priorityColor } as React.CSSProperties}
    >
      <div className={s.cardPriorityStripe} style={{ background: priorityColor }} />

      <div className={s.cardHeader}>
        <span className={s.cardPriorityBadge} style={{ color: priorityColor }}>
          {task.priority === 'critical' && <AlertCircle size={10} />}
          {PRIORITY_LABEL[task.priority]}
        </span>
        {task.linkedEntity && (
          <span className={s.cardEntityBadge}>
            <Link2 size={9} />
            {ENTITY_TYPE_LABEL[task.linkedEntity.type]}
          </span>
        )}
      </div>

      <p className={s.cardTitle}>{task.title}</p>

      {taskTags.length > 0 && (
        <div className={s.cardTags}>
          {taskTags.map(tg => (
            <span key={tg.id} className={s.cardTag} style={{ '--tag-color': tg.color } as React.CSSProperties}>
              {tg.label}
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
              {task.assignedName.slice(0, 2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
