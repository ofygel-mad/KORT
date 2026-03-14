/**
 * leads-spa/index.tsx — SPA shell mounted inside the workspace tile modal.
 */
import { useEffect, useState } from 'react';
import { Users, Briefcase, LayoutList, Plus, X, ChevronDown } from 'lucide-react';
import { useLeadsStore } from './model/leads.store';
import { useNotifStore } from './model/notifications.store';
import { useLeadsRbac, canSeeQualifierBoard, canSeeCloserBoard } from './model/rbac.store';
import { QualifierView } from './views/QualifierView';
import { CloserView } from './views/CloserView';
import { AllLeadsView } from './views/AllLeadsView';
import { LeadDrawer } from './components/drawer/LeadDrawer';
import { HandoffModal } from './components/handoff/HandoffModal';
import { GlobalSearch } from './components/search/GlobalSearch';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import s from './LeadsSPA.module.css';

type NavTab = 'qualifier' | 'closer' | 'all';

const SOURCE_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'site',      label: 'Сайт' },
  { value: 'referral',  label: 'Реферал' },
  { value: 'ad',        label: 'Реклама' },
];

export function LeadsSPA() {
  const { leads, loading, load, addLead } = useLeadsStore();
  const { load: loadNotifs } = useNotifStore();
  const { currentRole } = useLeadsRbac();
  const [tab, setTab] = useState<NavTab>('qualifier');
  const [addOpen, setAddOpen] = useState(false);

  // Add form state
  const [newName,   setNewName]   = useState('');
  const [newPhone,  setNewPhone]  = useState('');
  const [newSource, setNewSource] = useState('instagram');
  const [newBudget, setNewBudget] = useState('');
  const [newComment,setNewComment]= useState('');

  useEffect(() => { load(); loadNotifs(); }, []);

  useEffect(() => {
    if (!canSeeQualifierBoard(currentRole)) setTab('closer');
  }, [currentRole]);

  const showQualifier = canSeeQualifierBoard(currentRole);
  const showCloser    = canSeeCloserBoard(currentRole);

  const handleAddLead = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    await addLead({
      fullName: newName.trim(),
      phone: newPhone.trim(),
      source: newSource,
      budget: newBudget ? parseInt(newBudget.replace(/\D/g,''), 10) || undefined : undefined,
      comment: newComment.trim() || undefined,
    });
    setNewName(''); setNewPhone(''); setNewBudget(''); setNewComment(''); setNewSource('instagram');
    setAddOpen(false);
  };

  const counts = {
    qualifier: leads.filter(l => l.pipeline === 'qualifier').length,
    closer:    leads.filter(l => l.pipeline === 'closer').length,
  };

  return (
    <div className={s.root}>
      {/* ── Top bar ─────────────────────────────────────── */}
      <header className={s.topbar}>
        <div className={s.topbarLeft}>
          <GlobalSearch />
        </div>
        <div className={s.topbarRight}>
          <NotificationCenter />
          <button className={s.addBtn} onClick={() => setAddOpen(v => !v)}>
            <Plus size={14} />
            Добавить лида
            <ChevronDown size={12} style={{ opacity: 0.6, transform: addOpen ? 'rotate(180deg)' : '', transition: 'transform 200ms' }} />
          </button>
        </div>
      </header>

      {/* ── Add lead expanded form ───────────────────── */}
      {addOpen && (
        <div className={s.addPanel}>
          <div className={s.addPanelTitle}>Новый лид</div>
          <div className={s.addGrid}>
            <div className={s.addField}>
              <label className={s.addLabel}>Имя *</label>
              <input className={s.addInput} placeholder="Имя клиента" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className={s.addField}>
              <label className={s.addLabel}>Телефон *</label>
              <input className={s.addInput} placeholder="+7 (___) ___-__-__" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            </div>
            <div className={s.addField}>
              <label className={s.addLabel}>Источник</label>
              <select className={s.addSelect} value={newSource} onChange={e => setNewSource(e.target.value)}>
                {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className={s.addField}>
              <label className={s.addLabel}>Бюджет (₸)</label>
              <input className={s.addInput} placeholder="500 000" value={newBudget} onChange={e => setNewBudget(e.target.value)} />
            </div>
            <div className={`${s.addField} ${s.addFieldFull}`}>
              <label className={s.addLabel}>Первичный комментарий</label>
              <input className={s.addInput} placeholder="Что хочет клиент, откуда пришёл..." value={newComment} onChange={e => setNewComment(e.target.value)} />
            </div>
          </div>
          <div className={s.addActions}>
            <button className={s.addCancel} onClick={() => setAddOpen(false)}><X size={13} /> Отмена</button>
            <button className={s.addConfirm} onClick={handleAddLead} disabled={!newName.trim() || !newPhone.trim()}>
              Добавить →
            </button>
          </div>
        </div>
      )}

      {/* ── Tab nav ──────────────────────────────────── */}
      <nav className={s.tabs}>
        {showQualifier && (
          <button className={`${s.tab} ${tab === 'qualifier' ? s.tabActive : ''}`} onClick={() => setTab('qualifier')}>
            <Users size={13} /> Воронка лидов
            <span className={s.tabCount}>{counts.qualifier}</span>
          </button>
        )}
        {showCloser && (
          <button className={`${s.tab} ${tab === 'closer' ? s.tabActive : ''}`} onClick={() => setTab('closer')}>
            <Briefcase size={13} /> Воронка сделок
            <span className={s.tabCount}>{counts.closer}</span>
          </button>
        )}
        {showQualifier && showCloser && (
          <button className={`${s.tab} ${tab === 'all' ? s.tabActive : ''}`} onClick={() => setTab('all')}>
            <LayoutList size={13} /> Все лиды
            <span className={s.tabCount}>{leads.length}</span>
          </button>
        )}
      </nav>

      {/* ── Board / Table area ───────────────────────── */}
      <div className={s.boardWrap}>
        {loading ? (
          <div className={s.loading}>
            <div className={s.loadingSpinner} />
            <span>Загружаю лидов...</span>
          </div>
        ) : (
          <>
            {tab === 'qualifier' && showQualifier && <QualifierView leads={leads.filter(l => l.pipeline === 'qualifier')} />}
            {tab === 'closer'    && showCloser    && <CloserView    leads={leads.filter(l => l.pipeline === 'closer')} />}
            {tab === 'all'                         && <AllLeadsView  leads={leads} />}
          </>
        )}
      </div>

      {/* ── Overlays ─────────────────────────────────── */}
      <LeadDrawer />
      <HandoffModal />
    </div>
  );
}
