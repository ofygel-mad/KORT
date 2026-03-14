/**
 * leads-spa/index.tsx
 * Entry point — mounted inside the workspace tile modal.
 * Self-contained SPA with its own state, routing and RBAC.
 *
 * ARCHITECTURE:
 *   features/leads-spa/
 *     api/          ← mock now, swap for real fetch later
 *     model/        ← zustand stores (leads, rbac, notifications)
 *     components/   ← board, drawer, handoff, search, notifications
 *     views/        ← QualifierView, CloserView
 *     index.tsx     ← this file (entry, shell, nav)
 */
import { useEffect, useState } from 'react';
import { Users, Briefcase, CalendarDays, Bell, Search as SearchIcon, Plus, X } from 'lucide-react';
import { useLeadsStore } from './model/leads.store';
import { useNotifStore } from './model/notifications.store';
import { useLeadsRbac, canSeeQualifierBoard, canSeeCloserBoard } from './model/rbac.store';
import { QualifierView } from './views/QualifierView';
import { CloserView } from './views/CloserView';
import { LeadDrawer } from './components/drawer/LeadDrawer';
import { HandoffModal } from './components/handoff/HandoffModal';
import { GlobalSearch } from './components/search/GlobalSearch';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import s from './LeadsSPA.module.css';

type NavTab = 'qualifier' | 'closer' | 'all';

export function LeadsSPA() {
  const { leads, loading, load } = useLeadsStore();
  const { load: loadNotifs } = useNotifStore();
  const { currentRole } = useLeadsRbac();
  const [tab, setTab] = useState<NavTab>('qualifier');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const { addLead } = useLeadsStore();

  useEffect(() => { load(); loadNotifs(); }, []);

  // Auto-select visible tab based on role
  useEffect(() => {
    if (!canSeeQualifierBoard(currentRole)) setTab('closer');
  }, [currentRole]);

  const showQualifier = canSeeQualifierBoard(currentRole);
  const showCloser    = canSeeCloserBoard(currentRole);

  const handleAddLead = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    await addLead({ fullName: newName.trim(), phone: newPhone.trim() });
    setNewName(''); setNewPhone(''); setAddOpen(false);
  };

  const tabLeads = tab === 'all' ? leads : tab === 'qualifier'
    ? leads.filter(l => l.pipeline === 'qualifier')
    : leads.filter(l => l.pipeline === 'closer');

  const counts = {
    qualifier: leads.filter(l => l.pipeline === 'qualifier').length,
    closer:    leads.filter(l => l.pipeline === 'closer').length,
  };

  return (
    <div className={s.root}>
      {/* ── Top bar ─────────────────────────────────────── */}
      <header className={s.topbar}>
        <div className={s.topbarLeft}>
          <div className={s.brand}>
            <Users size={15} />
            <span>Лиды</span>
          </div>
          <GlobalSearch />
        </div>
        <div className={s.topbarRight}>
          <NotificationCenter />
          <button className={s.addBtn} onClick={() => setAddOpen(v => !v)}>
            <Plus size={14} />
            Добавить лида
          </button>
        </div>
      </header>

      {/* ── Add lead inline form ─────────────────────── */}
      {addOpen && (
        <div className={s.addForm}>
          <input className={s.addInput} placeholder="Имя" value={newName} onChange={e => setNewName(e.target.value)} />
          <input className={s.addInput} placeholder="+7 (___) ___-__-__" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
          <button className={s.addConfirm} onClick={handleAddLead}>Добавить</button>
          <button className={s.addCancel} onClick={() => setAddOpen(false)}><X size={14} /></button>
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
            Все лиды
            <span className={s.tabCount}>{leads.length}</span>
          </button>
        )}
      </nav>

      {/* ── Board area ───────────────────────────────── */}
      <div className={s.boardWrap}>
        {loading ? (
          <div className={s.loading}>
            <div className={s.loadingSpinner} />
            <span>Загружаю лидов...</span>
          </div>
        ) : (
          <>
            {(tab === 'qualifier' || tab === 'all') && showQualifier && <QualifierView leads={tabLeads} />}
            {(tab === 'closer'    || tab === 'all') && showCloser    && <CloserView leads={tabLeads} />}
          </>
        )}
      </div>

      {/* ── Overlays (drawer, handoff modal) ─────────── */}
      <LeadDrawer />
      <HandoffModal />
    </div>
  );
}
