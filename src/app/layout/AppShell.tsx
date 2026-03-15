import { addDocumentListener } from '../../shared/lib/browser';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { CommandPalette } from '../../widgets/command-palette/CommandPalette';
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
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
import { MobileFab } from '../../shared/ui/MobileFab';
import { AiAssistant } from '../../widgets/ai-assistant/AiAssistant';
import { EditorialCursor } from '../../shared/ui/EditorialCursor';
import { CreateCustomerDrawer } from '../../features/quick-actions/CreateCustomerDrawer';
import { CreateDealDrawer } from '../../features/quick-actions/CreateDealDrawer';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import styles from './AppShell.module.css';


function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className={styles.offlineBanner}
          role="status"
          aria-live="polite"
        >
          <WifiOff size={14} /> Нет подключения. Данные могут быть устаревшими.
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AppShell() {
  const { isOpen, toggle } = useCommandPalette();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { sidebarCollapsed, toggleFocusMode, openCreateCustomer, openCreateDeal, openCreateTask } = useUIStore();
  const { can } = useCapabilities();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { org: currentOrg } = useAuthStore();


  useKeyboardShortcuts({
    ...(can('customers:write') ? { n: () => openCreateCustomer() } : {}),
    ...(can('deals:write') ? { d: () => openCreateDeal() } : {}),
    ...(can('tasks:write') ? { t: () => openCreateTask() } : {}),
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
    return addDocumentListener('keydown', onKey);
  }, [toggle]);

  const sidebarW = isMobile ? 0 : sidebarCollapsed ? 64 : 220;

  return (
    <div className={styles.root}>
      <EditorialCursor />
      <div className={styles.ambientGlow} aria-hidden="true" />
      <div className={styles.ambientGrid} aria-hidden="true" />
      <OfflineBanner />
      {!isMobile && (
        <motion.div className={styles.sidebarRail} animate={{ width: sidebarW }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
          <Sidebar />
        </motion.div>
      )}

      <div className={styles.content}>
        <Topbar />
        <main className={styles.main}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} initial={pageTransition.initial} animate={pageTransition.animate} exit={pageTransition.exit} transition={pageTransition.transition} className={styles.routeViewport}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {isMobile && <MobileNav />}
      {isMobile && <MobileFab />}
      <CreateCustomerDrawer />
      <CreateDealDrawer />
      <FocusMode />
      <SmartSuggestions />
      <AiAssistant />
      {isOpen && <CommandPalette />}
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
