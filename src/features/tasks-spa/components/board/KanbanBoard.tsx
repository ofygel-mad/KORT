/**
 * features/tasks-spa/components/board/KanbanBoard.tsx
 * 4-column Kanban: Todo / In Progress / Review / Done
 * Supports drag-and-drop between columns.
 */
import { useRef, useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useTasksStore } from '../../model/tasks.store';
import { useTileTasksUI } from '../../model/tile-ui.store';
import { TaskCard } from './TaskCard';
import { STATUS_LABEL, STATUS_ORDER, STATUS_TONE } from '../../api/types';
import type { TaskStatus, Task, TaskTone } from '../../api/types';
import s from './Board.module.css';

const TONE_CLASS: Record<TaskTone, string> = {
  muted: s.toneMuted,
  info: s.toneInfo,
  warning: s.toneWarning,
  danger: s.toneDanger,
  success: s.toneSuccess,
  accent: s.toneAccent,
};

export function TaskKanbanBoard({ tileId }: { tileId: string }) {
  const tasks       = useTasksStore(st => st.tasks);
  const moveStatus  = useTasksStore(st => st.moveStatus);
  const { openCreateModal: openCreate, filterStatus, filterAssignee, filterPriority, searchQuery, openDrawer } = useTileTasksUI(tileId);

  const [dragging, setDragging]   = useState<string | null>(null);
  const [overCol,  setOverCol]    = useState<TaskStatus | null>(null);
  const dragTaskRef = useRef<Task | null>(null);


  const columns = useMemo(() => {
    const filtered = tasks.filter(t => {
      if (filterStatus   !== 'all' && t.status   !== filterStatus)   return false;
      if (filterAssignee !== 'all' && t.assignedName !== filterAssignee) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // Group into columns in a single pass
    const byStatus: Record<string, Task[]> = {};
    for (const st of STATUS_ORDER) byStatus[st] = [];
    for (const t of filtered) {
      const bucket = byStatus[t.status];
      if (bucket) bucket.push(t);
    }
    return STATUS_ORDER.map(st => ({
      status: st,
      label: STATUS_LABEL[st],
      toneClass: TONE_CLASS[STATUS_TONE[st]],
      tasks: byStatus[st],
    }));
  }, [tasks, filterStatus, filterAssignee, filterPriority, searchQuery]);

  return (
    <div className={s.board}>
      {columns.map(col => (
        <div
          key={col.status}
          className={`${s.column} ${overCol === col.status ? s.columnDrop : ''}`}
          onDragOver={e => { e.preventDefault(); setOverCol(col.status); }}
          onDragLeave={() => setOverCol(null)}
          onDrop={async () => {
            setOverCol(null);
            if (dragging && dragTaskRef.current && dragTaskRef.current.status !== col.status) {
              await moveStatus(dragging, col.status);
            }
          }}
        >
          {/* Header */}
          <div className={s.columnHeader}>
            <div className={s.columnTitleRow}>
              <div className={`${s.columnDot} ${col.toneClass}`} />
              <span className={s.columnTitle}>{col.label}</span>
              <span className={s.columnCount}>{col.tasks.length}</span>
            </div>
            <button
              className={s.columnAddBtn}
              onClick={() => openCreate({ status: col.status })}
              title={`Создать задачу в «${col.label}»`}
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Cards */}
          <div className={s.columnCards}>
            {col.tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onOpenDrawer={openDrawer}
                onDragStart={() => { setDragging(task.id); dragTaskRef.current = task; }}
                onDragEnd={() => { setDragging(null); dragTaskRef.current = null; setOverCol(null); }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
