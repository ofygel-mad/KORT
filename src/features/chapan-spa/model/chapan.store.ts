/**
 * features/chapan-spa/model/chapan.store.ts
 * Central state for the Chapan sewing workshop ERP.
 * Manages orders, production tasks, payments, transfers, and workshop config.
 */
import { create } from 'zustand';
import { chapanApi } from '../api/client';
import { useBadgeStore } from '../../shared-bus/badge.store';
import { useSharedBus } from '../../shared-bus';
import type { GlobalNotifEvent } from '../../shared-bus';
import { useAuthStore } from '@/shared/stores/auth';
import type {
  Order, Client, OrderStatus, ProductionStatus,
  PaymentMethod, OrderPriority, OrderItem, OrderActivity,
  ClientRequest, WorkzoneProfile,
} from '../api/types';
import {
  ORDER_STATUS_LABEL,
  PRODUCTION_STATUS_LABEL,
  DEFAULT_WORKERS,
  PRODUCT_CATALOG,
  FABRIC_CATALOG,
  SIZE_OPTIONS,
} from '../api/types';

/** Get the current user's display name for activity logs. */
function getAuthorName(): string {
  return useAuthStore.getState().user?.full_name ?? 'Менеджер';
}

interface ChapanState {
  orders: Order[];
  clients: Client[];
  requests: ClientRequest[];
  workers: string[];
  productCatalog: string[];
  fabricCatalog: string[];
  sizeCatalog: string[];
  profile: WorkzoneProfile;
  loading: boolean;

  // Data actions
  load: () => Promise<void>;
  loadClients: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  refreshSettings: () => Promise<void>;

  // Order CRUD
  createOrder: (data: {
    clientId?: string;
    clientName: string;
    clientPhone: string;
    priority: OrderPriority;
    items: Omit<OrderItem, 'id'>[];
    dueDate?: string;
    sourceRequestId?: string;
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
  updateProfile: (patch: Partial<WorkzoneProfile>) => Promise<void>;
  saveCatalogs: (data: {
    productCatalog?: string[];
    fabricCatalog?: string[];
    sizeCatalog?: string[];
    workers?: string[];
  }) => Promise<void>;
  setRequestStatus: (requestId: string, status: ClientRequest['status'], createdOrderId?: string) => Promise<void>;
  addWorker: (name: string) => Promise<void>;
  removeWorker: (name: string) => Promise<void>;
}

export const useChapanStore = create<ChapanState>((set, get) => ({
  orders: [],
  clients: [],
  requests: [],
  workers: [...DEFAULT_WORKERS],
  productCatalog: [...PRODUCT_CATALOG],
  fabricCatalog: [...FABRIC_CATALOG],
  sizeCatalog: [...SIZE_OPTIONS],
  profile: {
    displayName: 'Чапан',
    descriptor: '',
    orderPrefix: 'ЧП',
    publicIntakeTitle: 'Оставьте заявку на пошив',
    publicIntakeDescription: '',
    publicIntakeEnabled: true,
    supportLabel: '',
  },
  loading: false,

  // ── Load ────────────────────────────────────────────────

  load: async () => {
    set({ loading: true });
    const [orders, clients, requests, settings, profile] = await Promise.all([
      chapanApi.getOrders(),
      chapanApi.getClients(),
      chapanApi.getRequests(),
      chapanApi.getCatalogs(),
      chapanApi.getProfile(),
    ]);
    set({
      orders,
      clients,
      requests,
      workers: settings.workers,
      productCatalog: settings.productCatalog,
      fabricCatalog: settings.fabricCatalog,
      sizeCatalog: settings.sizeCatalog,
      profile,
      loading: false,
    });
  },

  loadClients: async () => {
    const clients = await chapanApi.getClients();
    set({ clients });
  },

  refreshRequests: async () => {
    const requests = await chapanApi.getRequests();
    set({ requests });
  },

  refreshSettings: async () => {
    const [settings, profile] = await Promise.all([
      chapanApi.getCatalogs(),
      chapanApi.getProfile(),
    ]);
    set({
      workers: settings.workers,
      productCatalog: settings.productCatalog,
      fabricCatalog: settings.fabricCatalog,
      sizeCatalog: settings.sizeCatalog,
      profile,
    });
  },

  // ── Create order ────────────────────────────────────────

  createOrder: async (data) => {
    const order = await chapanApi.createOrder(data);
    set(s => ({
      orders: [order, ...s.orders],
      requests: data.sourceRequestId
        ? s.requests.map((request) => (
            request.id === data.sourceRequestId
              ? {
                  ...request,
                  status: 'converted',
                  createdOrderId: order.id,
                  updatedAt: new Date().toISOString(),
                }
              : request
          ))
        : s.requests,
    }));

    // Refresh clients when the order created or reused a client implicitly.
    if (!data.clientId?.trim()) {
      try {
        const clients = await chapanApi.getClients();
        set({ clients });
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
      author: getAuthorName(),
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
      author: getAuthorName(),
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
                  author: getAuthorName(),
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
              author: getAuthorName(),
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
              author: getAuthorName(),
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
              author: getAuthorName(),
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
                  author: getAuthorName(),
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
                  author: getAuthorName(),
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

  updateProfile: async (patch) => {
    const profile = await chapanApi.updateProfile(patch);
    set({ profile });
  },

  saveCatalogs: async (data) => {
    await chapanApi.saveCatalogs(data);
    const settings = await chapanApi.getCatalogs();
    set({
      workers: settings.workers,
      productCatalog: settings.productCatalog,
      fabricCatalog: settings.fabricCatalog,
      sizeCatalog: settings.sizeCatalog,
    });
  },

  setRequestStatus: async (requestId, status, createdOrderId) => {
    await chapanApi.updateRequestStatus(requestId, status, createdOrderId);
    set((state) => ({
      requests: state.requests.map((request) => (
        request.id === requestId
          ? {
              ...request,
              status,
              createdOrderId: createdOrderId ?? request.createdOrderId,
              updatedAt: new Date().toISOString(),
            }
          : request
      )),
    }));
  },

  addWorker: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const workers = get().workers.includes(trimmed)
      ? get().workers
      : [...get().workers, trimmed];
    await chapanApi.saveCatalogs({ workers });
    set({ workers });
  },

  removeWorker: async (name) => {
    const workers = get().workers.filter(w => w !== name);
    await chapanApi.saveCatalogs({ workers });
    set({ workers });
  },
}));
