/**
 * features/tasks-spa/components/modals/CreateTaskModal.tsx
 * Modal for creating a new task. Supports preset from bus request.
 */
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTasksStore } from '../../model/tasks.store';
import { useTileTasksUI } from '../../model/tile-ui.store';
import { PRIORITY_ORDER, PRIORITY_LABEL, STATUS_ORDER, STATUS_LABEL, TAGS } from '../../api/types';
import type { TaskPriority, TaskStatus } from '../../api/types';
import { ASSIGNEES } from '../../api/mock';
import s from './Modals.module.css';

interface Props { tileId: string; }

export function CreateTaskModal({ tileId }: Props) {
  const { createTask } = useTasksStore();
  const { createModalOpen, createPreset, closeCreateModal } = useTileTasksUI(tileId);

  const [title,      setTitle]      = useState('');
  const [desc,       setDesc]       = useState('');
  const [priority,   setPriority]   = useState<TaskPriority>('medium');
  const [status,     setStatus]     = useState<TaskStatus>('todo');
  const [assignee,   setAssignee]   = useState('');
  const [dueAt,      setDueAt]      = useState('');
  const [tags,       setTags]       = useState<string[]>([]);

  // Apply preset when modal opens
  useEffect(() => {
    if (createModalOpen && createPreset) {
      setTitle(createPreset.title ?? '');
      setPriority(createPreset.priority ?? 'medium');
      setStatus(createPreset.status ?? 'todo');
      setAssignee(createPreset.assignedName ?? '');
      setDueAt(createPreset.dueAt ? new Date(createPreset.dueAt).toISOString().slice(0, 16) : '');
    } else if (!createModalOpen) {
      // Reset on close
      setTitle(''); setDesc(''); setPriority('medium'); setStatus('todo');
      setAssignee(''); setDueAt(''); setTags([]);
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

  const toggleTag = (id: string) =>
    setTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  return (
    <>
      <div className={s.overlay} onClick={closeCreateModal} />
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Новая задача</span>
          <button className={s.closeBtn} onClick={closeCreateModal}><X size={15} /></button>
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
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>Описание</label>
            <textarea
              className={s.textarea}
              value={desc}
              placeholder="Дополнительные детали..."
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.label}>Приоритет</label>
              <select className={s.select} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                {PRIORITY_ORDER.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Статус</label>
              <select className={s.select} value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                {STATUS_ORDER.map(st => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
              </select>
            </div>
          </div>

          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.label}>Исполнитель</label>
              <select className={s.select} value={assignee} onChange={e => setAssignee(e.target.value)}>
                <option value="">— Не назначен —</option>
                {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Срок</label>
              <input type="datetime-local" className={s.input} value={dueAt} onChange={e => setDueAt(e.target.value)} />
            </div>
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>Метки</label>
            <div className={s.tagsWrap}>
              {TAGS.map(tg => {
                const active = tags.includes(tg.id);
                return (
                  <button
                    key={tg.id}
                    className={s.tagBtn}
                    style={active
                      ? { background: tg.color + '28', color: tg.color, borderColor: tg.color + '60' }
                      : { background: 'transparent', color: '#6b7280', borderColor: 'rgba(255,255,255,.1)' }
                    }
                    onClick={() => toggleTag(tg.id)}
                  >
                    {tg.label}
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
