import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Users, Briefcase, CheckSquare, TrendingUp, Plus, ArrowRight,
  AlertTriangle, BellOff, ClipboardList, CircleAlert, Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { useAuthStore } from '../../shared/stores/auth';
import { useUIStore } from '../../shared/stores/ui';
import { formatNumber, formatMoney } from '../../shared/utils/format';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Skeleton } from '../../shared/ui/Skeleton';
import { InlineErrorState } from '../../shared/ui/InlineErrorState';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import { getProductMoment, clearProductMoment } from '../../shared/utils/productMoment';
import styles from './Dashboard.module.css';

interface DashboardData {
  customers_count: number;
  customers_delta: number;
  active_deals_count: number;
  revenue_month: number;
  tasks_today: number;
  overdue_tasks: number;
  recent_customers: Array<{
    id: string;
    full_name: string;
    company_name: string;
    status: string;
    created_at: string;
  }>;
  deals_no_activity: number;
  stalled_deals: Array<{
    id: string;
    title: string;
    amount: number;
    currency: string;
    stage: string;
    customer_name: string;
    customer_id: string;
    days_silent: number | null;
  }>;
  silent_customers: Array<{
    id: string;
    full_name: string;
    company_name: string;
    phone: string;
    days_silent: number | null;
  }>;
  today_tasks: Array<{
    id: string;
    title: string;
    priority: string;
    due_at: string | null;
    customer: { id: string; full_name: string } | null;
  }>;
}

const STATUS_MAP: Record<string, { variant: 'success' | 'info' | 'default' | 'warning'; label: string }> = {
  new: { variant: 'info', label: 'Новый' },
  active: { variant: 'success', label: 'Активный' },
  inactive: { variant: 'default', label: 'Неактивный' },
  archived: { variant: 'default', label: 'Архив' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
};

function MetricCard({
  label,
  value,
  icon,
  accentColor,
  subtitle,
  fmt = 'n',
  loading,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accentColor: string;
  subtitle?: string;
  fmt?: 'n' | 'c';
  loading?: boolean;
}) {
  const orgCurrency = useAuthStore(s => s.org?.currency ?? 'KZT');
  const display = fmt === 'c' ? formatMoney(value, orgCurrency) : formatNumber(value);

  return (
    <motion.div variants={fadeUp} className={styles.metricCard}>
      <div
        className={styles.metricIcon}
        style={{ '--metric-accent': accentColor, '--metric-accent-soft': `${accentColor}18` } as CSSProperties}
      >
        {icon}
      </div>
      <div className={styles.metricMeta}>
        <div className={styles.metricLabel}>{label}</div>
        {loading ? <Skeleton height={24} width={80} /> : <div className={styles.metricValue}>{display}</div>}
        {subtitle && <div className={styles.metricSubtitle}>{subtitle}</div>}
      </div>
    </motion.div>
  );
}

function TodayFocusCard({ data, onOpenTasks, onOpenDeals, onOpenCustomers, onAskAssistant }: {
  data?: DashboardData;
  onOpenTasks: () => void;
  onOpenDeals: () => void;
  onOpenCustomers: () => void;
  onAskAssistant: () => void;
}) {
  const overdueTasks = data?.overdue_tasks ?? 0;
  const stalledDeals = data?.stalled_deals?.length ?? 0;
  const silentCustomers = data?.silent_customers?.length ?? 0;

  const focus = overdueTasks > 0
    ? {
        title: `Разберите ${overdueTasks} просроченных задач`,
        description: 'Сначала снимите просрочку. Пока она висит, всё остальное выглядит прилично только в отчётах.',
        primary: { label: 'Открыть задачи', action: onOpenTasks },
        secondary: { label: 'Спросить ассистента', action: onAskAssistant },
      }
    : stalledDeals > 0
      ? {
          title: `Верните в движение ${stalledDeals} сделок`,
          description: 'Сделки без движения уже сказали всё, что хотели. Теперь надо, чтобы кто-то сделал ход.',
          primary: { label: 'Открыть сделки', action: onOpenDeals },
          secondary: { label: 'Следующий шаг', action: onAskAssistant },
        }
      : silentCustomers > 0
        ? {
            title: `Свяжитесь с ${silentCustomers} молчащими клиентами`,
            description: 'Тишина редко считается стратегией. Обычно это просто потеря темпа.',
            primary: { label: 'Открыть клиентов', action: onOpenCustomers },
            secondary: { label: 'Спросить ассистента', action: onAskAssistant },
          }
        : {
            title: 'День выглядит спокойно',
            description: 'Критических сигналов нет. Значит, можно вести базу вперёд, а не тушить пожары.',
            primary: { label: 'Создать задачу', action: onOpenTasks },
            secondary: { label: 'Открыть сделки', action: onOpenDeals },
          };

  return (
    <section className={styles.focusCard} aria-labelledby="dashboard-focus-title">
      <div className={styles.focusBadge}><Sparkles size={13} /> Фокус на сегодня</div>
      <h2 id="dashboard-focus-title" className={styles.focusTitle}>{focus.title}</h2>
      <p className={styles.focusDescription}>{focus.description}</p>
      <div className={styles.focusActions}>
        <Button size="sm" onClick={focus.primary.action}>{focus.primary.label}</Button>
        <Button variant="secondary" size="sm" onClick={focus.secondary.action}>{focus.secondary.label}</Button>
      </div>
    </section>
  );
}

function CriticalQueue({ data, navigate }: { data: DashboardData; navigate: ReturnType<typeof useNavigate> }) {
  const items = useMemo(() => {
    const stalled = (data.stalled_deals ?? []).slice(0, 3).map((deal) => ({
      id: `deal-${deal.id}`,
      title: deal.title,
      sub: `${deal.customer_name} · ${deal.stage}`,
      badge: deal.days_silent != null ? `${deal.days_silent}д` : undefined,
      icon: <AlertTriangle size={14} />,
      critical: true,
      onClick: () => navigate(`/deals/${deal.id}`),
    }));

    const silent = (data.silent_customers ?? []).slice(0, 3).map((customer) => ({
      id: `customer-${customer.id}`,
      title: customer.full_name,
      sub: customer.company_name || customer.phone,
      badge: customer.days_silent != null ? `${customer.days_silent}д` : undefined,
      icon: <BellOff size={14} />,
      critical: false,
      onClick: () => navigate(`/customers/${customer.id}`),
    }));

    const today = (data.today_tasks ?? []).slice(0, 3).map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      sub: task.customer?.full_name ?? 'Без клиента',
      badge: task.priority === 'high' ? 'Важно' : undefined,
      icon: <ClipboardList size={14} />,
      critical: false,
      onClick: () => navigate('/tasks'),
    }));

    return [...stalled, ...silent, ...today].slice(0, 6);
  }, [data, navigate]);

  if (items.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="dashboard-queue-title">
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionEyebrow}>Требуют внимания</div>
          <h2 id="dashboard-queue-title" className={styles.sectionTitle}>Критическая очередь</h2>
        </div>
        <button className={styles.sectionLink} onClick={() => navigate('/tasks')}>Открыть всё <ArrowRight size={12} /></button>
      </div>
      <div className={styles.queueGrid} aria-live="polite">
        {items.map((item) => (
          <button
            key={item.id}
            className={`${styles.queueItem} ${item.critical ? styles.queueItemCritical : ''}`}
            onClick={item.onClick}
          >
            <span className={styles.queueIcon}>{item.icon}</span>
            <span className={styles.queueBody}>
              <span className={styles.queueTitle}>{item.title}</span>
              <span className={styles.queueSub}>{item.sub}</span>
            </span>
            {item.badge && <span className={styles.queueBadge}>{item.badge}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const org = useAuthStore(s => s.org);
  const isMobile = useIsMobile();
  const openCreateCustomer = useUIStore(s => s.openCreateCustomer);
  const openCreateDeal = useUIStore(s => s.openCreateDeal);
  const openCreateTask = useUIStore(s => s.openCreateTask);
  const openAssistantPrompt = useUIStore(s => s.openAssistantPrompt);
  const { can } = useCapabilities();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  const [productMoment, setProductMoment] = useState<string | null>(null);

  useEffect(() => {
    const moment = getProductMoment();
    if (moment) {
      setProductMoment(moment);
      clearProductMoment();
    }
  }, []);

  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/reports/dashboard'),
  });

  const watchSignals = (data?.overdue_tasks ?? 0) + (data?.stalled_deals?.length ?? 0) + (data?.silent_customers?.length ?? 0);

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="dashboard-title">
        <div className={styles.heroCopy}>
          <div className={styles.heroContext}>Главная · План на сегодня</div>
          <p className={styles.heroGreeting}>{greeting},</p>
          <h1 id="dashboard-title" className={styles.heroTitle}>{user?.full_name?.split(' ')[0] ?? 'команда'}</h1>
          <p className={styles.heroDescription}>
            {org?.name ? `${org.name}. ` : ''}Сначала видно срочное, затем понятен следующий ход. Ничего мистического, просто редкая дисциплина в CRM.
          </p>
          <div className={styles.heroSignals} aria-live="polite">
            <span className={styles.signalChip}><CircleAlert size={12} /> Сигналов: <strong>{watchSignals}</strong></span>
            <span className={styles.signalChip}><ClipboardList size={12} /> Задач на сегодня: <strong>{data?.tasks_today ?? 0}</strong></span>
            <span className={styles.signalChip}><AlertTriangle size={12} /> Просрочено: <strong>{data?.overdue_tasks ?? 0}</strong></span>
          </div>
        </div>

        {!isMobile && (
          <div className={styles.heroActions}>
            {can('customers:write') && (
              <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={openCreateCustomer}>
                Клиент
              </Button>
            )}
            {can('deals:write') && (
              <Button size="sm" icon={<Plus size={13} />} onClick={() => openCreateDeal()}>
                Сделка
              </Button>
            )}
          </div>
        )}
      </section>

      {productMoment && (
        <div className={styles.productMoment} role="status" aria-live="polite">
          <div className={styles.productMomentCopy}>
            <div className={styles.productMomentTitle}>Сценарий продолжен</div>
            <div className={styles.productMomentText}>{productMoment}</div>
          </div>
          <button className={styles.productMomentClose} onClick={() => setProductMoment(null)}>Закрыть</button>
        </div>
      )}

      {isError && (
        <InlineErrorState
          title="Главный экран не загрузился"
          description="API решил поиграть в молчанку. Обновите блок и продолжайте работу."
          action={{ label: 'Повторить', onClick: () => void refetch() }}
        />
      )}

      {!isError && (
        <>
          <TodayFocusCard
            data={data}
            onOpenTasks={() => can('tasks:write') && openCreateTask()}
            onOpenDeals={() => navigate('/deals')}
            onOpenCustomers={() => navigate('/customers')}
            onAskAssistant={() => openAssistantPrompt('Что сейчас требует внимания в Kort?')}
          />

          {!isLoading && data && <CriticalQueue data={data} navigate={navigate} />}

          <section className={styles.section} aria-labelledby="dashboard-metrics-title">
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionEyebrow}>Сводка</div>
                <h2 id="dashboard-metrics-title" className={styles.sectionTitle}>Коротко по состоянию</h2>
              </div>
            </div>
            <motion.div initial="hidden" animate="show" className={styles.metricsGrid}>
              <MetricCard label="Клиенты" value={data?.customers_count ?? 0} icon={<Users size={15} />} accentColor="#3B82F6" subtitle={data?.customers_delta ? `${data.customers_delta > 0 ? '+' : ''}${data.customers_delta} за период` : undefined} loading={isLoading} />
              <MetricCard label="Активные сделки" value={data?.active_deals_count ?? 0} icon={<Briefcase size={15} />} accentColor="#D97706" loading={isLoading} />
              <MetricCard label="Задачи на сегодня" value={data?.tasks_today ?? 0} icon={<CheckSquare size={15} />} accentColor="#10B981" loading={isLoading} />
              <MetricCard label="Выручка за месяц" value={data?.revenue_month ?? 0} fmt="c" icon={<TrendingUp size={15} />} accentColor="#8B5CF6" loading={isLoading} />
            </motion.div>
          </section>

          <section className={styles.section} aria-labelledby="dashboard-continuation-title">
            <div className={styles.continuationGrid}>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <div className={styles.sectionEyebrow}>Продолжить работу</div>
                    <h2 id="dashboard-continuation-title" className={styles.panelTitle}>Последние клиенты</h2>
                  </div>
                  <button className={styles.sectionLink} onClick={() => navigate('/customers')}>Все <ArrowRight size={12} /></button>
                </div>
                {isLoading ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className={styles.skeletonRow}>
                      <div><Skeleton height={14} width={150} /><div className={styles.skeletonGap} /><Skeleton height={12} width={96} /></div>
                      <Skeleton height={26} width={84} />
                    </div>
                  ))
                ) : (data?.recent_customers ?? []).length === 0 ? (
                  <div className={styles.panelEmpty}>Пока пусто. Добавь первого клиента и, внезапно, список оживёт.</div>
                ) : (
                  (data?.recent_customers ?? []).map((customer) => {
                    const status = STATUS_MAP[customer.status] ?? STATUS_MAP.new;
                    return (
                      <button key={customer.id} className={styles.customerRow} onClick={() => navigate(`/customers/${customer.id}`)}>
                        <span className={styles.customerCopy}>
                          <span className={styles.customerName}>{customer.full_name}</span>
                          <span className={styles.customerMeta}>{customer.company_name || 'Без компании'}</span>
                        </span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </button>
                    );
                  })
                )}
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <div className={styles.sectionEyebrow}>Быстрые действия</div>
                    <h2 className={styles.panelTitle}>Без лишних переходов</h2>
                  </div>
                </div>
                <div className={styles.actionList}>
                  {can('customers:write') && <button className={styles.actionRow} onClick={openCreateCustomer}><Users size={15} /> Добавить клиента</button>}
                  {can('deals:write') && <button className={styles.actionRow} onClick={() => openCreateDeal()}><Briefcase size={15} /> Создать сделку</button>}
                  {can('tasks:write') && <button className={styles.actionRow} onClick={() => openCreateTask()}><CheckSquare size={15} /> Новая задача</button>}
                  {can('customers.import') && <button className={styles.actionRow} onClick={() => navigate('/imports')}><TrendingUp size={15} /> Импорт данных</button>}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
