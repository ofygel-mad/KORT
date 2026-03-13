import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { CommandPalette } from '../../widgets/command-palette/CommandPalette';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition } from '../../shared/motion/presets';
import { useCommandPalette } from '../../shared/stores/commandPalette';
import { useUIStore } from '../../shared/stores/ui';
import { useKeyboardShortcuts } from '../../shared/hooks/useKeyboardShortcuts';
import { ShortcutsModal } from '../../shared/ui/ShortcutsModal';
import { FocusMode } from '../../widgets/focus-mode/FocusMode';
import { SmartSuggestions } from '../../widgets/smart-suggestions/SmartSuggestions';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { useAuthStore } from '../../shared/stores/auth';
import { api } from '../../shared/api/client';
import { MobileFab } from '../../shared/ui/MobileFab';
import { AiAssistant } from '../../widgets/ai-assistant/AiAssistant';
import { resolveOnboardingCompleted } from '../../shared/lib/auth';
import styles from './AppShell.module.css';

export function AppShell() {
  const { isOpen, toggle } = useCommandPalette();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { sidebarCollapsed, toggleFocusMode } = useUIStore();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuth, clearAuth, org: currentOrg } = useAuthStore();

  useEffect(() => {
    api.get<any>('/auth/me')
      .then((data) => {
        const onboardingCompleted = resolveOnboardingCompleted(data, currentOrg?.onboarding_completed ?? false);
        setAuth(
          data.user,
          { ...data.org, onboarding_completed: onboardingCompleted },
          useAuthStore.getState().token!,
          useAuthStore.getState().refreshToken!,
          data.capabilities ?? [],
          data.role ?? 'viewer',
        );
        if (!onboardingCompleted && location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
        }
      })
      .catch(() => {
        clearAuth();
        navigate('/auth/login', { replace: true });
      });
  }, [clearAuth, currentOrg?.onboarding_completed, location.pathname, navigate, setAuth]);

  useKeyboardShortcuts({
    n: () => window.dispatchEvent(new CustomEvent('kort:new-customer')),
    d: () => window.dispatchEvent(new CustomEvent('kort:new-deal')),
    t: () => window.dispatchEvent(new CustomEvent('kort:new-task')),
    f: () => toggleFocusMode(),
    '/': () => toggle(),
    '?': () => setShortcutsOpen(true),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle]);


  useEffect(() => {
    const goImport = () => navigate('/imports');
    window.addEventListener('kort:go-import', goImport);
    return () => window.removeEventListener('kort:go-import', goImport);
  }, [navigate]);

  const sidebarW = isMobile ? 0 : sidebarCollapsed ? 64 : 220;

  return (
    <div className={styles.root}>
      {!isMobile && (
        <motion.div
          className={styles.sidebarRail}
          animate={{ width: sidebarW }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        >
          <Sidebar />
        </motion.div>
      )}

      <div className={styles.content}>
        <Topbar />
        <main className={styles.main}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={pageTransition.initial}
              animate={pageTransition.animate}
              exit={pageTransition.exit}
              transition={pageTransition.transition}
              className={styles.routeViewport}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {isMobile && <MobileNav />}
      <MobileFab />
      <AiAssistant />

      <AnimatePresence>{isOpen && <CommandPalette />}</AnimatePresence>
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <FocusMode />
      <SmartSuggestions />
    </div>
  );
}
