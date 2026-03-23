/**
 * features/production-spa/api/client.ts
 *
 * Workshop API client.
 * Currently returns MOCK DATA — all functions are wired to realistic stubs.
 * Replace mock implementations with real `api.get/post/patch` calls
 * when backend /workshops routes are ready.
 *
 * ⚠ BACKEND HOOKUP: search for "// TODO:" comments to find swap points.
 */

import type {
  ProductionOrder,
  OrderStatus,
  TaskStatus,
  WorkshopProfile,
  WorkshopWorker,
  WorkshopEquipment,
  WorkshopCreateInput,
  CreateOrderInput,
  ShortageResult,
  ProductionStage,
} from './types';

// ── Mock data ────────────────────────────────────────────────

const MOCK_STAGES: ProductionStage[] = [
  { id: 's1', name: 'Приёмка', index: 0, estimatedMinutes: 30 },
  { id: 's2', name: 'Раскрой', index: 1, estimatedMinutes: 60 },
  { id: 's3', name: 'Пошив', index: 2, estimatedMinutes: 120 },
  { id: 's4', name: 'Отделка', index: 3, estimatedMinutes: 45 },
  { id: 's5', name: 'ОТК', index: 4, estimatedMinutes: 30 },
];

const MOCK_WORKERS: WorkshopWorker[] = [
  { id: 'w1', name: 'Айгуль М.', role: 'Швея' },
  { id: 'w2', name: 'Жанна К.', role: 'Закройщик', activeTaskId: 't1' },
  { id: 'w3', name: 'Бахыт Т.', role: 'Швея' },
  { id: 'w4', name: 'Нурлан С.', role: 'ОТК' },
];

const MOCK_EQUIPMENT: WorkshopEquipment[] = [
  { id: 'e1', name: 'Швейная машина #1', type: 'Швейная', status: 'active' },
  { id: 'e2', name: 'Швейная машина #2', type: 'Швейная', status: 'active' },
  { id: 'e3', name: 'Оверлок', type: 'Оверлок', status: 'maintenance', nextMaintenanceAt: '2026-03-25' },
  { id: 'e4', name: 'Раскройный стол', type: 'Раскрой', status: 'active' },
];

function makeMockOrders(workshopId: string): ProductionOrder[] {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

  return [
    {
      id: `${workshopId}-o1`,
      orderNumber: 'ЦЕХ-001',
      clientName: 'Алия Сейткали',
      clientPhone: '+7 701 234 56 78',
      status: 'in_production',
      paymentStatus: 'partial',
      priority: 'urgent',
      totalAmount: 45000,
      paidAmount: 22500,
      dueDate: tomorrow.toISOString(),
      createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
      items: [
        { id: 'i1', productName: 'Пальто женское', quantity: 1, unitPrice: 45000, sku: 'COAT-W-L' },
      ],
      tasks: [
        { id: 't1', orderId: `${workshopId}-o1`, stageName: 'Раскрой', stageIndex: 1, status: 'done', assignedTo: 'Жанна К.', isBlocked: false, completedAt: now.toISOString() },
        { id: 't2', orderId: `${workshopId}-o1`, stageName: 'Пошив', stageIndex: 2, status: 'in_progress', assignedTo: 'Айгуль М.', isBlocked: false, startedAt: now.toISOString() },
        { id: 't3', orderId: `${workshopId}-o1`, stageName: 'Отделка', stageIndex: 3, status: 'pending', isBlocked: false },
        { id: 't4', orderId: `${workshopId}-o1`, stageName: 'ОТК', stageIndex: 4, status: 'pending', isBlocked: false },
      ],
    },
    {
      id: `${workshopId}-o2`,
      orderNumber: 'ЦЕХ-002',
      clientName: 'Серик Байжанов',
      clientPhone: '+7 702 345 67 89',
      status: 'confirmed',
      paymentStatus: 'not_paid',
      priority: 'normal',
      totalAmount: 28000,
      paidAmount: 0,
      dueDate: nextWeek.toISOString(),
      createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
      items: [
        { id: 'i2', productName: 'Брюки мужские', quantity: 2, unitPrice: 14000, sku: 'TRSR-M-M' },
      ],
      tasks: [
        { id: 't5', orderId: `${workshopId}-o2`, stageName: 'Приёмка', stageIndex: 0, status: 'done', isBlocked: false },
        { id: 't6', orderId: `${workshopId}-o2`, stageName: 'Раскрой', stageIndex: 1, status: 'pending', isBlocked: false },
      ],
    },
    {
      id: `${workshopId}-o3`,
      orderNumber: 'ЦЕХ-003',
      clientName: 'Динара Омарова',
      clientPhone: '+7 707 456 78 90',
      status: 'new',
      paymentStatus: 'not_paid',
      priority: 'vip',
      totalAmount: 85000,
      paidAmount: 0,
      dueDate: yesterday.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      items: [
        { id: 'i3', productName: 'Свадебное платье', quantity: 1, unitPrice: 85000, sku: 'DRSS-WD-S' },
      ],
      tasks: [],
      shortage: {
        orderId: `${workshopId}-o3`,
        status: 'blocked',
        items: [
          { sku: 'FAB-SILK-W', name: 'Шёлк белый', required: 5, available: 2.3, unit: 'м', status: 'shortage' },
          { sku: 'FAB-LACE-W', name: 'Кружево белое', required: 3, available: 1, unit: 'м', status: 'shortage' },
        ],
        checkedAt: now.toISOString(),
      },
    },
    {
      id: `${workshopId}-o4`,
      orderNumber: 'ЦЕХ-004',
      clientName: 'Арман Тулегенов',
      clientPhone: '+7 771 567 89 01',
      status: 'ready',
      paymentStatus: 'paid',
      priority: 'normal',
      totalAmount: 15000,
      paidAmount: 15000,
      dueDate: new Date(now.getTime() + 3 * 86400000).toISOString(),
      createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
      items: [
        { id: 'i4', productName: 'Рубашка мужская', quantity: 3, unitPrice: 5000 },
      ],
      tasks: [
        { id: 't7', orderId: `${workshopId}-o4`, stageName: 'Пошив', stageIndex: 2, status: 'done', isBlocked: false, completedAt: now.toISOString() },
        { id: 't8', orderId: `${workshopId}-o4`, stageName: 'ОТК', stageIndex: 4, status: 'done', isBlocked: false, completedAt: now.toISOString() },
      ],
    },
  ];
}

// ── Mock profile ─────────────────────────────────────────────

function makeMockProfile(workshopId: string, name: string): WorkshopProfile {
  return {
    id: workshopId,
    name,
    descriptor: 'Производственное пространство',
    orderPrefix: name.slice(0, 3).toUpperCase(),
    mode: 'light',
  };
}

// ── Client ───────────────────────────────────────────────────

export const workshopApi = {

  // ── Workshop CRUD ────────────────────────────────────────

  createWorkshop: async (data: WorkshopCreateInput): Promise<WorkshopProfile> => {
    // TODO: api.post('/workshops', data)
    await delay(400);
    const id = `ws_${Date.now()}`;
    return makeMockProfile(id, data.name);
  },

  getProfile: async (workshopId: string): Promise<WorkshopProfile> => {
    // TODO: api.get(`/workshops/${workshopId}`)
    await delay(200);
    return makeMockProfile(workshopId, 'Новый цех');
  },

  // ── Orders ───────────────────────────────────────────────

  getOrders: async (workshopId: string): Promise<ProductionOrder[]> => {
    // TODO: api.get(`/workshops/${workshopId}/orders`)
    await delay(300);
    return makeMockOrders(workshopId);
  },

  createOrder: async (workshopId: string, data: CreateOrderInput): Promise<ProductionOrder> => {
    // TODO: api.post(`/workshops/${workshopId}/orders`, data)
    await delay(400);
    const id = `${workshopId}-o${Date.now()}`;
    const now = new Date().toISOString();
    return {
      id,
      orderNumber: `ЦЕХ-${String(Math.floor(Math.random() * 900) + 100)}`,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      status: 'new',
      paymentStatus: 'not_paid',
      priority: data.priority,
      totalAmount: data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      paidAmount: 0,
      dueDate: data.dueDate,
      createdAt: now,
      updatedAt: now,
      items: data.items.map((it, idx) => ({ id: `i${idx}`, ...it })),
      tasks: [],
    };
  },

  moveOrderStatus: async (_workshopId: string, orderId: string, status: OrderStatus): Promise<void> => {
    // TODO: api.patch(`/workshops/${_workshopId}/orders/${orderId}`, { status })
    await delay(200);
    void orderId; void status;
  },

  cancelOrder: async (_workshopId: string, orderId: string, reason: string): Promise<void> => {
    // TODO: api.patch(`/workshops/${_workshopId}/orders/${orderId}/cancel`, { reason })
    await delay(200);
    void orderId; void reason;
  },

  // ── Tasks ────────────────────────────────────────────────

  moveTaskStatus: async (_workshopId: string, taskId: string, status: TaskStatus): Promise<void> => {
    // TODO: api.patch(`/workshops/${_workshopId}/tasks/${taskId}`, { status })
    await delay(150);
    void taskId; void status;
  },

  assignWorker: async (_workshopId: string, taskId: string, worker: string): Promise<void> => {
    // TODO: api.patch(`/workshops/${_workshopId}/tasks/${taskId}`, { assignedTo: worker })
    await delay(150);
    void taskId; void worker;
  },

  flagTask: async (_workshopId: string, taskId: string, reason: string): Promise<void> => {
    // TODO: api.patch(`/workshops/${_workshopId}/tasks/${taskId}/block`, { reason })
    await delay(150);
    void taskId; void reason;
  },

  unflagTask: async (_workshopId: string, taskId: string): Promise<void> => {
    // TODO: api.patch(`/workshops/${_workshopId}/tasks/${taskId}/unblock`)
    await delay(150);
    void taskId;
  },

  // ── Shortage ─────────────────────────────────────────────
  // ⚠ StockProvider abstraction: when Склад SPA is built, this becomes
  //   a call to the Warehouse service instead of a local check.

  checkShortage: async (_workshopId: string, orderId: string): Promise<ShortageResult> => {
    // Try real warehouse API first; fall back to mock if not configured
    try {
      const { warehouseApi } = await import('../../warehouse-spa/api/client');
      const report = await warehouseApi.checkOrder(orderId, true);
      return {
        orderId: report.orderId,
        status: report.status,
        items: report.items.map((item) => ({
          sku: item.itemId,
          name: item.itemName,
          required: item.needed,
          available: item.available,
          unit: item.unit,
          status: item.shortage > 0 ? 'shortage' : item.available < item.needed * 1.2 ? 'low' : 'ok',
        })),
        checkedAt: report.checkedAt,
      };
    } catch {
      // Warehouse not set up — return ok
      return { orderId, status: 'ok', items: [], checkedAt: new Date().toISOString() };
    }
  },

  // ── Workers & Equipment ──────────────────────────────────

  getWorkers: async (_workshopId: string): Promise<WorkshopWorker[]> => {
    // TODO: api.get(`/workshops/${_workshopId}/workers`)
    await delay(200);
    return MOCK_WORKERS;
  },

  getEquipment: async (_workshopId: string): Promise<WorkshopEquipment[]> => {
    // TODO: api.get(`/workshops/${_workshopId}/equipment`)
    await delay(200);
    return MOCK_EQUIPMENT;
  },

  // ── Stages ───────────────────────────────────────────────

  getStages: async (_workshopId: string): Promise<ProductionStage[]> => {
    // TODO: api.get(`/workshops/${_workshopId}/stages`)
    await delay(150);
    return MOCK_STAGES;
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
