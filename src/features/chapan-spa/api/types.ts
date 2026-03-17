/**
 * features/chapan-spa/api/types.ts
 * Domain types for the Chapan (sewing workshop) ERP SPA.
 *
 * Three status axes per order:
 *   1. OrderStatus   — lifecycle of the order itself
 *   2. PaymentStatus — payment tracking
 *   3. ProductionStatus — per-item production progress
 */

// ── Order lifecycle ──────────────────────────────────────────

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'transferred'
  | 'completed'
  | 'cancelled';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new:            'Новый',
  confirmed:      'Подтверждён',
  in_production:  'В производстве',
  ready:          'Готов',
  transferred:    'Передан',
  completed:      'Завершён',
  cancelled:      'Отменён',
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  new:            '#6b7280',
  confirmed:      '#3b82f6',
  in_production:  '#f59e0b',
  ready:          '#22c55e',
  transferred:    '#8b5cf6',
  completed:      '#10b981',
  cancelled:      '#ef4444',
};

export const ORDER_STATUS_ORDER: OrderStatus[] = [
  'new', 'confirmed', 'in_production', 'ready', 'transferred', 'completed',
];

// ── Payment status ───────────────────────────────────────────

export type PaymentStatus = 'not_paid' | 'partial' | 'paid';

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  not_paid: 'Не оплачен',
  partial:  'Частично',
  paid:     'Оплачен',
};

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  not_paid: '#ef4444',
  partial:  '#f59e0b',
  paid:     '#22c55e',
};

// ── Production status (per item) ─────────────────────────────

export type ProductionStatus =
  | 'pending'
  | 'cutting'
  | 'sewing'
  | 'finishing'
  | 'quality_check'
  | 'done';

export const PRODUCTION_STATUS_LABEL: Record<ProductionStatus, string> = {
  pending:       'Ожидание',
  cutting:       'Раскрой',
  sewing:        'Пошив',
  finishing:     'Отделка',
  quality_check: 'Проверка',
  done:          'Готово',
};

export const PRODUCTION_STATUS_COLOR: Record<ProductionStatus, string> = {
  pending:       '#6b7280',
  cutting:       '#f59e0b',
  sewing:        '#3b82f6',
  finishing:     '#8b5cf6',
  quality_check: '#ec4899',
  done:          '#22c55e',
};

export const PRODUCTION_STATUS_ORDER: ProductionStatus[] = [
  'pending', 'cutting', 'sewing', 'finishing', 'quality_check', 'done',
];

// ── Order priority ───────────────────────────────────────────

export type OrderPriority = 'normal' | 'urgent' | 'vip';

export const PRIORITY_LABEL: Record<OrderPriority, string> = {
  normal: 'Обычный',
  urgent: 'Срочный',
  vip:    'VIP',
};

export const PRIORITY_COLOR: Record<OrderPriority, string> = {
  normal: '#6b7280',
  urgent: '#f59e0b',
  vip:    '#ec4899',
};

// ── Payment method ───────────────────────────────────────────

export type PaymentMethod = 'cash' | 'card' | 'transfer';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash:     'Наличные',
  card:     'Карта',
  transfer: 'Перевод',
};

// ── Activity types ───────────────────────────────────────────

export type ActivityType =
  | 'status_change'
  | 'payment'
  | 'production_update'
  | 'comment'
  | 'transfer'
  | 'system';

// ── Entities ─────────────────────────────────────────────────

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  fabric: string;
  size: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  /** Special instructions for the workshop (e.g. embroidery, non-standard cut) */
  workshopNotes?: string;
}

export interface ProductionTask {
  id: string;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  productName: string;
  fabric: string;
  size: string;
  quantity: number;
  status: ProductionStatus;
  assignedTo?: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  defects?: string;
  /** True when the task is blocked and cannot proceed */
  isBlocked: boolean;
  /** Reason why the task is blocked (no material, client change, etc.) */
  blockReason?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  notes?: string;
}

export interface Transfer {
  id: string;
  orderId: string;
  confirmedByManager: boolean;
  confirmedByClient: boolean;
  transferredAt?: string;
  notes?: string;
}

export interface OrderActivity {
  id: string;
  type: ActivityType;
  content: string;
  author: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  clientPhone: string;

  status: OrderStatus;
  paymentStatus: PaymentStatus;
  priority: OrderPriority;

  items: OrderItem[];
  productionTasks: ProductionTask[];
  payments: Payment[];
  transfer?: Transfer;
  activities: OrderActivity[];

  totalAmount: number;
  paidAmount: number;

  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

// ── View options ─────────────────────────────────────────────

export type ViewMode = 'list' | 'kanban';
export type OrderSortBy = 'createdAt' | 'dueDate' | 'totalAmount' | 'updatedAt';
export type OrderGroupBy = 'status' | 'priority' | 'paymentStatus';

// ── Product catalog (predefined) ─────────────────────────────

export const PRODUCT_CATALOG = [
  'Чапан классический',
  'Чапан праздничный',
  'Тон (национальное платье)',
  'Камзол',
  'Жилет мужской',
  'Койлек (рубашка)',
  'Саукеле',
  'Другое',
] as const;

export const FABRIC_CATALOG = [
  'Бархат синий',
  'Бархат бордовый',
  'Бархат зелёный',
  'Атлас красный',
  'Атлас золотой',
  'Атлас белый',
  'Шёлк натуральный',
  'Хлопок плотный',
  'Парча золотая',
  'Парча серебряная',
] as const;

export const SIZE_OPTIONS = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'На заказ',
] as const;

export const DEFAULT_WORKERS: string[] = [
  'Айгуль М.',
  'Жанна К.',
  'Бахыт Т.',
  'Нурлан С.',
  'Камила А.',
];

/** @deprecated Use useChapanStore().workers instead */
export const WORKERS = DEFAULT_WORKERS;
