/**
 * Mock API — перехватчик запросов для работы без бэкенда.
 * Подключается автоматически когда VITE_MOCK_API=true в .env.local
 */
import type { AxiosInstance } from 'axios';
import {
  MOCK_AUTH_RESPONSE,
  MOCK_CUSTOMERS,
  MOCK_DASHBOARD,
  MOCK_DEALS,
  MOCK_PIPELINE,
  MOCK_TASKS,
  MOCK_TEAM,
} from './mock-data';

let mockSessionOrg = { ...MOCK_AUTH_RESPONSE.org };
let mockCustomers = [...MOCK_CUSTOMERS];
let mockDeals = [...MOCK_DEALS];
let mockTasks = [...MOCK_TASKS];

function delay(ms = 180) {
  return new Promise(r => setTimeout(r, ms));
}

function paginate<T>(items: T[], params?: Record<string, string>) {
  return { count: items.length, results: items };
}

export function installMockAdapter(client: AxiosInstance) {
  client.interceptors.request.use(async (config) => {
    await delay();

    const url = (config.url ?? '').replace(/^\/api\/v1/, '');
    const method = (config.method ?? 'get').toLowerCase();
    const params = config.params ?? {};

    let responseData: unknown = null;

    // ── AUTH ───────────────────────────────────────────────────────────────
    if (url.startsWith('/auth/')) {
      responseData = { ...MOCK_AUTH_RESPONSE, org: mockSessionOrg, onboarding_completed: mockSessionOrg.onboarding_completed };
    }

    // ── BOOTSTRAP / PROFILE ───────────────────────────────────────────────
    else if (url === '/bootstrap/' || url === '/me/') {
      responseData = { ...MOCK_AUTH_RESPONSE, org: mockSessionOrg, onboarding_completed: mockSessionOrg.onboarding_completed };
    }

    // ── DASHBOARD ─────────────────────────────────────────────────────────
    else if (url === '/reports/dashboard' || url === '/reports/dashboard/') {
      responseData = MOCK_DASHBOARD;
    }

    // ── CUSTOMERS ─────────────────────────────────────────────────────────
    else if (url === '/customers/' || url === '/customers') {
      if (method === 'get') {
        let list = [...mockCustomers];
        if (params.search) {
          const q = (params.search as string).toLowerCase();
          list = list.filter(c =>
            c.full_name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            c.email.toLowerCase().includes(q),
          );
        }
        if (params.status) list = list.filter(c => c.status === params.status);
        responseData = paginate(list, params);
      } else {
        // POST — create
        const newC = { id: `c-${Date.now()}`, ...JSON.parse(config.data ?? '{}'), status: 'new', created_at: new Date().toISOString(), health: { score: 50, band: 'at_risk' }, notes: '', tags: [] };
        mockCustomers = [newC, ...mockCustomers];
        responseData = newC;
      }
    }
    else if (url.match(/\/customers\/[^/]+\//) && !url.includes('bulk')) {
      const id = url.split('/')[2];
      if (method === 'patch' || method === 'put') {
        const payload = JSON.parse(config.data ?? '{}');
        mockCustomers = mockCustomers.map(c => c.id === id ? { ...c, ...payload } : c);
      }
      responseData = mockCustomers.find(c => c.id === id) ?? mockCustomers[0];
    }
    else if (url.includes('/customers/bulk/')) {
      responseData = { affected: 1 };
    }

    // ── DEALS ─────────────────────────────────────────────────────────────
    else if (url === '/deals/board/' || url === '/deals/board') {
      responseData = {
        pipeline: {
          id: MOCK_PIPELINE.id,
          name: MOCK_PIPELINE.name,
          stages: MOCK_PIPELINE.stages.map((stage, index) => ({
            id: stage.id,
            name: stage.name,
            order: stage.position,
            type: index === MOCK_PIPELINE.stages.length - 1 ? 'won' : 'open',
            color: ['#4F8CFF', '#7C3AED', '#D97706', '#16A34A'][index] ?? '#6B7280',
          })),
        },
        deals: mockDeals.map((deal) => ({
          ...deal,
          stage: {
            id: deal.stage_id,
            name: deal.stage,
            order: 1,
            type: 'open',
            color: '#6B7280',
          },
          owner: MOCK_AUTH_RESPONSE.user,
          pipeline: { id: MOCK_PIPELINE.id, name: MOCK_PIPELINE.name, stages: [] },
        })),
        total_open: mockDeals.filter((deal) => deal.status === 'open').length,
        total_amount: mockDeals.reduce((sum, deal) => sum + (deal.amount ?? 0), 0),
      };
    }
    else if (url === '/deals/' || url === '/deals') {
      if (method === 'get') {
        responseData = paginate(mockDeals, params);
      } else {
        const payload = JSON.parse(config.data ?? '{}');
        const stage = MOCK_PIPELINE.stages.find((item) => item.id === payload.stage_id);
        const customer = mockCustomers.find((item) => item.id === payload.customer_id);
        const created = { id: `d-${Date.now()}`, ...payload, stage: stage?.name ?? 'Квалификация', customer, customer_name: customer?.full_name ?? '', status: 'open', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), days_silent: 0, pipeline_id: MOCK_PIPELINE.id };
        mockDeals = [created, ...mockDeals];
        responseData = created;
      }
    }
    else if (url.match(/\/deals\/[^/]+\//)) {
      const id = url.split('/')[2];
      if (method === 'patch' || method === 'put') {
        const payload = JSON.parse(config.data ?? '{}');
        mockDeals = mockDeals.map(d => d.id === id ? { ...d, ...payload, updated_at: new Date().toISOString() } : d);
      }
      responseData = mockDeals.find(d => d.id === id) ?? mockDeals[0];
    }

    // ── PIPELINES ─────────────────────────────────────────────────────────
    else if (url.includes('/pipelines')) {
      responseData = { count: 1, results: [MOCK_PIPELINE] };
    }

    // ── TASKS ─────────────────────────────────────────────────────────────
    else if (url === '/tasks/' || url === '/tasks') {
      if (method === 'get') {
        responseData = paginate(mockTasks, params);
      } else {
        const created = { id: `t-${Date.now()}`, ...JSON.parse(config.data ?? '{}'), status: 'pending', created_at: new Date().toISOString() };
        mockTasks = [created, ...mockTasks];
        responseData = created;
      }
    }

    // ── USERS / TEAM ───────────────────────────────────────────────────────
    else if (url.includes('/users/team')) {
      responseData = paginate(MOCK_TEAM, params);
    }
    else if (url.includes('/users/me')) {
      responseData = MOCK_AUTH_RESPONSE.user;
    }

    // ── ORGANIZATIONS ─────────────────────────────────────────────────────
    else if (url.includes('/organizations') || url.includes('/org')) {
      if (method === 'patch' || method === 'put') {
        const payload = JSON.parse(config.data ?? '{}');
        mockSessionOrg = { ...mockSessionOrg, ...payload };
      }
      responseData = mockSessionOrg;
    }

    // ── REPORTS ───────────────────────────────────────────────────────────
    else if (url.includes('/reports')) {
      responseData = {
        revenue_by_month: [
          { month: 'Янв', amount: 2100000 }, { month: 'Фев', amount: 1800000 },
          { month: 'Мар', amount: 3200000 }, { month: 'Апр', amount: 2700000 },
          { month: 'Май', amount: 4100000 }, { month: 'Июн', amount: 3600000 },
        ],
        deals_by_stage: [
          { stage: 'Квалификация', count: 8 }, { stage: 'Переговоры', count: 5 },
          { stage: 'КП', count: 3 }, { stage: 'Закрыто', count: 12 },
        ],
        conversion_rate: 34,
        avg_deal_size: 1450000,
      };
    }

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────
    else if (url.includes('/notifications')) {
      responseData = { count: 0, results: [] };
    }

    // ── ACTIVITIES / FEED ─────────────────────────────────────────────────
    else if (url.includes('/activities') || url.includes('/feed')) {
      responseData = { count: 0, results: [] };
    }

    // ── AUTOMATIONS ───────────────────────────────────────────────────────
    else if (url.includes('/automations')) {
      responseData = { count: 0, results: [] };
    }

    // ── AUDIT ─────────────────────────────────────────────────────────────
    else if (url.includes('/audit')) {
      responseData = { count: 0, results: [] };
    }

    // ── SETTINGS / MISC ───────────────────────────────────────────────────
    else if (url.includes('/settings') || url.includes('/exchange-rates') || url.includes('/currency')) {
      responseData = { rates: { USD: 0.00207, EUR: 0.0019 } };
    }

    // ── DEFAULT fallback ──────────────────────────────────────────────────
    else {
      responseData = { count: 0, results: [] };
    }

    // Подменяем запрос на готовый ответ через adapter
    config.adapter = () =>
      Promise.resolve({
        data: responseData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });

    return config;
  });
}
