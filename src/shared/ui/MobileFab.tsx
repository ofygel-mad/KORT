import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Users, Briefcase, CheckSquare, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCapabilities } from '../hooks/useCapabilities';
import { useIsMobile } from '../hooks/useIsMobile';
import { getNavigator } from '../lib/browser';
import { useSharedBus } from '../../features/shared-bus';
import { useWorkspaceStore } from '../../features/workspace/model/store';
import { setTileLeadsCreatePanelOpen } from '../../features/leads-spa/model/tile-ui.store';
import { setTileDealsCreatePanelOpen } from '../../features/deals-spa/model/tile-ui.store';
import s from './MobileFab.module.css';

const ACTIONS = [
  { icon: <Users size={18} />, label: 'Лид', capability: 'customers:write', kind: 'customers' as const },
  { icon: <Briefcase size={18} />, label: 'Сделка', capability: 'deals:write', kind: 'deals' as const },
  { icon: <CheckSquare size={18} />, label: 'Задача', capability: 'tasks:write', kind: 'tasks' as const },
] as const;

export function MobileFab() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { can } = useCapabilities();
  const nav = getNavigator();
  const visibleActions = ACTIONS.filter((action) => can(action.capability));
  const openWorkspaceTileByKind = useWorkspaceStore((s) => s.openWorkspaceTileByKind);

  if (!isMobile || visibleActions.length === 0) return null;

  function handleAction(action: typeof ACTIONS[number]) {
    setOpen(false);
    navigate('/');

    requestAnimationFrame(() => {
      const tileId = openWorkspaceTileByKind(action.kind);
      if (!tileId) return;

      if (action.kind === 'customers') {
        setTileLeadsCreatePanelOpen(tileId, true);
        return;
      }
      if (action.kind === 'deals') {
        setTileDealsCreatePanelOpen(tileId, true);
        return;
      }

      useSharedBus.getState().publishTaskRequest({
        sourceSpа: 'standalone',
        suggestedTitle: '',
        priority: 'medium',
      });
    });

    if (nav && 'vibrate' in nav) nav.vibrate(8);
  }

  return (
    <div className={s.container}>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className={s.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            {visibleActions.map((action, i) => (
              <motion.button
                key={action.label}
                className={s.dialItem}
                style={{ bottom: (i + 1) * 56 }}
                initial={{ opacity: 0, y: 16, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.05 } }}
                exit={{ opacity: 0, y: 16, scale: 0.8 }}
                onClick={() => handleAction(action)}
              >
                <span className={s.dialIcon}>{action.icon}</span>
                {action.label}
              </motion.button>
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.button
        className={s.fab}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => { setOpen((o) => !o); if (nav && 'vibrate' in nav) nav.vibrate(6); }}
        aria-label={open ? 'Закрыть меню' : 'Создать'}
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </motion.button>
    </div>
  );
}
