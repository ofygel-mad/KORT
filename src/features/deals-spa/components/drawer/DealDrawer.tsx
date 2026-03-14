import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Phone, MessageCircle, Trophy, XCircle, Clock, CheckSquare, Square,
  Send, Plus, Calendar, User, Tag, FileText, Trash2, AlignLeft,
  PhoneCall, Mail, Users as UsersIcon,
} from 'lucide-react';
import { useDealsStore } from '../../model/deals.store';
import { STAGE_LABEL, STAGE_ACCENT, DEAL_CHECKLIST, ACTIVITY_LABEL, ACTIVITY_COLOR } from '../../api/types';
import type { ActivityType, TaskPriority } from '../../api/types';
import s from './Drawer.module.css';

// ── Helpers ───────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  instagram: 'Instagram', site: 'Сайт', referral: 'Реферал', ad: 'Реклама',
};

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₸';
}
function fmtDT(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('ru', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: 'short', year: 'numeric' });
}
function isOverdue(iso?: string) {
  return iso ? new Date(iso).getTime() < Date.now() : false;
}

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  note:         <AlignLeft size={12} />,
  call:         <PhoneCall size={12} />,
  meeting:      <UsersIcon size={12} />,
  email:        <Mail size={12} />,
  stage_change: <Tag size={12} />,
  system:       <FileText size={12} />,
};

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'note',    label: 'Заметка' },
  { value: 'call',    label: 'Звонок' },
  { value: 'meeting', label: 'Встреча' },
  { value: 'email',   label: 'Письмо' },
];

// ── Component ─────────────────────────────────────────────────

export function DealDrawer() {
  const {
    deals, drawerOpen, activeId, closeDrawer,
    addActivity, addTask, toggleTask, toggleChecklist,
    updateDeal, openLostModal, openWonModal, openDeleteConfirm,
  } = useDealsStore();

  const deal = deals.find(d => d.id === activeId);

  // Activity input
  const [actText,    setActText]    = useState('');
  const [actType,    setActType]    = useState<ActivityType>('note');
  const [actFilter,  setActFilter]  = useState<ActivityType | 'all'>('all');
  const [sending,    setSending]    = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Task input
  const [taskTitle,    setTaskTitle]    = useState('');
  const [taskDue,      setTaskDue]      = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskOpen,     setTaskOpen]     = useState(false);

  // Inline edit — value & probability
  const [editValue,  setEditValue]  = useState('');
  const [editProb,   setEditProb]   = useState('');
  const [editingVal, setEditingVal] = useState(false);
  const [editingProb,setEditingProb]= useState(false);

  useEffect(() => {
    if (deal) {
      setEditValue(String(deal.value));
      setEditProb(String(deal.probability));
    }
  }, [deal?.id]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [deal?.activities.length]);

  if (!deal) return null;

  // ── Handlers ─────────────────────────────────────────────

  const handleActivity = async () => {
    const text = actText.trim();
    if (!text) return;
    setSending(true);
    await addActivity(deal.id, actType, text, 'Менеджер');
    setActText('');
    setSending(false);
  };

  const handleTask = async () => {
    const title = taskTitle.trim();
    if (!title) return;
    await addTask(deal.id, title, taskPriority, taskDue || undefined);
    setTaskTitle(''); setTaskDue(''); setTaskPriority('medium');
    setTaskOpen(false);
  };

  const handleValueBlur = () => {
    setEditingVal(false);
    const val = parseInt(editValue.replace(/\D/g, ''), 10);
    if (!isNaN(val) && val !== deal.value) updateDeal(deal.id, { value: val });
  };

  const handleProbBlur = () => {
    setEditingProb(false);
    const prob = Math.min(100, Math.max(0, parseInt(editProb, 10)));
    if (!isNaN(prob) && prob !== deal.probability) updateDeal(deal.id, { probability: prob });
  };

  const filteredActs = actFilter === 'all'
    ? deal.activities
    : deal.activities.filter(a => a.type === actFilter);

  const pendingTasks = deal.tasks.filter(t => !t.done);
  const doneTasks    = deal.tasks.filter(t => t.done);

  return (
    <AnimatePresence>
      {drawerOpen && (
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
            {/* ── Header ────────────────────────────── */}
            <div className={s.header}>
              <div className={s.headerLeft}>
                <div className={s.avatar}>{deal.fullName[0]}</div>
                <div>
                  <div className={s.dealTitle}>{deal.title}</div>
                  <div className={s.stagePill} style={{ color: STAGE_ACCENT[deal.stage] }}>
                    <span className={s.stageDot} style={{ background: STAGE_ACCENT[deal.stage] }} />
                    {STAGE_LABEL[deal.stage]}
                  </div>
                </div>
              </div>
              <div className={s.headerActions}>
                {deal.stage !== 'won' && deal.stage !== 'lost' && (
                  <>
                    <button className={`${s.hdrBtn} ${s.hdrBtnWon}`} onClick={() => openWonModal(deal.id)} title="Закрыть как выигранную">
                      <Trophy size={13} /> Выиграно
                    </button>
                    <button className={`${s.hdrBtn} ${s.hdrBtnLost}`} onClick={() => openLostModal(deal.id)} title="Отметить как проигранную">
                      <XCircle size={13} /> Слив
                    </button>
                  </>
                )}
                <button className={s.deleteBtn} onClick={() => openDeleteConfirm(deal.id)} title="Удалить сделку">
                  <Trash2 size={13} />
                </button>
                <button className={s.closeBtn} onClick={closeDrawer}><X size={14} /></button>
              </div>
            </div>

            {/* ── Two-zone body ──────────────────────── */}
            <div className={s.twoZone}>

              {/* LEFT — profile ───────────────────────── */}
              <div className={s.profilePane}>

                {/* Contact */}
                <div className={s.paneSection}>
                  <div className={s.sectionTitle}><User size={11} /> Контакт</div>
                  <div className={s.contactBlock}>
                    <div className={s.phoneRow}>
                      <span className={s.phoneVal}>{deal.phone}</span>
                      <div className={s.contactBtns}>
                        <a className={s.contactBtn} href={`tel:${deal.phone}`}><Phone size={12} /></a>
                        <a className={s.contactBtn} href={`https://wa.me/${deal.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><MessageCircle size={12} /></a>
                      </div>
                    </div>
                    {deal.email && <div className={s.infoRow}><span className={s.infoLabel}>Email</span><span className={s.infoVal}>{deal.email}</span></div>}
                    {deal.companyName && <div className={s.infoRow}><span className={s.infoLabel}>Компания</span><span className={s.infoVal}>{deal.companyName}</span></div>}
                    <div className={s.infoRow}><span className={s.infoLabel}>Источник</span><span className={s.infoVal}>{SOURCE_LABEL[deal.source] ?? deal.source}</span></div>
                  </div>
                </div>

                {/* Deal financials — inline editable */}
                <div className={s.paneSection}>
                  <div className={s.sectionTitle}><Tag size={11} /> Сделка</div>
                  <div className={s.finGrid}>
                    <div className={s.finCell}>
                      <span className={s.finLabel}>Сумма</span>
                      {editingVal
                        ? <input
                            className={s.finInput}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={handleValueBlur}
                            onKeyDown={e => { if (e.key === 'Enter') handleValueBlur(); }}
                            autoFocus
                          />
                        : <span className={`${s.finValue} ${s.finValueMoney}`} onClick={() => setEditingVal(true)} title="Нажмите чтобы изменить">
                            {fmt(deal.value)}
                          </span>
                      }
                    </div>
                    <div className={s.finCell}>
                      <span className={s.finLabel}>Вероятность</span>
                      {editingProb
                        ? <input
                            className={s.finInput}
                            value={editProb}
                            onChange={e => setEditProb(e.target.value)}
                            onBlur={handleProbBlur}
                            onKeyDown={e => { if (e.key === 'Enter') handleProbBlur(); }}
                            autoFocus
                          />
                        : <span className={s.finValue} onClick={() => setEditingProb(true)} title="Нажмите чтобы изменить">
                            {deal.probability}%
                          </span>
                      }
                    </div>
                  </div>
                  {/* Prob bar */}
                  <div className={s.probBarWrap}>
                    <div className={s.probBar}>
                      <div className={s.probFill} style={{
                        width: `${deal.probability}%`,
                        background: deal.probability >= 75 ? '#22c55e' : deal.probability >= 45 ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                  </div>
                </div>

                {/* Dates & assignee */}
                <div className={s.paneSection}>
                  <div className={s.sectionTitle}><Calendar size={11} /> Даты</div>
                  <div className={s.detailRows}>
                    {deal.assignedName && (
                      <div className={s.detailRow}>
                        <span className={s.detailLabel}>Ответственный</span>
                        <span className={s.detailVal}>{deal.assignedName}</span>
                      </div>
                    )}
                    {deal.qualifierName && (
                      <div className={s.detailRow}>
                        <span className={s.detailLabel}>Квалификатор</span>
                        <span className={s.detailVal}>{deal.qualifierName}</span>
                      </div>
                    )}
                    {deal.meetingAt && (
                      <div className={s.detailRow}>
                        <span className={s.detailLabel}><Clock size={10} /> Встреча</span>
                        <span className={`${s.detailVal} ${isOverdue(deal.meetingAt) ? s.overdue : s.upcoming}`}>
                          {fmtDT(deal.meetingAt)}
                        </span>
                      </div>
                    )}
                    {deal.expectedCloseAt && (
                      <div className={s.detailRow}>
                        <span className={s.detailLabel}>Закрытие</span>
                        <span className={`${s.detailVal} ${isOverdue(deal.expectedCloseAt) ? s.overdue : ''}`}>
                          {fmtDate(deal.expectedCloseAt)}
                        </span>
                      </div>
                    )}
                    <div className={s.detailRow}>
                      <span className={s.detailLabel}>Создана</span>
                      <span className={s.detailVal}>{fmtDate(deal.createdAt)}</span>
                    </div>
                    {deal.wonAt && (
                      <div className={s.detailRow}>
                        <span className={s.detailLabel}>Закрыта</span>
                        <span className={`${s.detailVal} ${s.won}`}>{fmtDate(deal.wonAt)}</span>
                      </div>
                    )}
                    {deal.lostAt && (
                      <div className={s.detailRow}>
                        <span className={s.detailLabel}>Проиграна</span>
                        <span className={`${s.detailVal} ${s.lost}`}>{fmtDate(deal.lostAt)}</span>
                      </div>
                    )}
                    {deal.lostReason && (
                      <div className={s.detailRow}>
                        <span className={s.detailLabel}>Причина</span>
                        <span className={`${s.detailVal} ${s.lost}`}>{deal.lostReason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Checklist */}
                <div className={s.paneSection}>
                  <div className={s.sectionTitle}><CheckSquare size={11} /> Чек-лист</div>
                  <div className={s.checklist}>
                    {DEAL_CHECKLIST.map(item => {
                      const done = (deal.checklistDone ?? []).includes(item.id);
                      return (
                        <button key={item.id} className={s.checkItem} onClick={() => toggleChecklist(deal.id, item.id)}>
                          {done ? <CheckSquare size={13} color="rgba(34,197,94,0.8)" /> : <Square size={13} color="rgba(255,255,255,0.2)" />}
                          <span className={done ? s.checkDone : ''}>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tasks */}
                <div className={s.paneSection}>
                  <div className={s.sectionTitleRow}>
                    <div className={s.sectionTitle}><Clock size={11} /> Задачи</div>
                    <button className={s.addTaskBtn} onClick={() => setTaskOpen(v => !v)}>
                      <Plus size={11} />
                    </button>
                  </div>

                  {taskOpen && (
                    <div className={s.taskForm}>
                      <input className={s.taskInput} placeholder="Название задачи" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
                      <div className={s.taskFormRow}>
                        <input className={s.taskInput} type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} style={{ flex: '0 0 auto', width: '130px' }} />
                        <select className={s.taskSelect} value={taskPriority} onChange={e => setTaskPriority(e.target.value as TaskPriority)}>
                          <option value="low">Низкий</option>
                          <option value="medium">Средний</option>
                          <option value="high">Высокий</option>
                        </select>
                        <button className={s.taskConfirm} onClick={handleTask} disabled={!taskTitle.trim()}>
                          Добавить
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={s.tasks}>
                    {[...pendingTasks, ...doneTasks].map(task => (
                      <div key={task.id} className={s.taskRow}>
                        <button className={s.taskCheck} onClick={() => toggleTask(deal.id, task.id)}>
                          {task.done
                            ? <CheckSquare size={13} color="rgba(34,197,94,0.7)" />
                            : <Square size={13} color="rgba(255,255,255,0.25)" />}
                        </button>
                        <div className={s.taskBody}>
                          <span className={`${s.taskTitle} ${task.done ? s.taskDone : ''}`}>{task.title}</span>
                          {task.dueAt && (
                            <span className={`${s.taskDue} ${isOverdue(task.dueAt) && !task.done ? s.taskDueOverdue : ''}`}>
                              {new Date(task.dueAt).toLocaleDateString('ru', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                        <span className={`${s.taskPriority} ${s[`priority_${task.priority}`]}`}>
                          {task.priority === 'high' ? '!' : task.priority === 'medium' ? '·' : ''}
                        </span>
                      </div>
                    ))}
                    {deal.tasks.length === 0 && (
                      <div className={s.tasksEmpty}>Нет задач</div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT — activity feed ────────────────── */}
              <div className={s.feedPane}>

                {/* Activity type filter */}
                <div className={s.feedFilters}>
                  {(['all', 'note', 'call', 'meeting', 'email'] as const).map(f => (
                    <button
                      key={f}
                      className={`${s.feedFilterBtn} ${actFilter === f ? s.feedFilterActive : ''}`}
                      onClick={() => setActFilter(f)}
                    >
                      {f === 'all' ? 'Все' : ACTIVITY_LABEL[f]}
                    </button>
                  ))}
                </div>

                {/* Feed */}
                <div className={s.feed}>
                  {filteredActs.length === 0 && (
                    <div className={s.feedEmpty}>
                      {actFilter === 'all' ? 'Нет активности' : `Нет записей типа "${ACTIVITY_LABEL[actFilter]}"`}
                    </div>
                  )}
                  {filteredActs.map((act, i) => (
                    <div key={act.id} className={`${s.feedEntry} ${i === filteredActs.length - 1 ? s.feedLast : ''}`}>
                      <div
                        className={s.feedIcon}
                        style={{ background: `color-mix(in srgb, ${ACTIVITY_COLOR[act.type]} 20%, rgba(255,255,255,0.04))`,
                                 borderColor: `color-mix(in srgb, ${ACTIVITY_COLOR[act.type]} 40%, rgba(255,255,255,0.1))`,
                                 color: ACTIVITY_COLOR[act.type] }}
                      >
                        {ACTIVITY_ICONS[act.type]}
                      </div>
                      <div className={s.feedBody}>
                        <div className={s.feedTypeRow}>
                          <span className={s.feedType} style={{ color: ACTIVITY_COLOR[act.type] }}>
                            {ACTIVITY_LABEL[act.type]}
                          </span>
                          {act.durationMin && <span className={s.feedDuration}>{act.durationMin} мин</span>}
                        </div>
                        <div className={s.feedContent}>{act.content}</div>
                        <div className={s.feedMeta}>
                          <span className={s.feedAuthor}>{act.author}</span>
                          &nbsp;·&nbsp;
                          {new Date(act.createdAt).toLocaleString('ru', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={feedEndRef} />
                </div>

                {/* Activity input */}
                <div className={s.activityBox}>
                  <div className={s.activityTypeRow}>
                    {ACTIVITY_TYPES.map(t => (
                      <button
                        key={t.value}
                        className={`${s.actTypeBtn} ${actType === t.value ? s.actTypeBtnActive : ''}`}
                        style={actType === t.value ? { color: ACTIVITY_COLOR[t.value], borderColor: `color-mix(in srgb, ${ACTIVITY_COLOR[t.value]} 40%, rgba(255,255,255,0.1))` } : {}}
                        onClick={() => setActType(t.value)}
                      >
                        {ACTIVITY_ICONS[t.value]}
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className={s.activityInputRow}>
                    <textarea
                      className={s.actInput}
                      placeholder={`Добавить ${ACTIVITY_LABEL[actType].toLowerCase()}...`}
                      value={actText}
                      onChange={e => setActText(e.target.value)}
                      rows={2}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleActivity(); }}
                    />
                    <button
                      className={s.actSend}
                      onClick={handleActivity}
                      disabled={!actText.trim() || sending}
                      title="Сохранить (Ctrl+Enter)"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
