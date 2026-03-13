import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Users, Briefcase, CheckSquare, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/ui';
import { useCapabilities } from '../hooks/useCapabilities';
import { useIsMobile } from '../hooks/useIsMobile';
import { getNavigator } from '../lib/browser';
import s from './MobileFab.module.css';

const ACTIONS = [
  { icon: <Users size={18} />, label: 'Клиент', path: '/customers', capability: 'customers:write', run: (api: ReturnType<typeof useUIStore.getState>) => api.openCreateCustomer() },
  { icon: <Briefcase size={18} />, label: 'Сделка', path: '/deals', capability: 'deals:write', run: (api: ReturnType<typeof useUIStore.getState>) => api.openCreateDeal() },
  { icon: <CheckSquare size={18} />, label: 'Задача', path: '/tasks', capability: 'tasks:write', run: (api: ReturnType<typeof useUIStore.getState>) => api.openCreateTask() },
] as const;

export function MobileFab() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ui = useUIStore();
  const { can } = useCapabilities();
  const nav = getNavigator();
  const visibleActions = ACTIONS.filter((action) => can(action.capability));

  if (!isMobile || visibleActions.length === 0) return null;

  function handleAction(action: typeof ACTIONS[number]) {
    setOpen(false);
    navigate(action.path);
    setTimeout(() => action.run(ui), 100);
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
