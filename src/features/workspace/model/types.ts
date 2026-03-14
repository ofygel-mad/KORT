export type WorkspaceWidgetKind = 'customers' | 'deals' | 'tasks' | 'reports' | 'imports' | 'draft';

export interface WorkspaceViewport {
  x: number;
  y: number;
}

export type WorkspaceModalSize = 'compact' | 'default' | 'wide';

export interface WorkspaceTile {
  id: string;
  kind: WorkspaceWidgetKind;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  modalSize: WorkspaceModalSize;
  version: number;
  createdAt: string;
}

export interface WorkspaceSnapshot {
  customersCount: number;
  dealsCount: number;
  tasksCount: number;
  revenueMonth: number;
  recentCustomers: Array<{
    id: string;
    fullName: string;
    companyName: string;
    status: string;
  }>;
  stalledDeals: Array<{
    id: string;
    title: string;
    customerName: string;
    stage: string;
    amount: number;
    daysSilent: number | null;
  }>;
  todayTasks: Array<{
    id: string;
    title: string;
    priority: string;
    customerName: string | null;
    dueAt: string | null;
  }>;
}
