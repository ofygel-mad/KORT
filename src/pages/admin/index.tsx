import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Activity, TrendingUp, Send,
  UserCheck, UserX, BarChart2, Settings2,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Skeleton } from '../../shared/ui/Skeleton';
import { useAuthStore } from '../../shared/stores/auth';
import { useRole } from '../../shared/hooks/useRole';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { reloadWindow } from '../../shared/lib/browser';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import { useTabsKeyboardNav } from '../../shared/hooks/useTabsKeyboardNav';
import styles from './Admin.module.css';

interface TeamMember { id: string; full_name: string; email: string; status: string; role?: string; }
interface AuditEntry { id: string; action: string; entity_type: string; entity_label: string; actor?: { full_name: string }; created_at: string; ip_address?: string; }
interface DashboardStats { customers_count: number; active_deals_count: number; revenue_month: number; tasks_today: number; overdue_tasks: number; }

const ROLE_COLORS: Record<string, string> = {
  owner: '#8B5CF6', admin: '#D97706', manager: '#3B82F6', viewer: '#6B7280',
};
const ACTION_LABELS: Record<string, string> = {
  create: 'Создание', update: 'Изменение', delete: 'Удаление',
  login: 'Вход', logout: 'Выход', export: 'Экспорт', import: 'Импорт',
};
const ACTION_COLORS: Record<string, string> = {
  create: '#10B981', update: '#3B82F6', delete: '#EF4444',
  login: '#6B7280', logout: '#6B7280', export: '#D97706', import: '#D97706',
};
const MODE_LABELS: Record<string, string> = {
  basic: 'Базовый', advanced: 'Продвинутый', industrial: 'Промышленный',
};
const MODE_COLORS: Record<string, string> = {
  basic: '#3B82F6', advanced: '#D97706', industrial: '#8B5CF6',
};

type Tab = 'overview' | 'team' | 'audit' | 'settings';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export default function AdminPage() {
  const qc = useQueryClient();
  const { isOwner } = useRole();
  const { canManageTeam, canViewAudit, canManageBilling } = useCapabilities();
  const params = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const org = useAuthStore((s) => s.org);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('manager');
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/reports/dashboard/'),
    enabled: ((params.section as Tab | undefined) ?? 'overview') === 'overview',
  });

  const { data: team, isLoading: teamLoading } = useQuery<{ results: TeamMember[]; count: number }>({
    queryKey: ['team'],
    queryFn: () => api.get('/users/team/'),
    enabled: ((params.section as Tab | undefined) ?? 'overview') === 'team',
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<{ results: AuditEntry[] }>({
    queryKey: ['audit'],
    queryFn: () => api.get('/audit/?page_size=50'),
    enabled: ((params.section as Tab | undefined) ?? 'overview') === 'audit',
  });

  const setRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => api.patch(`/users/${userId}/role/`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success('Роль обновлена'); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Ошибка'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/deactivate/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success('Пользователь деактивирован'); },
  });

  const activateMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/activate/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success('Пользователь активирован'); },
  });

  const upgradeMutation = useMutation({
    mutationFn: (mode: string) => api.patch('/organization/', { mode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Режим KORT обновлён');
      reloadWindow();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Ошибка'),
  });

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res: any = await api.post('/auth/invite/', { email: inviteEmail, role: inviteRole });
      toast.success(res.detail ?? 'Приглашение отправлено');
      setInviteEmail('');
      setShowInviteForm(false);
      qc.invalidateQueries({ queryKey: ['team'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Ошибка при отправке');
    } finally {
      setInviting(false);
    }
  };

  const TABS: Array<{ key: Tab; label: string; icon: ReactNode; visible: boolean }> = [
    { key: 'overview', label: 'Обзор', icon: <BarChart2 size={15} />, visible: true },
    { key: 'team', label: 'Команда', icon: <Users size={15} />, visible: canManageTeam },
    { key: 'audit', label: 'Аудит', icon: <Activity size={15} />, visible: canViewAudit },
    { key: 'settings', label: 'Тариф и режим', icon: <Settings2 size={15} />, visible: canManageBilling || isOwner },
  ];
  const visibleTabs = useMemo(() => TABS.filter((tab) => tab.visible), [TABS]);
  const requestedTab = (params.section as Tab | undefined) ?? 'overview';
  const activeTab = visibleTabs.some((tab) => tab.key === requestedTab) ? requestedTab : (visibleTabs[0]?.key ?? 'overview');
  const tabKeys = visibleTabs.map((tab) => tab.key);
  const goToTab = (next: Tab) => navigate(next === 'overview' ? '/admin' : `/admin/${next}`);
  const handleTabKeyDown = useTabsKeyboardNav(tabKeys, activeTab, goToTab);

  const overviewCards = [
    { label: 'Клиентов всего', value: statsLoading ? null : stats?.customers_count, icon: <Users size={20} />, color: '#3B82F6' },
    { label: 'Активных сделок', value: statsLoading ? null : stats?.active_deals_count, icon: <TrendingUp size={20} />, color: '#10B981' },
    { label: 'Задач сегодня', value: statsLoading ? null : stats?.tasks_today, icon: <UserCheck size={20} />, color: '#D97706' },
    { label: 'Просроченных задач', value: statsLoading ? null : stats?.overdue_tasks, icon: <CheckCircle2 size={20} />, color: '#8B5CF6' },
  ];

  const plans = [
    { mode: 'basic', color: '#3B82F6', title: 'Базовый', features: ['Клиенты и сделки', 'Задачи', 'Простые отчёты'] },
    { mode: 'advanced', color: '#D97706', title: 'Продвинутый', features: ['+ Роли сотрудников', '+ Автоматизации', '+ Кастомные поля', '+ Расширенная аналитика'] },
    { mode: 'industrial', color: '#8B5CF6', title: 'Промышленный', features: ['+ Аудит всех действий', '+ API доступ', '+ Мультифилиальность', '+ SLA и очереди'] },
  ] as const;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Панель управления"
        subtitle={`Организация: ${org?.name ?? '—'} · Режим работы: ${MODE_LABELS[org?.mode ?? 'basic']}`}
      />

      <div className={styles.tabs} role="tablist" aria-label="Разделы панели управления" aria-orientation="horizontal" onKeyDown={handleTabKeyDown}>
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => goToTab(t.key)}
            role="tab"
            id={`admin-tab-${t.key}`}
            aria-selected={activeTab === t.key}
            aria-controls={`admin-panel-${t.key}`}
            tabIndex={activeTab === t.key ? 0 : -1}
            className={cx(styles.tabButton, activeTab === t.key && styles.active)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" id="admin-panel-overview" role="tabpanel" aria-labelledby="admin-tab-overview" tabIndex={0} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className={styles.panelGrid}>
              {overviewCards.map((card) => (
                <div key={card.label} className={styles.statCard}>
                  <div className={styles.statIcon} style={{ '--card-color': card.color } as CSSProperties}>{card.icon}</div>
                  <div className={styles.statValue}>{card.value === null ? <Skeleton height={28} width={60} /> : (card.value ?? '—')}</div>
                  <div className={styles.statLabel}>{card.label}</div>
                </div>
              ))}
            </div>

            <div className={styles.surfaceCard}>
              <h3 className={styles.surfaceTitle}>Текущий режим Kort</h3>
              <div className={styles.modeRow}>
                <div className={styles.modeDot} style={{ '--mode-color': MODE_COLORS[org?.mode ?? 'basic'] } as CSSProperties} />
                <span className={styles.modeValue} style={{ '--mode-color': MODE_COLORS[org?.mode ?? 'basic'] } as CSSProperties}>
                  {MODE_LABELS[org?.mode ?? 'basic']}
                </span>
                {isOwner && org?.mode !== 'industrial' && (
                  <button type="button" onClick={() => navigate('/admin/settings')} className={styles.modeLink}>
                    Повысить план →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'team' && (
          <motion.div key="team" id="admin-panel-team" role="tabpanel" aria-labelledby="admin-tab-team" tabIndex={0} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className={styles.teamHeader}>
              <span className={styles.memberCount}>{team?.count ?? 0} сотрудников</span>
              {canManageTeam && (
                <Button size="sm" icon={<Send size={13} />} onClick={() => setShowInviteForm(!showInviteForm)}>
                  Пригласить сотрудника
                </Button>
              )}
            </div>

            <AnimatePresence>
              {showInviteForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={styles.inviteWrap}>
                  <div className={styles.inviteCard}>
                    <fieldset className={styles.inviteForm}>
                      <legend className={styles.surfaceTitle}>Приглашение сотрудника</legend>
                      <input
                        className="kort-input"
                        placeholder="email@company.com"
                        aria-label="Email сотрудника"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <select className={styles.inviteSelect} aria-label="Роль сотрудника" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                        <option value="admin">Администратор</option>
                        <option value="manager">Менеджер</option>
                        <option value="viewer">Наблюдатель</option>
                      </select>
                      <Button size="sm" loading={inviting} onClick={handleInvite}>Отправить</Button>
                    </fieldset>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={styles.teamCard}>
              {teamLoading
                ? [1, 2, 3].map((i) => (
                  <div key={i} className={styles.skeletonRow}>
                    <Skeleton height={14} width="60%" />
                  </div>
                ))
                : (team?.results ?? []).map((member) => (
                  <div key={member.id} className={styles.memberRow}>
                    <div className={styles.memberIdentity}>
                      <div className={styles.memberAvatar} style={{ '--member-color': ROLE_COLORS[member.role ?? 'viewer'] } as CSSProperties}>
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.memberName}>{member.full_name}</div>
                        <div className={styles.memberEmail}>{member.email}</div>
                      </div>
                    </div>
                    <div className={styles.memberActions}>
                      <span className={cx(styles.memberStatus, member.status === 'active' ? styles.activeStatus : styles.inactiveStatus)}>
                        {member.status === 'active' ? '● Активен' : '○ Неактивен'}
                      </span>
                      {member.role === 'owner' ? (
                        <Badge bg="#8B5CF620" color="#8B5CF6">Владелец</Badge>
                      ) : (
                        <select
                          className={styles.inlineSelect}
                          value={member.role ?? 'viewer'}
                          onChange={(e) => setRoleMutation.mutate({ userId: member.id, role: e.target.value })}
                        >
                          <option value="admin">Администратор</option>
                          <option value="manager">Менеджер</option>
                          <option value="viewer">Наблюдатель</option>
                        </select>
                      )}
                      {member.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => member.status === 'active' ? deactivateMutation.mutate(member.id) : activateMutation.mutate(member.id)}
                          title={member.status === 'active' ? 'Деактивировать' : 'Активировать'}
                          className={styles.iconButton}
                          style={{ '--icon-color': member.status === 'active' ? 'var(--fill-negative)' : 'var(--fill-positive)' } as CSSProperties}
                        >
                          {member.status === 'active' ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div key="audit" id="admin-panel-audit" role="tabpanel" aria-labelledby="admin-tab-audit" tabIndex={0} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className={styles.auditCard}>
              <div className={styles.auditHead}>
                {['Действие', 'Объект', 'Описание', 'Сотрудник', 'Время'].map((h) => (
                  <span key={h} className={styles.auditHeading}>{h}</span>
                ))}
              </div>
              {auditLoading
                ? [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={styles.skeletonRow}>
                    <Skeleton height={13} width="80%" />
                  </div>
                ))
                : (auditData?.results ?? []).map((entry) => (
                  <div key={entry.id} className={styles.auditRow}>
                    <span className={styles.auditAction} style={{ '--action-color': ACTION_COLORS[entry.action] ?? 'var(--text-tertiary)' } as CSSProperties}>
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                    <span className={styles.auditEntity}>{entry.entity_type}</span>
                    <span className={styles.auditLabel}>{entry.entity_label || '—'}</span>
                    <span className={styles.auditActor}>{entry.actor?.full_name ?? 'Система'}</span>
                    <span className={styles.auditTime}>
                      {new Date(entry.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              {!auditLoading && !auditData?.results?.length && (
                <div className={styles.emptyAudit}>
                  <Activity size={32} className={styles.emptyAuditIcon} />
                  <p>Действий пока нет</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div key="settings" id="admin-panel-settings" role="tabpanel" aria-labelledby="admin-tab-settings" tabIndex={0} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!isOwner && (
              <div className={styles.warningBanner}>
                <AlertCircle size={16} />
                <span className={styles.warningText}>Только владелец организации может менять режим Kort</span>
              </div>
            )}
            <p className={styles.modeDescription}>
              Текущий режим: <strong>{MODE_LABELS[org?.mode ?? 'basic']}</strong>. Повышение режима мгновенно открывает новые возможности.
            </p>
            <div className={styles.planGrid}>
              {plans.map((m) => {
                const isCurrent = org?.mode === m.mode;
                return (
                  <div
                    key={m.mode}
                    className={cx(styles.planCard, isCurrent && styles.planCurrent)}
                    style={{ '--plan-color': m.color } as CSSProperties}
                  >
                    <div className={styles.planTitle}>{m.title}</div>
                    {m.features.map((f) => (
                      <div key={f} className={styles.planFeatureRow}>
                        <CheckCircle2 size={11} color={m.color} />
                        <span className={styles.planFeature}>{f}</span>
                      </div>
                    ))}
                    {isCurrent
                      ? <div className={styles.planCurrentBadge}><CheckCircle2 size={13} /> Текущий режим</div>
                      : (
                        <Button
                          size="sm"
                          className={styles.planButton}
                          disabled={!isOwner || upgradeMutation.isPending}
                          onClick={() => upgradeMutation.mutate(m.mode)}
                        >
                          Переключить
                        </Button>
                      )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
