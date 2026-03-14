/**
 * features/tasks-spa/components/drawer/TaskDrawer.tsx
 * Right-side drawer showing full task details with editing.
 */
import { useState, useRef } from 'react';
import { X, Link2, Calendar, User, AlertCircle } from 'lucide-react';
import { useTasksStore } from '../../model/tasks.store';
import { useTileTasksUI } from '../../model/tile-ui.store';
import {
  PRIORITY_LABEL, PRIORITY_COLOR, PRIORITY_ORDER,
  STATUS_LABEL, STATUS_COLOR, STATUS_ORDER,
  TAGS,
} from '../../api/types';
import type { TaskPriority, TaskStatus } from '../../api/types';
import s from './Drawer.module.css';

const ENTITY_LABEL: Record<string, string> = {
  deal: 'Сделка', lead: 'Лид', standalone: 'Без привязки',
};

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

interface Props { tileId: string; }

export function TaskDrawer({ tileId }: Props) {
  const { tasks, moveStatus, updateTask, addSubtask, toggleSubtask, addComment, deleteTask } = useTasksStore();
  const { activeId, drawerOpen, closeDrawer } = useTileTasksUI(tileId);

  const task = tasks.find(t => t.id === activeId);
  const [commentText, setCommentText] = useState('');
  const [newSubtask,  setNewSubtask]  = useState('');

  if (!drawerOpen || !task) return null;

  const priorityColor = PRIORITY_COLOR[task.priority];
  const doneSubs  = task.subtasks.filter(s => s.done).length;
  const totalSubs = task.subtasks.length;
  const progressPct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;

  const taskTags = TAGS.filter(tg => task.tags.includes(tg.id));

  const handleStatusChange = (st: TaskStatus) => moveStatus(task.id, st);
  const handlePriorityChange = (p: TaskPriority) => updateTask(task.id, { priority: p });

  const handleTagToggle = (tagId: string) => {
    const has = task.tags.includes(tagId);
    updateTask(task.id, { tags: has ? task.tags.filter(t => t !== tagId) : [...task.tags, tagId] });
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    await addSubtask(task.id, newSubtask.trim());
    setNewSubtask('');
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    await addComment(task.id, commentText.trim(), 'Менеджер');
    setCommentText('');
  };

  const ACTIVITY_COLOR: Record<string, string> = {
    comment: '#8b5cf6', status_change: '#3b82f6', assign: '#f59e0b', system: '#4b5563',
  };

  return (
    <>
      <div className={s.overlay} onClick={closeDrawer} />
      <div className={s.drawer}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.headerLeft}>
            <div className={s.headerMeta}>
              <span
                className={s.priorityBadge}
                style={{ color: priorityColor, borderColor: `${priorityColor}40`, background: `${priorityColor}18` }}
              >
                {task.priority === 'critical' && <AlertCircle size={11} />}
                {PRIORITY_LABEL[task.priority]}
              </span>
              {task.linkedEntity && (
                <span className={s.entityBadge}>
                  <Link2 size={11} />
                  {ENTITY_LABEL[task.linkedEntity.type]}: {task.linkedEntity.title}
                </span>
              )}
            </div>
            <div className={s.title}>
              <input
                className={s.titleInput}
                value={task.title}
                onChange={e => updateTask(task.id, { title: e.target.value })}
              />
            </div>
          </div>
          <button className={s.closeBtn} onClick={closeDrawer}><X size={15} /></button>
        </div>

        {/* Body */}
        <div className={s.body}>
          {/* Left pane */}
          <div className={s.leftPane}>

            {/* Status */}
            <div className={s.fieldGroup}>
              <div className={s.sectionTitle}>Статус</div>
              <div className={s.statusTabs}>
                {STATUS_ORDER.map(st => (
                  <button
                    key={st}
                    className={`${s.statusTab} ${task.status === st ? s.statusTabActive : ''}`}
                    style={task.status === st
                      ? { background: STATUS_COLOR[st] + '28', borderColor: STATUS_COLOR[st] + '60', color: STATUS_COLOR[st] }
                      : {}
                    }
                    onClick={() => handleStatusChange(st)}
                  >
                    {STATUS_LABEL[st]}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className={s.fieldGroup}>
              <div className={s.sectionTitle}>Описание</div>
              <textarea
                className={s.descTextarea}
                value={task.description ?? ''}
                placeholder="Добавить описание..."
                onChange={e => updateTask(task.id, { description: e.target.value })}
              />
            </div>

            {/* Tags */}
            <div className={s.fieldGroup}>
              <div className={s.sectionTitle}>Метки</div>
              <div className={s.tagsWrap}>
                {TAGS.map(tg => {
                  const active = task.tags.includes(tg.id);
                  return (
                    <button
                      key={tg.id}
                      className={s.tagBtn}
                      style={active
                        ? { background: tg.color + '28', color: tg.color, borderColor: tg.color + '60' }
                        : { background: 'transparent', color: '#6b7280', borderColor: 'rgba(255,255,255,.1)' }
                      }
                      onClick={() => handleTagToggle(tg.id)}
                    >
                      {tg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subtasks */}
            <div className={s.fieldGroup}>
              <div className={s.sectionTitle}>
                Подзадачи
                {totalSubs > 0 && <span style={{ color: '#6b7280', marginLeft: 6, fontWeight: 400 }}>
                  {doneSubs}/{totalSubs}
                </span>}
              </div>
              {totalSubs > 0 && (
                <div className={s.subtaskProgress}>
                  <div className={s.subtaskProgressBar} style={{ width: `${progressPct}%` }} />
                </div>
              )}
              <div className={s.subtaskList}>
                {task.subtasks.map(sub => (
                  <div key={sub.id} className={s.subtaskRow}>
                    <input
                      type="checkbox"
                      className={s.subtaskCheckbox}
                      checked={sub.done}
                      onChange={() => toggleSubtask(task.id, sub.id)}
                    />
                    <span className={`${s.subtaskLabel} ${sub.done ? s.subtaskLabelDone : ''}`}>
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>
              <div className={s.addSubtaskRow}>
                <input
                  className={s.addSubtaskInput}
                  value={newSubtask}
                  placeholder="Новая подзадача..."
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                />
                <button className={s.addSubtaskBtn} onClick={handleAddSubtask}>+ Добавить</button>
              </div>
            </div>

            {/* Activity */}
            <div className={s.fieldGroup}>
              <div className={s.sectionTitle}>Активность</div>
              <div className={s.activityFeed}>
                {[...task.activities].reverse().map(act => (
                  <div key={act.id} className={s.activityItem}>
                    <div
                      className={s.activityDot}
                      style={{ background: ACTIVITY_COLOR[act.type] ?? '#4b5563' }}
                    />
                    <div className={s.activityContent}>
                      <div className={s.activityText}>{act.content}</div>
                      <div className={s.activityMeta}>{act.author} · {fmt(act.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <textarea
                className={s.commentInput}
                value={commentText}
                placeholder="Написать комментарий..."
                onChange={e => setCommentText(e.target.value)}
              />
              <button className={s.commentSendBtn} onClick={handleSendComment}>
                Отправить
              </button>
            </div>
          </div>

          {/* Right pane — meta fields */}
          <div className={s.rightPane}>
            {/* Priority selector */}
            <div className={s.metaItem}>
              <span className={s.metaLabel}>Приоритет</span>
              <select
                className={s.fieldSelect}
                value={task.priority}
                onChange={e => handlePriorityChange(e.target.value as TaskPriority)}
              >
                {PRIORITY_ORDER.map(p => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div className={s.metaItem}>
              <span className={s.metaLabel}>Исполнитель</span>
              <input
                className={s.fieldInput}
                value={task.assignedName ?? ''}
                placeholder="Не назначен"
                onChange={e => updateTask(task.id, { assignedName: e.target.value })}
              />
            </div>

            {/* Due date */}
            <div className={s.metaItem}>
              <span className={s.metaLabel}>Срок</span>
              <input
                type="datetime-local"
                className={s.fieldInput}
                value={fmtDate(task.dueAt)}
                onChange={e => updateTask(task.id, { dueAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
            </div>

            {/* Remind */}
            <div className={s.metaItem}>
              <span className={s.metaLabel}>Напомнить</span>
              <input
                type="datetime-local"
                className={s.fieldInput}
                value={fmtDate(task.remindAt)}
                onChange={e => updateTask(task.id, { remindAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
            </div>

            {/* Created / Updated */}
            <div className={s.metaItem}>
              <span className={s.metaLabel}>Создано</span>
              <span className={s.metaValue}>{fmt(task.createdAt)}</span>
            </div>
            <div className={s.metaItem}>
              <span className={s.metaLabel}>Обновлено</span>
              <span className={s.metaValue}>{fmt(task.updatedAt)}</span>
            </div>
            {task.completedAt && (
              <div className={s.metaItem}>
                <span className={s.metaLabel}>Завершено</span>
                <span className={s.metaValue} style={{ color: '#22c55e' }}>{fmt(task.completedAt)}</span>
              </div>
            )}

            <button
              className={s.deleteBtn}
              onClick={async () => { await deleteTask(task.id); closeDrawer(); }}
            >
              Удалить задачу
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
