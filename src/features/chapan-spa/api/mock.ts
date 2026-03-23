/**
 * features/chapan-spa/api/mock.ts
 * Mock data + async API shims for the Chapan sewing workshop.
 * Replace each function body with real fetch() to connect backend.
 */
import { nanoid } from 'nanoid';
import type {
  Order, OrderItem, ProductionTask, Payment, Transfer,
  OrderActivity, Client, OrderStatus, PaymentStatus,
  ProductionStatus, OrderPriority, PaymentMethod,
  ClientRequest, WorkzoneProfile,
} from './types';
import {
  PRODUCT_CATALOG,
  FABRIC_CATALOG,
  SIZE_OPTIONS,
  DEFAULT_WORKERS,
} from './types';

const delay = (ms = 80) => new Promise(r => setTimeout(r, ms));

// ─── Helpers ─────────────────────────────────────────────────

function ago(days: number, hours = 0): string {
  return new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();
}
function later(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

let _orderCounter = 8;
function nextOrderNumber(): string {
  const prefix = (_profile?.orderPrefix || 'ЧП').trim().slice(0, 6).toUpperCase();
  return `${prefix}-${String(++_orderCounter).padStart(3, '0')}`;
}

let _requestCounter = 2;
function nextRequestNumber(): string {
  return `RQ-${String(++_requestCounter).padStart(3, '0')}`;
}

function act(
  type: OrderActivity['type'], content: string, author: string, daysAgo: number,
): OrderActivity {
  return { id: nanoid(), type, content, author, createdAt: ago(daysAgo) };
}

// ─── Seed: Clients ───────────────────────────────────────────

const _clients: Client[] = [
  { id: 'c1', fullName: 'Алмас Бекмуратов', phone: '+7 701 111 2233', company: 'ТОО "Алтын Той"', createdAt: ago(60) },
  { id: 'c2', fullName: 'Гульнара Сагиндыкова', phone: '+7 702 444 5566', email: 'gulnara@mail.kz', createdAt: ago(45) },
  { id: 'c3', fullName: 'Ерлан Нурпеисов', phone: '+7 705 777 8899', company: 'ИП Нурпеисов', createdAt: ago(30) },
  { id: 'c4', fullName: 'Айжан Тлеубаева', phone: '+7 707 222 3344', email: 'aizhan.t@gmail.com', createdAt: ago(20) },
  { id: 'c5', fullName: 'Берик Жумабеков', phone: '+7 700 555 6677', createdAt: ago(10) },
  { id: 'c6', fullName: 'Жарасов', phone: '+7 701 999 0011', createdAt: ago(4) },
];

// ─── Seed: Orders ────────────────────────────────────────────

const _orders: Order[] = [
  {
    id: 'o1', orderNumber: 'ЧП-001',
    clientId: 'c1', clientName: 'Алмас Бекмуратов', clientPhone: '+7 701 111 2233',
    status: 'in_production', paymentStatus: 'partial', priority: 'urgent',
    items: [
      { id: 'i1', productName: 'Чапан праздничный', fabric: 'Бархат бордовый', size: 'L', quantity: 2, unitPrice: 85000 },
      { id: 'i2', productName: 'Камзол', fabric: 'Парча золотая', size: 'M', quantity: 1, unitPrice: 45000 },
    ],
    productionTasks: [
      { id: 'pt1', orderId: 'o1', orderNumber: 'ЧП-001', orderItemId: 'i1', productName: 'Чапан праздничный', fabric: 'Бархат бордовый', size: 'L', quantity: 2, status: 'sewing', assignedTo: 'Айгуль М.', startedAt: ago(3), isBlocked: false },
      { id: 'pt2', orderId: 'o1', orderNumber: 'ЧП-001', orderItemId: 'i2', productName: 'Камзол', fabric: 'Парча золотая', size: 'M', quantity: 1, status: 'cutting', assignedTo: 'Жанна К.', startedAt: ago(1), isBlocked: true, blockReason: 'Нет нужной ткани на складе — парча золотая закончилась' },
    ],
    payments: [
      { id: 'pay1', orderId: 'o1', amount: 100000, method: 'cash', paidAt: ago(5), notes: 'Предоплата 50%' },
    ],
    activities: [
      act('system', 'Заказ создан', 'Менеджер', 6),
      act('status_change', 'Новый → Подтверждён', 'Менеджер', 5),
      act('payment', 'Оплата 100 000 ₸ (наличные) — предоплата', 'Менеджер', 5),
      act('status_change', 'Подтверждён → В производстве', 'Менеджер', 4),
      act('production_update', 'Чапан праздничный: Ожидание → Раскрой → Пошив', 'Айгуль М.', 3),
      act('production_update', 'Камзол: Ожидание → Раскрой', 'Жанна К.', 1),
    ],
    totalAmount: 215000, paidAmount: 100000,
    dueDate: later(4),
    createdAt: ago(6), updatedAt: ago(1),
  },
  {
    id: 'o2', orderNumber: 'ЧП-002',
    clientId: 'c2', clientName: 'Гульнара Сагиндыкова', clientPhone: '+7 702 444 5566',
    status: 'ready', paymentStatus: 'paid', priority: 'normal',
    items: [
      { id: 'i3', productName: 'Тон (национальное платье)', fabric: 'Атлас красный', size: 'S', quantity: 1, unitPrice: 65000 },
    ],
    productionTasks: [
      { id: 'pt3', orderId: 'o2', orderNumber: 'ЧП-002', orderItemId: 'i3', productName: 'Тон (национальное платье)', fabric: 'Атлас красный', size: 'S', quantity: 1, status: 'done', assignedTo: 'Бахыт Т.', startedAt: ago(8), completedAt: ago(2), isBlocked: false },
    ],
    payments: [
      { id: 'pay2', orderId: 'o2', amount: 65000, method: 'card', paidAt: ago(10) },
    ],
    activities: [
      act('system', 'Заказ создан', 'Менеджер', 12),
      act('status_change', 'Новый → Подтверждён', 'Менеджер', 11),
      act('payment', 'Оплата 65 000 ₸ (карта) — полная', 'Менеджер', 10),
      act('status_change', 'Подтверждён → В производстве', 'Менеджер', 9),
      act('production_update', 'Тон: пошив завершён, проверка пройдена', 'Бахыт Т.', 2),
      act('status_change', 'В производстве → Готов', 'Система', 2),
      act('comment', 'Клиент приедет забрать в четверг', 'Менеджер', 1),
    ],
    totalAmount: 65000, paidAmount: 65000,
    dueDate: later(1),
    createdAt: ago(12), updatedAt: ago(1),
  },
  {
    id: 'o3', orderNumber: 'ЧП-003',
    clientId: 'c3', clientName: 'Ерлан Нурпеисов', clientPhone: '+7 705 777 8899',
    status: 'new', paymentStatus: 'not_paid', priority: 'normal',
    items: [
      { id: 'i4', productName: 'Чапан классический', fabric: 'Бархат синий', size: 'XL', quantity: 3, unitPrice: 72000 },
      { id: 'i5', productName: 'Жилет мужской', fabric: 'Хлопок плотный', size: 'L', quantity: 3, unitPrice: 28000 },
    ],
    productionTasks: [],
    payments: [],
    activities: [
      act('system', 'Заказ создан', 'Менеджер', 1),
      act('comment', 'Клиент запросил скидку на партию. Ждём подтверждения.', 'Менеджер', 0),
    ],
    totalAmount: 300000, paidAmount: 0,
    dueDate: later(14),
    createdAt: ago(1), updatedAt: ago(0, 3),
  },
  {
    id: 'o4', orderNumber: 'ЧП-004',
    clientId: 'c4', clientName: 'Айжан Тлеубаева', clientPhone: '+7 707 222 3344',
    status: 'completed', paymentStatus: 'paid', priority: 'vip',
    items: [
      { id: 'i6', productName: 'Саукеле', fabric: 'Парча серебряная', size: 'На заказ', quantity: 1, unitPrice: 180000 },
      { id: 'i7', productName: 'Тон (национальное платье)', fabric: 'Атлас белый', size: 'M', quantity: 1, unitPrice: 75000 },
    ],
    productionTasks: [
      { id: 'pt4', orderId: 'o4', orderNumber: 'ЧП-004', orderItemId: 'i6', productName: 'Саукеле', fabric: 'Парча серебряная', size: 'На заказ', quantity: 1, status: 'done', assignedTo: 'Камила А.', startedAt: ago(25), completedAt: ago(8), isBlocked: false },
      { id: 'pt5', orderId: 'o4', orderNumber: 'ЧП-004', orderItemId: 'i7', productName: 'Тон (национальное платье)', fabric: 'Атлас белый', size: 'M', quantity: 1, status: 'done', assignedTo: 'Айгуль М.', startedAt: ago(22), completedAt: ago(10), isBlocked: false },
    ],
    payments: [
      { id: 'pay3', orderId: 'o4', amount: 127500, method: 'transfer', paidAt: ago(28), notes: 'Предоплата 50%' },
      { id: 'pay4', orderId: 'o4', amount: 127500, method: 'transfer', paidAt: ago(6), notes: 'Остаток' },
    ],
    transfer: { id: 'tr1', orderId: 'o4', confirmedByManager: true, confirmedByClient: true, transferredAt: ago(5), notes: 'Передано в офисе' },
    activities: [
      act('system', 'Заказ создан', 'Менеджер', 30),
      act('payment', 'Предоплата 127 500 ₸ (перевод)', 'Менеджер', 28),
      act('status_change', 'Новый → Подтверждён → В производстве', 'Менеджер', 27),
      act('production_update', 'Саукеле: завершено', 'Камила А.', 8),
      act('production_update', 'Тон: завершено', 'Айгуль М.', 10),
      act('status_change', 'В производстве → Готов', 'Система', 7),
      act('payment', 'Остаток 127 500 ₸ (перевод)', 'Менеджер', 6),
      act('transfer', 'Передача: подтверждена менеджером и клиентом', 'Менеджер', 5),
      act('status_change', 'Готов → Передан → Завершён', 'Система', 5),
    ],
    totalAmount: 255000, paidAmount: 255000,
    createdAt: ago(30), updatedAt: ago(5), completedAt: ago(5),
  },
  {
    id: 'o5', orderNumber: 'ЧП-005',
    clientId: 'c5', clientName: 'Берик Жумабеков', clientPhone: '+7 700 555 6677',
    status: 'confirmed', paymentStatus: 'partial', priority: 'normal',
    items: [
      { id: 'i8', productName: 'Чапан классический', fabric: 'Бархат зелёный', size: 'XXL', quantity: 1, unitPrice: 72000 },
    ],
    productionTasks: [],
    payments: [
      { id: 'pay5', orderId: 'o5', amount: 36000, method: 'cash', paidAt: ago(2), notes: 'Предоплата 50%' },
    ],
    activities: [
      act('system', 'Заказ создан', 'Менеджер', 3),
      act('status_change', 'Новый → Подтверждён', 'Менеджер', 2),
      act('payment', 'Предоплата 36 000 ₸ (наличные)', 'Менеджер', 2),
    ],
    totalAmount: 72000, paidAmount: 36000,
    dueDate: later(10),
    createdAt: ago(3), updatedAt: ago(2),
  },
  {
    id: 'o6', orderNumber: 'ЧП-006',
    clientId: 'c1', clientName: 'Алмас Бекмуратов', clientPhone: '+7 701 111 2233',
    status: 'in_production', paymentStatus: 'paid', priority: 'vip',
    items: [
      { id: 'i9', productName: 'Чапан праздничный', fabric: 'Парча золотая', size: 'L', quantity: 1, unitPrice: 120000 },
      { id: 'i10', productName: 'Камзол', fabric: 'Бархат бордовый', size: 'L', quantity: 1, unitPrice: 55000 },
      { id: 'i11', productName: 'Койлек (рубашка)', fabric: 'Шёлк натуральный', size: 'L', quantity: 2, unitPrice: 32000 },
    ],
    productionTasks: [
      { id: 'pt6', orderId: 'o6', orderNumber: 'ЧП-006', orderItemId: 'i9', productName: 'Чапан праздничный', fabric: 'Парча золотая', size: 'L', quantity: 1, status: 'finishing', assignedTo: 'Камила А.', startedAt: ago(6), isBlocked: false },
      { id: 'pt7', orderId: 'o6', orderNumber: 'ЧП-006', orderItemId: 'i10', productName: 'Камзол', fabric: 'Бархат бордовый', size: 'L', quantity: 1, status: 'sewing', assignedTo: 'Жанна К.', startedAt: ago(4), isBlocked: false },
      { id: 'pt8', orderId: 'o6', orderNumber: 'ЧП-006', orderItemId: 'i11', productName: 'Койлек (рубашка)', fabric: 'Шёлк натуральный', size: 'L', quantity: 2, status: 'quality_check', assignedTo: 'Нурлан С.', startedAt: ago(5), isBlocked: false },
    ],
    payments: [
      { id: 'pay6', orderId: 'o6', amount: 239000, method: 'transfer', paidAt: ago(8), notes: 'Полная оплата' },
    ],
    activities: [
      act('system', 'Заказ создан', 'Менеджер', 10),
      act('payment', 'Полная оплата 239 000 ₸ (перевод)', 'Менеджер', 8),
      act('status_change', 'Новый → Подтверждён → В производстве', 'Менеджер', 7),
      act('production_update', 'Чапан: раскрой → пошив → отделка', 'Камила А.', 2),
      act('production_update', 'Койлек ×2: проверка качества', 'Нурлан С.', 1),
    ],
    totalAmount: 239000, paidAmount: 239000,
    dueDate: later(3),
    createdAt: ago(10), updatedAt: ago(1),
  },
  {
    id: 'o7', orderNumber: 'ЧП-007',
    clientId: 'c2', clientName: 'Гульнара Сагиндыкова', clientPhone: '+7 702 444 5566',
    status: 'cancelled', paymentStatus: 'not_paid', priority: 'normal',
    items: [
      { id: 'i12', productName: 'Жилет мужской', fabric: 'Хлопок плотный', size: 'M', quantity: 2, unitPrice: 28000 },
    ],
    productionTasks: [],
    payments: [],
    activities: [
      act('system', 'Заказ создан', 'Менеджер', 15),
      act('comment', 'Клиент отменил — не подошёл срок', 'Менеджер', 14),
      act('status_change', 'Новый → Отменён', 'Менеджер', 14),
    ],
    totalAmount: 56000, paidAmount: 0,
    createdAt: ago(15), updatedAt: ago(14),
    cancelledAt: ago(14), cancelReason: 'Не подошёл срок изготовления',
  },
  {
    id: 'o8', orderNumber: 'ЧП-008',
    clientId: 'c6', clientName: 'Жарасов', clientPhone: '+7 701 999 0011',
    status: 'ready', paymentStatus: 'not_paid', priority: 'normal',
    items: [
      { id: 'i13', productName: 'Чапан классический', fabric: 'Бархат синий', size: 'L', quantity: 1, unitPrice: 12333, workshopNotes: 'Особый воротник, уточнить у клиента' },
    ],
    productionTasks: [
      { id: 'pt9', orderId: 'o8', orderNumber: 'ЧП-008', orderItemId: 'i13', productName: 'Чапан классический', fabric: 'Бархат синий', size: 'L', quantity: 1, status: 'done', assignedTo: 'Бахыт Т.', startedAt: ago(3), completedAt: ago(1), isBlocked: false },
    ],
    payments: [],
    activities: [
      act('system', 'Заказ создан', 'Менеджер', 4),
      act('status_change', 'Новый → Подтверждён → В производстве', 'Менеджер', 3),
      act('production_update', 'Чапан классический: завершён', 'Бахыт Т.', 1),
      act('status_change', 'В производстве → Готов к выдаче', 'Система', 1),
      act('comment', 'Клиент ещё не оплатил, ждём звонка', 'Менеджер', 0),
    ],
    totalAmount: 12333, paidAmount: 0,
    dueDate: later(1),
    createdAt: ago(4), updatedAt: ago(1),
  },
];

// ─── API shims ───────────────────────────────────────────────

const STORAGE_KEY = 'kort-workzone-db-v2';

const _requests: ClientRequest[] = [
  {
    id: 'rq-1',
    requestNumber: 'RQ-001',
    customerName: 'Салтанат Есимова',
    phone: '+7 707 321 1122',
    messengers: ['whatsapp'],
    city: 'Шымкент',
    deliveryMethod: 'Доставка по Казахстану',
    leadSource: 'Instagram',
    preferredContact: 'whatsapp',
    desiredDate: later(12),
    notes: 'Нужен комплект к семейному мероприятию, важна мягкая посадка и быстрая обратная связь.',
    source: 'public_form',
    status: 'new',
    items: [
      { id: 'rqi-1', productName: 'Чапан праздничный', fabricPreference: 'Бархат бордовый', size: 'L', quantity: 1, notes: 'Сделать богаче отделку по вороту' },
      { id: 'rqi-2', productName: 'Камзол', fabricPreference: 'Парча золотая', size: 'M', quantity: 1 },
    ],
    createdAt: ago(0, 8),
    updatedAt: ago(0, 8),
  },
  {
    id: 'rq-2',
    requestNumber: 'RQ-002',
    customerName: 'Ермек Шынгысов',
    phone: '+7 701 444 8899',
    messengers: ['telegram'],
    city: 'Астана',
    deliveryMethod: 'Самовывоз',
    leadSource: 'WhatsApp',
    preferredContact: 'telegram',
    desiredDate: later(20),
    notes: 'Хочет базовый вариант без спешки, но просит заранее согласовать цену.',
    source: 'whatsapp',
    status: 'reviewed',
    items: [
      { id: 'rqi-3', productName: 'Чапан классический', fabricPreference: 'Бархат синий', size: 'XL', quantity: 2 },
    ],
    createdAt: ago(1, 6),
    updatedAt: ago(0, 14),
  },
];

let _profile: WorkzoneProfile = {
  displayName: 'Чапан',
  descriptor: '',
  orderPrefix: 'ЧП',
  publicIntakeTitle: 'Оставьте заявку на пошив',
  publicIntakeDescription: '',
  publicIntakeEnabled: true,
  supportLabel: '',
};

let _productCatalog: string[] = [...PRODUCT_CATALOG];
let _fabricCatalog: string[] = [...FABRIC_CATALOG];
let _sizeCatalog: string[] = [...SIZE_OPTIONS];
let _workers: string[] = [...DEFAULT_WORKERS];

function replaceArray<T>(target: T[], source: T[]) {
  target.splice(0, target.length, ...source);
}

function persistState() {
  if (typeof window === 'undefined') return;

  const payload = {
    orderCounter: _orderCounter,
    requestCounter: _requestCounter,
    clients: _clients,
    orders: _orders,
    requests: _requests,
    profile: _profile,
    productCatalog: _productCatalog,
    fabricCatalog: _fabricCatalog,
    sizeCatalog: _sizeCatalog,
    workers: _workers,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function hydrateState() {
  if (typeof window === 'undefined') return;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const payload = JSON.parse(raw) as Partial<{
      orderCounter: number;
      requestCounter: number;
      clients: Client[];
      orders: Order[];
      requests: ClientRequest[];
      profile: WorkzoneProfile;
      productCatalog: string[];
      fabricCatalog: string[];
      sizeCatalog: string[];
      workers: string[];
    }>;

    if (typeof payload.orderCounter === 'number') _orderCounter = payload.orderCounter;
    if (typeof payload.requestCounter === 'number') _requestCounter = payload.requestCounter;
    if (Array.isArray(payload.clients)) replaceArray(_clients, payload.clients);
    if (Array.isArray(payload.orders)) replaceArray(_orders, payload.orders);
    if (Array.isArray(payload.requests)) replaceArray(_requests, payload.requests);
    if (payload.profile) _profile = { ..._profile, ...payload.profile };
    if (Array.isArray(payload.productCatalog)) _productCatalog = [...payload.productCatalog];
    if (Array.isArray(payload.fabricCatalog)) _fabricCatalog = [...payload.fabricCatalog];
    if (Array.isArray(payload.sizeCatalog)) _sizeCatalog = [...payload.sizeCatalog];
    if (Array.isArray(payload.workers)) _workers = [...payload.workers];
  } catch {
    // Keep seed data if persisted payload is corrupted.
  }
}

hydrateState();

export const chapanApi = {
  getProfile: async (): Promise<WorkzoneProfile> => {
    await delay(40);
    return { ..._profile };
  },

  updateProfile: async (patch: Partial<WorkzoneProfile>): Promise<WorkzoneProfile> => {
    await delay(80);
    _profile = { ..._profile, ...patch };
    persistState();
    return { ..._profile };
  },

  getCatalogs: async (): Promise<{ productCatalog: string[]; fabricCatalog: string[]; sizeCatalog: string[]; workers: string[] }> => {
    await delay(40);
    return {
      productCatalog: [..._productCatalog],
      fabricCatalog: [..._fabricCatalog],
      sizeCatalog: [..._sizeCatalog],
      workers: [..._workers],
    };
  },

  saveCatalogs: async (data: {
    productCatalog?: string[];
    fabricCatalog?: string[];
    sizeCatalog?: string[];
    workers?: string[];
  }): Promise<void> => {
    await delay(80);

    if (Array.isArray(data.productCatalog)) {
      _productCatalog = [...new Set(data.productCatalog.map((item) => item.trim()).filter(Boolean))];
    }
    if (Array.isArray(data.fabricCatalog)) {
      _fabricCatalog = [...new Set(data.fabricCatalog.map((item) => item.trim()).filter(Boolean))];
    }
    if (Array.isArray(data.sizeCatalog)) {
      _sizeCatalog = [...new Set(data.sizeCatalog.map((item) => item.trim()).filter(Boolean))];
    }
    if (Array.isArray(data.workers)) {
      _workers = [...new Set(data.workers.map((item) => item.trim()).filter(Boolean))];
    }

    persistState();
  },

  getRequests: async (): Promise<ClientRequest[]> => {
    await delay(50);
    return _requests.map((request) => ({
      ...request,
      items: request.items.map((item) => ({ ...item })),
    }));
  },

  submitClientRequest: async (data: {
    customerName: string;
    phone: string;
    messengers?: Array<'whatsapp' | 'telegram'>;
    city?: string;
    deliveryMethod?: string;
    leadSource?: string;
    preferredContact: 'phone' | 'whatsapp' | 'telegram';
    desiredDate?: string;
    notes?: string;
    source?: ClientRequest['source'];
    items: Array<{
      productName: string;
      fabricPreference?: string;
      size?: string;
      quantity: number;
      notes?: string;
    }>;
  }): Promise<ClientRequest> => {
    await delay(120);
    const now = new Date().toISOString();
    const request: ClientRequest = {
      id: nanoid(),
      requestNumber: nextRequestNumber(),
      customerName: data.customerName.trim(),
      phone: data.phone.trim(),
      messengers: data.messengers?.length ? [...new Set(data.messengers)] : undefined,
      city: data.city?.trim() || undefined,
      deliveryMethod: data.deliveryMethod?.trim() || undefined,
      leadSource: data.leadSource?.trim() || undefined,
      preferredContact: data.preferredContact,
      desiredDate: data.desiredDate,
      notes: data.notes?.trim() || undefined,
      source: data.source ?? 'public_form',
      status: 'new',
      items: data.items.map((item) => ({
        id: nanoid(),
        productName: item.productName.trim(),
        fabricPreference: item.fabricPreference?.trim() || undefined,
        size: item.size?.trim() || undefined,
        quantity: Math.max(1, item.quantity),
        notes: item.notes?.trim() || undefined,
      })),
      createdAt: now,
      updatedAt: now,
    };

    _requests.unshift(request);
    persistState();

    return {
      ...request,
      items: request.items.map((item) => ({ ...item })),
    };
  },

  updateRequestStatus: async (requestId: string, status: ClientRequest['status'], createdOrderId?: string): Promise<void> => {
    await delay(60);
    const request = _requests.find((item) => item.id === requestId);
    if (!request) return;
    request.status = status;
    request.updatedAt = new Date().toISOString();
    request.createdOrderId = createdOrderId ?? request.createdOrderId;
    persistState();
  },
  // ── Orders ──────────────────────────────────────────────
  getOrders: async (): Promise<Order[]> => {
    await delay();
    return _orders.map(o => ({
      ...o,
      items: [...o.items],
      productionTasks: o.productionTasks.map(pt => ({ ...pt })),
      payments: [...o.payments],
      activities: [...o.activities],
      transfer: o.transfer ? { ...o.transfer } : undefined,
    }));
  },

  getClients: async (): Promise<Client[]> => {
    await delay();
    return _clients.map(c => ({ ...c }));
  },

  createOrder: async (data: {
    clientId?: string;
    clientName: string;
    clientPhone: string;
    priority: OrderPriority;
    items: Omit<OrderItem, 'id'>[];
    dueDate?: string;
    sourceRequestId?: string;
  }): Promise<Order> => {
    await delay(120);
    const now = new Date().toISOString();
    const existingClient = data.clientId
      ? _clients.find((client) => client.id === data.clientId)
      : _clients.find((client) => client.phone === data.clientPhone);
    const clientId = existingClient?.id ?? nanoid();

    if (!existingClient) {
      _clients.unshift({
        id: clientId,
        fullName: data.clientName,
        phone: data.clientPhone,
        createdAt: now,
      });
    }

    const order: Order = {
      id: nanoid(),
      orderNumber: nextOrderNumber(),
      clientId,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      status: 'new',
      paymentStatus: 'not_paid',
      priority: data.priority,
      items: data.items.map(it => ({ ...it, id: nanoid() })),
      productionTasks: [],
      payments: [],
      activities: [
        { id: nanoid(), type: 'system', content: 'Заказ создан', author: 'Менеджер', createdAt: now },
      ],
      totalAmount: data.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0),
      paidAmount: 0,
      dueDate: data.dueDate,
      createdAt: now,
      updatedAt: now,
    };
    _orders.unshift(order);
    if (data.sourceRequestId) {
      const request = _requests.find((item) => item.id === data.sourceRequestId);
      if (request) {
        request.status = 'converted';
        request.createdOrderId = order.id;
        request.updatedAt = now;
      }
    }
    persistState();
    return { ...order, items: [...order.items], activities: [...order.activities] };
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<void> => {
    await delay(80);
    const o = _orders.find(o => o.id === id);
    if (o) {
      o.status = status;
      o.updatedAt = new Date().toISOString();
      if (status === 'completed') o.completedAt = o.updatedAt;
      if (status === 'cancelled') o.cancelledAt = o.updatedAt;
      persistState();
    }
  },

  confirmOrder: async (id: string): Promise<void> => {
    await delay(80);
    const o = _orders.find(o => o.id === id);
    if (!o) return;
    o.status = 'confirmed';
    o.updatedAt = new Date().toISOString();
    // Auto-create production tasks from items
    const newTasks: ProductionTask[] = o.items.map(item => ({
      id: nanoid(),
      orderId: o.id,
      orderNumber: o.orderNumber,
      orderItemId: item.id,
      productName: item.productName,
      fabric: item.fabric,
      size: item.size,
      quantity: item.quantity,
      status: 'pending' as ProductionStatus,
      isBlocked: false,
    }));
    o.productionTasks = newTasks;
    persistState();
  },

  addPayment: async (orderId: string, amount: number, method: PaymentMethod, notes?: string): Promise<Payment> => {
    await delay(80);
    const payment: Payment = {
      id: nanoid(),
      orderId,
      amount,
      method,
      paidAt: new Date().toISOString(),
      notes,
    };
    const o = _orders.find(o => o.id === orderId);
    if (o) {
      o.payments.push(payment);
      o.paidAmount += amount;
      o.paymentStatus = o.paidAmount >= o.totalAmount ? 'paid' : 'partial';
      o.updatedAt = new Date().toISOString();
      persistState();
    }
    return { ...payment };
  },

  // ── Production ──────────────────────────────────────────
  moveProductionStatus: async (taskId: string, status: ProductionStatus): Promise<void> => {
    await delay(80);
    for (const o of _orders) {
      const pt = o.productionTasks.find(t => t.id === taskId);
      if (pt) {
        pt.status = status;
        if (status !== 'pending' && !pt.startedAt) pt.startedAt = new Date().toISOString();
        if (status === 'done') pt.completedAt = new Date().toISOString();
        o.updatedAt = new Date().toISOString();
        persistState();
        break;
      }
    }
  },

  assignWorker: async (taskId: string, worker: string): Promise<void> => {
    await delay(60);
    for (const o of _orders) {
      const pt = o.productionTasks.find(t => t.id === taskId);
      if (pt) { pt.assignedTo = worker; persistState(); break; }
    }
  },

  // ── Transfer ────────────────────────────────────────────
  initiateTransfer: async (orderId: string): Promise<Transfer> => {
    await delay(80);
    const t: Transfer = {
      id: nanoid(),
      orderId,
      confirmedByManager: false,
      confirmedByClient: false,
    };
    const o = _orders.find(o => o.id === orderId);
    if (o) { o.transfer = t; o.updatedAt = new Date().toISOString(); persistState(); }
    return { ...t };
  },

  confirmTransfer: async (orderId: string, by: 'manager' | 'client'): Promise<void> => {
    await delay(60);
    const o = _orders.find(o => o.id === orderId);
    if (!o?.transfer) return;
    if (by === 'manager') o.transfer.confirmedByManager = true;
    if (by === 'client') o.transfer.confirmedByClient = true;
    if (o.transfer.confirmedByManager && o.transfer.confirmedByClient) {
      o.transfer.transferredAt = new Date().toISOString();
      o.status = 'transferred';
    }
    o.updatedAt = new Date().toISOString();
    persistState();
  },

  // ── Task flags & defects ────────────────────────────────
  flagTask: async (taskId: string, reason: string): Promise<void> => {
    await delay(60);
    for (const o of _orders) {
      const pt = o.productionTasks.find(t => t.id === taskId);
      if (pt) { pt.isBlocked = true; pt.blockReason = reason; o.updatedAt = new Date().toISOString(); persistState(); break; }
    }
  },

  unflagTask: async (taskId: string): Promise<void> => {
    await delay(60);
    for (const o of _orders) {
      const pt = o.productionTasks.find(t => t.id === taskId);
      if (pt) { pt.isBlocked = false; pt.blockReason = undefined; o.updatedAt = new Date().toISOString(); persistState(); break; }
    }
  },

  setTaskDefect: async (taskId: string, defect: string): Promise<void> => {
    await delay(60);
    for (const o of _orders) {
      const pt = o.productionTasks.find(t => t.id === taskId);
      if (pt) { pt.defects = defect || undefined; o.updatedAt = new Date().toISOString(); persistState(); break; }
    }
  },

  // ── Activity ────────────────────────────────────────────
  addActivity: async (orderId: string, entry: Omit<OrderActivity, 'id'>): Promise<OrderActivity> => {
    await delay(60);
    const a: OrderActivity = { ...entry, id: nanoid() };
    const o = _orders.find(o => o.id === orderId);
    if (o) { o.activities.push(a); o.updatedAt = new Date().toISOString(); persistState(); }
    return a;
  },

  // ── Clients ─────────────────────────────────────────────
  createClient: async (data: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
    await delay(80);
    const c: Client = { ...data, id: nanoid(), createdAt: new Date().toISOString() };
    _clients.unshift(c);
    persistState();
    return { ...c };
  },
};
