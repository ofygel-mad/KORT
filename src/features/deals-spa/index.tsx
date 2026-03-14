/**
 * features/deals-spa/index.tsx
 * Deals SPA shell — mounts inside the workspace tile modal.
 * Independent from other SPAs; communicates only via shared-bus.
 */
import { useEffect, useState } from 'react';
import { Briefcase, LayoutList, Plus, X, ChevronDown } from 'lucide-react';
import { useDealsStore } from './model/deals.store';
import { useTileDealsUI } from './model/tile-ui.store';
import { DealKanbanBoard } from './components/board/KanbanBoard';
import { DealDrawer } from './components/drawer/DealDrawer';
import { LostModal } from './components/modals/LostModal';
import { WonModal } from './components/modals/WonModal';
import { DeleteConfirmModal } from './components/modals/DeleteConfirmModal';
import { AllDealsView } from './views/AllDealsView';
import s from './DealsSPA.module.css';


const ASSIGNEES = ['Сауле М.', 'Алибек Н.'];

interface Props { tileId: string; }

export function DealsSPA({ tileId }: Props) {
  const { deals, loading, load, createFromLead } = useDealsStore();
  const { currentTab: tab, setTab, openDrawer, openLostModal, openWonModal } = useTileDealsUI(tileId);
  const [addOpen,   setAddOpen]   = useState(false);

  // Add form
  const [newName,     setNewName]     = useState('');
  const [newPhone,    setNewPhone]    = useState('');
  const [newValue,    setNewValue]    = useState('');
  const [newAssignee, setNewAssignee] = useState(ASSIGNEES[0]);
  const [newSource,   setNewSource]   = useState('site');

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    await createFromLead({
      leadId: crypto.randomUUID(),
      fullName: newName.trim(),
      phone: newPhone.trim(),
      source: newSource,
      value: parseInt(newValue.replace(/\D/g, ''), 10) || 0,
      assignedName: newAssignee,
    });
    setNewName(''); setNewPhone(''); setNewValue('');
    setAddOpen(false);
  };

  const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
  const totalPipeline = activeDeals.reduce((a, d) => a + d.value * (d.probability / 100), 0);
  const wonCount  = deals.filter(d => d.stage === 'won').length;
  const wonValue  = deals.filter(d => d.stage === 'won').reduce((a, d) => a + d.value, 0);

  const fmtShort = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'М';
    if (n >= 1_000) return Math.round(n / 1_000) + 'к';
    return String(n);
  };

  return (
    <div className={s.root}>
      {/* ── Top bar ─────────────────────────────── */}
      <header className={s.topbar}>
        <div className={s.stats}>
          <div className={s.stat}>
            <span className={s.statVal}>{activeDeals.length}</span>
            <span className={s.statLabel}>активных</span>
          </div>
          <div className={s.statDiv} />
          <div className={s.stat}>
            <span className={s.statVal} style={{ color: 'rgba(134,239,172,0.85)' }}>
              ~{fmtShort(totalPipeline)} ₸
            </span>
            <span className={s.statLabel}>взвешенная воронка</span>
          </div>
          {wonCount > 0 && (
            <>
              <div className={s.statDiv} />
              <div className={s.stat}>
                <span className={s.statVal} style={{ color: 'rgba(134,239,172,0.9)' }}>
                  {wonCount} · {fmtShort(wonValue)} ₸
                </span>
                <span className={s.statLabel}>закрыто</span>
              </div>
            </>
          )}
        </div>
        <button className={s.addBtn} onClick={() => setAddOpen(v => !v)}>
          <Plus size={13} /> Новая сделка
          <ChevronDown size={11} style={{ opacity: 0.6, transform: addOpen ? 'rotate(180deg)' : '', transition: 'transform 200ms' }} />
        </button>
      </header>

      {/* ── Add deal form ────────────────────────── */}
      {addOpen && (
        <div className={s.addPanel}>
          <div className={s.addPanelTitle}>Новая сделка</div>
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
              <label className={s.addLabel}>Сумма (₸)</label>
              <input className={s.addInput} placeholder="500 000" value={newValue} onChange={e => setNewValue(e.target.value)} />
            </div>
            <div className={s.addField}>
              <label className={s.addLabel}>Ответственный</label>
              <select className={s.addSelect} value={newAssignee} onChange={e => setNewAssignee(e.target.value)}>
                {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className={s.addField}>
              <label className={s.addLabel}>Источник</label>
              <select className={s.addSelect} value={newSource} onChange={e => setNewSource(e.target.value)}>
                <option value="instagram">Instagram</option>
                <option value="site">Сайт</option>
                <option value="referral">Реферал</option>
                <option value="ad">Реклама</option>
              </select>
            </div>
          </div>
          <div className={s.addActions}>
            <button className={s.addCancel} onClick={() => setAddOpen(false)}><X size={12} /> Отмена</button>
            <button className={s.addConfirm} onClick={handleAdd} disabled={!newName.trim() || !newPhone.trim()}>
              Создать сделку →
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────── */}
      <nav className={s.tabs}>
        <button className={`${s.tab} ${tab === 'pipeline' ? s.tabActive : ''}`} onClick={() => setTab('pipeline')}>
          <Briefcase size={12} /> Воронка
          <span className={s.tabCount}>{activeDeals.length}</span>
        </button>
        <button className={`${s.tab} ${tab === 'all' ? s.tabActive : ''}`} onClick={() => setTab('all')}>
          <LayoutList size={12} /> Все сделки
          <span className={s.tabCount}>{deals.length}</span>
        </button>
      </nav>

      {/* ── Content ─────────────────────────────── */}
      <div className={s.contentWrap}>
        {loading ? (
          <div className={s.loading}>
            <div className={s.spinner} />
            <span>Загружаю сделки...</span>
          </div>
        ) : (
          <>
            {tab === 'pipeline' && <DealKanbanBoard deals={activeDeals} onOpenDrawer={openDrawer} onOpenLostModal={openLostModal} onOpenWonModal={openWonModal} />}
            {tab === 'all'      && <AllDealsView deals={deals} onOpenDrawer={openDrawer} />}
          </>
        )}
      </div>

      {/* ── Overlays ─────────────────────────────── */}
      <DealDrawer tileId={tileId} />
      <LostModal tileId={tileId} />
      <WonModal tileId={tileId} />
      <DeleteConfirmModal tileId={tileId} />
    </div>
  );
}
