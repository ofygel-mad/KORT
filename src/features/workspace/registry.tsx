import type { LucideIcon } from 'lucide-react';
import { Briefcase, CheckSquare, DatabaseZap, FolderInput, Users } from 'lucide-react';
import type { WorkspaceSnapshot, WorkspaceWidgetKind } from './model/types';
import { CustomersTilePreview } from './widgets/customers/CustomersTilePreview';
import { DealsTilePreview } from './widgets/deals/DealsTilePreview';
import { TasksTilePreview } from './widgets/tasks/TasksTilePreview';
import { ReportsTilePreview } from './widgets/reports/ReportsTilePreview';
import { ImportsTilePreview } from './widgets/imports/ImportsTilePreview';

export interface WorkspaceWidgetDefinition {
  kind: WorkspaceWidgetKind;
  title: string;
  description: string;
  route: string;
  icon: LucideIcon;
  render: (snapshot?: WorkspaceSnapshot, version?: number) => JSX.Element;
}

export const WORKSPACE_WIDGETS: WorkspaceWidgetDefinition[] = [
  {
    kind: 'customers',
    title: 'Клиенты',
    description: 'Превью базы клиентов с быстрым доступом к последним записям.',
    route: '/customers',
    icon: Users,
    render: (snapshot, version) => <CustomersTilePreview key={version} snapshot={snapshot} />,
  },
  {
    kind: 'deals',
    title: 'Сделки',
    description: 'Стадии и зависшие сделки внутри отдельной рабочей плитки.',
    route: '/deals',
    icon: Briefcase,
    render: (snapshot, version) => <DealsTilePreview key={version} snapshot={snapshot} />,
  },
  {
    kind: 'tasks',
    title: 'Задачи',
    description: 'Локальный центр контроля задач. Можно создать сколько угодно копий.',
    route: '/tasks',
    icon: CheckSquare,
    render: (snapshot, version) => <TasksTilePreview key={version} snapshot={snapshot} />,
  },
  {
    kind: 'reports',
    title: 'Сводка',
    description: 'Компактная метрика для тех, кому нужно видеть только нерв системы.',
    route: '/reports',
    icon: DatabaseZap,
    render: (snapshot, version) => <ReportsTilePreview key={version} snapshot={snapshot} />,
  },
  {
    kind: 'imports',
    title: 'Импорт',
    description: 'Быстрый вход в поток загрузки и синхронизации данных.',
    route: '/imports',
    icon: FolderInput,
    render: (_snapshot, version) => <ImportsTilePreview key={version} />,
  },
];

export const WORKSPACE_WIDGET_MAP = Object.fromEntries(
  WORKSPACE_WIDGETS.map((widget) => [widget.kind, widget]),
) as Record<WorkspaceWidgetKind, WorkspaceWidgetDefinition>;
