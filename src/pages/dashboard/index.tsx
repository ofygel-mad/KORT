import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import {
  Users, Briefcase, CheckSquare, TrendingUp,
  Plus, ArrowRight, AlertTriangle, Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { useAuthStore } from '../../shared/stores/auth';
import { formatNumber, formatMoney } from '../../shared/utils/format';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Skeleton } from '../../shared/ui/Skeleton';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { DailyFocus } from '../../widgets/daily-focus/DailyFocus';
import styles from './Dashboard.module.css';

interface DashboardData {
  customers_count:    number;
  customers_delta:    number;
  active_deals_count: number;
  revenue_month:      number;
  tasks_today:        number;
  overdue_tasks:      number;
  recent_customers: Array<{
    id: string; full_name: string;
    company_name: string; status: string; created_at: string;
  }>;
  deals_no_activity: number;
  stalled_deals: Array<{
    id: string; title: string; amount: number; currency: string;
    stage: string; customer_name: string; customer_id: string;
    days_silent: number | null;
  }>;
  silent_customers: Array<{
    id: string; full_name: string; company_name: string;
    phone: string; days_silent: number | null;
  }>;
  today_tasks: Array<{
    id: string; title: string; priority: string;
    due_at: string | null; customer: { id: string; full_name: string } | null;
  }>;
}

const STATUS_MAP: Record<string, { variant: 'success' | 'info' | 'default' | 'warning'; label: string }> = {
  new:      { variant: 'info',    label: 'Новый' },
  active:   { variant: 'success', label: 'Активный' },
  inactive: { variant: 'default', label: 'Неактивный' },
  archived: { variant: 'default', label: 'Архив' },
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
const fadeUp  = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 500, damping: 38 } },
};

function StatCard({ label, value, delta, icon, accentColor, fmt = 'n', loading }: {
  label: string; value: number; delta?: number; icon: React.ReactNode;
  accentColor: string; fmt?: 'n' | 'c'; loading?: boolean;
}) {
  const orgCurrency = useAuthStore.getState().org?.currency ?? 'KZT';
  const display = fmt === 'c' ? formatMoney(value, orgCurrency) : formatNumber(value);

  return (
    <motion.div variants={fadeUp} className={styles.statCard}>
      <div className={styles.statHeader}>
        <div
          className={styles.statIcon}
          style={{ '--stat-accent': accentColor, '--stat-accent-soft': `${accentColor}18` } as CSSProperties}
        >
          {icon}
        </div>
        {delta !== undefined && delta !== 0 && (
          <span className={`${styles.statDelta} ${delta > 0 ? styles.statDeltaPos : styles.statDeltaNeg}`}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      {loading
        ? <div className={styles.statSkeleton}><Skeleton height={24} width={72} /></div>
        : <div className={styles.statValue}>{display}</div>
      }
      <div className={styles.statLabel}>{label}</div>
    </motion.div>
  );
}

function WatchlistBlock({ data, navigate }: {
  data: DashboardData;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const stalled    = data.stalled_deals ?? [];
  const silent     = data.silent_customers ?? [];
  const todayTasks = data.today_tasks ?? [];
  if (stalled.length === 0 && silent.length === 0 && todayTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.3 }}
      className={styles.watchlist}
    >
      {stalled.length > 0 && (
        <div className={`${styles.watchPanel} ${styles.watchPanelDanger}`}>
          <div className={styles.watchPanelHeader}>
            <div className={styles.watchPanelTitle}>
              <span className={styles.watchPanelEmoji}>⚠️</span>
              Сделки без движения
            </div>
            <span className={styles.panelCount}>{stalled.length}</span>
          </div>
          {stalled.map((d) => (
            <div key={d.id} className={styles.watchRow} onClick={() => navigate(`/deals/${d.id}`)}>
              <div className={styles.watchRowTitle}>{d.title}</div>
              <div className={styles.watchRowMeta}>
                <span className={styles.watchRowSub}>{d.customer_name} · {d.stage}</span>
                {d.days_silent != null && (
                  <span className={`${styles.staleBadge} ${d.days_silent >= 10 ? styles.staleBadgeDanger : styles.staleBadgeWarning}`}>
                    {d.days_silent}д
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {silent.length > 0 && (
        <div className={`${styles.watchPanel} ${styles.watchPanelWarning}`}>
          <div className={styles.watchPanelHeader}>
            <div className={styles.watchPanelTitle}>
              <span className={styles.watchPanelEmoji}>🔕</span>
              Молчат клиенты
            </div>
            <span className={styles.panelCount}>{silent.length}</span>
          </div>
          {silent.map((c) => (
            <div key={c.id} className={styles.watchRow} onClick={() => navigate(`/customers/${c.id}`)}>
              <div className={styles.watchRowTitle}>{c.full_name}</div>
              <div className={styles.watchRowMeta}>
                <span className={styles.watchRowSub}>{c.company_name || c.phone}</span>
                {c.days_silent != null && (
                  <span className={`${styles.staleBadge} ${styles.staleBadgeWarning}`}>
                    {c.days_silent}д
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {todayTasks.length > 0 && (
        <div className={styles.watchPanel}>
          <div className={styles.watchPanelHeader}>
            <div className={styles.watchPanelTitle}>
              <span className={styles.watchPanelEmoji}>📋</span>
              На сегодня
            </div>
            <button className={styles.panelLink} onClick={() => navigate('/tasks')}>
              Все <ArrowRight size={11} />
            </button>
          </div>
          {todayTasks.map((t) => {
            const dotClass = t.priority === 'high'
              ? styles.taskDotHigh
              : t.priority === 'medium'
              ? styles.taskDotMedium
              : styles.taskDotLow;
            return (
              <div key={t.id} className={styles.taskRow} onClick={() => navigate('/tasks')}>
                <div className={`${styles.taskDot} ${dotClass}`} />
                <div className={styles.taskRowContent}>
                  <div className={styles.taskRowTitle}>{t.title}</div>
                  {t.customer && <div className={styles.taskRowSub}>{t.customer.full_name}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default function DashboardPage() {
  const navigate  = useNavigate();
  const user      = useAuthStore(s => s.user);
  const isMobile  = useIsMobile();
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-summary'],
    queryFn:  () => api.get('/reports/dashboard'),
  });

  return (
    <div className={styles.page}>
      <DailyFocus />

      {/* ── Header ──────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <p className={styles.greeting}>{greeting},</p>
          <h1 className={styles.username}>
            {user?.full_name?.split(' ')[0] ?? 'пользователь'} 👋
          </h1>
        </div>
        {!isMobile && (
          <div className={styles.headerActions}>
            <Button variant="secondary" size="sm" icon={<Plus size={13} />}
              onClick={() => window.dispatchEvent(new CustomEvent('kort:new-customer'))}>
              Клиент
            </Button>
            <Button size="sm" icon={<Plus size={13} />}
              onClick={() => window.dispatchEvent(new CustomEvent('kort:new-deal'))}>
              Сделка
            </Button>
          </div>
        )}
      </div>

      {/* ── Attention banner ───────────────────────────────── */}
      {(data?.overdue_tasks ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.attentionBanner}
        >
          <AlertTriangle size={14} className={styles.attentionIcon} />
          <span className={styles.attentionText}>
            {data!.overdue_tasks} просроченных задач — требуют внимания
          </span>
          <button className={styles.attentionLink} onClick={() => navigate('/tasks')}>
            Открыть →
          </button>
        </motion.div>
      )}

      {/* ── Stats grid ─────────────────────────────────────── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className={styles.statsGrid}>
        <StatCard label="Клиентов"        value={data?.customers_count    ?? 0} delta={data?.customers_delta}
          icon={<Users size={15} />}        accentColor="#3B82F6"  loading={isLoading} />
        <StatCard label="Активных сделок" value={data?.active_deals_count ?? 0}
          icon={<Briefcase size={15} />}    accentColor="#D97706"  loading={isLoading} />
        <StatCard label="Задач сегодня"   value={data?.tasks_today        ?? 0}
          icon={<CheckSquare size={15} />}  accentColor="#10B981"  loading={isLoading} />
        <StatCard label="Выручка / мес"   value={data?.revenue_month      ?? 0} fmt="c"
          icon={<TrendingUp size={15} />}   accentColor="#8B5CF6"  loading={isLoading} />
      </motion.div>

      {/* ── Body grid ──────────────────────────────────────── */}
      <div className={styles.bodyGrid}>
        {/* Recent customers */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Последние клиенты</span>
            <button className={styles.panelLink} onClick={() => navigate('/customers')}>
              Все <ArrowRight size={11} />
            </button>
          </div>
          {isLoading
            ? [1, 2, 3, 4].map(i => (
                <div key={i} className={styles.skeletonRow}>
                  <div className={styles.customerSkeletonTitle}><Skeleton height={13} width="55%" /></div>
                  <Skeleton height={11} width="32%" />
                </div>
              ))
            : (data?.recent_customers ?? []).length === 0
              ? <div className={styles.panelEmpty}>Клиентов пока нет</div>
              : (data?.recent_customers ?? []).map((c, idx) => {
                  const sm = STATUS_MAP[c.status] ?? STATUS_MAP.new;
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={styles.customerRow}
                      onClick={() => navigate(`/customers/${c.id}`)}
                    >
                      <div className={styles.customerContent}>
                        <div className={styles.customerName}>{c.full_name}</div>
                        {c.company_name && <div className={styles.customerMeta}>{c.company_name}</div>}
                      </div>
                      <Badge variant={sm.variant}>{sm.label}</Badge>
                    </motion.div>
                  );
                })
          }
        </div>

        {/* Quick actions */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Быстрые действия</span>
          </div>
          <div className={styles.quickActions}>
            <div className={styles.quickActionsGrid}>
              {[
                { label: 'Добавить клиента', icon: <Users size={14} />,
                  action: () => window.dispatchEvent(new CustomEvent('kort:new-customer')) },
                { label: 'Создать сделку',   icon: <Briefcase size={14} />,
                  action: () => window.dispatchEvent(new CustomEvent('kort:new-deal')) },
                { label: 'Новая задача',     icon: <CheckSquare size={14} />,
                  action: () => window.dispatchEvent(new CustomEvent('kort:new-task')) },
                { label: 'Импорт данных',    icon: <TrendingUp size={14} />,
                  action: () => navigate('/imports') },
              ].map(a => (
                <button key={a.label} className={styles.quickAction} onClick={a.action}>
                  <span className={styles.quickActionIcon}>{a.icon}</span>
                  <span className={styles.quickActionLabel}>{a.label}</span>
                </button>
              ))}
            </div>

            {!isLoading && (data?.tasks_today ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={styles.todayHint}
                onClick={() => navigate('/tasks')}
                role="button"
                tabIndex={0}
              >
                <Clock size={14} className={styles.todayHintIcon} />
                <span className={styles.todayHintText}>
                  Задач на сегодня: <strong>{data!.tasks_today}</strong>
                </span>
                <ArrowRight size={11} className={styles.todayHintArrow} />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Watchlist ────────────────────────────────────────── */}
      {!isLoading && data && (
        <WatchlistBlock data={data} navigate={navigate} />
      )}
    </div>
  );
}
