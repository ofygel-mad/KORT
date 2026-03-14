/**
 * src/features/workspace/widgets/tasks/spa/TasksSPA.tsx
 *
 * Tasks SPA — connected to useTasksStore.
 * Reads from the real store, NOT from workspace snapshot.
 */
import { useState, useEffect, useRef } from 'react';
import {
  CheckSquare, Square, Plus, Clock, AlertTriangle,
  Trash2, Bell, BellOff, X, Timer,
} from 'lucide-react';
import { useTasksStore }  from '../../../../tasks-spa/model/tasks.store';
import { useTileTasksUI } from '../../../../tasks-spa/model/tile-ui.store';
import { PRIORITY_META_MAP, TASK_TYPE_LABEL, TASK_TYPE_ICON } from './tasksMeta';
import type { Task, TaskType, TaskPriority } from '../../../../tasks-spa/api/types';
import s from './TasksSPA.module.css';

function formatCountdown(deadline: string): { label: string; overdue: boolean } {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { label: 'Просрочено!', overdue: true };
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const sec = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return { label: `${h}ч ${m}м`, overdue: false };
  if (m > 0) return { label: `${m}м ${sec}с`, overdue: false };
  return { label: `${sec}с`, overdue: false };
}

interface CreateModalProps { tileId: string; onClose: () => void; preset?: any; }

function CreateModal({ onClose, preset }: CreateModalProps) {
  const createTask = useTasksStore(state => state.createTask);

  const [title,         setTitle]         = useState('');
  const [taskType,      setTaskType]      = useState<TaskType>('manual');
  const [priority,      setPriority]      = useState<TaskPriority>('medium');
  const [note,          setNote]          = useState('');
  const [dueAt,         setDueAt]         = useState('');
  const [timerEnabled,  setTimerEnabled]  = useState(false);
  const [timerDeadline, setTimerDeadline] = useState('');
  const [timerWarning,  setTimerWarning]  = useState(false);
  const [assignee, setAssignee] = useState('');

  useEffect(() => {
    if (preset) {
      if (preset.title) setTitle(preset.title);
      if (preset.priority) setPriority(preset.priority);
      if (preset.assignedName) setAssignee(preset.assignedName);
      if (preset.dueAt) setDueAt(new Date(preset.dueAt).toISOString().slice(0, 16));
    }
  }, [preset]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createTask({
      title: title.trim(),
      taskType,
      priority,
      status: 'todo',
      tags: [],
      createdBy: 'Менеджер',
      note: note.trim() || undefined,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      assignedName: assignee || undefined,
      timerEnabled,
      timerDeadline: timerEnabled && timerDeadline
        ? new Date(timerDeadline).toISOString()
        : undefined,
      timerWarning,
      subtasks: [],
    });
    onClose();
  };

  const TYPES: TaskType[] = ['call', 'callback', 'manual'];
  const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low',      label: 'Низкий',      color: '#6b7280' },
    { value: 'medium',   label: 'Средний',     color: '#3b82f6' },
    { value: 'high',     label: 'Высокий',     color: '#f59e0b' },
    { value: 'critical', label: 'Критический', color: '#ef4444' },
  ];

  return (
    <div className={s.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Новая задача</span>
          <button className={s.modalClose} onClick={onClose}><X size={15} /></button>
        </div>

        <div className={s.typeRow}>
          {TYPES.map(t => (
            <button
              key={t}
              className={`${s.typeBtn} ${taskType === t ? s.typeBtnActive : ''}`}
              onClick={() => setTaskType(t)}
            >
              <span>{TASK_TYPE_ICON[t]}</span>
              {TASK_TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className={s.formGroup}>
          <input
            className={s.formInput}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={
              taskType === 'call' ? 'Кому позвонить?' :
              taskType === 'callback' ? 'Кому перезвонить?' :
              'Что нужно сделать?'
            }
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {taskType === 'manual' && (
          <div className={s.formGroup}>
            <textarea
              className={s.formTextarea}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Заметка / описание (опционально)"
              rows={3}
            />
          </div>
        )}

        <div className={s.formRow}>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Приоритет</label>
            <select
              className={s.formSelect}
              value={priority}
              onChange={e => setPriority(e.target.value as TaskPriority)}
            >
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Срок</label>
            <input
              type="datetime-local"
              className={s.formInput}
              value={dueAt}
              onChange={e => setDueAt(e.target.value)}
            />
          </div>
        </div>

        <div className={s.timerSection}>
          <button
            className={`${s.timerToggle} ${timerEnabled ? s.timerToggleOn : ''}`}
            onClick={() => setTimerEnabled(v => !v)}
          >
            {timerEnabled ? <Bell size={13} /> : <BellOff size={13} />}
            {timerEnabled ? 'Таймер включён' : 'Включить таймер'}
          </button>

          {timerEnabled && (
            <div className={s.timerOptions}>
              <div className={s.formGroup}>
                <label className={s.formLabel}>Дедлайн таймера</label>
                <input
                  type="datetime-local"
                  className={s.formInput}
                  value={timerDeadline}
                  onChange={e => setTimerDeadline(e.target.value)}
                />
              </div>
              <button
                className={`${s.warningToggle} ${timerWarning ? s.warningToggleOn : ''}`}
                onClick={() => setTimerWarning(v => !v)}
              >
                <AlertTriangle size={12} />
                {timerWarning ? 'Критическое предупреждение' : 'Обычное уведомление'}
              </button>
              <p className={s.timerHint}>
                {timerWarning
                  ? '⚠️ Таймер будет мигать красным и продолжать напоминать'
                  : '🔔 Одно уведомление когда время истечёт'}
              </p>
            </div>
          )}
        </div>

        <div className={s.modalFooter}>
          <button className={s.cancelBtn} onClick={onClose}>Отмена</button>
          <button className={s.submitBtn} onClick={handleSubmit} disabled={!title.trim()}>
            Создать задачу
          </button>
        </div>
      </div>
    </div>
  );
}

function TimerBadge({ deadline, warning }: { deadline: string; warning: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const { label, overdue } = formatCountdown(deadline);
  return (
    <span
      className={`${s.timerBadge} ${overdue ? s.timerOverdue : ''} ${warning && overdue ? s.timerPulse : ''}`}
    >
      <Timer size={10} />
      {label}
    </span>
  );
}

type Filter = 'all' | 'todo' | 'in_progress' | 'done';

interface Props { tileId: string; }

export function TasksSPA({ tileId }: Props) {
  const { tasks, loading, load, moveStatus, deleteTask } = useTasksStore();
  const [filter, setFilter] = useState<Filter>('all');
  const { createModalOpen, openCreateModal, closeCreateModal, createPreset } = useTileTasksUI(tileId);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      const requests = useSharedBus.getState().consumeTaskRequests();
      for (const req of requests) {
        openCreateModal({
          linkedEntity: req.linkedEntityId
            ? {
                type: req.linkedEntityType ?? 'standalone',
                id: req.linkedEntityId,
                title: req.linkedEntityTitle ?? '',
              }
            : undefined,
          title: req.suggestedTitle ?? '',
          assignedName: req.suggestedAssignee,
          dueAt: req.suggestedDueAt,
          priority: req.priority ?? 'medium',
        });
      }
    }, 2000);
    return () => clearInterval(id);
  }, [openCreateModal]);

  useEffect(() => {
    const interval = setInterval(() => {
      for (const task of tasks) {
        if (
          task.timerEnabled &&
          task.timerDeadline &&
          !task.timerFired &&
          task.status !== 'done' &&
          new Date(task.timerDeadline).getTime() <= Date.now() &&
          !notifiedRef.current.has(task.id)
        ) {
          notifiedRef.current.add(task.id);

          const fire = () => {
            new Notification(
              task.timerWarning ? `⚠️ КРИТИЧНО: ${task.title}` : `🔔 ${task.title}`,
              { body: task.timerWarning ? 'Задача не выполнена! Требуется срочное внимание.' : 'Время на задачу истекло.' }
            );
          };

          if (Notification.permission === 'granted') {
            fire();
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => { if (permission === 'granted') fire(); });
          }
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [tasks]);

  const FILTER_LABEL: Record<Filter, string> = {
    all: 'Все',
    todo: 'К выполнению',
    in_progress: 'В работе',
    done: 'Выполнено',
  };

  const filtered = tasks.filter(task => {
    if (filter === 'all') return task.status !== 'done';
    if (filter === 'done') return task.status === 'done';
    if (filter === 'todo') return task.status === 'todo';
    if (filter === 'in_progress') return task.status === 'in_progress' || task.status === 'review';
    return true;
  });

  const doneN = tasks.filter(task => task.status === 'done').length;
  const overdue = tasks.filter(task =>
    task.status !== 'done' && task.dueAt && new Date(task.dueAt) < new Date()
  ).length;

  if (loading) {
    return (
      <div className={s.root}>
        <div className={s.empty} style={{ marginTop: 60 }}>Загрузка задач…</div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        <div className={s.toolbarLeft}>
          <span className={s.heading}>Задачи</span>
          {overdue > 0 && <span className={s.overdueChip}>{overdue} просрочено</span>}
        </div>
        <button className={s.addBtn} onClick={() => openCreateModal()}>
          <Plus size={14} /> Задача
        </button>
      </div>

      <div className={s.filters}>
        {(['all', 'todo', 'in_progress', 'done'] as Filter[]).map(f => (
          <button
            key={f}
            className={`${s.filterChip} ${filter === f ? s.filterChipActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
        <span className={s.filterCount}>{filtered.length}</span>
      </div>

      <div className={s.list}>
        {filtered.length === 0 ? (
          <div className={s.empty}>
            {filter === 'done' ? 'Выполненных задач нет' : 'Задач нет — отличный день!'}
          </div>
        ) : (
          filtered.map(task => {
            const isDone = task.status === 'done';
            const isOverdue = !isDone && !!task.dueAt && new Date(task.dueAt) < new Date();
            const meta = PRIORITY_META_MAP[task.priority] ?? PRIORITY_META_MAP.medium;

            return (
              <div
                key={task.id}
                className={`${s.item} ${isDone ? s.itemDone : ''} ${isOverdue ? s.itemOverdue : ''}`}
              >
                <button
                  className={s.check}
                  onClick={() => moveStatus(task.id, isDone ? 'todo' : 'done')}
                  title={isDone ? 'Отметить невыполненной' : 'Отметить выполненной'}
                >
                  {isDone
                    ? <CheckSquare size={18} color="rgba(160,104,56,0.8)" />
                    : <Square size={18} color="rgba(255,255,255,0.25)" />
                  }
                </button>

                <div className={s.itemBody}>
                  <div className={s.itemTitleRow}>
                    <span className={s.taskTypeIcon} title={TASK_TYPE_LABEL[task.taskType ?? 'manual']}>
                      {TASK_TYPE_ICON[task.taskType ?? 'manual']}
                    </span>
                    <span className={s.itemTitle}>{task.title}</span>
                  </div>

                  {task.note && <span className={s.itemNote}>{task.note}</span>}

                  <div className={s.itemMeta}>
                    {task.assignedName && <span className={s.metaTag}>{task.assignedName}</span>}
                    {task.dueAt && (
                      <span className={`${s.metaTime} ${isOverdue ? s.metaTimeOverdue : ''}`}>
                        <Clock size={10} />
                        {new Date(task.dueAt).toLocaleString('ru', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                    {task.timerEnabled && task.timerDeadline && !isDone && (
                      <TimerBadge deadline={task.timerDeadline} warning={task.timerWarning} />
                    )}
                  </div>
                </div>

                <div className={s.itemRight}>
                  <span className={s.priority} style={{ color: meta.color }}>{meta.label}</span>
                  <button
                    className={s.deleteBtn}
                    onClick={() => deleteTask(task.id)}
                    title="Удалить задачу"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={s.footer}>
        <span>{doneN} из {tasks.length} выполнено</span>
        <div className={s.progress}>
          <div
            className={s.progressFill}
            style={{ width: `${tasks.length ? (doneN / tasks.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {createModalOpen && <CreateModal tileId={tileId} onClose={closeCreateModal} preset={createPreset} />}
    </div>
  );
}
