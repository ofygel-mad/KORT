/**
 * features/chapan-spa/model/chapan.store.ts
 * Central state for the Chapan sewing workshop ERP.
 * Manages orders, production tasks, payments, transfers, and workshop config.
 */
import { create } from 'zustand';
import { chapanApi } from '../api/mock';
import { useBadgeStore } from '../../shared-bus/badge.store';
import { useSharedBus } from '../../shared-bus';
import type { GlobalNotifEvent } from '../../shared-bus';
import type {
  Order, Client, OrderStatus, ProductionStatus,
  PaymentMethod, OrderPriority, OrderItem, OrderActivity,
} from '../api/types';
import { ORDER_STATUS_LABEL, PRODUCTION_STATUS_LABEL, DEFAULT_WORKERS } from '../api/types';

interface ChapanState {
  orders: Order[];
  clients: Client[];
  workers: string[];
  loading: boolean;

  // Data actions
  load: () => Promise<void>;
  loadClients: () => Promise<void>;

  // Order CRUD
  createOrder: (data: {
    clientId: string;
    clientName: string;
    clientPhone: string;
    isNewClient: boolean;
    priority: OrderPriority;
    items: Omit<OrderItem, 'id'>[];
    dueDate?: string;
  }) => Promise<string>;
  confirmOrder: (id: string) => Promise<void>;
  moveOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  cancelOrder: (id: string, reason: string) => Promise<void>;

  // Payments
  addPayment: (orderId: string, amount: number, method: PaymentMethod, notes?: string) => Promise<void>;

  // Production
  moveProductionStatus: (taskId: string, status: ProductionStatus) => Promise<void>;
  assignWorker: (taskId: string, worker: string) => Promise<void>;
  flagTask: (taskId: string, reason: string) => Promise<void>;
  unflagTask: (taskId: string) => Promise<void>;
  setTaskDefect: (taskId: string, defect: string) => Promise<void>;

  // Transfer
  initiateTransfer: (orderId: string) => Promise<void>;
  confirmTransfer: (orderId: string, by: 'manager' | 'client') => Promise<void>;

  // Activity
  addComment: (orderId: string, content: string, author: string) => Promise<void>;

  // Workshop config
  addWorker: (name: string) => void;
  removeWorker: (name: string) => void;
}

export const useChapanStore = create<ChapanState>((set, get) => ({
  orders: [],
  clients: [],
  workers: [...DEFAULT_WORKERS],
  loading: false,

  // ── Load ────────────────────────────────────────────────

  load: async () => {
    set({ loading: true });
    const [orders, clients] = await Promise.all([
      chapanApi.getOrders(),
      chapanApi.getClients(),
    ]);
    set({ orders, clients, loading: false });
  },

  loadClients: async () => {
    const clients = await chapanApi.getClients();
    set({ clients });
  },

  // ── Create order ────────────────────────────────────────

  createOrder: async (data) => {
    const order = await chapanApi.createOrder(data);
    set(s => ({ orders: [order, ...s.orders] }));

    // Auto-save new client to the clients list
    if (data.isNewClient && data.clientName.trim()) {
      try {
        const newClient = await chapanApi.createClient({
          fullName: data.clientName.trim(),
          phone: data.clientPhone.trim(),
        });
        set(s => ({ clients: [newClient, ...s.clients] }));
      } catch {
        // Non-critical — order was already created
      }
    }

    useBadgeStore.getState().incrementBadge('chapan');

    const notif: GlobalNotifEvent = {
      id: crypto.randomUUID(),
      title: 'Новый заказ',
      body: `${order.orderNumber} — ${order.clientName}`,
      kind: data.priority === 'vip' ? 'warning' : 'info',
      source: 'system',
      createdAt: new Date().toISOString(),
    };
    useSharedBus.getState().publishGlobalNotif(notif);

    return order.id;
  },

  // ── Confirm order (auto-creates production tasks) ───────

  confirmOrder: async (id) => {
    const prev = get().orders.find(o => o.id === id);
    if (!prev || prev.status !== 'new') return;

    await chapanApi.confirmOrder(id);
    const refreshed = await chapanApi.getOrders();
    const updated = refreshed.find(o => o.id === id);
    if (!updated) return;

    const now = new Date().toISOString();
    const activity: OrderActivity = {
      id: crypto.randomUUID(),
      type: 'status_change',
      content: `${ORDER_STATUS_LABEL[prev.status]} → ${ORDER_STATUS_LABEL['confirmed']}`,
      author: 'Менеджер',
      createdAt: now,
    };
    updated.activities = [...updated.activities, activity];

    set(s => ({
      orders: s.orders.map(o => o.id === id ? updated : o),
    }));
  },

  // ── Move order status ───────────────────────────────────

  moveOrderStatus: async (id, status) => {
    const prev = get().orders.find(o => o.id === id);
    if (!prev) return;

    const now = new Date().toISOString();
    const activity: OrderActivity = {
      id: crypto.randomUUID(),
      type: 'status_change',
      content: `${ORDER_STATUS_LABEL[prev.status]} → ${ORDER_STATUS_LABEL[status]}`,
      author: 'Менеджер',
      createdAt: now,
    };

    set(s => ({
      orders: s.orders.map(o =>
        o.id === id
          ? {
              ...o,
              status,
              updatedAt: now,
              completedAt: status === 'completed' ? now : o.completedAt,
              activities: [...o.activities, activity],
            }
          : o
      ),
    }));

    await chapanApi.updateOrderStatus(id, status);

    if (status === 'completed') {
      useBadgeStore.getState().decrementBadge('chapan');
    }
  },

  // ── Cancel order ────────────────────────────────────────

  cancelOrder: async (id, reason) => {
    const prev = get().orders.find(o => o.id === id);
    if (!prev) return;

    const now = new Date().toISOString();
    set(s => ({
      orders: s.orders.map(o =>
        o.id === id
          ? {
              ...o,
              status: 'cancelled' as const,
              cancelledAt: now,
              cancelReason: reason,
              updatedAt: now,
              activities: [
                ...o.activities,
                {
                  id: crypto.randomUUID(),
                  type: 'status_change' as const,
                  content: `${ORDER_STATUS_LABEL[prev.status]} → Отменён: ${reason}`,
                  author: 'Менеджер',
                  createdAt: now,
                },
              ],
            }
          : o
      ),
    }));

    await chapanApi.updateOrderStatus(id, 'cancelled');
    useBadgeStore.getState().decrementBadge('chapan');
  },

  // ── Payments ────────────────────────────────────────────

  addPayment: async (orderId, amount, method, notes) => {
    const payment = await chapanApi.addPayment(orderId, amount, method, notes);

    set(s => ({
      orders: s.orders.map(o => {
        if (o.id !== orderId) return o;
        const newPaid = o.paidAmount + amount;
        const now = new Date().toISOString();
        return {
          ...o,
          payments: [...o.payments, payment],
          paidAmount: newPaid,
          paymentStatus: newPaid >= o.totalAmount ? 'paid' : 'partial',
          updatedAt: now,
          activities: [
            ...o.activities,
            {
              id: crypto.randomUUID(),
              type: 'payment' as const,
              content: `Оплата ${amount.toLocaleString('ru-RU')} ₸${notes ? ` — ${notes}` : ''}`,
              author: 'Менеджер',
              createdAt: now,
            },
          ],
        };
      }),
    }));
  },

  // ── Production ──────────────────────────────────────────

  moveProductionStatus: async (taskId, status) => {
    const order = get().orders.find(o =>
      o.productionTasks.some(pt => pt.id === taskId)
    );
    if (!order) return;

    const task = order.productionTasks.find(pt => pt.id === taskId);
    if (!task) return;

    const prevLabel = PRODUCTION_STATUS_LABEL[task.status];
    const nextLabel = PRODUCTION_STATUS_LABEL[status];
    const now = new Date().toISOString();

    set(s => ({
      orders: s.orders.map(o => {
        if (o.id !== order.id) return o;
        const updatedTasks = o.productionTasks.map(pt =>
          pt.id === taskId
            ? {
                ...pt,
                status,
                // Moving forward clears the block
                isBlocked: false,
                blockReason: undefined,
                startedAt: status !== 'pending' && !pt.startedAt ? now : pt.startedAt,
                completedAt: status === 'done' ? now : pt.completedAt,
              }
            : pt
        );

        const allDone = updatedTasks.length > 0 && updatedTasks.every(pt => pt.status === 'done');
        const newStatus = allDone && o.status === 'in_production' ? 'ready' as const : o.status;

        const activities = [
          ...o.activities,
          {
            id: crypto.randomUUID(),
            type: 'production_update' as const,
            content: `${task.productName}: ${prevLabel} → ${nextLabel}`,
            author: task.assignedTo ?? 'Цех',
            createdAt: now,
          },
        ];

        if (allDone && o.status === 'in_production') {
          activities.push({
            id: crypto.randomUUID(),
            type: 'status_change' as const,
            content: 'Все изделия готовы → Заказ готов к выдаче',
            author: 'Система',
            createdAt: now,
          });
        }

        return {
          ...o,
          productionTasks: updatedTasks,
          status: newStatus,
          updatedAt: now,
          activities,
        };
      }),
    }));

    await chapanApi.moveProductionStatus(taskId, status);
  },

  assignWorker: async (taskId, worker) => {
    set(s => ({
      orders: s.orders.map(o => ({
        ...o,
        productionTasks: o.productionTasks.map(pt =>
          pt.id === taskId ? { ...pt, assignedTo: worker || undefined } : pt
        ),
      })),
    }));
    await chapanApi.assignWorker(taskId, worker);
  },

  flagTask: async (taskId, reason) => {
    const order = get().orders.find(o =>
      o.productionTasks.some(pt => pt.id === taskId)
    );
    if (!order) return;

    const task = order.productionTasks.find(pt => pt.id === taskId);
    if (!task) return;

    const now = new Date().toISOString();
    set(s => ({
      orders: s.orders.map(o => {
        if (o.id !== order.id) return o;
        return {
          ...o,
          updatedAt: now,
          productionTasks: o.productionTasks.map(pt =>
            pt.id === taskId ? { ...pt, isBlocked: true, blockReason: reason } : pt
          ),
          activities: [
            ...o.activities,
            {
              id: crypto.randomUUID(),
              type: 'production_update' as const,
              content: `${task.productName}: заблокировано — ${reason}`,
              author: 'Менеджер',
              createdAt: now,
            },
          ],
        };
      }),
    }));
    await chapanApi.flagTask(taskId, reason);
  },

  unflagTask: async (taskId) => {
    const order = get().orders.find(o =>
      o.productionTasks.some(pt => pt.id === taskId)
    );
    if (!order) return;

    const task = order.productionTasks.find(pt => pt.id === taskId);
    if (!task) return;

    const now = new Date().toISOString();
    set(s => ({
      orders: s.orders.map(o => {
        if (o.id !== order.id) return o;
        return {
          ...o,
          updatedAt: now,
          productionTasks: o.productionTasks.map(pt =>
            pt.id === taskId ? { ...pt, isBlocked: false, blockReason: undefined } : pt
          ),
          activities: [
            ...o.activities,
            {
              id: crypto.randomUUID(),
              type: 'production_update' as const,
              content: `${task.productName}: блок снят`,
              author: 'Менеджер',
              createdAt: now,
            },
          ],
        };
      }),
    }));
    await chapanApi.unflagTask(taskId);
  },

  setTaskDefect: async (taskId, defect) => {
    const order = get().orders.find(o =>
      o.productionTasks.some(pt => pt.id === taskId)
    );
    if (!order) return;

    const task = order.productionTasks.find(pt => pt.id === taskId);
    if (!task) return;

    const now = new Date().toISOString();
    set(s => ({
      orders: s.orders.map(o => {
        if (o.id !== order.id) return o;
        return {
          ...o,
          updatedAt: now,
          productionTasks: o.productionTasks.map(pt =>
            pt.id === taskId ? { ...pt, defects: defect || undefined } : pt
          ),
          activities: defect
            ? [
                ...o.activities,
                {
                  id: crypto.randomUUID(),
                  type: 'production_update' as const,
                  content: `${task.productName}: зафиксирован дефект — ${defect}`,
                  author: 'Менеджер',
                  createdAt: now,
                },
              ]
            : o.activities,
        };
      }),
    }));
    await chapanApi.setTaskDefect(taskId, defect);
  },

  // ── Transfer ────────────────────────────────────────────

  initiateTransfer: async (orderId) => {
    const transfer = await chapanApi.initiateTransfer(orderId);
    const now = new Date().toISOString();

    set(s => ({
      orders: s.orders.map(o =>
        o.id === orderId
          ? {
              ...o,
              transfer,
              updatedAt: now,
              activities: [
                ...o.activities,
                {
                  id: crypto.randomUUID(),
                  type: 'transfer' as const,
                  content: 'Процесс передачи инициирован',
                  author: 'Менеджер',
                  createdAt: now,
                },
              ],
            }
          : o
      ),
    }));
  },

  confirmTransfer: async (orderId, by) => {
    await chapanApi.confirmTransfer(orderId, by);
    const now = new Date().toISOString();
    const label = by === 'manager' ? 'менеджером' : 'клиентом';

    set(s => ({
      orders: s.orders.map(o => {
        if (o.id !== orderId || !o.transfer) return o;
        const updated = { ...o.transfer };
        if (by === 'manager') updated.confirmedByManager = true;
        if (by === 'client') updated.confirmedByClient = true;

        const bothConfirmed = updated.confirmedByManager && updated.confirmedByClient;
        if (bothConfirmed) updated.transferredAt = now;

        const activities = [
          ...o.activities,
          {
            id: crypto.randomUUID(),
            type: 'transfer' as const,
            content: `Передача подтверждена ${label}`,
            author: by === 'manager' ? 'Менеджер' : o.clientName,
            createdAt: now,
          },
        ];

        if (bothConfirmed) {
          activities.push({
            id: crypto.randomUUID(),
            type: 'status_change' as const,
            content: 'Передача завершена — заказ передан клиенту',
            author: 'Система',
            createdAt: now,
          });
        }

        return {
          ...o,
          transfer: updated,
          status: bothConfirmed ? 'transferred' as const : o.status,
          updatedAt: now,
          activities,
        };
      }),
    }));
  },

  // ── Comments ────────────────────────────────────────────

  addComment: async (orderId, content, author) => {
    const now = new Date().toISOString();
    const entry = await chapanApi.addActivity(orderId, {
      type: 'comment',
      content,
      author,
      createdAt: now,
    });

    set(s => ({
      orders: s.orders.map(o =>
        o.id === orderId
          ? { ...o, activities: [...o.activities, entry], updatedAt: now }
          : o
      ),
    }));
  },

  // ── Workshop config ─────────────────────────────────────

  addWorker: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set(s => ({
      workers: s.workers.includes(trimmed) ? s.workers : [...s.workers, trimmed],
    }));
  },

  removeWorker: (name) => {
    set(s => ({ workers: s.workers.filter(w => w !== name) }));
  },
}));
