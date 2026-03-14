/**
 * features/tasks-spa/components/board/KanbanBoard.tsx
 * 4-column Kanban: Todo / In Progress / Review / Done
 * Supports drag-and-drop between columns.
 */
import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTasksStore } from '../../model/tasks.store';
import { useTileTasksUI } from '../../model/tile-ui.store';
import { TaskCard } from './TaskCard';
import { STATUS_LABEL, STATUS_COLOR, STATUS_ORDER } from '../../api/types';
import type { TaskStatus, Task } from '../../api/types';
import s from './Board.module.css';

export function TaskKanbanBoard({ tileId }: { tileId: string }) {
  const tasks       = useTasksStore(st => st.tasks);
  const moveStatus  = useTasksStore(st => st.moveStatus);
  const { openCreateModal: openCreate, filterStatus, filterAssignee, filterPriority, searchQuery, openDrawer } = useTileTasksUI(tileId);

  const [dragging, setDragging]   = useState<string | null>(null);
  const [overCol,  setOverCol]    = useState<TaskStatus | null>(null);
  const dragTaskRef = useRef<Task | null>(null);


  const filtered = tasks.filter(t => {
    if (filterStatus   !== 'all' && t.status   !== filterStatus)   return false;
    if (filterAssignee !== 'all' && t.assignedName !== filterAssignee) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const columns = STATUS_ORDER.map(st => ({
    status: st,
    label: STATUS_LABEL[st],
    color: STATUS_COLOR[st],
    tasks: filtered.filter(t => t.status === st),
  }));

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
              <div className={s.columnDot} style={{ background: col.color }} />
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
