import { useState } from 'react';
import { AlertCircle, Link2, X } from 'lucide-react';
import { useTasksStore } from '../../model/tasks.store';
import { useTileTasksUI } from '../../model/tile-ui.store';
import {
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_TONE,
  TAGS,
} from '../../api/types';
import type {
  TaskActivityType,
  TaskPriority,
  TaskStatus,
  TaskTone,
} from '../../api/types';
import s from './Drawer.module.css';

const ENTITY_LABEL: Record<string, string> = {
  deal: 'Сделка',
  lead: 'Лид',
  standalone: 'Без привязки',
};

const TONE_CLASS: Record<TaskTone, string> = {
  muted: s.toneMuted,
  info: s.toneInfo,
  warning: s.toneWarning,
  danger: s.toneDanger,
  success: s.toneSuccess,
  accent: s.toneAccent,
};

const ACTIVITY_TONE: Record<TaskActivityType, TaskTone> = {
  comment: 'accent',
  status_change: 'info',
  assign: 'warning',
  system: 'muted',
};

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

interface Props {
  tileId: string;
}

export function TaskDrawer({ tileId }: Props) {
  const { tasks, moveStatus, updateTask, addSubtask, toggleSubtask, addComment, deleteTask } = useTasksStore();
  const { activeId, drawerOpen, closeDrawer } = useTileTasksUI(tileId);

  const task = tasks.find((item) => item.id === activeId);
  const [commentText, setCommentText] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  if (!drawerOpen || !task) return null;

  const doneSubs = task.subtasks.filter((subtask) => subtask.done).length;
  const totalSubs = task.subtasks.length;
  const progressPct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;

  const handleStatusChange = (status: TaskStatus) => moveStatus(task.id, status);
  const handlePriorityChange = (priority: TaskPriority) => updateTask(task.id, { priority });

  const handleTagToggle = (tagId: string) => {
    const hasTag = task.tags.includes(tagId);
    updateTask(task.id, {
      tags: hasTag ? task.tags.filter((tag) => tag !== tagId) : [...task.tags, tagId],
    });
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

  return (
    <>
      <div className={s.overlay} onClick={closeDrawer} />
      <div className={s.drawer}>
        <div className={s.header}>
          <div className={s.headerLeft}>
            <div className={s.headerMeta}>
              <span className={`${s.priorityBadge} ${TONE_CLASS[PRIORITY_TONE[task.priority]]}`}>
                {task.priority === 'critical' && <AlertCircle size={12} />}
                {PRIORITY_LABEL[task.priority]}
              </span>
              {task.linkedEntity && (
                <span className={s.entityBadge}>
                  <Link2 size={12} />
                  {ENTITY_LABEL[task.linkedEntity.type]}: {task.linkedEntity.title}
                </span>
              )}
            </div>
            <div className={s.title}>
              <input
                className={s.titleInput}
                value={task.title}
                onChange={(event) => updateTask(task.id, { title: event.target.value })}
              />
            </div>
          </div>
          <button className={s.closeBtn} onClick={closeDrawer} aria-label="Закрыть карточку">
            <X size={15} />
          </button>
        </div>

        <div className={s.body}>
          <div className={s.leftPane}>
            <div className={s.fieldGroup}>
              <div className={s.sectionTitle}>Статус</div>
              <div className={s.statusTabs}>
                {STATUS_ORDER.map((status) => (
                  <button
                    key={status}
                    className={`${s.statusTab} ${task.status === status ? `${s.statusTabActive} ${TONE_CLASS[STATUS_TONE[status]]}` : ''}`}
                    onClick={() => handleStatusChange(status)}
                  >
                    {STATUS_LABEL[status]}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.fieldGroup}>
              <div className={s.sectionTitle}>Описание</div>
              <textarea
                className={s.descTextarea}
                value={task.description ?? ''}
                placeholder="Добавить описание..."
                onChange={(event) => updateTask(task.id, { description: event.target.value })}
              />
            </div>

            <div className={s.fieldGroup}>
              <div className={s.sectionTitle}>Метки</div>
              <div className={s.tagsWrap}>
                {TAGS.map((tag) => {
                  const active = task.tags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      className={`${s.tagBtn} ${active ? TONE_CLASS[tag.tone] : s.tagBtnInactive}`}
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={s.fieldGroup}>
              <div className={s.sectionTitle}>
                Подзадачи
                {totalSubs > 0 && <span className={s.subtaskCount}>{doneSubs}/{totalSubs}</span>}
              </div>
              {totalSubs > 0 && (
                <div className={s.subtaskProgress}>
                  <div className={s.subtaskProgressBar} style={{ width: `${progressPct}%` }} />
                </div>
              )}
              <div className={s.subtaskList}>
                {task.subtasks.map((subtask) => (
                  <div key={subtask.id} className={s.subtaskRow}>
                    <input
                      type="checkbox"
                      className={s.subtaskCheckbox}
                      checked={subtask.done}
                      onChange={() => toggleSubtask(task.id, subtask.id)}
                    />
                    <span className={`${s.subtaskLabel} ${subtask.done ? s.subtaskLabelDone : ''}`}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
              <div className={s.addSubtaskRow}>
                <input
                  className={s.addSubtaskInput}
                  value={newSubtask}
                  placeholder="Новая подзадача..."
                  onChange={(event) => setNewSubtask(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleAddSubtask()}
                />
                <button className={s.addSubtaskBtn} onClick={handleAddSubtask}>
                  Добавить
                </button>
              </div>
            </div>

            <div className={s.fieldGroup}>
              <div className={s.sectionTitle}>Активность</div>
              <div className={s.activityFeed}>
                {[...task.activities].reverse().map((activity) => (
                  <div key={activity.id} className={s.activityItem}>
                    <div className={`${s.activityDot} ${TONE_CLASS[ACTIVITY_TONE[activity.type] ?? 'muted']}`} />
                    <div className={s.activityContent}>
                      <div className={s.activityText}>{activity.content}</div>
                      <div className={s.activityMeta}>{activity.author} · {fmt(activity.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <textarea
                className={s.commentInput}
                value={commentText}
                placeholder="Написать комментарий..."
                onChange={(event) => setCommentText(event.target.value)}
              />
              <button className={s.commentSendBtn} onClick={handleSendComment}>
                Отправить
              </button>
            </div>
          </div>

          <div className={s.rightPane}>
            <div className={s.metaItem}>
              <span className={s.metaLabel}>Приоритет</span>
              <select
                className={s.fieldSelect}
                value={task.priority}
                onChange={(event) => handlePriorityChange(event.target.value as TaskPriority)}
              >
                {PRIORITY_ORDER.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABEL[priority]}
                  </option>
                ))}
              </select>
            </div>

            <div className={s.metaItem}>
              <span className={s.metaLabel}>Исполнитель</span>
              <input
                className={s.fieldInput}
                value={task.assignedName ?? ''}
                placeholder="Не назначен"
                onChange={(event) => updateTask(task.id, { assignedName: event.target.value })}
              />
            </div>

            <div className={s.metaItem}>
              <span className={s.metaLabel}>Срок</span>
              <input
                type="datetime-local"
                className={s.fieldInput}
                value={fmtDate(task.dueAt)}
                onChange={(event) => updateTask(task.id, {
                  dueAt: event.target.value ? new Date(event.target.value).toISOString() : undefined,
                })}
              />
            </div>

            <div className={s.metaItem}>
              <span className={s.metaLabel}>Напомнить</span>
              <input
                type="datetime-local"
                className={s.fieldInput}
                value={fmtDate(task.remindAt)}
                onChange={(event) => updateTask(task.id, {
                  remindAt: event.target.value ? new Date(event.target.value).toISOString() : undefined,
                })}
              />
            </div>

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
                <span className={`${s.metaValue} ${s.completedValue}`}>{fmt(task.completedAt)}</span>
              </div>
            )}

            <button
              className={s.deleteBtn}
              onClick={async () => {
                await deleteTask(task.id);
                closeDrawer();
              }}
            >
              Удалить задачу
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
