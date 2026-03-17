import type { LucideIcon } from 'lucide-react';
import { Briefcase, CheckSquare, DatabaseZap, FolderInput, Users, Factory } from 'lucide-react';
import type { WorkspaceSnapshot, WorkspaceWidgetKind } from './model/types';

// Tile previews
import { LeadsTilePreview }  from './widgets/customers/LeadsTilePreview';
import { DealsTilePreview }   from './widgets/deals/DealsTilePreview';
import { TasksTilePreview }   from './widgets/tasks/TasksTilePreview';
import { ReportsTilePreview } from './widgets/reports/ReportsTilePreview';
import { ImportsTilePreview } from './widgets/imports/ImportsTilePreview';
import { ChapanTilePreview }  from './widgets/chapan/ChapanTilePreview';

// Full SPA environments
import { LeadsSPA }   from '../leads-spa';
import { DealsSPA }   from '../deals-spa';
import { TasksSPA }   from './widgets/tasks/spa/TasksSPA';
import { ReportsSPA } from './widgets/reports/spa/ReportsSPA';
import { ImportsSPA } from './widgets/imports/spa/ImportsSPA';
import { ChapanSPA }  from './widgets/chapan/spa/ChapanSPA';

export interface WorkspaceWidgetDefinition {
  kind: WorkspaceWidgetKind;
  title: string;
  description: string;
  icon: LucideIcon;
  renderPreview: (snapshot?: WorkspaceSnapshot, version?: number, tileId?: string) => JSX.Element;
  renderSPA:     (snapshot?: WorkspaceSnapshot, version?: number, tileId?: string) => JSX.Element;
}

export const WORKSPACE_WIDGETS: WorkspaceWidgetDefinition[] = [
  {
    kind: 'customers',
    title: 'Лиды',
    description: 'CRM воронка: квалификация, передача и закрытие лидов.',
    icon: Users,
    renderPreview: (_s, v, tid) => <LeadsTilePreview key={v} tileId={tid ?? 'default'} />,
    renderSPA:     (_s, v, tid) => <LeadsSPA key={v} tileId={tid ?? 'default'} />,
  },
  {
    kind: 'deals',
    title: 'Сделки',
    description: 'Воронка сделок: встречи, КП, договоры, оплаты.',
    icon: Briefcase,
    renderPreview: (_s, v, tid) => <DealsTilePreview key={v} tileId={tid ?? 'default'} />,
    renderSPA:     (_s, v, tid) => <DealsSPA key={v} tileId={tid ?? 'default'} />,
  },
  {
    kind: 'tasks',
    title: 'Задачи',
    description: 'Локальный центр контроля задач. Можно создать сколько угодно копий.',
    icon: CheckSquare,
    renderPreview: (s, v, tid) => <TasksTilePreview key={v} snapshot={s} tileId={tid ?? 'default'} />,
    renderSPA:     (_s, v, tid) => <TasksSPA key={v} tileId={tid ?? 'default'} />,
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
    description: 'Центр загрузки, маппинга и синхронизации данных.',
    icon: FolderInput,
    renderPreview: (_s, v) => <ImportsTilePreview key={v} />,
    renderSPA:     (_s, v, tid) => <ImportsSPA key={v} tileId={tid ?? 'default'} />,
  },
  {
    kind: 'chapan',
    title: 'Чапан',
    description: 'Workzone цеха Чапан — производство, заказы и контроль.',
    icon: Factory,
    renderPreview: (_s, v) => <ChapanTilePreview key={v} />,
    renderSPA:     (_s, v, tid) => <ChapanSPA key={v} tileId={tid ?? 'default'} />,
  },
];

export const WORKSPACE_WIDGET_MAP = Object.fromEntries(
  WORKSPACE_WIDGETS.map((w) => [w.kind, w]),
) as Record<WorkspaceWidgetKind, WorkspaceWidgetDefinition>;
