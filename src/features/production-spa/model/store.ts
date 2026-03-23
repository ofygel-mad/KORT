/**
 * features/production-spa/model/store.ts
 *
 * Zustand store for new (non-Chapan) workshops.
 * Mirrors chapan.store.ts structure but is agnostic of product domain.
 */

import { create } from 'zustand';
import { workshopApi } from '../api/client';
import type {
  ProductionOrder,
  OrderStatus,
  TaskStatus,
  WorkshopProfile,
  WorkshopWorker,
  WorkshopEquipment,
  ProductionStage,
  ShortageResult,
  CreateOrderInput,
} from '../api/types';

interface WorkshopState {
  // Per-workshopId data
  ordersMap: Record<string, ProductionOrder[]>;
  profileMap: Record<string, WorkshopProfile>;
  workersMap: Record<string, WorkshopWorker[]>;
  equipmentMap: Record<string, WorkshopEquipment[]>;
  stagesMap: Record<string, ProductionStage[]>;
  loadingMap: Record<string, boolean>;
  errorMap: Record<string, string | null>;

  // Actions
  load: (workshopId: string) => Promise<void>;
  createOrder: (workshopId: string, data: CreateOrderInput) => Promise<string>;
  moveOrderStatus: (workshopId: string, orderId: string, status: OrderStatus) => Promise<void>;
  cancelOrder: (workshopId: string, orderId: string, reason: string) => Promise<void>;
  moveTaskStatus: (workshopId: string, taskId: string, status: TaskStatus) => Promise<void>;
  assignWorker: (workshopId: string, taskId: string, worker: string) => Promise<void>;
  flagTask: (workshopId: string, taskId: string, reason: string) => Promise<void>;
  unflagTask: (workshopId: string, taskId: string) => Promise<void>;
  checkShortage: (workshopId: string, orderId: string) => Promise<ShortageResult>;
}

export const useWorkshopStore = create<WorkshopState>()((set, get) => ({
  ordersMap: {},
  profileMap: {},
  workersMap: {},
  equipmentMap: {},
  stagesMap: {},
  loadingMap: {},
  errorMap: {},

  load: async (workshopId) => {
    if (get().loadingMap[workshopId]) return;

    set((s) => ({ loadingMap: { ...s.loadingMap, [workshopId]: true } }));
    try {
      const [profile, orders, workers, equipment, stages] = await Promise.all([
        workshopApi.getProfile(workshopId),
        workshopApi.getOrders(workshopId),
        workshopApi.getWorkers(workshopId),
        workshopApi.getEquipment(workshopId),
        workshopApi.getStages(workshopId),
      ]);
      set((s) => ({
        profileMap: { ...s.profileMap, [workshopId]: profile },
        ordersMap: { ...s.ordersMap, [workshopId]: orders },
        workersMap: { ...s.workersMap, [workshopId]: workers },
        equipmentMap: { ...s.equipmentMap, [workshopId]: equipment },
        stagesMap: { ...s.stagesMap, [workshopId]: stages },
        loadingMap: { ...s.loadingMap, [workshopId]: false },
        errorMap: { ...s.errorMap, [workshopId]: null },
      }));
    } catch (err) {
      set((s) => ({
        loadingMap: { ...s.loadingMap, [workshopId]: false },
        errorMap: { ...s.errorMap, [workshopId]: err instanceof Error ? err.message : 'Ошибка загрузки' },
      }));
    }
  },

  createOrder: async (workshopId, data) => {
    const order = await workshopApi.createOrder(workshopId, data);
    set((s) => ({
      ordersMap: {
        ...s.ordersMap,
        [workshopId]: [order, ...(s.ordersMap[workshopId] ?? [])],
      },
    }));
    return order.id;
  },

  moveOrderStatus: async (workshopId, orderId, status) => {
    await workshopApi.moveOrderStatus(workshopId, orderId, status);
    set((s) => ({
      ordersMap: {
        ...s.ordersMap,
        [workshopId]: (s.ordersMap[workshopId] ?? []).map((o) =>
          o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o,
        ),
      },
    }));
  },

  cancelOrder: async (workshopId, orderId, reason) => {
    await workshopApi.cancelOrder(workshopId, orderId, reason);
    set((s) => ({
      ordersMap: {
        ...s.ordersMap,
        [workshopId]: (s.ordersMap[workshopId] ?? []).map((o) =>
          o.id === orderId ? { ...o, status: 'cancelled' as OrderStatus } : o,
        ),
      },
    }));
    void reason;
  },

  moveTaskStatus: async (workshopId, taskId, status) => {
    await workshopApi.moveTaskStatus(workshopId, taskId, status);
    set((s) => ({
      ordersMap: {
        ...s.ordersMap,
        [workshopId]: (s.ordersMap[workshopId] ?? []).map((o) => ({
          ...o,
          tasks: o.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
        })),
      },
    }));
  },

  assignWorker: async (workshopId, taskId, worker) => {
    await workshopApi.assignWorker(workshopId, taskId, worker);
    set((s) => ({
      ordersMap: {
        ...s.ordersMap,
        [workshopId]: (s.ordersMap[workshopId] ?? []).map((o) => ({
          ...o,
          tasks: o.tasks.map((t) => (t.id === taskId ? { ...t, assignedTo: worker } : t)),
        })),
      },
    }));
  },

  flagTask: async (workshopId, taskId, reason) => {
    await workshopApi.flagTask(workshopId, taskId, reason);
    set((s) => ({
      ordersMap: {
        ...s.ordersMap,
        [workshopId]: (s.ordersMap[workshopId] ?? []).map((o) => ({
          ...o,
          tasks: o.tasks.map((t) =>
            t.id === taskId ? { ...t, isBlocked: true, blockReason: reason, status: 'blocked' as TaskStatus } : t,
          ),
        })),
      },
    }));
  },

  unflagTask: async (workshopId, taskId) => {
    await workshopApi.unflagTask(workshopId, taskId);
    set((s) => ({
      ordersMap: {
        ...s.ordersMap,
        [workshopId]: (s.ordersMap[workshopId] ?? []).map((o) => ({
          ...o,
          tasks: o.tasks.map((t) =>
            t.id === taskId ? { ...t, isBlocked: false, blockReason: undefined, status: 'pending' as TaskStatus } : t,
          ),
        })),
      },
    }));
  },

  checkShortage: async (workshopId, orderId) => {
    const result = await workshopApi.checkShortage(workshopId, orderId);
    // Cache the shortage result on the order
    set((s) => ({
      ordersMap: {
        ...s.ordersMap,
        [workshopId]: (s.ordersMap[workshopId] ?? []).map((o) =>
          o.id === orderId ? { ...o, shortage: result } : o,
        ),
      },
    }));
    return result;
  },
}));
