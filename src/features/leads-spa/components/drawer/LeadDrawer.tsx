import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MessageCircle, Clock, CheckSquare, Square, User, History, Tag } from 'lucide-react';
import { useLeadsStore } from '../../model/leads.store';
import { CONTRACT_CHECKLIST } from '../../api/types';
import s from './Drawer.module.css';

const STAGE_LABELS: Record<string, string> = {
  new:'Новый', in_progress:'В работе', no_answer:'Недозвон', thinking:'Думает',
  meeting_set:'Встреча назначена', junk:'Брак', awaiting_meeting:'Ожидает встречи',
  meeting_done:'Встреча проведена', proposal:'Подготовка КП', contract:'Договор',
  awaiting_payment:'Ожидание оплаты', won:'Успешно', lost:'Слив',
};

export function LeadDrawer() {
  const { leads, drawerOpen, activeLeadId, closeDrawer, toggleChecklist } = useLeadsStore();
  const lead = leads.find(l => l.id === activeLeadId);

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
            {/* Header */}
            <div className={s.header}>
              <div className={s.headerLeft}>
                <div className={s.avatar}>{lead.fullName[0]}</div>
                <div>
                  <div className={s.name}>{lead.fullName}</div>
                  <div className={s.stage}>{STAGE_LABELS[lead.stage] ?? lead.stage}</div>
                </div>
              </div>
              <button className={s.closeBtn} onClick={closeDrawer}><X size={16} /></button>
            </div>

            <div className={s.body}>
              {/* Contact */}
              <div className={s.section}>
                <div className={s.sectionTitle}><User size={12} /> Контакт</div>
                <div className={s.contactRow}>
                  <span className={s.contactVal}>{lead.phone}</span>
                  <div className={s.contactActions}>
                    <a className={s.contactBtn} href={`tel:${lead.phone}`}><Phone size={13} /></a>
                    <a className={s.contactBtn} href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><MessageCircle size={13} /></a>
                  </div>
                </div>
                {lead.email && <div className={s.contactRow}><span className={s.contactVal}>{lead.email}</span></div>}
                {lead.companyName && <div className={s.contactRow}><span className={s.label}>Компания</span><span className={s.contactVal}>{lead.companyName}</span></div>}
              </div>

              {/* Details */}
              <div className={s.section}>
                <div className={s.sectionTitle}><Tag size={12} /> Детали</div>
                <div className={s.detailGrid}>
                  {lead.budget && <><span className={s.label}>Бюджет</span><span>{new Intl.NumberFormat('ru-RU').format(lead.budget)} ₸</span></>}
                  {lead.callbackAt && <><span className={s.label}>Перезвонить</span><span><Clock size={11} /> {new Date(lead.callbackAt).toLocaleString('ru',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span></>}
                  {lead.meetingAt && <><span className={s.label}>Встреча</span><span>{new Date(lead.meetingAt).toLocaleString('ru',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span></>}
                  {lead.assignedName && <><span className={s.label}>Ответственный</span><span>{lead.assignedName}</span></>}
                  {lead.comment && <><span className={s.label}>Комментарий</span><span className={s.commentVal}>{lead.comment}</span></>}
                </div>
              </div>

              {/* Contract checklist — shown only in contract stage */}
              {lead.stage === 'contract' && (
                <div className={s.section}>
                  <div className={s.sectionTitle}><CheckSquare size={12} /> Чек-лист договора</div>
                  <div className={s.checklist}>
                    {CONTRACT_CHECKLIST.map(item => {
                      const done = (lead.checklistDone ?? []).includes(item.id);
                      return (
                        <button key={item.id} className={s.checkItem} onClick={() => toggleChecklist(lead.id, item.id)}>
                          {done ? <CheckSquare size={16} color="rgba(34,197,94,0.8)" /> : <Square size={16} color="rgba(255,255,255,0.25)" />}
                          <span className={done ? s.checkItemDone : ''}>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* History */}
              <div className={s.section}>
                <div className={s.sectionTitle}><History size={12} /> История</div>
                <div className={s.history}>
                  {[...lead.history].reverse().map(entry => (
                    <div key={entry.id} className={s.historyEntry}>
                      <div className={s.historyDot} />
                      <div className={s.historyBody}>
                        <div className={s.historyAction}>{entry.action}</div>
                        {entry.comment && <div className={s.historyComment}>{entry.comment}</div>}
                        <div className={s.historyMeta}>{entry.author} · {new Date(entry.timestamp).toLocaleString('ru',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
