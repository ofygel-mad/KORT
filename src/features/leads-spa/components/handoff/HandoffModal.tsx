import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, MessageSquare, AlertCircle } from 'lucide-react';
import { useLeadsStore } from '../../model/leads.store';
import s from './Handoff.module.css';

const CLOSERS = [
  { id: 'u2', name: 'Сауле Мухамбет' },
  { id: 'u3', name: 'Алибек Нуров' },
];

export function HandoffModal() {
  const { leads, handoffLeadId, closeHandoff, completeHandoff } = useLeadsStore();
  const lead = leads.find(l => l.id === handoffLeadId);
  const [closerId, setCloserId] = useState('');
  const [meetingAt, setMeetingAt] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!closerId) { setError('Выберите ответственного'); return; }
    if (!meetingAt) { setError('Укажите дату встречи'); return; }
    if (!comment.trim()) { setError('Оставьте комментарий для передачи'); return; }
    setError('');
    setSubmitting(true);
    await completeHandoff(handoffLeadId!, closerId, meetingAt, comment);
    setSubmitting(false);
    setCloserId(''); setMeetingAt(''); setComment('');
  };

  return (
    <AnimatePresence>
      {handoffLeadId && lead && (
        <>
          <motion.div
            className={s.backdrop}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeHandoff}
          />
          <div className={s.shell}>
            <motion.div
              className={s.modal}
              initial={{ opacity: 0, scale: 0.93, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <div className={s.header}>
                <div>
                  <div className={s.eyebrow}>Передача лида</div>
                  <div className={s.title}>{lead.fullName}</div>
                  <div className={s.sub}>Заполните все поля — лид перейдёт к клоузеру мгновенно</div>
                </div>
                <button className={s.closeBtn} onClick={closeHandoff}><X size={15} /></button>
              </div>

              <div className={s.body}>
                {/* Closer picker */}
                <div className={s.field}>
                  <label className={s.fieldLabel}><User size={12} /> Ответственный клоузер</label>
                  <div className={s.closerGrid}>
                    {CLOSERS.map(c => (
                      <button
                        key={c.id}
                        className={`${s.closerCard} ${closerId === c.id ? s.closerCardActive : ''}`}
                        onClick={() => setCloserId(c.id)}
                      >
                        <div className={s.closerAvatar}>{c.name[0]}</div>
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meeting time */}
                <div className={s.field}>
                  <label className={s.fieldLabel}><Calendar size={12} /> Дата и время встречи</label>
                  <input
                    type="datetime-local"
                    className={s.input}
                    value={meetingAt}
                    onChange={e => setMeetingAt(e.target.value)}
                  />
                </div>

                {/* Comment */}
                <div className={s.field}>
                  <label className={s.fieldLabel}><MessageSquare size={12} /> Комментарий для клоузера</label>
                  <textarea
                    className={s.textarea}
                    placeholder="Например: клиент хочет 3-комнатную, бюджет 800к, торгуется..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={3}
                  />
                </div>

                {error && (
                  <div className={s.error}><AlertCircle size={13} />{error}</div>
                )}
              </div>

              <div className={s.footer}>
                <button className={s.cancelBtn} onClick={closeHandoff}>Отмена</button>
                <button
                  className={s.confirmBtn}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Передаю...' : 'Передать лида →'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
