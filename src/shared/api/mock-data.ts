/**
 * MOCK DATA — используется когда VITE_MOCK_API=true
 * Позволяет запускать фронтенд без бэкенда (npm run dev)
 */

export const MOCK_USER = {
  id: 'u-001',
  full_name: 'Алибек Сейткали',
  email: 'alibek@company.kz',
  phone: '+7 777 000 01 01',
  avatar_url: null,
  status: 'active',
};

export const MOCK_ORG = {
  id: 'org-001',
  name: 'Demo Company',
  slug: 'demo',
  mode: 'advanced' as const,
  currency: 'KZT',
  onboarding_completed: true,
};

export const MOCK_CUSTOMERS = [
  { id: 'c-001', full_name: 'Асем Нурланова', company_name: 'ТОО Альфа', phone: '+7 701 111 11 11', email: 'asem@alfa.kz', status: 'active', source: 'Instagram', created_at: '2025-01-10T10:00:00Z', health: { score: 82, band: 'healthy' } },
  { id: 'c-002', full_name: 'Дастан Жумабеков', company_name: 'АО Бета', phone: '+7 702 222 22 22', email: 'dastan@beta.kz', status: 'new', source: 'Referral', created_at: '2025-01-14T09:00:00Z', health: { score: 55, band: 'at_risk' } },
  { id: 'c-003', full_name: 'Мадина Сарсенова', company_name: '', phone: '+7 705 333 33 33', email: 'madina@gmail.com', status: 'inactive', source: 'Сайт', created_at: '2025-01-08T14:00:00Z', health: { score: 30, band: 'churned' } },
  { id: 'c-004', full_name: 'Ерлан Аубакиров', company_name: 'ТОО Гамма', phone: '+7 707 444 44 44', email: 'erlan@gamma.kz', status: 'active', source: 'Instagram', created_at: '2025-01-12T11:00:00Z', health: { score: 91, band: 'healthy' } },
  { id: 'c-005', full_name: 'Зарина Бекова', company_name: 'ИП Бекова', phone: '+7 708 555 55 55', email: 'zarina@ip.kz', status: 'active', source: 'WhatsApp', created_at: '2025-01-15T08:00:00Z', health: { score: 70, band: 'healthy' } },
];

export const MOCK_DEALS = [
  { id: 'd-001', title: 'Внедрение CRM', amount: 1500000, currency: 'KZT', stage: 'Переговоры', status: 'open', customer: { id: 'c-001', full_name: 'Асем Нурланова' }, customer_id: 'c-001', customer_name: 'Асем Нурланова', pipeline_id: 'p-001', stage_id: 's-002', created_at: '2025-01-10T10:00:00Z', updated_at: '2025-01-18T10:00:00Z', days_silent: 3 },
  { id: 'd-002', title: 'Поставка оборудования', amount: 4200000, currency: 'KZT', stage: 'Коммерческое предложение', status: 'open', customer: { id: 'c-004', full_name: 'Ерлан Аубакиров' }, customer_id: 'c-004', customer_name: 'Ерлан Аубакиров', pipeline_id: 'p-001', stage_id: 's-001', created_at: '2025-01-12T11:00:00Z', updated_at: '2025-01-16T11:00:00Z', days_silent: 12 },
  { id: 'd-003', title: 'Консалтинг Q1', amount: 800000, currency: 'KZT', stage: 'Квалификация', status: 'open', customer: { id: 'c-002', full_name: 'Дастан Жумабеков' }, customer_id: 'c-002', customer_name: 'Дастан Жумабеков', pipeline_id: 'p-001', stage_id: 's-001', created_at: '2025-01-14T09:00:00Z', updated_at: '2025-01-20T09:00:00Z', days_silent: 1 },
];

export const MOCK_TASKS = [
  { id: 't-001', title: 'Позвонить Асем по договору', priority: 'high', status: 'pending', due_at: new Date().toISOString(), customer: { id: 'c-001', full_name: 'Асем Нурланова' }, assignee: MOCK_USER, created_at: '2025-01-15T08:00:00Z' },
  { id: 't-002', title: 'Отправить КП Ерлану', priority: 'medium', status: 'pending', due_at: new Date().toISOString(), customer: { id: 'c-004', full_name: 'Ерлан Аубакиров' }, assignee: MOCK_USER, created_at: '2025-01-15T09:00:00Z' },
  { id: 't-003', title: 'Встреча с командой', priority: 'low', status: 'done', due_at: null, customer: null, assignee: MOCK_USER, created_at: '2025-01-14T10:00:00Z' },
];

export const MOCK_PIPELINE = {
  id: 'p-001',
  name: 'Основная воронка',
  stages: [
    { id: 's-001', name: 'Квалификация', position: 1, deals: ['d-002', 'd-003'] },
    { id: 's-002', name: 'Переговоры', position: 2, deals: ['d-001'] },
    { id: 's-003', name: 'Коммерческое предложение', position: 3, deals: [] },
    { id: 's-004', name: 'Закрыто', position: 4, deals: [] },
  ],
};

export const MOCK_DASHBOARD = {
  customers_count: 5,
  customers_delta: 2,
  active_deals_count: 3,
  revenue_month: 6500000,
  tasks_today: 2,
  overdue_tasks: 1,
  recent_customers: MOCK_CUSTOMERS.slice(0, 4),
  deals_no_activity: 1,
  stalled_deals: [MOCK_DEALS[1]],
  silent_customers: [MOCK_CUSTOMERS[2]],
  today_tasks: MOCK_TASKS.filter(t => t.due_at).slice(0, 2),
};

export const MOCK_TEAM = [
  { id: 'u-001', full_name: 'Алибек Сейткали', email: 'alibek@company.kz', role: 'owner' },
  { id: 'u-002', full_name: 'Айгерим Касымова', email: 'aigeri@company.kz', role: 'manager' },
];

export const MOCK_AUTH_RESPONSE = {
  access: 'mock_access_token_000',
  refresh: 'mock_refresh_token_000',
  user: MOCK_USER,
  org: MOCK_ORG,
  capabilities: ['customers:read', 'customers:write', 'deals:read', 'deals:write', 'tasks:read', 'tasks:write'],
  role: 'owner',
};
