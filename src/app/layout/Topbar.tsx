import { addDocumentListener } from '../../shared/lib/browser';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import { Search, ChevronRight, Bell, ArrowLeft, Shield, ShieldCheck } from 'lucide-react';
import { useCommandPalette } from '../../shared/stores/commandPalette';
import { useAuthStore } from '../../shared/stores/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { api } from '../../shared/api/client';
import { AnimatePresence, motion } from 'framer-motion';
import { useSSE } from '../../shared/hooks/useSSE';
import { useUIStore } from '../../shared/stores/ui';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { useT } from '../../shared/i18n';
import { popoverVariants, overlayVariants, t } from '../../shared/motion/presets';
import styles from './Topbar.module.css';

interface Notification { id: string; title: string; body: string; is_read: boolean; created_at: string; }

// ─── Notification Bell ────────────────────────────────────────────────────────
function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { data } = useQuery<{ results: Notification[]; count: number }>({
    queryKey:       ['notifications'],
    queryFn:        () => api.get('/notifications/'),
    refetchInterval: 30_000,
  });

  useSSE({ onNotification: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read_all/'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = (data?.results ?? []).filter(n => !n.is_read).length;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    return addDocumentListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className={styles.notifRoot}>
      <motion.button
        className={[styles.iconBtn, open ? styles.active : ''].join(' ')}
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.93 }}
        transition={t.fast}
        aria-label="Уведомления"
        aria-expanded={open}
      >
        <Bell size={16} strokeWidth={1.75} />
        {unread > 0 && <span className={styles.unreadDot} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.notifPanel}
            variants={popoverVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={isMobile ? { right: 0 } : undefined}
          >
            <div className={styles.notifHeader}>
              <span className={styles.notifTitle}>Уведомления</span>
              {unread > 0 && (
                <button
                  className={styles.notifMarkAll}
                  onClick={() => markAllRead.mutate()}
                >
                  Прочитать все
                </button>
              )}
            </div>

            {(data?.results ?? []).length === 0
              ? <div className={styles.notifEmpty}>Уведомлений нет</div>
              : (data?.results ?? []).map(n => (
                <div
                  key={n.id}
                  className={[styles.notifItem, !n.is_read ? styles.unread : ''].join(' ')}
                >
                  <div className={styles.notifItemTitle}>{n.title}</div>
                  <div className={styles.notifItemBody}>{n.body}</div>
                </div>
              ))
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Dynamic breadcrumb ────────────────────────────────────────────────────────
function useDynamicCrumb(): { parent: string; parentPath: string; current: string } | null {
  const matchCustomer = useMatch('/customers/:id');
  const matchDeal     = useMatch('/deals/:id');
  const matchTask     = useMatch('/tasks/:id');
  const customerId    = matchCustomer?.params.id;
  const dealId        = matchDeal?.params.id;

  const { data: customer } = useQuery({
    queryKey: ['customer-name', customerId],
    queryFn:  () => api.get(`/customers/${customerId}/`),
    enabled:  !!customerId,
    staleTime: 60_000,
    select:   (d: any) => d.full_name as string,
  });

  const { data: deal } = useQuery({
    queryKey: ['deal-name', dealId],
    queryFn:  () => api.get(`/deals/${dealId}/`),
    enabled:  !!dealId,
    staleTime: 60_000,
    select:   (d: any) => d.title as string,
  });

  if (customerId) return { parent: 'Клиенты', parentPath: '/customers', current: customer ?? '…' };
  if (dealId)     return { parent: 'Сделки',  parentPath: '/deals',     current: deal     ?? '…' };
  if (matchTask)  return { parent: 'Задачи',  parentPath: '/tasks',     current: 'Задача' };
  return null;
}

const BREADCRUMBS: Record<string, string> = {
  '/':           'Главная',
  '/feed':       'Лента',
  '/customers':  'Клиенты',
  '/deals':      'Сделки',
  '/tasks':      'Задачи',
  '/reports':    'Отчёты',
  '/automations':'Автоматизации',
  '/imports':    'Импорт',
  '/settings':   'Настройки',
  '/audit':      'Аудит',
  '/admin':      'Управление',
};

// ─── Topbar ────────────────────────────────────────────────────────────────────
function resolveBackTarget(pathname: string) {
  if (pathname.startsWith('/customers/')) return '/customers';
  if (pathname.startsWith('/deals/')) return '/deals';
  if (pathname.startsWith('/settings')) return '/';
  if (pathname.startsWith('/admin')) return '/';
  if (pathname.startsWith('/imports')) return '/';
  return '/';
}

export function Topbar() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { toggle } = useCommandPalette();
  const user       = useAuthStore(s => s.user);
  const { adminMode, setAdminMode } = useUIStore();
  const isMobile   = useIsMobile();
  const { locale, setLocale } = useT();
  const { canUseAdminMode } = useCapabilities();
  const dynamic    = useDynamicCrumb();
  const crumb      = BREADCRUMBS[location.pathname] ?? location.pathname.slice(1);
  const showBack = location.pathname !== '/' && location.pathname !== '/onboarding';
  const backTarget = resolveBackTarget(location.pathname);

  return (
    <header className={styles.topbar}>
      {/* Breadcrumb */}
      <div className={styles.left}>
        {showBack && (
          <button className={styles.backBtn} onClick={() => navigate(backTarget)} aria-label="Назад">
            <ArrowLeft size={14} />
            {!isMobile && <span>Назад</span>}
          </button>
        )}
        <nav className={styles.breadcrumb} aria-label="breadcrumb">
          {!isMobile && <span className={styles.crumbRoot}>Kort</span>}
          {!isMobile && <ChevronRight size={12} className={styles.crumbSep} />}

          {dynamic ? (
            <>
              <button
                className={styles.crumbParent}
                onClick={() => navigate(dynamic.parentPath)}
              >
                {dynamic.parent}
              </button>
              <ChevronRight size={12} className={styles.crumbSep} />
              <span className={styles.crumbCurrent}>{dynamic.current}</span>
            </>
          ) : (
            <span className={styles.crumbCurrent}>{crumb}</span>
          )}
        </nav>
      </div>

      {/* Actions */}
      <div className={styles.right}>
        {/* Search */}
        <button className={styles.searchBtn} onClick={toggle} aria-label="Поиск">
          <Search size={14} />
          {!isMobile && <span>Поиск</span>}
          {!isMobile && <kbd className={styles.searchKbd}>⌘K</kbd>}
        </button>

        <NotificationBell />

        {canUseAdminMode && (
          <button
            className={`${styles.adminModeBtn} ${adminMode ? styles.adminModeBtnActive : ''}`}
            onClick={() => setAdminMode(!adminMode)}
            aria-label={adminMode ? 'Выйти из режима администратора' : 'Включить режим администратора'}
            title={adminMode ? 'Режим администратора активен' : 'Включить режим администратора'}
          >
            {adminMode ? <ShieldCheck size={14} /> : <Shield size={14} />}
            {!isMobile && <span>{adminMode ? 'Режим администратора' : 'Рабочий режим'}</span>}
          </button>
        )}

        {/* Language */}
        <button
          className={styles.langBtn}
          onClick={() => setLocale(locale === 'ru' ? 'kk' : 'ru')}
        >
          {locale === 'ru' ? 'KK' : 'RU'}
        </button>


        {/* Avatar */}
        <button
          className={styles.avatarBtn}
          onClick={() => navigate('/settings')}
          aria-label="Настройки профиля"
        >
          {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
        </button>
      </div>
    </header>
  );
}

// Re-export for convenience
export { NotificationBell };
