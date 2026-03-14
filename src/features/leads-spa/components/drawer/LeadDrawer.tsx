/**
 * LeadDrawer — two-zone layout:
 *   Left  (35%): static profile — name, phone, meta, checklist
 *   Right (65%): event feed + comment input at bottom
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MessageCircle, Clock, CheckSquare, Square, User, Tag, Send, CalendarDays } from 'lucide-react';
import { useLeadsStore } from '../../model/leads.store';
import { CONTRACT_CHECKLIST } from '../../api/types';
import s from './Drawer.module.css';

const STAGE_LABELS: Record<string, string> = {
  new:'Новый', in_progress:'В работе', no_answer:'Недозвон', thinking:'Думает',
  meeting_set:'Встреча назначена', junk:'Брак',
  awaiting_meeting:'Ожидает встречи', meeting_done:'Встреча проведена',
  proposal:'Подготовка КП', contract:'Договор',
  awaiting_payment:'Ожидание оплаты', won:'Успешно', lost:'Слив',
};

const STAGE_COLOR: Record<string, string> = {
  new:'#3b82f6', in_progress:'#8b5cf6', no_answer:'#f59e0b',
  thinking:'#ec4899', meeting_set:'#22c55e', junk:'#6b7280',
  awaiting_meeting:'#3b82f6', meeting_done:'#8b5cf6', proposal:'#f59e0b',
  contract:'#ec4899', awaiting_payment:'#f97316', won:'#22c55e', lost:'#ef4444',
};

const SOURCE_LABEL: Record<string, string> = {
  instagram:'Instagram', site:'Сайт', referral:'Реферал', ad:'Реклама',
};

function fmt(n?: number) {
  if (!n) return null;
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₸';
}
function fmtDateTime(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('ru', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

export function LeadDrawer() {
  const { leads, drawerOpen, activeLeadId, closeDrawer, toggleChecklist, addComment } = useLeadsStore();
  const lead = leads.find(l => l.id === activeLeadId);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll feed to bottom when new entries added
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lead?.history.length]);

  const handleComment = async () => {
    const text = commentText.trim();
    if (!text || !lead) return;
    setSending(true);
    await addComment(lead.id, text, 'Менеджер');
    setCommentText('');
    setSending(false);
  };

  return (
    <AnimatePresence>
      {drawerOpen && lead && (
        <>
          <motion.div
            className={s.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeDrawer}
          />
          <motion.aside
            className={s.drawer}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.85 }}
          >
            {/* ── Slim header ───────────────────────────── */}
            <div className={s.header}>
              <div className={s.headerLeft}>
                <div className={s.avatar}>{lead.fullName[0]}</div>
                <div>
                  <div className={s.name}>{lead.fullName}</div>
                  <div className={s.stagePill} style={{ color: STAGE_COLOR[lead.stage] ?? '#6b7280' }}>
                    <span className={s.stageDot} style={{ background: STAGE_COLOR[lead.stage] ?? '#6b7280' }} />
                    {STAGE_LABELS[lead.stage] ?? lead.stage}
                  </div>
                </div>
              </div>
              <button className={s.closeBtn} onClick={closeDrawer}><X size={15} /></button>
            </div>

            {/* ── Two-zone body ─────────────────────────── */}
            <div className={s.twoZone}>

              {/* LEFT — static profile panel */}
              <div className={s.profilePane}>

                {/* Contact */}
                <div className={s.paneSection}>
                  <div className={s.sectionTitle}><User size={11} /> Контакт</div>

                  <div className={s.contactBlock}>
                    <div className={s.phoneRow}>
                      <span className={s.phoneVal}>{lead.phone}</span>
                      <div className={s.contactBtns}>
                        <a className={s.contactBtn} href={`tel:${lead.phone}`} title="Позвонить">
                          <Phone size={13} />
                        </a>
                        <a className={s.contactBtn}
                          href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`}
                          target="_blank" rel="noreferrer" title="WhatsApp">
                          <MessageCircle size={13} />
                        </a>
                      </div>
                    </div>
                    {lead.email && <div className={s.infoRow}><span className={s.infoVal}>{lead.email}</span></div>}
                    {lead.companyName && (
                      <div className={s.infoRow}>
                        <span className={s.infoLabel}>Компания</span>
                        <span className={s.infoVal}>{lead.companyName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className={s.paneSection}>
                  <div className={s.sectionTitle}><Tag size={11} /> Детали</div>
                  <div className={s.detailRows}>
                    <div className={s.detailRow}>
                      <span className={s.detailLabel}>Источник</span>
                      <span className={s.detailVal}>{SOURCE_LABEL[lead.source] ?? lead.source}</span>
                    </div>
                    {fmt(lead.budget) && (
                      <div className={s.detailRow}>
                        <span className={s.detailLabel}>Бюджет</span>
                        <span className={`${s.detailVal} ${s.budget}`}>{fmt(lead.budget)}</span>
                      </div>
                    )}
                    {lead.assignedName && (
                      <div className={s.detailRow}>
                        <span className={s.detailLabel}>Ответственный</span>
                        <span className={s.detailVal}>{lead.assignedName}</span>
                      </div>
                    )}
                    {lead.callbackAt && (
                      <div className={s.detailRow}>
                        <span className={s.detailLabel}><Clock size={10} /> Перезвонить</span>
                        <span className={`${s.detailVal} ${s.callback}`}>{fmtDateTime(lead.callbackAt)}</span>
                      </div>
                    )}
                    {lead.meetingAt && (
                      <div className={s.detailRow}>
                        <span className={s.detailLabel}><CalendarDays size={10} /> Встреча</span>
                        <span className={`${s.detailVal} ${s.meeting}`}>{fmtDateTime(lead.meetingAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contract checklist — only in contract stage */}
                {lead.stage === 'contract' && (
                  <div className={s.paneSection}>
                    <div className={s.sectionTitle}><CheckSquare size={11} /> Чек-лист</div>
                    <div className={s.checklist}>
                      {CONTRACT_CHECKLIST.map(item => {
                        const done = (lead.checklistDone ?? []).includes(item.id);
                        return (
                          <button key={item.id} className={s.checkItem} onClick={() => toggleChecklist(lead.id, item.id)}>
                            {done
                              ? <CheckSquare size={14} color="rgba(34,197,94,0.8)" />
                              : <Square size={14} color="rgba(255,255,255,0.2)" />}
                            <span className={done ? s.checkDone : ''}>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Created */}
                <div className={s.createdAt}>
                  Добавлен {fmtDateTime(lead.createdAt)}
                </div>
              </div>

              {/* RIGHT — feed + input */}
              <div className={s.feedPane}>
                <div className={s.feedTitle}>Лента событий</div>

                {/* Event feed */}
                <div className={s.feed}>
                  {lead.history.map((entry, i) => (
                    <div key={entry.id} className={`${s.feedEntry} ${i === lead.history.length - 1 ? s.feedEntryLast : ''}`}>
                      <div className={s.feedDot} />
                      <div className={s.feedBody}>
                        <div className={s.feedAction}>{entry.action}</div>
                        {entry.comment && <div className={s.feedComment}>{entry.comment}</div>}
                        <div className={s.feedMeta}>
                          <span className={s.feedAuthor}>{entry.author}</span>
                          &nbsp;·&nbsp;
                          {new Date(entry.timestamp).toLocaleString('ru', {
                            day:'2-digit', month:'short',
                            hour:'2-digit', minute:'2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={feedEndRef} />
                </div>

                {/* Comment input */}
                <div className={s.commentBox}>
                  <textarea
                    className={s.commentInput}
                    placeholder="Написать комментарий или итог звонка..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    rows={2}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment();
                    }}
                  />
                  <button
                    className={s.commentSend}
                    onClick={handleComment}
                    disabled={!commentText.trim() || sending}
                    title="Отправить (Ctrl+Enter)"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
