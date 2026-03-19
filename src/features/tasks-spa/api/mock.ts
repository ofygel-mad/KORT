/**
 * features/tasks-spa/api/mock.ts
 * Mock data + async API shims.
 * Replace each function body with real fetch() to connect backend.
 */
import { nanoid } from 'nanoid';
import type { Task, TaskStatus, TaskPriority, Subtask, TaskActivity } from './types';

const delay = (ms = 80) => new Promise(r => setTimeout(r, ms));

// ─── Seed helpers ─────────────────────────────────────────────

function ago(days: number, hours = 0): string {
  return new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();
}
function later(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function makeActivity(
  type: TaskActivity['type'], content: string, author: string, daysAgo: number
): TaskActivity {
  return { id: nanoid(), type, content, author, createdAt: ago(daysAgo) };
}

// ─── Seed data ────────────────────────────────────────────────

const _tasks: Task[] = [
  {
    id: 't1',
    title: 'Отправить КП Нурлану Касымову',
    taskType: 'manual',
    timerEnabled: false,
    timerWarning: false,
    description: 'Подготовить и отправить коммерческое предложение на 2-комнатную квартиру в ЖК «Алатау».',
    status: 'in_progress',
    priority: 'high',
    tags: ['docs', 'followup'],
    assignedName: 'Сауле М.',
    createdBy: 'Менеджер',
    dueAt: later(1),
    createdAt: ago(2),
    updatedAt: ago(0, 3),
    linkedEntity: { type: 'deal', id: 'd1', title: 'Нурлан Касымов — 800 000 ₸' },
    subtasks: [
      { id: 'st1', title: 'Собрать планировки', done: true, createdAt: ago(2) },
      { id: 'st2', title: 'Рассчитать стоимость', done: true, createdAt: ago(2) },
      { id: 'st3', title: 'Оформить PDF', done: false, createdAt: ago(1) },
    ],
    activities: [
      makeActivity('system', 'Задача создана', 'Система', 2),
      makeActivity('status_change', 'Статус изменён: К выполнению → В работе', 'Сауле М.', 1),
      makeActivity('comment', 'Планировки уже есть в папке «Алатау-2025»', 'Сауле М.', 0),
    ],
  },
  {
    id: 't2',
    title: 'Перезвонить Мадине Нурлановой',
    taskType: 'manual',
    timerEnabled: false,
    timerWarning: false,
    description: 'Клиент просил перезвонить после 14:00. Уточнить актуальность заявки.',
    status: 'todo',
    priority: 'critical',
    tags: ['call', 'urgent'],
    assignedName: 'Акбар А.',
    createdBy: 'Менеджер',
    dueAt: later(0),
    createdAt: ago(1),
    updatedAt: ago(0, 1),
    linkedEntity: { type: 'lead', id: 'l3', title: 'Мадина Нурланова' },
    subtasks: [],
    activities: [
      makeActivity('system', 'Задача создана автоматически из лид-карточки', 'Система', 1),
    ],
  },
  {
    id: 't3',
    title: 'Подписать договор с Гульнарой Бековой',
    taskType: 'manual',
    timerEnabled: false,
    timerWarning: false,
    description: 'Согласовать время встречи, распечатать 2 экземпляра договора.',
    status: 'review',
    priority: 'high',
    tags: ['meeting', 'docs'],
    assignedName: 'Алибек Н.',
    createdBy: 'Сауле М.',
    dueAt: later(2),
    createdAt: ago(3),
    updatedAt: ago(0, 5),
    linkedEntity: { type: 'deal', id: 'd3', title: 'Гульнара Бекова — 1 200 000 ₸' },
    subtasks: [
      { id: 'st4', title: 'Распечатать договор ×2', done: true, createdAt: ago(3) },
      { id: 'st5', title: 'Согласовать время', done: true, createdAt: ago(3) },
      { id: 'st6', title: 'Получить подпись клиента', done: false, createdAt: ago(1) },
    ],
    activities: [
      makeActivity('system', 'Задача создана', 'Система', 3),
      makeActivity('status_change', 'В работе → На проверке', 'Алибек Н.', 1),
      makeActivity('comment', 'Клиент подтвердил среду, 14:00', 'Алибек Н.', 0),
    ],
  },
  {
    id: 't4',
    title: 'Отчёт по сделкам за март',
    taskType: 'manual',
    timerEnabled: false,
    timerWarning: false,
    description: 'Подготовить итоговый отчёт: выигранные, проигранные, в воронке.',
    status: 'todo',
    priority: 'medium',
    tags: ['docs'],
    assignedName: 'Камила Р.',
    createdBy: 'Камила Р.',
    dueAt: later(5),
    createdAt: ago(1),
    updatedAt: ago(1),
    subtasks: [],
    activities: [makeActivity('system', 'Задача создана', 'Система', 1)],
  },
  {
    id: 't5',
    title: 'Провести встречу с Ерланом Жумабековым',
    taskType: 'manual',
    timerEnabled: false,
    timerWarning: false,
    description: 'Показ объекта. Маршрут выслан клиенту в WhatsApp.',
    status: 'done',
    priority: 'high',
    tags: ['meeting'],
    assignedName: 'Акбар А.',
    createdBy: 'Менеджер',
    dueAt: ago(1),
    completedAt: ago(0, 8),
    createdAt: ago(4),
    updatedAt: ago(0, 8),
    linkedEntity: { type: 'lead', id: 'l4', title: 'Ерлан Жумабеков' },
    subtasks: [
      { id: 'st7', title: 'Подтвердить время', done: true, createdAt: ago(4) },
      { id: 'st8', title: 'Подготовить маршрут', done: true, createdAt: ago(3) },
      { id: 'st9', title: 'Провести показ', done: true, createdAt: ago(1) },
    ],
    activities: [
      makeActivity('system', 'Задача создана', 'Система', 4),
      makeActivity('status_change', 'К выполнению → В работе', 'Акбар А.', 3),
      makeActivity('status_change', 'В работе → На проверке', 'Акбар А.', 1),
      makeActivity('status_change', 'На проверке → Выполнено', 'Менеджер', 0),
      makeActivity('comment', 'Клиент доволен, думает. Запросил расчёт ипотеки.', 'Акбар А.', 0),
    ],
  },
  {
    id: 't6',
    title: 'Выставить счёт Тимуру Смагулову',
    taskType: 'manual',
    timerEnabled: false,
    timerWarning: false,
    description: 'После согласования договора — выставить счёт на предоплату 30%.',
    status: 'todo',
    priority: 'high',
    tags: ['payment', 'docs'],
    assignedName: 'Алибек Н.',
    createdBy: 'Сауле М.',
    dueAt: later(3),
    createdAt: ago(2),
    updatedAt: ago(2),
    linkedEntity: { type: 'deal', id: 'd4', title: 'Тимур Смагулов — 650 000 ₸' },
    subtasks: [],
    activities: [makeActivity('system', 'Задача создана', 'Система', 2)],
  },
  {
    id: 't7',
    title: 'Обновить базу объектов',
    taskType: 'manual',
    timerEnabled: false,
    timerWarning: false,
    description: 'Загрузить новые планировки ЖК «Сункар» (фото + характеристики).',
    status: 'in_progress',
    priority: 'low',
    tags: ['docs'],
    assignedName: 'Камила Р.',
    createdBy: 'Камила Р.',
    dueAt: later(7),
    createdAt: ago(5),
    updatedAt: ago(0, 2),
    subtasks: [
      { id: 'st10', title: 'Получить материалы от застройщика', done: true, createdAt: ago(5) },
      { id: 'st11', title: 'Загрузить в CRM', done: false, createdAt: ago(3) },
      { id: 'st12', title: 'Проверить отображение', done: false, createdAt: ago(3) },
    ],
    activities: [
      makeActivity('system', 'Задача создана', 'Система', 5),
      makeActivity('status_change', 'К выполнению → В работе', 'Камила Р.', 2),
    ],
  },
  {
    id: 't8',
    title: 'Follow-up: Алия Тасбулатова после встречи',
    taskType: 'manual',
    timerEnabled: false,
    timerWarning: false,
    description: 'Отправить спасибо за встречу + презентацию объектов на e-mail.',
    status: 'done',
    priority: 'medium',
    tags: ['followup'],
    assignedName: 'Сауле М.',
    createdBy: 'Менеджер',
    dueAt: ago(3),
    completedAt: ago(3, 2),
    createdAt: ago(5),
    updatedAt: ago(3, 2),
    linkedEntity: { type: 'lead', id: 'l5', title: 'Алия Тасбулатова' },
    subtasks: [],
    activities: [
      makeActivity('system', 'Задача создана', 'Система', 5),
      makeActivity('status_change', 'В работе → Выполнено', 'Сауле М.', 3),
    ],
  },
];

// ─── API shims ────────────────────────────────────────────────

export const tasksApi = {
  getTasks: async (): Promise<Task[]> => {
    await delay();
    return _tasks.map(t => ({ ...t, subtasks: [...t.subtasks], activities: [...t.activities] }));
  },

  createTask: async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'activities'>): Promise<Task> => {
    await delay(120);
    const now = new Date().toISOString();
    const task: Task = {
      ...data,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
      activities: [
        { id: nanoid(), type: 'system', content: 'Задача создана', author: 'Система', createdAt: now },
      ],
    };
    _tasks.unshift(task);
    return { ...task };
  },

  updateTask: async (id: string, patch: Partial<Task>): Promise<Task> => {
    await delay(80);
    const idx = _tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error(`Task ${id} not found`);
    _tasks[idx] = { ..._tasks[idx], ...patch, updatedAt: new Date().toISOString() };
    return { ..._tasks[idx] };
  },

  moveStatus: async (id: string, status: TaskStatus): Promise<void> => {
    await delay(80);
    const t = _tasks.find(t => t.id === id);
    if (t) {
      t.status = status;
      t.updatedAt = new Date().toISOString();
      if (status === 'done') t.completedAt = t.updatedAt;
    }
  },

  addSubtask: async (taskId: string, title: string): Promise<Subtask> => {
    await delay(60);
    const sub: Subtask = { id: nanoid(), title, done: false, createdAt: new Date().toISOString() };
    const t = _tasks.find(t => t.id === taskId);
    if (t) t.subtasks.push(sub);
    return sub;
  },

  toggleSubtask: async (taskId: string, subtaskId: string, done: boolean): Promise<void> => {
    await delay(60);
    const t = _tasks.find(t => t.id === taskId);
    const s = t?.subtasks.find(s => s.id === subtaskId);
    if (s) s.done = done;
  },

  addActivity: async (taskId: string, entry: Omit<TaskActivity, 'id'>): Promise<TaskActivity> => {
    await delay(60);
    const act: TaskActivity = { ...entry, id: nanoid() };
    const t = _tasks.find(t => t.id === taskId);
    if (t) t.activities.push(act);
    return act;
  },

  deleteTask: async (id: string): Promise<void> => {
    await delay(80);
    const idx = _tasks.findIndex(t => t.id === id);
    if (idx !== -1) _tasks.splice(idx, 1);
  },
};

export const ASSIGNEES = ['Акбар А.', 'Сауле М.', 'Алибек Н.', 'Камила Р.'];
