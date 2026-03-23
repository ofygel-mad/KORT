/**
 * features/production-spa/adapter/chapan.adapter.ts
 *
 * Maps the existing Chapan store (chapan.store.ts) to the
 * universal ProductionAdapter interface.
 *
 * The Chapan data/API layer is NOT changed. This adapter is a
 * read/write bridge — UI components talk to the adapter, not the store directly.
 */

import { useChapanStore } from '../../chapan-spa/model/chapan.store';
import { chapanApi } from '../../chapan-spa/api/client';
import type {
  ProductionOrder,
  ProductionTask,
  WorkshopProfile,
  WorkshopWorker,
  WorkshopEquipment,
  ProductionStage,
  ShortageResult,
  OrderStatus,
  TaskStatus,
  CreateOrderInput,
} from '../api/types';
import type { ProductionAdapter } from './types';
import type {
  Order as ChapanOrder,
  ProductionTask as ChapanTask,
  ProductionStatus,
} from '../../chapan-spa/api/types';

// ── Status mapping Chapan → normalized ──────────────────────

const CHAPAN_STATUS_MAP: Record<string, OrderStatus> = {
  new: 'new',
  confirmed: 'confirmed',
  in_production: 'in_production',
  ready: 'ready',
  transferred: 'transferred',
  completed: 'completed',
  cancelled: 'cancelled',
};

const CHAPAN_TASK_STATUS_MAP: Record<ProductionStatus, TaskStatus> = {
  pending: 'pending',
  cutting: 'in_progress',
  sewing: 'in_progress',
  finishing: 'in_progress',
  quality_check: 'in_progress',
  done: 'done',
};

const CHAPAN_STAGES: ProductionStage[] = [
  { id: 'cp-s1', name: 'Раскрой', index: 0, estimatedMinutes: 60 },
  { id: 'cp-s2', name: 'Пошив', index: 1, estimatedMinutes: 120 },
  { id: 'cp-s3', name: 'Отделка', index: 2, estimatedMinutes: 45 },
  { id: 'cp-s4', name: 'Проверка качества', index: 3, estimatedMinutes: 30 },
];

// ── Mapper ───────────────────────────────────────────────────

function mapChapanTask(t: ChapanTask): ProductionTask {
  const stageNames: Record<string, string> = {
    pending: 'Ожидание',
    cutting: 'Раскрой',
    sewing: 'Пошив',
    finishing: 'Отделка',
    quality_check: 'Проверка качества',
    done: 'Готово',
  };
  const stageIndexes: Record<string, number> = {
    cutting: 0, sewing: 1, finishing: 2, quality_check: 3,
  };

  return {
    id: t.id,
    orderId: t.orderId,
    stageName: stageNames[t.status] ?? t.status,
    stageIndex: stageIndexes[t.status] ?? 0,
    status: t.isBlocked ? 'blocked' : CHAPAN_TASK_STATUS_MAP[t.status],
    assignedTo: t.assignedTo,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    notes: t.notes,
    isBlocked: t.isBlocked,
    blockReason: t.blockReason,
  };
}

function mapChapanOrder(o: ChapanOrder): ProductionOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    clientName: o.clientName,
    clientPhone: o.clientPhone,
    status: CHAPAN_STATUS_MAP[o.status] as OrderStatus ?? 'new',
    paymentStatus: o.paymentStatus as 'not_paid' | 'partial' | 'paid',
    priority: o.priority as 'normal' | 'urgent' | 'vip',
    totalAmount: o.totalAmount,
    paidAmount: o.paidAmount,
    dueDate: o.dueDate,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: o.items.map((it) => ({
      id: it.id,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      notes: it.notes,
    })),
    tasks: o.productionTasks.map(mapChapanTask),
  };
}

// ── Hook ─────────────────────────────────────────────────────

/**
 * Returns a ChapanAdapter that implements ProductionAdapter.
 * Drop-in replacement — ChapanSPA passes this to WorkshopSPA.
 */
export function useChapanAdapter(): ProductionAdapter {
  const store = useChapanStore();

  const profile: WorkshopProfile = {
    id: 'chapan',
    name: store.profile.displayName,
    descriptor: store.profile.descriptor,
    orderPrefix: store.profile.orderPrefix,
    mode: 'light',
  };

  const workers: WorkshopWorker[] = store.workers.map((name, i) => ({
    id: `cw-${i}`,
    name,
  }));

  const orders: ProductionOrder[] = store.orders.map(mapChapanOrder);

  return {
    orders,
    workers,
    equipment: [],
    stages: CHAPAN_STAGES,
    profile,
    loading: store.loading,
    error: null,

    load: store.load,

    createOrder: async (data: CreateOrderInput) => {
      const id = await store.createOrder({
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        priority: data.priority,
        items: data.items.map((it) => ({
          productName: it.productName,
          fabric: '',
          size: '',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          notes: it.notes,
        })),
        dueDate: data.dueDate,
      });
      return id;
    },

    moveOrderStatus: async (orderId, status) => {
      await store.moveOrderStatus(orderId, status as Parameters<typeof store.moveOrderStatus>[1]);
    },

    cancelOrder: async (orderId, reason) => {
      await store.cancelOrder(orderId, reason);
    },

    moveTaskStatus: async (taskId, status) => {
      const chapanStatus: Record<TaskStatus, ProductionStatus> = {
        pending: 'pending',
        in_progress: 'sewing',
        done: 'done',
        blocked: 'pending',
      };
      await store.moveProductionStatus(taskId, chapanStatus[status]);
    },

    assignWorker: async (taskId, workerName) => {
      await store.assignWorker(taskId, workerName);
    },

    flagTask: async (taskId, reason) => {
      await store.flagTask(taskId, reason);
    },

    unflagTask: async (taskId) => {
      await store.unflagTask(taskId);
    },

    checkShortage: async (orderId: string): Promise<ShortageResult> => {
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
        // Warehouse not configured — return ok so production is not blocked
        return {
          orderId,
          status: 'ok',
          items: [],
          checkedAt: new Date().toISOString(),
        };
      }
    },
  };
}
