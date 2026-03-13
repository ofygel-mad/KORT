import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Pencil, Trash2, Building2, Users, GitBranch,
  Shield, Globe, Zap, Key, Copy, Plus, MessageSquare, MonitorCog, Sun, Moon, Monitor, Check, Palette, Layers3, Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Skeleton } from '../../shared/ui/Skeleton';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRole } from '../../shared/hooks/useRole';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { useUIStore, type ThemePack } from '../../shared/stores/ui';
import { useNavigate, useParams } from 'react-router-dom';
import { useTabsKeyboardNav } from '../../shared/hooks/useTabsKeyboardNav';
import { copyToClipboard } from '../../shared/lib/browser';
import s from './Settings.module.css';

/* ── Types ──────────────────────────────────────────────────── */
interface Pipeline { id: string; name: string; is_default: boolean; stages: PipelineStage[]; }
interface PipelineStage { id: string; name: string; stage_type: string; color: string; position: number; }
interface OrgData { id: string; name: string; mode: string; industry: string; company_size: string; timezone: string; currency: string; }
interface UserItem { id: string; full_name: string; email: string; status: string; role?: string; }

/* ── Section nav ─────────────────────────────────────────────── */
const SECTIONS = [
  { key: 'organization', label: 'Организация', icon: <Building2 size={15} /> },
  { key: 'appearance', label: 'Оформление', icon: <MonitorCog size={15} /> },
  { key: 'pipelines', label: 'Воронки', icon: <GitBranch size={15} /> },
  { key: 'templates', label: 'Шаблоны сообщений', icon: <MessageSquare size={15} /> },
  { key: 'team', label: 'Команда', icon: <Users size={15} />, capability: 'team.manage', adminOnly: true },
  { key: 'mode', label: 'Админ-режим', icon: <Shield size={15} />, capability: 'admin.mode', adminOnly: true },
  { key: 'integrations', label: 'Интеграции', icon: <Globe size={15} />, capability: 'integrations.manage', adminOnly: true },
  { key: 'webhooks', label: 'Webhooks', icon: <Zap size={15} />, capability: 'automations.manage', adminOnly: true },
  { key: 'api', label: 'API токены', icon: <Key size={15} />, capability: 'admin.mode', adminOnly: true },
] as const;

const SECTION_FALLBACK = 'organization';

const SECTION_LOCK_REASON: Record<string, string> = {
  team: 'team.manage',
  mode: 'admin.mode',
  integrations: 'integrations.manage',
  webhooks: 'automations.manage',
  api: 'admin.mode',
};


const THEME_PACKS: Array<{ value: ThemePack; title: string; subtitle: string; accent: string; depth: string; density: string; }> = [
  { value: 'neutral', title: 'Neutral Premium', subtitle: 'Тёплый базовый характер Kort', accent: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)', depth: 'Мягкая глубина', density: 'Сбалансированный акцент' },
  { value: 'graphite', title: 'Graphite', subtitle: 'Спокойный строгий режим', accent: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)', depth: 'Холодная глубина', density: 'Низкая плотность' },
  { value: 'sand', title: 'Sand', subtitle: 'Тёплая операционная среда', accent: 'linear-gradient(135deg, #D6A46B 0%, #B77939 100%)', depth: 'Светлая глубина', density: 'Тёплый акцент' },
  { value: 'obsidian', title: 'Obsidian', subtitle: 'Контрастный premium-night', accent: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)', depth: 'Глубокая тень', density: 'Выразительный акцент' },
  { value: 'enterprise', title: 'Enterprise Hybrid', subtitle: 'Сдержанный blue-brown для команд', accent: 'linear-gradient(135deg, #2D5B8A 0%, #6A4D2F 100%)', depth: 'Деловая глубина', density: 'Структурный акцент' },
];

/* ── Organisation section ────────────────────────────────────── */
function OrgSection() {
  const qc = useQueryClient();
  const { data: org } = useQuery<OrgData>({ queryKey: ['organization'], queryFn: () => api.get('/organization/') });
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Partial<OrgData>>();
  const mutation = useMutation({
    mutationFn: (d: Partial<OrgData>) => api.patch('/organization/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organization'] }); toast.success('Сохранено'); },
  });
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>Данные организации</div>
          <div className={s.sectionSubtitle}>Базовые параметры компании и рабочей среды</div>
        </div>
        <Button size="sm" loading={isSubmitting} onClick={handleSubmit(d => mutation.mutate(d))}>Сохранить</Button>
      </div>
      <div className={s.sectionBody}>
        <div className={s.fieldGrid}>
          <div className={s.field}>
            <label className={s.fieldLabel}>Название организации</label>
            <input {...register('name')} defaultValue={org?.name ?? ''} className="kort-input" />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>Отрасль</label>
            <input {...register('industry')} defaultValue={org?.industry ?? ''} className="kort-input" placeholder="Торговля, услуги..." />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>Часовой пояс</label>
            <select {...register('timezone')} defaultValue={org?.timezone ?? 'Asia/Almaty'} className="kort-input">
              <option value="Asia/Almaty">Asia/Almaty (UTC+5) — Алматы, Астана</option>
              <option value="Asia/Oral">Asia/Oral (UTC+5) — Уральск</option>
              <option value="Asia/Aqtobe">Asia/Aqtobe (UTC+5) — Актобе</option>
              <option value="Asia/Bishkek">Asia/Bishkek (UTC+6) — Бишкек</option>
              <option value="Europe/Moscow">Europe/Moscow (UTC+3) — Москва</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>Валюта по умолчанию</label>
            <select {...register('currency')} defaultValue={org?.currency ?? 'KZT'} className="kort-input">
              <option value="KZT">₸ KZT — Казахстанский тенге</option>
              <option value="USD">$ USD — Доллар США</option>
              <option value="EUR">€ EUR — Евро</option>
              <option value="RUB">₽ RUB — Российский рубль</option>
              <option value="CNY">¥ CNY — Китайский юань</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Team section ────────────────────────────────────────────── */
function TeamSection() {
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  const { data: team, isLoading } = useQuery<{ results: UserItem[] }>({ queryKey: ['team'], queryFn: () => api.get('/users/team/') });
  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => api.patch(`/users/${userId}/role/`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success('Роль обновлена'); },
  });
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>Участники команды</div>
          <div className={s.sectionSubtitle}>Роли, доступы и приглашения</div>
        </div>
        <Button size="sm" icon={<Plus size={13} />}>Пригласить</Button>
      </div>
      <div className={s.teamTableWrap}>
        <table className={s.teamTable}>
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Статус</th>
              <th>Роль</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? [1,2,3].map(i => (
                  <tr key={i}><td colSpan={3}><Skeleton height={14} width="50%" /></td></tr>
                ))
              : (team?.results ?? []).map(member => (
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
                        color={member.status === 'active' ? 'var(--fill-positive-text)' : 'var(--text-tertiary)'}
                      >
                        {member.status === 'active' ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={member.role ?? 'viewer'}
                          onChange={e => setRole.mutate({ userId: member.id, role: e.target.value })}
                          className={`kort-input ${s.roleSelect}`}
                        >
                          <option value="admin">Администратор</option>
                          <option value="manager">Менеджер</option>
                          <option value="viewer">Наблюдатель</option>
                        </select>
                      ) : (
                        <span className={s.roleText}>{member.role ?? 'viewer'}</span>
                      )}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Sortable stage row ──────────────────────────────────────── */
const STAGE_TYPE_LABELS: Record<string, string> = { open: 'Открыта', won: 'Выиграна', lost: 'Проиграна' };
const STAGE_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  open: { bg: 'var(--fill-info-soft)',     color: 'var(--fill-info-text)' },
  won:  { bg: 'var(--fill-positive-soft)', color: 'var(--fill-positive-text)' },
  lost: { bg: 'var(--fill-negative-soft)', color: 'var(--fill-negative-text)' },
};

function SortableStageRow({ stage, onEdit, onDelete }: { stage: PipelineStage; onEdit: () => void; onDelete: () => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  const tc = STAGE_TYPE_COLORS[stage.stage_type] ?? STAGE_TYPE_COLORS.open;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${s.stageRow} ${isDragging ? s.dragging : ''}`}
    >
      <div className={s.dragHandle} {...attributes} {...listeners}><GripVertical size={15} /></div>
      <div className={s.stageDot} style={{ '--stage-color': stage.color } as CSSProperties} />
      <span className={s.stageName}>{stage.name}</span>
      <Badge bg={tc.bg} color={tc.color}>{STAGE_TYPE_LABELS[stage.stage_type] ?? stage.stage_type}</Badge>
      <div className={s.stageActions}>
        <button className={s.iconBtn} onClick={onEdit} aria-label="Редактировать"><Pencil size={13} /></button>
        <button className={`${s.iconBtn} ${s.danger}`} onClick={onDelete} aria-label="Удалить"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

/* ── Pipelines section ───────────────────────────────────────── */
function PipelinesSection() {
  const qc = useQueryClient();
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [editingStage, setEditingStage] = useState<{ id: string; name: string; color: string } | null>(null);

  const { data: pipelines, isLoading } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: () => api.get('/pipelines/'),
    select: (d: any) => d.results ?? d,
  });

  const pipeline = pipelines?.find(p => p.id === selectedPipeline) ?? pipelines?.[0] ?? null;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [stages, setStages] = useState<PipelineStage[]>([]);

  useEffect(() => {
    if (pipeline?.stages) setStages([...pipeline.stages].sort((a, b) => a.position - b.position));
  }, [pipeline]);

  const reorderMutation = useMutation({
    mutationFn: ({ pipelineId, order }: { pipelineId: string; order: string[] }) =>
      api.post(`/pipelines/${pipelineId}/stages/reorder/`, { order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const addStageMutation = useMutation({
    mutationFn: ({ pipelineId, name }: { pipelineId: string; name: string }) =>
      api.post(`/pipelines/${pipelineId}/stages/`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      setNewStageName(''); setAddingStage(false); toast.success('Этап добавлен');
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) =>
      api.delete(`/pipelines/${pipelineId}/stages/${stageId}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipelines'] }); toast.success('Удалено'); },
    onError: () => toast.error('Нельзя удалить: есть активные сделки'),
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ pipelineId, stageId, data }: { pipelineId: string; stageId: string; data: any }) =>
      api.patch(`/pipelines/${pipelineId}/stages/${stageId}/`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipelines'] }); setEditingStage(null); },
  });

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id || !pipeline) return;
    const oldIdx = stages.findIndex(s => s.id === active.id);
    const newIdx = stages.findIndex(s => s.id === over.id);
    const reordered = arrayMove(stages, oldIdx, newIdx);
    setStages(reordered);
    reorderMutation.mutate({ pipelineId: pipeline.id, order: reordered.map(s => s.id) });
  }

  const PALETTE = ['#6B7280','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#10B981','#EC4899','#06B6D4'];

  if (isLoading) return <div className={s.section}><div className={s.sectionBody}><Skeleton height={20} width="60%" /></div></div>;

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>Воронки продаж</div>
          <div className={s.sectionSubtitle}>Этапы и последовательность сделок</div>
        </div>
      </div>
      <div className={s.sectionBody}>
        {/* Pipeline selector */}
        {(pipelines ?? []).length > 1 && (
          <div className={s.pipelineTabs}>
            {(pipelines ?? []).map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPipeline(p.id)}
                className={`${s.pipelineTab} ${(pipeline?.id === p.id) ? s.pipelineTabActive : ''}`}
              >
                {p.name}
                {p.is_default && <span className={s.pipelineStar}>★</span>}
              </button>
            ))}
          </div>
        )}

        {/* Stage list */}
        {pipeline ? (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className={s.stageList}>
                  {stages.map(stage => (
                    <SortableStageRow
                      key={stage.id}
                      stage={stage}
                      onEdit={() => setEditingStage({ id: stage.id, name: stage.name, color: stage.color })}
                      onDelete={() => deleteStageMutation.mutate({ pipelineId: pipeline.id, stageId: stage.id })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add stage */}
            {addingStage ? (
              <div className={s.addStageRow}>
                <input
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  placeholder="Название этапа"
                  className={`kort-input ${s.stageInput}`}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') addStageMutation.mutate({ pipelineId: pipeline.id, name: newStageName }); }}
                />
                <Button size="sm" disabled={!newStageName.trim()} loading={addStageMutation.isPending}
                  onClick={() => addStageMutation.mutate({ pipelineId: pipeline.id, name: newStageName })}>
                  Добавить
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setAddingStage(false); setNewStageName(''); }}>Отмена</Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setAddingStage(true)} className={s.addStageBtn}>
                Добавить этап
              </Button>
            )}
          </>
        ) : (
          <div className={s.emptyPipeline}>Нет воронок продаж</div>
        )}
      </div>

      {/* Edit stage drawer inline */}
      {editingStage && pipeline && (
        <div className={s.editStagePanel}>
          <div className={s.field}>
            <label className={s.fieldLabel}>Название этапа</label>
            <input
              value={editingStage.name}
              onChange={e => setEditingStage(p => p ? { ...p, name: e.target.value } : null)}
              className="kort-input"
            />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>Цвет</label>
            <div className={s.colorPalette}>
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setEditingStage(p => p ? { ...p, color: c } : null)}
                  className={`${s.colorSwatch} ${editingStage.color === c ? s.colorSwatchActive : ''}`}
                  style={{ '--swatch-color': c } as CSSProperties}
                />
              ))}
            </div>
          </div>
          <div className={s.editStageActions}>
            <Button size="sm" variant="secondary" onClick={() => setEditingStage(null)}>Отмена</Button>
            <Button size="sm" loading={updateStageMutation.isPending}
              onClick={() => updateStageMutation.mutate({ pipelineId: pipeline.id, stageId: editingStage.id, data: { name: editingStage.name, color: editingStage.color } })}>
              Сохранить
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme, themePack, setThemePack } = useUIStore();

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>Темы и характер интерфейса</div>
          <div className={s.sectionSubtitle}>Mode отвечает за свет и тьму, theme pack - за surface, глубину и плотность акцента.</div>
        </div>
      </div>
      <div className={s.sectionBody}>
        <div className={s.appearanceStack}>
          <div className={s.appearanceBlock}>
            <div className={s.appearanceLabel}>Режим отображения</div>
            <div className={s.themeModeRow}>
              {[
                { value: 'light', label: 'Светлая', icon: <Sun size={14} /> },
                { value: 'dark', label: 'Тёмная', icon: <Moon size={14} /> },
                { value: 'system', label: 'Системная', icon: <Monitor size={14} /> },
              ].map((mode) => (
                <button key={mode.value} className={`${s.themeModeBtn} ${theme === mode.value ? s.themeModeBtnActive : ''}`} onClick={() => setTheme(mode.value as 'light' | 'dark' | 'system')}>
                  {mode.icon}
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <div className={s.appearanceBlock}>
            <div className={s.appearanceLabel}>Theme packs</div>
            <div className={s.themeGrid}>
              {THEME_PACKS.map((pack) => (
                <button key={pack.value} className={`${s.themeTile} ${themePack === pack.value ? s.themeTileActive : ''}`} onClick={() => setThemePack(pack.value)}>
                  <div className={s.themeTilePreview} style={{ '--theme-preview-accent': pack.accent } as CSSProperties}>
                    <div className={s.themePreviewTopbar} />
                    <div className={s.themePreviewSidebar} />
                    <div className={s.themePreviewSurfaceLg} />
                    <div className={s.themePreviewSurfaceSm} />
                    <div className={s.themePreviewChip} />
                  </div>
                  <div className={s.themeTileBody}>
                    <div className={s.themeTileHead}>
                      <div>
                        <div className={s.themeTileTitle}>{pack.title}</div>
                        <div className={s.themeTileSub}>{pack.subtitle}</div>
                      </div>
                      {themePack === pack.value && <span className={s.themeTileCheck}><Check size={13} /></span>}
                    </div>
                    <div className={s.themeTileMeta}>
                      <span className={s.themeMetaChip}><Layers3 size={12} /> {pack.depth}</span>
                      <span className={s.themeMetaChip}><Sparkles size={12} /> {pack.density}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className={s.appearanceAside}>
            <div className={s.appearanceHintCard}>
              <div className={s.appearanceHintTitle}><Palette size={14} /> Что меняет pack</div>
              <ul className={s.appearanceHintList}>
                <li>surface hierarchy и глубину панелей</li>
                <li>плотность фирменного акцента</li>
                <li>характер dashboard, drawers, assistant и palette</li>
              </ul>
              <p className={s.appearanceHintText}>Настройка хранится локально и уважает системную тему, если выбран режим «Системная».</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── API tokens section ──────────────────────────────────────── */
function LockedAdminSection({ title, subtitle, canActivateAdminMode }: { title: string; subtitle: string; canActivateAdminMode: boolean }) {
  const { setAdminMode } = useUIStore();
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
          <Shield size={18} />
          <div>
            <div className={s.adminGateTitle}>{canActivateAdminMode ? 'Включите режим администратора' : 'Недостаточно прав'}</div>
            <div className={s.adminGateText}>
              {canActivateAdminMode
                ? 'Так обычный рабочий интерфейс остаётся лёгким, а критичные функции не лезут в глаза сотрудникам каждый день.'
                : 'Для этого раздела нужен отдельный уровень доступа. Прятать системные функции за красивыми кнопками без прав - любимый спорт плохих CRM.'}
            </div>
          </div>
          {canActivateAdminMode && <Button size="sm" onClick={() => setAdminMode(true)}>Включить режим</Button>}
        </div>
      </div>
    </div>
  );
}

function ApiSection() {
  const { data: keys, isLoading } = useQuery<{ results: { id: string; name: string; key: string; created_at: string }[] }>({
    queryKey: ['api-keys'], queryFn: () => api.get('/api-keys/'),
  });
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>API токены</div>
          <div className={s.sectionSubtitle}>Доступ к Kort API для интеграций</div>
        </div>
        <Button size="sm" icon={<Plus size={13} />}>Создать токен</Button>
      </div>
      <div className={s.sectionBody}>
        {isLoading ? <Skeleton height={14} width="70%" /> :
          (keys?.results ?? []).map(k => (
            <div key={k.id} className={s.apiKeyRow}>
              <div className={s.apiKeyField}>{k.key}</div>
              <Button size="sm" variant="secondary" icon={<Copy size={13} />} onClick={async () => { const ok = await copyToClipboard(k.key); ok ? toast.success('Скопировано') : toast.error('Не удалось скопировать'); }}>
                Копировать
              </Button>
            </div>
          ))
        }
        {!isLoading && (keys?.results ?? []).length === 0 && (
          <p className={s.emptyHint}>Токенов нет. Создайте первый для интеграции с внешними сервисами.</p>
        )}
      </div>
    </div>
  );
}

/* ── Planned section ─────────────────────────────────────────── */
function PlannedSection({
  title, subtitle, icon, bullets, footnote, action,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  bullets: string[];
  footnote: string;
  action?: ReactNode;
}) {
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <div>
          <div className={s.sectionTitle}>{title}</div>
          <div className={s.sectionSubtitle}>{subtitle}</div>
        </div>
      </div>
      <div className={s.sectionBody}>
        <div className={s.appearanceHintCard}>
          <EmptyState
            icon={icon}
            title="Раздел включён в архитектуру Kort"
            subtitle="Здесь лучше честно показать будущую зону ответственности раздела, чем прятать пустой экран под безликое «в разработке»."
          />
          <ul className={s.appearanceHintList}>
            {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
          </ul>
          <p className={s.appearanceHintText}>{footnote}</p>
          {action && <div className={s.editStageActions}>{action}</div>}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function SettingsPage() {
  useDocumentTitle('Настройки');
  const params = useParams();
  const navigate = useNavigate();
  const { adminMode } = useUIStore();
  const { canUseAdminMode, canManageTeam, canManageIntegrations, canRunAutomations, can } = useCapabilities();

  const accessMap: Record<string, boolean> = {
    'team.manage': canManageTeam,
    'integrations.manage': canManageIntegrations,
    'automations.manage': canRunAutomations,
    'admin.mode': canUseAdminMode,
  };

  const visibleSections = useMemo(() => (
    SECTIONS.filter((sec) => !sec.capability || accessMap[sec.capability])
  ), [accessMap]);

  const requestedSection = params.section ?? SECTION_FALLBACK;
  const requestedMeta = SECTIONS.find((sec) => sec.key === requestedSection);
  const defaultSection = visibleSections[0]?.key ?? SECTION_FALLBACK;
  const section = requestedMeta ? requestedSection : defaultSection;
  const sectionMeta = SECTIONS.find((sec) => sec.key === section);
  const sectionCapability = SECTION_LOCK_REASON[section];
  const hasCapability = sectionCapability ? accessMap[sectionCapability] || can(sectionCapability) : true;
  const requiresAdminMode = sectionMeta?.adminOnly ?? false;
  const sectionLocked = Boolean(sectionMeta) && (!hasCapability || (requiresAdminMode && !adminMode));

  useEffect(() => {
    if (!params.section) return;
    if (!requestedMeta && defaultSection !== params.section) {
      navigate(`/settings/${defaultSection}`, { replace: true });
    }
  }, [defaultSection, navigate, params.section, requestedMeta]);

  const changeSection = (next: string) => {
    navigate(next === SECTION_FALLBACK ? '/settings' : `/settings/${next}`);
  };

  const sectionKeys = visibleSections.map((sec) => sec.key);
  const handleSectionTabKeyDown = useTabsKeyboardNav(sectionKeys, section, changeSection);

  return (
    <div className={s.page}>
      <PageHeader title="Настройки" subtitle="Конфигурация организации и инструментов" />

      <div className={s.navTabs} role="tablist" aria-label="Разделы настроек" aria-orientation="horizontal" onKeyDown={handleSectionTabKeyDown}>
        {visibleSections.map(sec => (
          <button
            key={sec.key}
            role="tab"
            id={`settings-tab-${sec.key}`}
            aria-selected={section === sec.key}
            aria-controls={`settings-panel-${sec.key}`}
            tabIndex={section === sec.key ? 0 : -1}
            className={`${s.navTab} ${section === sec.key ? s.active : ''} ${sec.adminOnly && !adminMode ? s.lockedTab : ''}`}
            onClick={() => changeSection(sec.key)}
          >
            {sec.icon}
            {sec.label}
            {sec.adminOnly && !adminMode && <span className={s.tabMeta}>Требует админ-режим</span>}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          id={`settings-panel-${section}`}
          tabIndex={0}
          role="tabpanel"
          aria-labelledby={`settings-tab-${section}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          {sectionLocked && (
            <LockedAdminSection
              title="Раздел ограничен"
              subtitle={requiresAdminMode && !adminMode ? 'Раздел есть в структуре, но сейчас закрыт за админ-режимом. Это лучше, чем прятать системные настройки так, будто их вовсе не существует.' : 'У вас нет прав на этот раздел.'}
              canActivateAdminMode={requiresAdminMode && canUseAdminMode}
            />
          )}
          {!sectionLocked && section === 'organization' && <OrgSection />}
          {!sectionLocked && section === 'team'         && <TeamSection />}
          {!sectionLocked && section === 'pipelines'    && <PipelinesSection />}
          {!sectionLocked && section === 'appearance'   && <AppearanceSection />}
          {!sectionLocked && section === 'api'          && <ApiSection />}
          {!sectionLocked && section === 'mode' && (
            <PlannedSection
              title="Админ-режим"
              subtitle="Owner/admin surface для чувствительных сценариев и расширенного управления."
              icon={<Shield size={18} />}
              bullets={[
                'дельта между рабочим и административным режимом без дубляжа экранов',
                'capability-aware секции и действия с server-friendly contract',
                'явные risk states для действий, которые влияют на организацию целиком',
              ]}
              footnote="Следующий шаг - соединить adminMode с более плотным capability layer, а не превращать всё в хаос из случайных if в JSX."
              action={canUseAdminMode && !adminMode ? <Button size="sm" onClick={() => useUIStore.getState().setAdminMode(true)}>Включить режим администратора</Button> : undefined}
            />
          )}
          {!sectionLocked && section === 'integrations' && (
            <PlannedSection
              title="Интеграции"
              subtitle="Подключение внешних сервисов и каналов без мусора в основном интерфейсе."
              icon={<Globe size={18} />}
              bullets={[
                'каталог подключений: телефония, мессенджеры, аналитика, ERP',
                'health/status по каждому коннектору и последней синхронизации',
                'зоны для ключей, webhooks и ошибок авторизации отдельно от everyday settings',
              ]}
              footnote="Раздел оставлен в IA намеренно: команда видит, что интеграции - это системная зона, а не потерянная кнопка где-то в меню."
            />
          )}
          {!sectionLocked && section === 'webhooks' && (
            <PlannedSection
              title="Webhooks"
              subtitle="Технический контур автоматизаций и доставки событий."
              icon={<Zap size={18} />}
              bullets={[
                'endpoint list с режимами active / paused / failed',
                'подписи запросов, retry policy и sample payload',
                'история последних delivery attempts без прыжков в аудит',
              ]}
              footnote="Когда backend-контракты будут окончательно закреплены, этот раздел должен стать рабочим инструментом, а не декоративной админкой."
            />
          )}
          {!sectionLocked && section === 'templates' && (
            <PlannedSection
              title="Шаблоны сообщений"
              subtitle="Повторно используемые тексты для команды, продаж и follow-up."
              icon={<MessageSquare size={18} />}
              bullets={[
                'шаблоны по сценариям: welcome, follow-up, повторный контакт, закрытие сделки',
                'переменные клиента и сделки с предпросмотром перед отправкой',
                'роль и канал доставки как часть шаблона, а не отдельный хаос настроек',
              ]}
              footnote="Здесь логика должна помогать команде работать быстрее, а не плодить ещё одну свалку фраз ради галочки."
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
