import { useMemo } from 'react';
import { useTasksStore } from '../model/tasks.store';
import { useTileTasksUI } from '../model/tile-ui.store';
import {
  PRIORITY_COLOR, PRIORITY_LABEL,
  STATUS_LABEL, PRIORITY_ORDER,
} from '../api/types';
import type { Task } from '../api/types';
import s from './ListView.module.css';

function formatDue(iso?: string): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const d = new Date(iso);
  const overdue = d < new Date();
  return { label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), overdue };
}

function TaskRow({ task, onOpenDrawer }: { task: Task; onOpenDrawer: (id: string) => void }) {
  const moveStatus = useTasksStore(s => s.moveStatus);
  const due = formatDue(task.dueAt);

  return (
    <tr className={s.row} onClick={() => onOpenDrawer(task.id)}>
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
      <td className={s.tdTitle}><span className={`${s.title} ${task.status === 'done' ? s.titleDone : ''}`}>{task.title}</span></td>
      <td className={s.tdPriority}><span className={s.priorityBadge} style={{ color: PRIORITY_COLOR[task.priority], background: PRIORITY_COLOR[task.priority] + '18' }}>{PRIORITY_LABEL[task.priority]}</span></td>
      <td className={s.tdAssignee}>{task.assignedName ?? '—'}</td>
      <td className={s.tdDue}>{due ? <span className={`${s.due} ${due.overdue && task.status !== 'done' ? s.dueOverdue : ''}`}>{due.label}</span> : <span className={s.noDue}>—</span>}</td>
      <td className={s.tdLinked}>{task.linkedEntity?.title ?? '—'}</td>
      <td className={s.tdLinked}>{STATUS_LABEL[task.status]}</td>
    </tr>
  );
}

export function ListView({ tileId }: { tileId: string }) {
  const { tasks } = useTasksStore();
  const { groupBy, sortBy, filterStatus, filterAssignee, filterPriority, searchQuery, openDrawer } = useTileTasksUI(tileId);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterAssignee !== 'all' && t.assignedName !== filterAssignee) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'priority') return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
      if (sortBy === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'updatedAt') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return (new Date(a.dueAt ?? 0).getTime()) - (new Date(b.dueAt ?? 0).getTime());
    });
  }, [tasks, filterStatus, filterAssignee, filterPriority, searchQuery, sortBy]);

  const grouped = filtered.reduce<Record<string, Task[]>>((acc, t) => {
    const key = groupBy === 'status'
      ? t.status
      : groupBy === 'priority'
        ? t.priority
        : (t.assignedName ?? 'Без исполнителя');
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className={s.root}>
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className={s.group}>
          <div className={s.groupTitle}>{group}</div>
          <table className={s.table}>
            <tbody>
              {(items ?? []).map(task => <TaskRow key={task.id} task={task} onOpenDrawer={openDrawer} />)}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
