import { useCallback, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BarChart2,
  Settings, Shield, Zap, Upload, ChevronLeft, Crown, LogOut,
  LayoutGrid, Plus,
} from 'lucide-react';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import { useRole } from '../../shared/hooks/useRole';
import { useUIStore } from '../../shared/stores/ui';
import { useAuthStore } from '../../shared/stores/auth';
import { useWorkspaceStore } from '../../features/workspace/model/store';
import { KortLogo } from '../../shared/ui/KortLogo';
import { Tooltip } from '../../shared/ui/Tooltip';
import styles from './Sidebar.module.css';
import { t, spring } from '../../shared/motion/presets';

// ─── Navigation map — product-level IA (Глава 8) ─────────────────────────
const NAV_MAIN = [
  { to: '/', icon: LayoutDashboard, label: 'Главная', always: true },
];

const NAV_SECONDARY = [
  { to: '/reports',     icon: BarChart2, label: 'Отчёты',        cap: 'reports.basic' },
  { to: '/imports',     icon: Upload,    label: 'Импорт',        cap: 'customers.import' },
  { to: '/automations', icon: Zap,       label: 'Автоматизации', cap: 'automations.manage', adminOnly: true },
  { to: '/audit',       icon: Shield,    label: 'Аудит',         cap: 'audit.read', adminOnly: true },
];

const label = (text: string, collapsed: boolean) => (
  <AnimatePresence initial={false}>
    {!collapsed && (
      <motion.span
        className={styles.navLabel}
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: 'auto' }}
        exit={{ opacity: 0, width: 0 }}
        transition={t.fast}
      >
        {text}
      </motion.span>
    )}
  </AnimatePresence>
);

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const asideRef = useRef<HTMLElement | null>(null);
  const collapseTimerRef = useRef<number | null>(null);
  const { can, canUseAdminMode } = useCapabilities();
  const { isAdmin } = useRole();
  const { sidebarCollapsed, toggleSidebar, adminMode, toggleAdminMode, openWorkspaceAddMenu } = useUIStore();
  const user = useAuthStore(s => s.user);
  const lock = useAuthStore(s => s.lock);
  const isUnlocked = useAuthStore(s => s.isUnlocked);
  const alignTilesToGrid = useWorkspaceStore(s => s.alignTilesToGrid);
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  const handleSignOut = () => {
    lock();
    navigate('/');
  };

  const secondaryVisible = NAV_SECONDARY.filter(i => i.cap && can(i.cap) && (!i.adminOnly || (isAdmin && adminMode)));
  const collapsed = sidebarCollapsed;

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    [styles.navItem, isActive ? styles.navItemActive : ''].join(' ');

  const clearAutoCollapse = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const scheduleAutoCollapse = useCallback(() => {
    clearAutoCollapse();
    collapseTimerRef.current = window.setTimeout(() => {
      collapseTimerRef.current = null;
      const state = useUIStore.getState();
      if (!state.sidebarCollapsed) {
        state.toggleSidebar();
      }
    }, 5000);
  }, [clearAutoCollapse]);

  useEffect(() => {
    if (collapsed) {
      clearAutoCollapse();
      return;
    }

    const sidebarNode = asideRef.current;
    if (sidebarNode?.matches(':hover')) {
      clearAutoCollapse();
      return;
    }

    scheduleAutoCollapse();
    return clearAutoCollapse;
  }, [collapsed, clearAutoCollapse, scheduleAutoCollapse]);

  return (
    <motion.aside
      ref={asideRef}
      className={styles.sidebar}
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
      onPointerEnter={clearAutoCollapse}
      onPointerLeave={() => {
        if (!collapsed) {
          scheduleAutoCollapse();
        }
      }}
    >
      {/* Logo */}
      <div className={styles.logo}>
        <KortLogo size={28} />
        {label('Kort', collapsed)}
      </div>

      {/* Primary nav */}
      <nav className={styles.nav}>
        {NAV_MAIN.map(({ to, icon: Icon, label: lbl }) => (
          <Tooltip key={to} content={lbl} disabled={!collapsed} side="right">
            <NavLink
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              aria-label={lbl}
              className={navItemClass}
            >
              <span className={styles.navIcon}>
                <Icon size={17} strokeWidth={1.75} />
              </span>
              {label(lbl, collapsed)}
            </NavLink>
          </Tooltip>
        ))}

        <Tooltip content={collapsed ? 'Развернуть' : 'Свернуть'} disabled={!collapsed} side="right">
          <button
            className={`${styles.navItem} ${styles.navInlineControl}`}
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
          >
            <span className={styles.navIcon}>
              <motion.div
                animate={{ rotate: collapsed ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <ChevronLeft size={15} />
              </motion.div>
            </span>
            {label(collapsed ? 'Развернуть' : 'Свернуть', collapsed)}
          </button>
        </Tooltip>

        {/* Workspace actions — visible only on dashboard when unlocked */}
        <AnimatePresence>
          {isDashboard && isUnlocked && (
            <motion.div
              className={styles.workspaceActions}
              key="workspace-actions"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring.snappy}
              style={{ overflow: 'hidden' }}
            >
              {!collapsed && (
                <div className={styles.navSection}>Рабочее поле</div>
              )}

              <Tooltip content="Создать плитку" disabled={!collapsed} side="right" stretch>
                <button
                  className={`${styles.navItem} ${styles.createTileBtn}`}
                  onClick={openWorkspaceAddMenu}
                  aria-label="Создать плитку"
                >
                  <span className={`${styles.navIcon} ${styles.createTileIcon}`}>
                    <Plus size={17} strokeWidth={2.2} />
                  </span>
                  {label('Создать плитку', collapsed)}
                </button>
              </Tooltip>

              <Tooltip content="Выровнять плитки" disabled={!collapsed} side="right" stretch>
                <button
                  className={styles.navItem}
                  onClick={alignTilesToGrid}
                  aria-label="Выровнять плитки"
                >
                  <span className={styles.navIcon}>
                    <LayoutGrid size={17} strokeWidth={1.75} />
                  </span>
                  {label('Выровнять', collapsed)}
                </button>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Secondary section */}
        {secondaryVisible.length > 0 && (
          <>
            {!collapsed && (
              <div className={styles.navSection}>Инструменты</div>
            )}
            {secondaryVisible.map(({ to, icon: Icon, label: lbl }) => (
              <Tooltip key={to} content={lbl} disabled={!collapsed} side="right">
                <NavLink
                  to={to}
                  onClick={onNavigate}
                  aria-label={lbl}
                  className={navItemClass}
                >
                  <span className={styles.navIcon}>
                    <Icon size={17} strokeWidth={1.75} />
                  </span>
                  {label(lbl, collapsed)}
                </NavLink>
              </Tooltip>
            ))}
          </>
        )}
      </nav>

      {/* Bottom: admin + settings + collapse */}
      <div className={styles.bottom}>
        <Tooltip content="Завершить сессию" disabled={!collapsed} side="right">
          <button
            className={`${styles.navItem} ${styles.logoutBtn}`}
            onClick={handleSignOut}
            aria-label="Завершить сессию"
          >
            <span className={styles.navIcon}>
              <LogOut size={17} strokeWidth={1.75} />
            </span>
            {label('Завершить сессию', collapsed)}
          </button>
        </Tooltip>

        {canUseAdminMode && !collapsed && (
          <button className={`${styles.modeSwitch} ${adminMode ? styles.modeSwitchActive : ''}`} onClick={toggleAdminMode}>
            <Shield size={15} strokeWidth={1.75} />
            <span>{adminMode ? 'Режим администратора' : 'Рабочий режим команды'}</span>
          </button>
        )}

        {canUseAdminMode && adminMode && (
          <Tooltip content="Управление" disabled={!collapsed} side="right">
            <NavLink
              to="/admin"
              onClick={onNavigate}
              aria-label="Управление"
              className={navItemClass}
            >
              <span className={styles.navIcon}>
                <Crown size={17} strokeWidth={1.75} />
              </span>
              {label('Управление', collapsed)}
            </NavLink>
          </Tooltip>
        )}

        <Tooltip content="Настройки" disabled={!collapsed} side="right">
          <NavLink
            to="/settings"
            onClick={onNavigate}
            aria-label="Настройки"
            className={navItemClass}
          >
            <span className={styles.navIcon}>
              <Settings size={17} strokeWidth={1.75} />
            </span>
            {label('Настройки', collapsed)}
          </NavLink>
        </Tooltip>

        {/* User indicator */}
        {user && !collapsed && (
          <div className={styles.userSection}>
            <div className={styles.avatar}>
              {user.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user.full_name}</div>
              <div className={styles.userRole}>{user.email}</div>
            </div>
          </div>
        )}

      </div>
    </motion.aside>
  );
}
