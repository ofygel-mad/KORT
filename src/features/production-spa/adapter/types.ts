/**
 * features/production-spa/adapter/types.ts
 *
 * The ProductionAdapter interface — the universal contract.
 * All UI components depend only on this interface.
 * ChapanAdapter and WorkshopAdapter both implement it.
 */

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

export interface ProductionAdapter {
  // ── State ──────────────────────────────────────────────
  orders: ProductionOrder[];
  workers: WorkshopWorker[];
  equipment: WorkshopEquipment[];
  stages: ProductionStage[];
  profile: WorkshopProfile;
  loading: boolean;
  error: string | null;

  // ── Data loading ───────────────────────────────────────
  load(): Promise<void>;

  // ── Order actions ──────────────────────────────────────
  createOrder(data: CreateOrderInput): Promise<string>;
  moveOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
  cancelOrder(orderId: string, reason: string): Promise<void>;

  // ── Task actions ───────────────────────────────────────
  moveTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  assignWorker(taskId: string, workerName: string): Promise<void>;
  flagTask(taskId: string, reason: string): Promise<void>;
  unflagTask(taskId: string): Promise<void>;

  // ── Shortage (StockProvider abstraction) ───────────────
  // When Склад SPA is built, these will delegate to the Warehouse service.
  checkShortage(orderId: string): Promise<ShortageResult>;
}
