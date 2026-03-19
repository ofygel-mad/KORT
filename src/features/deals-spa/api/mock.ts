/**
 * features/deals-spa/api/mock.ts
 * Mock data seeded from the closer-pipeline leads.
 * Replace each function body with fetch() to connect real backend.
 */
import { nanoid } from 'nanoid';
import type { Deal, DealStage, DealActivity, DealTask, ActivityType } from './types';
import { STAGE_PROBABILITY } from './types';

const delay = (ms = 100) => new Promise(r => setTimeout(r, ms));

// ── Helpers ──────────────────────────────────────────────────

function makeActivity(type: ActivityType, content: string, author: string, daysAgo: number): DealActivity {
  return {
    id: nanoid(),
    type,
    content,
    author,
    createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  };
}

function makeDeal(partial: Partial<Deal> & Pick<Deal, 'id' | 'leadId' | 'fullName' | 'phone' | 'source' | 'stage' | 'value' | 'assignedName'>): Deal {
  const stage = partial.stage;
  return {
    currency: 'KZT',
    probability: STAGE_PROBABILITY[stage],
    title: `Недвижимость — ${partial.fullName.split(' ')[0]}`,
    email: undefined,
    companyName: undefined,
    qualifierName: 'Акбар А.',
    stageEnteredAt: new Date(Date.now() - Math.random() * 5 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    tasks: [],
    checklistDone: [],
    activities: [],
    ...partial,
  };
}

// ── Seed data ────────────────────────────────────────────────

const _deals: Deal[] = [
  makeDeal({
    id: 'd1', leadId: 'l6',
    fullName: 'Нурлан Касымов', phone: '+77056667788',
    source: 'instagram', stage: 'awaiting_meeting',
    value: 800000, assignedName: 'Сауле М.',
    meetingAt: new Date(Date.now() + 86400000).toISOString(),
    expectedCloseAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    activities: [
      makeActivity('system', 'Лид передан из воронки квалификации', 'Система', 3),
      makeActivity('call', 'Первый контакт. Клиент подтвердил интерес. Встреча назначена на завтра.', 'Сауле М.', 2),
    ],
    tasks: [
      { id: 't1', title: 'Подготовить презентацию объектов', dueAt: new Date(Date.now() + 86400000).toISOString(), done: false, priority: 'high', createdAt: new Date().toISOString() },
    ],
  }),

  makeDeal({
    id: 'd2', leadId: 'l8',
    fullName: 'Тимур Смагулов', phone: '+77078889900',
    source: 'referral', stage: 'meeting_done',
    value: 650000, assignedName: 'Алибек Н.',
    probability: 45,
    expectedCloseAt: new Date(Date.now() + 10 * 86400000).toISOString(),
    activities: [
      makeActivity('system', 'Лид передан из воронки квалификации', 'Система', 5),
      makeActivity('meeting', 'Встреча прошла успешно. Обсудили 2 варианта квартир. Клиент берёт паузу на 2 дня.', 'Алибек Н.', 3),
      makeActivity('note', 'Интересует ЖК "Астана" или "Нурсат". Бюджет жёсткий — не выше 650к.', 'Алибек Н.', 3),
    ],
    tasks: [
      { id: 't2', title: 'Отправить подборку вариантов по email', dueAt: new Date(Date.now() + 1 * 86400000).toISOString(), done: true, priority: 'medium', createdAt: new Date().toISOString() },
      { id: 't3', title: 'Перезвонить через 2 дня', dueAt: new Date(Date.now() + 2 * 86400000).toISOString(), done: false, priority: 'high', createdAt: new Date().toISOString() },
    ],
  }),

  makeDeal({
    id: 'd3', leadId: 'l7',
    fullName: 'Гульнара Бекова', phone: '+77067778899',
    source: 'ad', stage: 'contract',
    value: 1200000, assignedName: 'Сауле М.',
    probability: 80,
    expectedCloseAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    checklistDone: ['kp_sent', 'kp_agreed', 'req_rcvd'],
    activities: [
      makeActivity('system', 'Лид передан из воронки квалификации', 'Система', 10),
      makeActivity('meeting', 'Встреча. Клиент согласен на квартиру 3к в ЖК "Байтерек". Нужен договор.', 'Сауле М.', 8),
      makeActivity('email', 'КП отправлено на гульнара@email.kz', 'Сауле М.', 7),
      makeActivity('call', 'КП согласовано. Попросила прислать реквизиты.', 'Сауле М.', 5),
      makeActivity('note', 'Реквизиты получены. Договор готовится.', 'Сауле М.', 2),
    ],
    tasks: [
      { id: 't4', title: 'Отправить финальный договор на подпись', dueAt: new Date(Date.now() + 1 * 86400000).toISOString(), done: false, priority: 'high', createdAt: new Date().toISOString() },
    ],
  }),

  makeDeal({
    id: 'd4', leadId: 'l9-seed',
    fullName: 'Дамир Ахметов', phone: '+77011223344',
    source: 'site', stage: 'proposal',
    value: 950000, assignedName: 'Алибек Н.',
    probability: 55,
    expectedCloseAt: new Date(Date.now() + 8 * 86400000).toISOString(),
    stageEnteredAt: new Date(Date.now() - 6 * 86400000).toISOString(), // stale — 6 days in stage
    updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    activities: [
      makeActivity('meeting', 'Встреча. Клиент рассматривает 2-комнатную, бюджет 950к.', 'Алибек Н.', 8),
      makeActivity('note', 'Запросил КП с тремя вариантами в разных ЖК.', 'Алибек Н.', 6),
    ],
    tasks: [
      { id: 't5', title: 'Подготовить КП с 3 вариантами', dueAt: new Date(Date.now() - 2 * 86400000).toISOString(), done: false, priority: 'high', createdAt: new Date().toISOString() },
    ],
  }),

  makeDeal({
    id: 'd5', leadId: 'l10-seed',
    fullName: 'Жанна Сейткали', phone: '+77022334455',
    source: 'referral', stage: 'awaiting_payment',
    value: 1500000, assignedName: 'Сауле М.',
    probability: 92,
    expectedCloseAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    checklistDone: ['kp_sent', 'kp_agreed', 'req_rcvd', 'contract_signed'],
    activities: [
      makeActivity('meeting', 'Договор подписан. Ждём оплату.', 'Сауле М.', 2),
      makeActivity('call', 'Подтвердила перевод в течение 3 дней.', 'Сауле М.', 1),
    ],
    tasks: [
      { id: 't6', title: 'Выставить счёт на оплату', dueAt: new Date(Date.now() + 1 * 86400000).toISOString(), done: false, priority: 'high', createdAt: new Date().toISOString() },
    ],
  }),
];

// ── API shims ────────────────────────────────────────────────

export const dealsApi = {
  getDeals: async (): Promise<Deal[]> => {
    await delay();
    return _deals.map(d => ({ ...d, activities: [...d.activities], tasks: [...d.tasks] }));
  },

  createDeal: async (data: Partial<Deal>): Promise<Deal> => {
    await delay(80);
    const deal: Deal = {
      id: nanoid(),
      leadId: data.leadId ?? nanoid(),
      fullName: data.fullName ?? 'Новая сделка',
      phone: data.phone ?? '',
      source: data.source ?? 'site',
      title: data.title ?? `Сделка — ${data.fullName ?? 'Новая'}`,
      stage: 'awaiting_meeting',
      value: data.value ?? 0,
      probability: STAGE_PROBABILITY['awaiting_meeting'],
      currency: 'KZT',
      assignedName: data.assignedName,
      qualifierName: data.qualifierName,
      meetingAt: data.meetingAt,
      expectedCloseAt: data.expectedCloseAt,
      email: data.email,
      companyName: data.companyName,
      stageEnteredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activities: [{
        id: nanoid(), type: 'system',
        content: 'Сделка создана из воронки лидов',
        author: 'Система',
        createdAt: new Date().toISOString(),
      }],
      tasks: [],
      checklistDone: [],
      ...data,
    };
    _deals.unshift(deal);
    return { ...deal };
  },

  updateDeal: async (id: string, patch: Partial<Deal>): Promise<Deal> => {
    await delay(60);
    const idx = _deals.findIndex(d => d.id === id);
    if (idx === -1) throw new Error(`Deal ${id} not found`);
    Object.assign(_deals[idx], patch, { updatedAt: new Date().toISOString() });
    return { ..._deals[idx] };
  },

  moveStage: async (id: string, stage: DealStage): Promise<void> => {
    await delay(60);
    const deal = _deals.find(d => d.id === id);
    if (deal) {
      deal.stage = stage;
      deal.stageEnteredAt = new Date().toISOString();
      deal.updatedAt = new Date().toISOString();
      if (stage === 'won')  { deal.wonAt  = new Date().toISOString(); deal.probability = 100; }
      if (stage === 'lost') { deal.lostAt = new Date().toISOString(); deal.probability = 0; }
    }
  },

  addActivity: async (dealId: string, activity: Omit<DealActivity, 'id'>): Promise<DealActivity> => {
    await delay(50);
    const entry: DealActivity = { id: nanoid(), ...activity };
    const deal = _deals.find(d => d.id === dealId);
    if (deal) { deal.activities.push(entry); deal.updatedAt = new Date().toISOString(); }
    return entry;
  },

  addTask: async (dealId: string, task: Omit<DealTask, 'id' | 'createdAt'>): Promise<DealTask> => {
    await delay(50);
    const t: DealTask = { id: nanoid(), createdAt: new Date().toISOString(), ...task };
    const deal = _deals.find(d => d.id === dealId);
    if (deal) deal.tasks.push(t);
    return t;
  },

  toggleTask: async (dealId: string, taskId: string, done: boolean): Promise<void> => {
    await delay(40);
    const deal = _deals.find(d => d.id === dealId);
    const task = deal?.tasks.find(t => t.id === taskId);
    if (task) { task.done = done; }
    if (deal) deal.updatedAt = new Date().toISOString();
  },

  toggleChecklist: async (dealId: string, itemId: string, done: boolean): Promise<void> => {
    await delay(40);
    const deal = _deals.find(d => d.id === dealId);
    if (!deal) return;
    deal.checklistDone = deal.checklistDone ?? [];
    if (done) { if (!deal.checklistDone.includes(itemId)) deal.checklistDone.push(itemId); }
    else { deal.checklistDone = deal.checklistDone.filter(i => i !== itemId); }
  },

  deleteDeal: async (id: string): Promise<void> => {
    await delay(60);
    const idx = _deals.findIndex(d => d.id === id);
    if (idx !== -1) _deals.splice(idx, 1);
  },
};
