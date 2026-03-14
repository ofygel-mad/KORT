/**
 * features/tasks-spa/views/ListView.tsx
 * Table / list view for tasks with grouping by status or priority.
 */
import { useTasksStore } from '../model/tasks.store';
import {
  PRIORITY_COLOR, PRIORITY_LABEL,
  STATUS_COLOR, STATUS_LABEL, STATUS_ORDER, PRIORITY_ORDER,
  TAGS,
} from '../api/types';
import type { Task } from '../api/types';
import s from './ListView.module.css';

function formatDue(iso?: string): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const d = new Date(iso);
  const overdue = d < new Date();
  return { label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), overdue };
}

function TaskRow({ task }: { task: Task }) {
  const openDrawer    = useTasksStore(s => s.openDrawer);
  const moveStatus    = useTasksStore(s => s.moveStatus);
  const due = formatDue(task.dueAt);
  const doneSubs = task.subtasks.filter(s => s.done).length;
  const totalSubs = task.subtasks.length;
  const taskTags = TAGS.filter(tg => task.tags.includes(tg.id));

  return (
    <tr className={s.row} onClick={() => openDrawer(task.id)}>
      <td className={s.tdCheck}>
        <input
          type="checkbox"
          className={s.checkbox}
          checked={task.status === 'done'}
          onClick={e => e.stopPropagation()}
          onChange={e => {
            e.stopPropagation();
            moveStatus(task.id, e.target.checked ? 'done' : 'todo');
          }}
        />
      </td>
      <td className={s.tdTitle}>
        <span className={`${s.title} ${task.status === 'done' ? s.titleDone : ''}`}>
          {task.title}
        </span>
        {taskTags.length > 0 && (
          <div className={s.tagRow}>
            {taskTags.map(tg => (
              <span key={tg.id} className={s.tag} style={{ color: tg.color, background: tg.color + '18' }}>
                {tg.label}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className={s.tdPriority}>
        <span className={s.priorityBadge} style={{ color: PRIORITY_COLOR[task.priority], background: PRIORITY_COLOR[task.priority] + '18' }}>
          {PRIORITY_LABEL[task.priority]}
        </span>
      </td>
      <td className={s.tdAssignee}>
        {task.assignedName
          ? <span className={s.avatar}>{task.assignedName.slice(0, 2)}</span>
          : <span className={s.noAssign}>—</span>
        }
      </td>
      <td className={s.tdDue}>
        {due
          ? <span className={`${s.due} ${due.overdue && task.status !== 'done' ? s.dueOverdue : ''}`}>{due.label}</span>
          : <span className={s.noDue}>—</span>
        }
      </td>
      <td className={s.tdSubs}>
        {totalSubs > 0
          ? <span className={`${s.subs} ${doneSubs === totalSubs ? s.subsDone : ''}`}>{doneSubs}/{totalSubs}</span>
          : <span className={s.noDue}>—</span>
        }
      </td>
      <td className={s.tdLinked}>
        {task.linkedEntity
          ? <span className={s.linked}>{task.linkedEntity.type === 'deal' ? '💼' : '👤'} {task.linkedEntity.title}</span>
          : null
        }
      </td>
    </tr>
  );
}

function GroupHeader({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <tr className={s.groupHeader}>
      <td colSpan={7}>
        <div className={s.groupHeaderContent}>
          <div className={s.groupDot} style={{ background: color }} />
          <span className={s.groupLabel}>{label}</span>
          <span className={s.groupCount}>{count}</span>
        </div>
      </td>
    </tr>
  );
}

export function ListView() {
  const { tasks, groupBy, sortBy, filterStatus, filterAssignee, filterPriority, searchQuery } = useTasksStore();

  // Apply filters
  let filtered = tasks.filter(t => {
    if (filterStatus   !== 'all' && t.status       !== filterStatus)   return false;
    if (filterAssignee !== 'all' && t.assignedName !== filterAssignee) return false;
    if (filterPriority !== 'all' && t.priority     !== filterPriority) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'dueAt') {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    if (sortBy === 'priority') {
      return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    }
    if (sortBy === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'updatedAt') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    return 0;
  });

  // Group
  const rows: React.ReactNode[] = [];

  if (groupBy === 'status') {
    STATUS_ORDER.forEach(st => {
      const group = filtered.filter(t => t.status === st);
      if (group.length === 0) return;
      rows.push(<GroupHeader key={`gh-${st}`} label={STATUS_LABEL[st]} color={STATUS_COLOR[st]} count={group.length} />);
      group.forEach(t => rows.push(<TaskRow key={t.id} task={t} />));
    });
  } else if (groupBy === 'priority') {
    PRIORITY_ORDER.forEach(p => {
      const group = filtered.filter(t => t.priority === p);
      if (group.length === 0) return;
      rows.push(<GroupHeader key={`gh-${p}`} label={PRIORITY_LABEL[p]} color={PRIORITY_COLOR[p]} count={group.length} />);
      group.forEach(t => rows.push(<TaskRow key={t.id} task={t} />));
    });
  } else if (groupBy === 'assignee') {
    const assignees = [...new Set(filtered.map(t => t.assignedName ?? '—'))].sort();
    assignees.forEach(name => {
      const group = filtered.filter(t => (t.assignedName ?? '—') === name);
      rows.push(<GroupHeader key={`gh-${name}`} label={name} color="#6b7280" count={group.length} />);
      group.forEach(t => rows.push(<TaskRow key={t.id} task={t} />));
    });
  } else {
    // No grouping
    filtered.forEach(t => rows.push(<TaskRow key={t.id} task={t} />));
  }

  return (
    <div className={s.wrap}>
      <table className={s.table}>
        <thead>
          <tr className={s.thead}>
            <th className={s.thCheck} />
            <th className={s.thTitle}>Задача</th>
            <th className={s.thPriority}>Приоритет</th>
            <th className={s.thAssignee}>Исполнитель</th>
            <th className={s.thDue}>Срок</th>
            <th className={s.thSubs}>Подзадачи</th>
            <th className={s.thLinked}>Привязка</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
