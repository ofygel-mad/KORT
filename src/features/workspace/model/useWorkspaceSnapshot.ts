import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import type { WorkspaceSnapshot } from './types';

interface DashboardData {
  customers_count: number;
  active_deals_count: number;
  revenue_month: number;
  tasks_today: number;
  recent_customers: Array<{
    id: string;
    full_name: string;
    company_name: string;
    status: string;
  }>;
  stalled_deals: Array<{
    id: string;
    title: string;
    amount: number;
    stage: string;
    customer_name: string;
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

export function useWorkspaceSnapshot() {
  return useQuery<WorkspaceSnapshot>({
    queryKey: ['workspace-snapshot'],
    queryFn: async () => {
      const data = await api.get<DashboardData>('/reports/dashboard');
      return {
        customersCount: data.customers_count ?? 0,
        dealsCount: data.active_deals_count ?? 0,
        tasksCount: data.tasks_today ?? 0,
        revenueMonth: data.revenue_month ?? 0,
        recentCustomers: (data.recent_customers ?? []).slice(0, 5).map((item) => ({
          id: item.id,
          fullName: item.full_name,
          companyName: item.company_name,
          status: item.status,
        })),
        stalledDeals: (data.stalled_deals ?? []).slice(0, 5).map((item) => ({
          id: item.id,
          title: item.title,
          customerName: item.customer_name,
          stage: item.stage,
          amount: item.amount,
          daysSilent: item.days_silent,
        })),
        todayTasks: (data.today_tasks ?? []).slice(0, 5).map((item) => ({
          id: item.id,
          title: item.title,
          priority: item.priority,
          customerName: item.customer?.full_name ?? null,
          dueAt: item.due_at,
        })),
      };
    },
  });
}
