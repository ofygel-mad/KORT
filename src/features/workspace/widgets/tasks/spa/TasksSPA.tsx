/**
 * Tasks SPA — Task management with filters and priority system.
 * Lives at: src/features/workspace/widgets/tasks/spa/TasksSPA.tsx
 */
import { useState } from 'react';
import { CheckSquare, Square, Plus, Clock, AlertTriangle, Minus } from 'lucide-react';
import type { WorkspaceSnapshot } from '../../../model/types';
import s from './TasksSPA.module.css';

const PRIORITY_META: Record<string, { label: string; color: string; Icon: typeof AlertTriangle }> = {
  high:   { label: 'Высокий', color: '#ef4444', Icon: AlertTriangle },
  medium: { label: 'Средний', color: '#f59e0b', Icon: Minus },
  low:    { label: 'Низкий',  color: '#22c55e', Icon: Minus },
};

type Filter = 'all' | 'high' | 'medium' | 'low';

interface Props { snapshot?: WorkspaceSnapshot; }

export function TasksSPA({ snapshot }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [done, setDone] = useState<Set<string>>(new Set());
  const tasks = snapshot?.todayTasks ?? [];
  const filtered = tasks.filter(t => filter === 'all' || t.priority === filter);

  const toggle = (id: string) => {
    setDone(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        <span className={s.heading}>Задачи на сегодня</span>
        <button className={s.addBtn}><Plus size={14} /> Задача</button>
      </div>

      <div className={s.filters}>
        {(['all','high','medium','low'] as Filter[]).map(f => (
          <button key={f} className={`${s.filterChip} ${filter === f ? s.filterChipActive : ''}`}
            onClick={() => setFilter(f)}
            style={f !== 'all' ? { '--chip-color': PRIORITY_META[f].color } as React.CSSProperties : {}}>
            {f === 'all' ? 'Все' : PRIORITY_META[f].label}
          </button>
        ))}
        <span className={s.filterCount}>{filtered.length} задач</span>
      </div>

      <div className={s.list}>
        {filtered.length === 0 ? (
          <div className={s.empty}>Задач нет — отличный день!</div>
        ) : filtered.map(task => {
          const isDone = done.has(task.id);
          const meta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
          return (
            <div key={task.id} className={`${s.item} ${isDone ? s.itemDone : ''}`} onClick={() => toggle(task.id)}>
              <button className={s.check} onClick={e => { e.stopPropagation(); toggle(task.id); }}>
                {isDone ? <CheckSquare size={18} color="rgba(160,104,56,0.8)" /> : <Square size={18} color="rgba(255,255,255,0.25)" />}
              </button>
              <div className={s.itemBody}>
                <span className={s.itemTitle}>{task.title}</span>
                <div className={s.itemMeta}>
                  {task.customerName && <span className={s.metaTag}>{task.customerName}</span>}
                  {task.dueAt && <span className={s.metaTime}><Clock size={10} />{new Date(task.dueAt).toLocaleTimeString('ru', { hour:'2-digit', minute:'2-digit' })}</span>}
                </div>
              </div>
              <span className={s.priority} style={{ '--p-color': meta.color } as React.CSSProperties}>
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className={s.footer}>
        <span>{done.size} из {tasks.length} выполнено</span>
        <div className={s.progress}>
          <div className={s.progressFill} style={{ width: `${tasks.length ? (done.size/tasks.length)*100 : 0}%` }} />
        </div>
      </div>
    </div>
  );
}
