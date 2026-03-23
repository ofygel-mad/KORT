import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTasksStore } from '../../model/tasks.store';
import { useTileTasksUI } from '../../model/tile-ui.store';
import {
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  STATUS_LABEL,
  STATUS_ORDER,
  TAGS,
} from '../../api/types';
import type { TaskPriority, TaskStatus, TaskTone } from '../../api/types';
import { ASSIGNEES } from '../../api/client';
import s from './Modals.module.css';

const TONE_CLASS: Record<TaskTone, string> = {
  muted: s.toneMuted,
  info: s.toneInfo,
  warning: s.toneWarning,
  danger: s.toneDanger,
  success: s.toneSuccess,
  accent: s.toneAccent,
};

interface Props {
  tileId: string;
}

export function CreateTaskModal({ tileId }: Props) {
  const { createTask } = useTasksStore();
  const { createModalOpen, createPreset, closeCreateModal } = useTileTasksUI(tileId);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [assignee, setAssignee] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (createModalOpen && createPreset) {
      setTitle(createPreset.title ?? '');
      setPriority(createPreset.priority ?? 'medium');
      setStatus(createPreset.status ?? 'todo');
      setAssignee(createPreset.assignedName ?? '');
      setDueAt(createPreset.dueAt ? new Date(createPreset.dueAt).toISOString().slice(0, 16) : '');
      return;
    }

    if (!createModalOpen) {
      setTitle('');
      setDesc('');
      setPriority('medium');
      setStatus('todo');
      setAssignee('');
      setDueAt('');
      setTags([]);
    }
  }, [createModalOpen, createPreset]);

  if (!createModalOpen) return null;

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createTask({
      title: title.trim(),
      description: desc.trim() || undefined,
      priority,
      status,
      assignedName: assignee || undefined,
      createdBy: 'Менеджер',
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      tags,
      subtasks: [],
      linkedEntity: createPreset?.linkedEntity,
      taskType: 'manual',
      timerEnabled: false,
      timerWarning: false,
    });
    closeCreateModal();
  };

  const toggleTag = (id: string) => {
    setTags((prev) => (prev.includes(id) ? prev.filter((tag) => tag !== id) : [...prev, id]));
  };

  return (
    <>
      <div className={s.overlay} onClick={closeCreateModal} />
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Новая задача</span>
          <button className={s.closeBtn} onClick={closeCreateModal} aria-label="Закрыть форму">
            <X size={15} />
          </button>
        </div>

        {createPreset?.linkedEntity && (
          <div className={s.linkedBadge}>
            Привязана к: {createPreset.linkedEntity.title}
          </div>
        )}

        <div className={s.form}>
          <div className={s.formGroup}>
            <label className={s.label}>Название *</label>
            <input
              className={s.input}
              value={title}
              autoFocus
              placeholder="Что нужно сделать?"
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>Описание</label>
            <textarea
              className={s.textarea}
              value={desc}
              placeholder="Дополнительные детали..."
              onChange={(event) => setDesc(event.target.value)}
            />
          </div>

          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.label}>Приоритет</label>
              <select className={s.select} value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                {PRIORITY_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {PRIORITY_LABEL[item]}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Статус</label>
              <select className={s.select} value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
                {STATUS_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {STATUS_LABEL[item]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.label}>Исполнитель</label>
              <select className={s.select} value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                <option value="">— Не назначен —</option>
                {ASSIGNEES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Срок</label>
              <input type="datetime-local" className={s.input} value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            </div>
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>Метки</label>
            <div className={s.tagsWrap}>
              {TAGS.map((tag) => {
                const active = tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    className={`${s.tagBtn} ${active ? TONE_CLASS[tag.tone] : s.tagBtnInactive}`}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={s.modalFooter}>
          <button className={s.cancelBtn} onClick={closeCreateModal}>Отмена</button>
          <button className={s.submitBtn} onClick={handleSubmit} disabled={!title.trim()}>
            Создать задачу
          </button>
        </div>
      </div>
    </>
  );
}
