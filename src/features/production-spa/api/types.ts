/**
 * features/production-spa/api/types.ts
 *
 * Normalized domain types for the Universal Production Engine.
 * Both ChapanAdapter and WorkshopAdapter produce these types.
 * UI components only know about these — never about raw chapan/workshop API types.
 */

// ── Enums & constants ────────────────────────────────────────

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'transferred'
  | 'completed'
  | 'cancelled';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'blocked';

export type Priority = 'normal' | 'urgent' | 'vip';
export type PaymentStatus = 'not_paid' | 'partial' | 'paid';
export type UITone = 'muted' | 'info' | 'warning' | 'danger' | 'success' | 'accent';

export type WorkshopMode = 'light' | 'advanced';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  in_production: 'В производстве',
  ready: 'Готов',
  transferred: 'Передан',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

export const ORDER_STATUS_TONE: Record<OrderStatus, UITone> = {
  new: 'muted',
  confirmed: 'info',
  in_production: 'warning',
  ready: 'success',
  transferred: 'accent',
  completed: 'success',
  cancelled: 'danger',
};

export const ORDER_STATUS_ORDER: OrderStatus[] = [
  'new', 'confirmed', 'in_production', 'ready', 'transferred', 'completed',
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Ожидание',
  in_progress: 'В работе',
  done: 'Готово',
  blocked: 'Блокировка',
};

export const TASK_STATUS_TONE: Record<TaskStatus, UITone> = {
  pending: 'muted',
  in_progress: 'info',
  done: 'success',
  blocked: 'danger',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  normal: 'Обычный',
  urgent: 'Срочный',
  vip: 'VIP',
};

export const PRIORITY_TONE: Record<Priority, UITone> = {
  normal: 'muted',
  urgent: 'warning',
  vip: 'accent',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  not_paid: 'Не оплачен',
  partial: 'Частично',
  paid: 'Оплачен',
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, UITone> = {
  not_paid: 'danger',
  partial: 'warning',
  paid: 'success',
};

// ── Stock / Shortage (abstract layer — will connect to Warehouse SPA) ──────

export interface MaterialCheck {
  sku: string;
  name: string;
  required: number;
  available: number;
  unit: string;
  /** ok = enough, low = available but tight (<20% margin), shortage = not enough */
  status: 'ok' | 'low' | 'shortage';
}

export interface ShortageResult {
  orderId: string;
  /** ok = all good, partial = some low, blocked = hard shortage */
  status: 'ok' | 'partial' | 'blocked';
  items: MaterialCheck[];
  checkedAt: string;
}

// ── BOM (Bill of Materials) ──────────────────────────────────

export interface BomLine {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface BomSpec {
  productSku: string;
  productName: string;
  lines: BomLine[];
}

// ── Production entities ──────────────────────────────────────

export interface ProductionTask {
  id: string;
  orderId: string;
  /** Human-readable stage name (e.g. "Раскрой", "Пошив") */
  stageName: string;
  /** Index in the pipeline */
  stageIndex: number;
  status: TaskStatus;
  assignedTo?: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  isBlocked: boolean;
  blockReason?: string;
  /** Estimated minutes for this stage */
  estimatedMinutes?: number;
}

export interface ProductionOrderItem {
  id: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  /** BOM spec for this item (populated lazily) */
  bom?: BomSpec;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  clientPhone: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  priority: Priority;
  totalAmount: number;
  paidAmount: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  items: ProductionOrderItem[];
  tasks: ProductionTask[];
  /** Shortage check result — null until checked, populated lazily */
  shortage?: ShortageResult;
}

// ── Workshop config ──────────────────────────────────────────

export interface ProductionStage {
  id: string;
  name: string;
  index: number;
  /** Estimated minutes for this stage (used in Timeline) */
  estimatedMinutes?: number;
  color?: string;
}

export interface WorkshopWorker {
  id: string;
  name: string;
  role?: string;
  /** Current task assignment */
  activeTaskId?: string;
}

export interface WorkshopEquipment {
  id: string;
  name: string;
  type?: string;
  status: 'active' | 'maintenance' | 'broken';
  nextMaintenanceAt?: string;
}

export interface WorkshopProfile {
  id: string;
  name: string;
  descriptor?: string;
  orderPrefix: string;
  mode: WorkshopMode;
}

// ── Create/Update inputs ─────────────────────────────────────

export interface CreateOrderInput {
  clientName: string;
  clientPhone: string;
  priority: Priority;
  items: Array<{
    productName: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
  dueDate?: string;
}

export interface WorkshopCreateInput {
  name: string;
  descriptor?: string;
  prefix: string;
  mode: WorkshopMode;
  stages?: Array<{ name: string; estimatedMinutes?: number }>;
}
