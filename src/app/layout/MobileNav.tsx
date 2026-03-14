import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, CheckSquare, MoreHorizontal, Smartphone } from 'lucide-react';
import { useWorkspaceStore } from '../../features/workspace/model/store';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePwaInstall } from '../../shared/hooks/usePwaInstall';
import styles from './MobileNav.module.css';

const PRIMARY_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Главная' },
  { to: '/customers', icon: Users, label: 'Лиды', kind: 'customers' as const },
  { to: '/deals', icon: Briefcase, label: 'Сделки', kind: 'deals' as const },
  { to: '/tasks', icon: CheckSquare, label: 'Задачи', kind: 'tasks' as const },
];

const MORE_LABELS: Record<string, string> = {
  '/reports': 'Отчёты',
  '/imports': 'Импорт',
  '/automations': 'Автоматизации',
  '/settings': 'Настройки',
  '/audit': 'Аудит',
};

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { canInstall, install } = usePwaInstall();
  const navigate = useNavigate();
  const openWorkspaceTileByKind = useWorkspaceStore((s) => s.openWorkspaceTileByKind);

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className={styles.backdrop}
            />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={styles.moreMenu}
            >
              {Object.keys(MORE_LABELS).map((to) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={styles.moreLink}
                >
                  {MORE_LABELS[to]}
                </NavLink>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <nav className="mobile-nav">
        {PRIMARY_NAV.map(({ to, icon: Icon, label, kind }) => (
          <NavLink
            key={`${label}-${to}`}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
            onClick={(e) => {
              if (!kind) return;
              e.preventDefault();
              navigate('/');
              requestAnimationFrame(() => {
                openWorkspaceTileByKind(kind);
              });
            }}
          >
            <Icon size={20} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="mobile-nav-item" onClick={() => setMoreOpen((o) => !o)}>
          <MoreHorizontal size={20} strokeWidth={1.75} />
          <span>Ещё</span>
        </button>
      </nav>
      {canInstall && <button className={styles.installButton} onClick={install}><Smartphone size={18} /> Установить</button>}
    </>
  );
}
