import { useMemo } from 'react';
import { useTasksStore } from '../model/tasks.store';
import { useTileTasksUI } from '../model/tile-ui.store';
import {
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
} from '../api/types';
import type { Task, TaskPriority, TaskStatus, TaskTone } from '../api/types';
import s from './ListView.module.css';

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
  return {
    label: dueAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    overdue: dueAt < new Date(),
  };
}

function getGroupLabel(groupBy: string, value: string) {
  if (groupBy === 'status' && value in STATUS_LABEL) {
    return STATUS_LABEL[value as TaskStatus];
  }
  if (groupBy === 'priority' && value in PRIORITY_LABEL) {
    return PRIORITY_LABEL[value as TaskPriority];
  }
  return value;
}

function getGroupToneClass(groupBy: string, value: string) {
  if (groupBy === 'status' && value in STATUS_TONE) {
    return TONE_CLASS[STATUS_TONE[value as TaskStatus]];
  }
  if (groupBy === 'priority' && value in PRIORITY_TONE) {
    return TONE_CLASS[PRIORITY_TONE[value as TaskPriority]];
  }
  return s.toneMuted;
}

function TaskRow({ task, onOpenDrawer }: { task: Task; onOpenDrawer: (id: string) => void }) {
  const moveStatus = useTasksStore((state) => state.moveStatus);
  const due = formatDue(task.dueAt);

  return (
    <tr className={s.row} onClick={() => onOpenDrawer(task.id)}>
      <td className={s.tdCheck}>
        <input
          type="checkbox"
          className={s.checkbox}
          checked={task.status === 'done'}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            moveStatus(task.id, event.target.checked ? 'done' : 'todo');
          }}
        />
      </td>
      <td className={s.tdTitle}>
        <span className={`${s.title} ${task.status === 'done' ? s.titleDone : ''}`}>{task.title}</span>
      </td>
      <td className={s.tdPriority}>
        <span className={`${s.priorityBadge} ${TONE_CLASS[PRIORITY_TONE[task.priority]]}`}>
          {PRIORITY_LABEL[task.priority]}
        </span>
      </td>
      <td className={s.tdAssignee}>
        {task.assignedName ? task.assignedName : <span className={s.mutedValue}>—</span>}
      </td>
      <td className={s.tdDue}>
        {due ? (
          <span className={`${s.due} ${due.overdue && task.status !== 'done' ? s.dueOverdue : ''}`}>
            {due.label}
          </span>
        ) : (
          <span className={s.mutedValue}>—</span>
        )}
      </td>
      <td className={s.tdLinked}>
        {task.linkedEntity?.title ? <span className={s.linkedValue}>{task.linkedEntity.title}</span> : <span className={s.mutedValue}>—</span>}
      </td>
      <td className={s.tdStatus}>
        <span className={`${s.statusBadge} ${TONE_CLASS[STATUS_TONE[task.status]]}`}>
          {STATUS_LABEL[task.status]}
        </span>
      </td>
    </tr>
  );
}

export function ListView({ tileId }: { tileId: string }) {
  const { tasks } = useTasksStore();
  const {
    groupBy,
    sortBy,
    filterStatus,
    filterAssignee,
    filterPriority,
    searchQuery,
    openDrawer,
  } = useTileTasksUI(tileId);

  const filtered = useMemo(() => {
    return tasks
      .filter((task) => {
        if (filterStatus !== 'all' && task.status !== filterStatus) return false;
        if (filterAssignee !== 'all' && task.assignedName !== filterAssignee) return false;
        if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
        if (sortBy === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'updatedAt') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        return new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime();
      });
  }, [tasks, filterStatus, filterAssignee, filterPriority, searchQuery, sortBy]);

  const grouped = filtered.reduce<Record<string, Task[]>>((acc, task) => {
    const key =
      groupBy === 'status'
        ? task.status
        : groupBy === 'priority'
          ? task.priority
          : task.assignedName ?? 'Без исполнителя';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className={s.root}>
      {Object.entries(grouped).map(([group, items]) => (
        <section key={group} className={s.group}>
          <div className={s.groupHeader}>
            <div className={s.groupTitleRow}>
              <span className={`${s.groupBadge} ${getGroupToneClass(groupBy, group)}`}>
                {getGroupLabel(groupBy, group)}
              </span>
            </div>
            <span className={s.groupCount}>{items.length}</span>
          </div>

          <table className={s.table}>
            <tbody>
              {items.map((task) => (
                <TaskRow key={task.id} task={task} onOpenDrawer={openDrawer} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
