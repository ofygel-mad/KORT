import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CheckSquare,
  Layers,
  LogOut,
  MoreHorizontal,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../shared/stores/auth';
import {
  CHAPAN_NAV_ITEM,
  SETTINGS_NAV_ITEM,
  SIDEBAR_NAV_SECTIONS,
} from '../../shared/navigation/appNavigation';
import { usePlan, planIncludes } from '../../shared/hooks/usePlan';
import styles from './MobileNav.module.css';

const PRIMARY_TABS = [
  { to: '/',          icon: Layers,       label: 'Канвас',  end: true },
  { to: '/crm/leads', icon: Users,        label: 'Лиды' },
  { to: '/crm/deals', icon: Briefcase,    label: 'Сделки' },
  { to: '/crm/tasks', icon: CheckSquare,  label: 'Задачи' },
];

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const plan = usePlan();

  function handleLogout() {
    setMoreOpen(false);
    clearAuth();
    navigate('/auth/login', { replace: true });
  }

  function closeDrawer() {
    setMoreOpen(false);
  }

  return (
    <>
      <nav className={styles.nav}>
        {PRIMARY_TABS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}

        <button
          className={`${styles.navItem} ${moreOpen ? styles.navItemActive : ''}`}
          onClick={() => setMoreOpen(true)}
          aria-label="Ещё"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal size={20} />
          <span>Ещё</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <div className={styles.backdrop} onClick={closeDrawer} aria-hidden="true" />

          <div className={styles.drawer} role="dialog" aria-label="Главное меню">
            <div className={styles.drawerHandle} aria-hidden="true" />

            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Меню</span>
              <button
                className={styles.drawerClose}
                onClick={closeDrawer}
                aria-label="Закрыть меню"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {SIDEBAR_NAV_SECTIONS.map((section) => {
                const visibleItems = section.items.filter((item) =>
                  planIncludes(plan, item.planTier),
                );
                if (!visibleItems.length) return null;

                return (
                  <div key={section.label} className={styles.drawerSection}>
                    <div className={styles.drawerSectionLabel}>{section.label}</div>
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.id}
                          to={item.to}
                          className={({ isActive }) =>
                            `${styles.drawerItem} ${isActive ? styles.drawerItemActive : ''}`
                          }
                          onClick={closeDrawer}
                        >
                          <span
                            className={styles.drawerItemIcon}
                            style={{ ['--item-color' as string]: item.color }}
                          >
                            <Icon size={16} />
                          </span>
                          {item.label}
                        </NavLink>
                      );
                    })}
                  </div>
                );
              })}

              {planIncludes(plan, 'industrial') && (
                <div className={styles.drawerSection}>
                  <div className={styles.drawerSectionLabel}>Воркзоны</div>
                  <NavLink
                    to={CHAPAN_NAV_ITEM.to}
                    className={({ isActive }) =>
                      `${styles.drawerItem} ${isActive ? styles.drawerItemActive : ''}`
                    }
                    onClick={closeDrawer}
                  >
                    <span className={styles.drawerItemIcon}>
                      <CHAPAN_NAV_ITEM.icon size={16} />
                    </span>
                    {CHAPAN_NAV_ITEM.label}
                  </NavLink>
                </div>
              )}

              <div className={styles.drawerSection}>
                <NavLink
                  to={SETTINGS_NAV_ITEM.to}
                  className={({ isActive }) =>
                    `${styles.drawerItem} ${isActive ? styles.drawerItemActive : ''}`
                  }
                  onClick={closeDrawer}
                >
                  <span className={styles.drawerItemIcon}>
                    <SETTINGS_NAV_ITEM.icon size={16} />
                  </span>
                  {SETTINGS_NAV_ITEM.label}
                </NavLink>

                <button className={styles.drawerItemLogout} onClick={handleLogout}>
                  <span className={styles.drawerItemIcon}>
                    <LogOut size={16} />
                  </span>
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
