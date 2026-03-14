import type { LucideIcon } from 'lucide-react';
import { Briefcase, CheckSquare, DatabaseZap, FolderInput, Users, PenLine } from 'lucide-react';
import type { WorkspaceSnapshot, WorkspaceWidgetKind } from './model/types';

// Tile previews
import { LeadsTilePreview }  from './widgets/customers/LeadsTilePreview';
import { DealsTilePreview }   from './widgets/deals/DealsTilePreview';
import { TasksTilePreview }   from './widgets/tasks/TasksTilePreview';
import { ReportsTilePreview } from './widgets/reports/ReportsTilePreview';
import { ImportsTilePreview } from './widgets/imports/ImportsTilePreview';
import { DraftTilePreview }   from './widgets/draft/DraftTilePreview';

// Full SPA environments
import { LeadsSPA }   from '../leads-spa';
import { DealsSPA }   from '../deals-spa';      // ← new independent SPA
import { TasksSPA }   from './widgets/tasks/spa/TasksSPA';
import { ReportsSPA } from './widgets/reports/spa/ReportsSPA';
import { ImportsSPA } from './widgets/imports/spa/ImportsSPA';
import { DraftSPA }   from './widgets/draft/spa/DraftSPA';

export interface WorkspaceWidgetDefinition {
  kind: WorkspaceWidgetKind;
  title: string;
  description: string;
  icon: LucideIcon;
  renderPreview: (snapshot?: WorkspaceSnapshot, version?: number) => JSX.Element;
  renderSPA:     (snapshot?: WorkspaceSnapshot, version?: number) => JSX.Element;
}

export const WORKSPACE_WIDGETS: WorkspaceWidgetDefinition[] = [
  {
    kind: 'customers',
    title: 'Лиды',
    description: 'CRM воронка: квалификация, передача и закрытие лидов.',
    icon: Users,
    renderPreview: (_s, v) => <LeadsTilePreview key={v} />,
    renderSPA:     (_s, v) => <LeadsSPA key={v} />,
  },
  {
    kind: 'deals',
    title: 'Сделки',
    description: 'Воронка сделок: встречи, КП, договоры, оплаты.',
    icon: Briefcase,
    renderPreview: (_s, v) => <DealsTilePreview key={v} />,
    renderSPA:     (_s, v) => <DealsSPA key={v} />,
  },
  {
    kind: 'tasks',
    title: 'Задачи',
    description: 'Локальный центр контроля задач. Можно создать сколько угодно копий.',
    icon: CheckSquare,
    renderPreview: (s, v) => <TasksTilePreview key={v} snapshot={s} />,
    renderSPA:     (s, v) => <TasksSPA key={v} snapshot={s} />,
  },
  {
    kind: 'reports',
    title: 'Сводка',
    description: 'Компактная метрика для тех, кому нужно видеть только нерв системы.',
    icon: DatabaseZap,
    renderPreview: (s, v) => <ReportsTilePreview key={v} snapshot={s} />,
    renderSPA:     (s, v) => <ReportsSPA key={v} snapshot={s} />,
  },
  {
    kind: 'imports',
    title: 'Импорт',
    description: 'Быстрый вход в поток загрузки и синхронизации данных.',
    icon: FolderInput,
    renderPreview: (_s, v) => <ImportsTilePreview key={v} />,
    renderSPA:     (_s, v) => <ImportsSPA key={v} />,
  },
  {
    kind: 'draft',
    title: 'Черновик',
    description: 'Свободное пространство — собери нужные тебе инструменты и блоки.',
    icon: PenLine,
    renderPreview: (_s, v) => <DraftTilePreview key={v} />,
    renderSPA:     (_s, v) => <DraftSPA key={v} />,
  },
];

export const WORKSPACE_WIDGET_MAP = Object.fromEntries(
  WORKSPACE_WIDGETS.map((w) => [w.kind, w]),
) as Record<WorkspaceWidgetKind, WorkspaceWidgetDefinition>;


export interface WorkspaceWidgetDefinition {
  kind: WorkspaceWidgetKind;
  title: string;
  description: string;
  icon: LucideIcon;
  renderPreview: (snapshot?: WorkspaceSnapshot, version?: number) => JSX.Element;
  renderSPA:     (snapshot?: WorkspaceSnapshot, version?: number) => JSX.Element;
}

export const WORKSPACE_WIDGETS: WorkspaceWidgetDefinition[] = [
  {
    kind: 'customers',
    title: 'Лиды',
    description: 'CRM воронка: квалификация, передача и закрытие лидов.',
    icon: Users,
    renderPreview: (_s, v) => <LeadsTilePreview key={v} />,
    renderSPA:     (_s, v) => <LeadsSPA key={v} />,
  },
  {
    kind: 'deals',
    title: 'Сделки',
    description: 'Стадии и зависшие сделки внутри отдельной рабочей плитки.',
    icon: Briefcase,
    renderPreview: (s, v) => <DealsTilePreview key={v} snapshot={s} />,
    renderSPA:     (s, v) => <DealsSPA key={v} snapshot={s} />,
  },
  {
    kind: 'tasks',
    title: 'Задачи',
    description: 'Локальный центр контроля задач. Можно создать сколько угодно копий.',
    icon: CheckSquare,
    renderPreview: (s, v) => <TasksTilePreview key={v} snapshot={s} />,
    renderSPA:     (s, v) => <TasksSPA key={v} snapshot={s} />,
  },
  {
    kind: 'reports',
    title: 'Сводка',
    description: 'Компактная метрика для тех, кому нужно видеть только нерв системы.',
    icon: DatabaseZap,
    renderPreview: (s, v) => <ReportsTilePreview key={v} snapshot={s} />,
    renderSPA:     (s, v) => <ReportsSPA key={v} snapshot={s} />,
  },
  {
    kind: 'imports',
    title: 'Импорт',
    description: 'Быстрый вход в поток загрузки и синхронизации данных.',
    icon: FolderInput,
    renderPreview: (_s, v) => <ImportsTilePreview key={v} />,
    renderSPA:     (_s, v) => <ImportsSPA key={v} />,
  },
  {
    kind: 'draft',
    title: 'Черновик',
    description: 'Свободное пространство — собери нужные тебе инструменты и блоки.',
    icon: PenLine,
    renderPreview: (_s, v) => <DraftTilePreview key={v} />,
    renderSPA:     (_s, v) => <DraftSPA key={v} />,
  },
];

export const WORKSPACE_WIDGET_MAP = Object.fromEntries(
  WORKSPACE_WIDGETS.map((w) => [w.kind, w]),
) as Record<WorkspaceWidgetKind, WorkspaceWidgetDefinition>;
