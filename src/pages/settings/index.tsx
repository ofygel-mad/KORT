import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Check,
  Copy,
  Globe,
  Key,
  MessageSquare,
  Monitor,
  MonitorCog,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../shared/api/client';
import type { TeamMemberResponse } from '../../shared/api/contracts';
import { useCompanyAccess } from '../../shared/hooks/useCompanyAccess';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import { useRole } from '../../shared/hooks/useRole';
import { useTabsKeyboardNav } from '../../shared/hooks/useTabsKeyboardNav';
import { copyToClipboard } from '../../shared/lib/browser';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { getDeviceId, usePinStore } from '../../shared/stores/pin';
import { useAuthStore } from '../../shared/stores/auth';
import { useUIStore, type Theme, type ThemePack } from '../../shared/stores/ui';
import { useProfileStore, MOODS } from '../../shared/stores/profile';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { CompanyAccessGate } from '../../shared/ui/CompanyAccessGate';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { EmployeePanel } from '../../features/auth/EmployeePanel';
import s from './Settings.module.css';

interface OrgData {
  id: string;
  name: string;
  slug?: string;
  mode?: string;
  // Extended profile fields — all optional, null from server = not set
  legal_name?: string;
  bin?: string;
  iin?: string;
  legal_form?: string;
  director?: string;
  accountant?: string;
  shipment_responsible_name?: string;
  shipment_responsible_position?: string;
  transport_organization?: string;
  attorney_number?: string;
  attorney_date?: string;
  attorney_issued_by?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  bank_name?: string;
  bank_bik?: string;
  bank_account?: string;
  currency: string;
  industry?: string;
  onboarding_completed?: boolean;
}

type SectionKey =
  | 'profile'
  | 'organization'
  | 'company-access'
  | 'appearance'
  | 'security'
  | 'team'
  | 'integrations'
  | 'webhooks'
  | 'templates'
  | 'api';

const ACCESS_LABELS: Record<string, string> = {
  active: 'Активен',
  pending: 'Ожидает подтверждения',
  rejected: 'Отклонён',
  no_company: 'Без компании',
  anonymous: 'Без авторизации',
};

const SECTIONS: Array<{ key: SectionKey; label: string; icon: JSX.Element }> = [
  { key: 'profile', label: 'Профиль', icon: <User size={15} /> },
  { key: 'organization', label: 'Организация', icon: <Building2 size={15} /> },
  { key: 'company-access', label: 'Компания и доступ', icon: <Users size={15} /> },
  { key: 'appearance', label: 'Оформление', icon: <MonitorCog size={15} /> },
  { key: 'security', label: 'Безопасность', icon: <ShieldCheck size={15} /> },
  { key: 'team', label: 'Команда', icon: <Users size={15} /> },
  { key: 'integrations', label: 'Интеграции', icon: <Globe size={15} /> },
  { key: 'webhooks', label: 'Webhooks', icon: <Zap size={15} /> },
  { key: 'templates', label: 'Шаблоны', icon: <MessageSquare size={15} /> },
  { key: 'api', label: 'API токены', icon: <Key size={15} /> },
];

const THEME_PACKS: Array<{ value: ThemePack; title: string; subtitle: string }> = [
  { value: 'neutral', title: 'Neutral Premium', subtitle: 'Сдержанный базовый стиль интерфейса' },
  { value: 'graphite', title: 'Graphite', subtitle: 'Холодный строгий визуальный пакет' },
  { value: 'sand', title: 'Sand', subtitle: 'Тёплый спокойный рабочий стиль' },
  { value: 'obsidian', title: 'Obsidian', subtitle: 'Контрастная ночная палитра' },
  { value: 'enterprise', title: 'Enterprise Hybrid', subtitle: 'Собранный business-режим для команд' },
];

const KZ_LEGAL_FORMS = [
  { value: '', label: 'Выберите форму' },
  { value: 'ТОО', label: 'ТОО — Товарищество с ограниченной ответственностью' },
  { value: 'АО', label: 'АО — Акционерное общество' },
  { value: 'ИП', label: 'ИП — Индивидуальный предприниматель' },
  { value: 'КФ', label: 'КФ — Крестьянское (фермерское) хозяйство' },
  { value: 'ГКП', label: 'ГКП — Государственное казённое предприятие' },
  { value: 'РГП', label: 'РГП — Республиканское государственное предприятие' },
  { value: 'НКО', label: 'НКО — Некоммерческая организация' },
];

function extractInviteToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token')?.trim() ?? '';
  } catch {
    const matched = trimmed.match(/[?&]token=([^&]+)/);
    return matched ? decodeURIComponent(matched[1]) : trimmed;
  }
}

function OrgSection() {
  const queryClient = useQueryClient();
  const setOrg = useAuthStore((state) => state.setOrg);
  const { data: org } = useQuery<OrgData>({
    queryKey: ['organization'],
    queryFn: () => api.get('/organization/'),
  });
  const { register, handleSubmit } = useForm<Partial<OrgData>>();
  const mutation = useMutation({
    mutationFn: (payload: Partial<OrgData>) => api.patch<OrgData>('/organization/', payload),
    onSuccess: (updated) => {
      if (updated) setOrg(updated as any);
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Организация обновлена');
    },
  });

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>Данные организации</div>
          <div className={s.sectionSubtitle}>Реквизиты используются при формировании счётов, накладных и документов</div>
        </div>
        <Button size="sm" loading={mutation.isPending} onClick={handleSubmit((payload) => mutation.mutate(payload))}>
          Сохранить
        </Button>
      </div>
      <div className={s.sectionBody}>

        {/* — Блок 1: Основные данные — */}
        <div className={s.orgGroup}>
          <div className={s.orgGroupLabel}>Основное</div>
          <div className={s.fieldGrid}>
            <div className={s.field}>
              <label className={s.fieldLabel}>Название компании <span className={s.fieldRequired}>*</span></label>
              <input {...register('name')} defaultValue={org?.name ?? ''} className="kort-input" placeholder="ТОО «Моя Компания»" />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Юридическое наименование</label>
              <input {...register('legal_name')} defaultValue={org?.legal_name ?? ''} className="kort-input" placeholder="Полное официальное наименование" />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Организационно-правовая форма</label>
              <select {...register('legal_form')} defaultValue={org?.legal_form ?? ''} className={`kort-input ${s.selectInput}`}>
                {KZ_LEGAL_FORMS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Отрасль</label>
              <input {...register('industry')} defaultValue={org?.industry ?? ''} className="kort-input" placeholder="Производство / Торговля / Услуги" />
            </div>
          </div>
        </div>

        {/* — Блок 2: Регистрационные данные — */}
        <div className={s.orgGroup}>
          <div className={s.orgGroupLabel}>Регистрация и налоги</div>
          <div className={s.fieldGrid}>
            <div className={s.field}>
              <label className={s.fieldLabel}>БИН <span className={s.fieldHint}>(12 цифр, для юр. лиц)</span></label>
              <input {...register('bin')} defaultValue={org?.bin ?? ''} className="kort-input" placeholder="000000000000" maxLength={12} inputMode="numeric" />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>ИИН <span className={s.fieldHint}>(12 цифр, для ИП)</span></label>
              <input {...register('iin')} defaultValue={org?.iin ?? ''} className="kort-input" placeholder="000000000000" maxLength={12} inputMode="numeric" />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Валюта расчётов</label>
              <select {...register('currency')} defaultValue={org?.currency ?? 'KZT'} className={`kort-input ${s.selectInput}`}>
                <option value="KZT">KZT — Казахстанский тенге ₸</option>
                <option value="USD">USD — Доллар США $</option>
                <option value="RUB">RUB — Российский рубль ₽</option>
                <option value="EUR">EUR — Евро €</option>
              </select>
            </div>
          </div>
        </div>

        {/* — Блок 3: Руководство — */}
        <div className={s.orgGroup}>
          <div className={s.orgGroupLabel}>Руководство</div>
          <div className={s.fieldGrid}>
            <div className={s.field}>
              <label className={s.fieldLabel}>Директор / Руководитель</label>
              <input {...register('director')} defaultValue={org?.director ?? ''} className="kort-input" placeholder="ФИО полностью" />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Главный бухгалтер</label>
              <input {...register('accountant')} defaultValue={org?.accountant ?? ''} className="kort-input" placeholder="ФИО или «Без бухгалтера»" />
            </div>
          </div>
        </div>

        <div className={s.orgGroup}>
          <div className={s.orgGroupLabel}>Документы и подписи</div>
          <div className={s.fieldGrid}>
            <div className={s.field}>
              <label className={s.fieldLabel}>Ответственный за отпуск</label>
              <input
                {...register('shipment_responsible_name')}
                defaultValue={org?.shipment_responsible_name ?? ''}
                className="kort-input"
                placeholder="ФИО сотрудника, который разрешает отпуск"
              />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Должность ответственного</label>
              <input
                {...register('shipment_responsible_position')}
                defaultValue={org?.shipment_responsible_position ?? ''}
                className="kort-input"
                placeholder="Руководитель / Зав. складом / Менеджер"
              />
            </div>
            <div className={`${s.field} ${s.fieldWide}`}>
              <label className={s.fieldLabel}>Транспортная организация</label>
              <input
                {...register('transport_organization')}
                defaultValue={org?.transport_organization ?? ''}
                className="kort-input"
                placeholder="Если есть постоянный перевозчик, укажите здесь"
              />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Номер доверенности</label>
              <input
                {...register('attorney_number')}
                defaultValue={org?.attorney_number ?? ''}
                className="kort-input"
                placeholder="15/ДОВ-2026"
              />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Дата доверенности</label>
              <input
                {...register('attorney_date')}
                defaultValue={org?.attorney_date ?? ''}
                className="kort-input"
                type="date"
              />
            </div>
            <div className={`${s.field} ${s.fieldWide}`}>
              <label className={s.fieldLabel}>Кем выдана доверенность</label>
              <input
                {...register('attorney_issued_by')}
                defaultValue={org?.attorney_issued_by ?? ''}
                className="kort-input"
                placeholder="ТОО «Компания» / ИП Иванов И.И."
              />
            </div>
          </div>
        </div>

        {/* — Блок 4: Контакты и адрес — */}
        <div className={s.orgGroup}>
          <div className={s.orgGroupLabel}>Контакты и адрес</div>
          <div className={s.fieldGrid}>
            <div className={s.field}>
              <label className={s.fieldLabel}>Город</label>
              <input {...register('city')} defaultValue={org?.city ?? ''} className="kort-input" placeholder="Алматы" />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Юридический адрес</label>
              <input {...register('address')} defaultValue={org?.address ?? ''} className="kort-input" placeholder="ул. Абая, 1, офис 100" />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Телефон</label>
              <input {...register('phone')} defaultValue={org?.phone ?? ''} className="kort-input" placeholder="+7 (___) ___-__-__" inputMode="tel" />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Электронная почта</label>
              <input {...register('email')} defaultValue={org?.email ?? ''} className="kort-input" placeholder="info@company.kz" inputMode="email" />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Веб-сайт</label>
              <input {...register('website')} defaultValue={org?.website ?? ''} className="kort-input" placeholder="https://company.kz" />
            </div>
          </div>
        </div>

        {/* — Блок 5: Банковские реквизиты — */}
        <div className={s.orgGroup}>
          <div className={s.orgGroupLabel}>Банковские реквизиты</div>
          <div className={s.fieldGrid}>
            <div className={s.field}>
              <label className={s.fieldLabel}>Банк</label>
              <input {...register('bank_name')} defaultValue={org?.bank_name ?? ''} className="kort-input" placeholder="БанкЦентрКредит / Халык Банк" />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>БИК банка</label>
              <input {...register('bank_bik')} defaultValue={org?.bank_bik ?? ''} className="kort-input" placeholder="HSBKKZKX" maxLength={11} />
            </div>
            <div className={`${s.field} ${s.fieldWide}`}>
              <label className={s.fieldLabel}>Расчётный счёт (ИИК)</label>
              <input {...register('bank_account')} defaultValue={org?.bank_account ?? ''} className="kort-input" placeholder="KZ00 0000 0000 0000 0000" maxLength={24} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function CompanyAccessSection() {
  const access = useCompanyAccess();

  return (
    <>
      {/* ── Статус доступа ── */}
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <div>
            <div className={s.sectionTitle}>Статус доступа</div>
            <div className={s.sectionSubtitle}>Компания, роль и текущее состояние участия</div>
          </div>
          <Badge bg="var(--bg-surface-inset)" color="var(--text-secondary)">
            {ACCESS_LABELS[access.state] ?? access.state}
          </Badge>
        </div>
        <div className={s.sectionBody}>
          {access.isAdmin ? (
            <div className={s.adminGateCard}>
              <Building2 size={18} />
              <div>
                <div className={s.adminGateTitle}>Компания активна</div>
                <div className={s.adminGateText}>
                  Вы управляете компанией «{access.companyName ?? 'Текущая организация'}».
                  Сотрудники добавляются в разделе ниже.
                </div>
              </div>
            </div>
          ) : (
            <CompanyAccessGate compact />
          )}

          <div className={s.fieldGrid}>
            <div className={s.field}>
              <label className={s.fieldLabel}>Текущая компания</label>
              <div className={s.apiKeyField}>{access.companyName ?? 'Не выбрана'}</div>
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>Роль</label>
              <div className={s.apiKeyField}>{access.role ?? 'viewer'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Управление сотрудниками (только для admin/owner) ── */}
      {access.isAdmin && (
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <div>
              <div className={s.sectionTitle}>Сотрудники</div>
              <div className={s.sectionSubtitle}>
                Добавление, права доступа и управление аккаунтами. Сотрудники входят через
                номер телефона при первом визите.
              </div>
            </div>
          </div>
          <div className={s.sectionBody}>
            <EmployeePanel />
          </div>
        </div>
      )}
    </>
  );
}

function TeamSection() {
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const { data: team, isLoading } = useQuery<{ results: TeamMemberResponse[] }>({
    queryKey: ['team'],
    queryFn: () => api.get('/users/team/'),
  });
  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => api.patch(`/users/${userId}/role/`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Роль обновлена');
    },
  });

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>Команда</div>
          <div className={s.sectionSubtitle}>Активные сотрудники компании</div>
        </div>
        <Button size="sm" onClick={() => window.location.assign('/admin/team')}>Приглашения</Button>
      </div>

      <div className={s.teamTableWrap}>
        <table className={s.teamTable}>
          <tbody>
            {isLoading
              ? [1, 2, 3].map((item) => (
                <tr key={item}>
                  <td><Skeleton height={16} /></td>
                </tr>
              ))
              : (team?.results ?? []).map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className={s.memberCell}>
                      <div className={s.memberAvatar}>{member.full_name.charAt(0)}</div>
                      <div>
                        <div className={s.memberName}>{member.full_name}</div>
                        <div className={s.memberEmail}>{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge
                      bg={member.status === 'active' ? 'var(--fill-positive-soft)' : 'var(--bg-surface-inset)'}
                      color={member.status === 'active' ? 'var(--fill-positive-text)' : 'var(--text-secondary)'}
                    >
                      {member.status}
                    </Badge>
                  </td>
                  <td>
                    {isAdmin ? (
                      <select
                        value={member.role ?? 'viewer'}
                        onChange={(event) => setRole.mutate({ userId: member.id, role: event.target.value })}
                        className={`kort-input ${s.roleSelect}`}
                      >
                        <option value="admin">admin</option>
                        <option value="manager">manager</option>
                        <option value="viewer">viewer</option>
                      </select>
                    ) : (
                      <span className={s.roleText}>{member.role ?? 'viewer'}</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const THEME_MODES: Array<{ value: Theme; label: string; icon: JSX.Element }> = [
  { value: 'light', label: 'Светлая', icon: <Sun size={15} /> },
  { value: 'dark', label: 'Тёмная', icon: <Moon size={15} /> },
  { value: 'system', label: 'Системная', icon: <Monitor size={15} /> },
];

function AppearanceSection() {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const themePack = useUIStore((state) => state.themePack);
  const setThemePack = useUIStore((state) => state.setThemePack);

  return (
    <>
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <div>
            <div className={s.sectionTitle}>Цветовая схема</div>
            <div className={s.sectionSubtitle}>Применяется глобально ко всему интерфейсу</div>
          </div>
        </div>
        <div className={s.sectionBody}>
          <div className={s.themeToggleRow}>
            {THEME_MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${s.themeToggleBtn} ${theme === item.value ? s.themeToggleBtnActive : ''}`}
                onClick={() => setTheme(item.value)}
              >
                {item.icon}
                {item.label}
                {theme === item.value && <Check size={13} className={s.themeToggleCheck} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionHeader}>
          <div>
            <div className={s.sectionTitle}>Визуальный пакет</div>
            <div className={s.sectionSubtitle}>Цветовая палитра и стиль компонентов</div>
          </div>
        </div>
        <div className={s.sectionBody}>
          <div className={s.themePackGrid}>
            {THEME_PACKS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${s.themePackCard} ${themePack === item.value ? s.themePackCardActive : ''}`}
                onClick={() => setThemePack(item.value)}
              >
                <div className={s.themePackCardInner}>
                  <div className={s.themePackName}>{item.title}</div>
                  <div className={s.themePackSub}>{item.subtitle}</div>
                </div>
                {themePack === item.value && (
                  <div className={s.themePackCheck}><Check size={12} /></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function OwnerCredentialsCard() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleChangeEmail() {
    if (!newEmail.trim() || !emailCurrentPassword.trim()) {
      toast.error('Заполните все поля.');
      return;
    }
    setEmailLoading(true);
    try {
      await api.post('/users/me/change-email/', {
        new_email: newEmail.trim().toLowerCase(),
        current_password: emailCurrentPassword,
      });
      toast.success('Email изменён. Войдите заново с новым адресом.');
      clearAuth();
      navigate('/auth/login', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Не удалось изменить email.');
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword.trim() || !newPassword.trim() || !newPasswordConfirm.trim()) {
      toast.error('Заполните все поля.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error('Пароли не совпадают.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Пароль должен содержать не менее 6 символов.');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Пароль изменён. Войдите заново.');
      clearAuth();
      navigate('/auth/login', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Не удалось изменить пароль.');
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>Учётная запись руководителя</div>
          <div className={s.sectionSubtitle}>
            После смены данных сессия владельца завершится. Сотрудники не будут выброшены из системы.
          </div>
        </div>
      </div>
      <div className={s.sectionBody}>
        {/* ── Смена email ── */}
        <div className={s.securityCard}>
          <div className={s.securityCardBody}>
            <div className={s.securityCardTitle}>Email</div>
            <div className={s.securityCardMeta}>{user?.email ?? '—'}</div>
            <div className={s.securityActions}>
              <button className={s.securityBtn} onClick={() => { setShowEmailForm((v) => !v); setShowPasswordForm(false); }}>
                Изменить email
              </button>
            </div>
          </div>
        </div>
        {showEmailForm && (
          <div className={s.pinSetupCard}>
            <div className={s.pinSetupFields}>
              <div className={s.field}>
                <label className={s.fieldLabel}>Новый email</label>
                <input
                  className="kort-input"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="новый@email.com"
                  autoComplete="email"
                />
              </div>
              <div className={s.field}>
                <label className={s.fieldLabel}>Текущий пароль для подтверждения</label>
                <input
                  className="kort-input"
                  type="password"
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  placeholder="Введите текущий пароль"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <div className={s.pinSetupActions}>
              <button className={s.securityBtn} disabled={emailLoading} onClick={() => void handleChangeEmail()}>
                {emailLoading ? 'Сохраняем...' : 'Сохранить email'}
              </button>
            </div>
          </div>
        )}

        {/* ── Смена пароля ── */}
        <div className={s.securityCard}>
          <div className={s.securityCardBody}>
            <div className={s.securityCardTitle}>Пароль</div>
            <div className={s.securityCardMeta}>••••••••</div>
            <div className={s.securityActions}>
              <button className={s.securityBtn} onClick={() => { setShowPasswordForm((v) => !v); setShowEmailForm(false); }}>
                Изменить пароль
              </button>
            </div>
          </div>
        </div>
        {showPasswordForm && (
          <div className={s.pinSetupCard}>
            <div className={s.pinSetupFields}>
              <div className={s.field}>
                <label className={s.fieldLabel}>Текущий пароль</label>
                <input
                  className="kort-input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Текущий пароль"
                  autoComplete="current-password"
                />
              </div>
              <div className={s.field}>
                <label className={s.fieldLabel}>Новый пароль</label>
                <input
                  className="kort-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  autoComplete="new-password"
                />
              </div>
              <div className={s.field}>
                <label className={s.fieldLabel}>Повторите новый пароль</label>
                <input
                  className="kort-input"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="Повторите пароль"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className={s.pinSetupActions}>
              <button className={s.securityBtn} disabled={passwordLoading} onClick={() => void handleChangePassword()}>
                {passwordLoading ? 'Сохраняем...' : 'Сохранить пароль'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileSection() {
  const userAuth = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const { mood, statusText, setMood, setStatusText } = useProfileStore();

  const [fullName, setFullName] = useState(userAuth?.full_name ?? '');
  const [phone, setPhone] = useState(userAuth?.phone ?? '');

  const { data: meData } = useQuery<{
    id: string; full_name: string; email: string; phone: string | null; avatar_url: string | null;
  }>({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me/'),
    staleTime: 30000,
  });

  useEffect(() => {
    if (meData) {
      setFullName(meData.full_name ?? '');
      setPhone(meData.phone ?? '');
    }
  }, [meData]);

  const mutation = useMutation({
    mutationFn: (payload: { full_name?: string; phone?: string | null }) =>
      api.patch('/users/me/', payload),
    onSuccess: (data: any) => {
      if (data?.user) setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Профиль обновлён');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(msg ?? 'Не удалось сохранить изменения');
    },
  });

  const initials = (fullName || userAuth?.full_name || '?')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>Профиль</div>
          <div className={s.sectionSubtitle}>Личная информация и статус</div>
        </div>
        <Button size="sm" loading={mutation.isPending} onClick={() => mutation.mutate({ full_name: fullName.trim() || undefined, phone: phone.trim() || null })}>
          Сохранить
        </Button>
      </div>
      <div className={s.sectionBody}>
        <div className={s.profileAvatarRow}>
          <div className={s.profileAvatar}>{initials}</div>
          <div className={s.profileAvatarMeta}>
            <div className={s.profileAvatarName}>{fullName || userAuth?.full_name}</div>
            <div className={s.profileAvatarEmail}>{meData?.email ?? userAuth?.email ?? ''}</div>
          </div>
        </div>

        <div className={s.fieldGrid}>
          <div className={s.field}>
            <label className={s.fieldLabel}>Имя</label>
            <input
              className="kort-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ваше имя"
              autoComplete="name"
            />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>Телефон</label>
            <input
              className="kort-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (XXX) XXX-XX-XX"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>Статус</label>
          <input
            className="kort-input"
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            placeholder="Что сейчас делаете?"
            maxLength={80}
          />
        </div>

        <div>
          <div className={s.fieldLabel} style={{ marginBottom: 8 }}>Настроение</div>
          <div className={s.moodGrid}>
            {MOODS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={[s.moodItem, mood === m.key ? s.moodItemActive : ''].join(' ')}
                onClick={() => setMood(m.key)}
                title={m.label}
              >
                <span className={s.moodEmoji}>{m.emoji || '○'}</span>
                <span className={s.moodLabel}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySection() {
  const { isOwner } = useRole();
  const pin = usePinStore((state) => state.pin);
  const isTrustedDevice = usePinStore((state) => state.isTrustedDevice);
  const setPin = usePinStore((state) => state.setPin);
  const clearPin = usePinStore((state) => state.clearPin);
  const [nextPin, setNextPin] = useState('');
  const [showForm, setShowForm] = useState(false);

  return (
    <>
    {isOwner && <OwnerCredentialsCard />}
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>Безопасность входа</div>
          <div className={s.sectionSubtitle}>PIN-код и доверенное устройство</div>
        </div>
      </div>
      <div className={s.sectionBody}>
        <div className={s.securityCard}>
          <div className={s.securityCardIcon}><Smartphone size={18} /></div>
          <div className={s.securityCardBody}>
            <div className={s.securityCardTitle}>Устройство</div>
            <div className={s.securityCardMeta}>ID: {getDeviceId().slice(0, 18)}...</div>
            <div className={s.securityCardStatus}>
              {isTrustedDevice
                ? <span className={s.statusTrusted}>Доверенное устройство</span>
                : <span className={s.statusUntrusted}>Сначала выполните обычный вход</span>}
            </div>
          </div>
        </div>

        <div className={s.securityCard}>
          <div className={s.securityCardIcon}><ShieldCheck size={18} /></div>
          <div className={s.securityCardBody}>
            <div className={s.securityCardTitle}>PIN-код</div>
            <div className={s.securityCardMeta}>{pin ? 'PIN установлен' : 'PIN не установлен'}</div>
            <div className={s.securityActions}>
              <button className={s.securityBtn} onClick={() => setShowForm((state) => !state)}>
                {pin ? 'Изменить PIN' : 'Установить PIN'}
              </button>
              {pin && (
                <button
                  className={`${s.securityBtn} ${s.securityBtnDanger}`}
                  onClick={() => {
                    clearPin();
                    toast.success('PIN удалён');
                  }}
                >
                  Удалить PIN
                </button>
              )}
            </div>
          </div>
        </div>

        {showForm && (
          <div className={s.pinSetupCard}>
            <div className={s.pinSetupFields}>
              <div className={s.field}>
                <label className={s.fieldLabel}>Новый PIN</label>
                <input
                  className="kort-input"
                  inputMode="numeric"
                  maxLength={4}
                  value={nextPin}
                  onChange={(event) => setNextPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </div>
            </div>
            <div className={s.pinSetupActions}>
              <button
                className={s.securityBtn}
                onClick={() => {
                  if (nextPin.length !== 4) {
                    toast.error('PIN должен содержать 4 цифры');
                    return;
                  }
                  setPin(nextPin);
                  setShowForm(false);
                  setNextPin('');
                  toast.success('PIN сохранён');
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function ApiSection() {
  const org = useAuthStore((state) => state.org);
  const token = `kort_${org?.slug ?? 'workspace'}_${(org?.id ?? 'org').replace(/[^a-z0-9]/gi, '').slice(0, 10).toLowerCase()}_demo`;

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>API токен</div>
          <div className={s.sectionSubtitle}>Mock-контракт для будущего backend</div>
        </div>
      </div>
      <div className={s.sectionBody}>
        <div className={s.apiKeyRow}>
          <div className={s.apiKeyField}>{token}</div>
          <Button
            size="sm"
            icon={<Copy size={13} />}
            onClick={async () => {
              const copied = await copyToClipboard(token);
              toast[copied ? 'success' : 'error'](copied ? 'Токен скопирован' : 'Не удалось скопировать токен');
            }}
          >
            Копировать
          </Button>
        </div>
      </div>
    </div>
  );
}

function StubSection({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>{title}</div>
          <div className={s.sectionSubtitle}>{subtitle}</div>
        </div>
      </div>
      <div className={s.sectionBody}>
        <div className={s.adminGateCard}>
          <MessageSquare size={18} />
          <div>
            <div className={s.adminGateTitle}>Каркас секции сохранён</div>
            <div className={s.adminGateText}>
              Базовая структура уже подготовлена и ждёт подключения полноценного backend API для этой области.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Настройки');
  const params = useParams();
  const navigate = useNavigate();
  const access = useCompanyAccess();
  const capabilities = useCapabilities();

  const visibleSections = useMemo(() => SECTIONS.filter((item) => {
    switch (item.key) {
      case 'profile':
      case 'company-access':
      case 'appearance':
      case 'security':
        return true;
      case 'organization':
        return access.isAdmin && access.hasCompanyAccess;
      case 'templates':
        return access.hasCompanyAccess;
      case 'team':
        return capabilities.canManageTeam;
      case 'integrations':
        return capabilities.canManageIntegrations;
      case 'webhooks':
        return capabilities.canRunAutomations;
      case 'api':
        return capabilities.canViewAudit;
      default:
        return false;
    }
  }), [access.hasCompanyAccess, access.isAdmin, capabilities.canManageIntegrations, capabilities.canManageTeam, capabilities.canRunAutomations, capabilities.canViewAudit]);

  const requestedSection = (params.section as SectionKey | undefined) ?? 'company-access';
  const defaultSection = visibleSections[0]?.key ?? 'company-access';
  const section = visibleSections.some((item) => item.key === requestedSection) ? requestedSection : defaultSection;
  const sectionKeys = visibleSections.map((item) => item.key);
  const onTabKeyDown = useTabsKeyboardNav(sectionKeys, section, (next) => navigate(next === 'company-access' ? '/settings' : `/settings/${next}`));

  useEffect(() => {
    const expectedPath = section === 'company-access' ? '/settings' : `/settings/${section}`;
    if (`/${params.section ?? ''}` === `/${section}` && params.section) return;
    if (!params.section && section === 'company-access') return;
    navigate(expectedPath, { replace: true });
  }, [navigate, params.section, section]);

  return (
    <div className={s.page}>
      <div className={s.layout}>
        <nav className={s.sidebar} role="tablist" aria-label="Разделы настроек" onKeyDown={onTabKeyDown}>
          {visibleSections.map((item) => (
            <button
              key={item.key}
              role="tab"
              tabIndex={section === item.key ? 0 : -1}
              aria-selected={section === item.key}
              className={`${s.sidebarItem} ${section === item.key ? s.sidebarItemActive : ''}`}
              onClick={() => navigate(item.key === 'company-access' ? '/settings' : `/settings/${item.key}`)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className={s.mainContent}>
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.13 }}
            >
              {section === 'profile' && <ProfileSection />}
              {section === 'organization' && <OrgSection />}
              {section === 'company-access' && <CompanyAccessSection />}
              {section === 'appearance' && <AppearanceSection />}
              {section === 'security' && <SecuritySection />}
              {section === 'team' && <TeamSection />}
              {section === 'api' && <ApiSection />}
              {section === 'integrations' && <StubSection title="Интеграции" subtitle="Каталог внешних подключений и ключей" />}
              {section === 'webhooks' && <StubSection title="Webhooks" subtitle="Доставка событий и автоматизации" />}
              {section === 'templates' && <StubSection title="Шаблоны сообщений" subtitle="Повторно используемые тексты и follow-up сценарии" />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
