/**
 * Domain types for the Chapan (sewing workshop) ERP SPA.
 */

export type UITone = 'muted' | 'info' | 'warning' | 'danger' | 'success' | 'accent';

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'transferred'
  | 'completed'
  | 'cancelled';

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
  'new',
  'confirmed',
  'in_production',
  'ready',
  'transferred',
  'completed',
];

export type PaymentStatus = 'not_paid' | 'partial' | 'paid';

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

export type ProductionStatus =
  | 'pending'
  | 'cutting'
  | 'sewing'
  | 'finishing'
  | 'quality_check'
  | 'done';

export const PRODUCTION_STATUS_LABEL: Record<ProductionStatus, string> = {
  pending: 'Ожидание',
  cutting: 'Раскрой',
  sewing: 'Пошив',
  finishing: 'Отделка',
  quality_check: 'Проверка',
  done: 'Готово',
};

export const PRODUCTION_STATUS_TONE: Record<ProductionStatus, UITone> = {
  pending: 'muted',
  cutting: 'warning',
  sewing: 'info',
  finishing: 'accent',
  quality_check: 'warning',
  done: 'success',
};

export const PRODUCTION_STATUS_ORDER: ProductionStatus[] = [
  'pending',
  'cutting',
  'sewing',
  'finishing',
  'quality_check',
  'done',
];

export type OrderPriority = 'normal' | 'urgent' | 'vip';

export const PRIORITY_LABEL: Record<OrderPriority, string> = {
  normal: 'Обычный',
  urgent: 'Срочный',
  vip: 'VIP',
};

export const PRIORITY_TONE: Record<OrderPriority, UITone> = {
  normal: 'muted',
  urgent: 'warning',
  vip: 'accent',
};

export type PaymentMethod = 'cash' | 'card' | 'transfer';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
};

export type ActivityType =
  | 'status_change'
  | 'payment'
  | 'production_update'
  | 'comment'
  | 'transfer'
  | 'system';

export const ACTIVITY_TONE: Record<ActivityType, UITone> = {
  status_change: 'info',
  payment: 'success',
  production_update: 'warning',
  comment: 'accent',
  transfer: 'accent',
  system: 'muted',
};

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
  isBlocked: boolean;
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

export type ClientRequestStatus = 'new' | 'reviewed' | 'converted' | 'archived';

export interface ClientRequestItem {
  id: string;
  productName: string;
  fabricPreference?: string;
  size?: string;
  quantity: number;
  notes?: string;
}

export interface ClientRequest {
  id: string;
  requestNumber: string;
  customerName: string;
  phone: string;
  messengers?: Array<'whatsapp' | 'telegram'>;
  city?: string;
  deliveryMethod?: string;
  leadSource?: string;
  preferredContact: 'phone' | 'whatsapp' | 'telegram';
  desiredDate?: string;
  notes?: string;
  source: 'public_form' | 'manager' | 'whatsapp';
  status: ClientRequestStatus;
  items: ClientRequestItem[];
  createdOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkzoneProfile {
  displayName: string;
  descriptor: string;
  orderPrefix: string;
  publicIntakeTitle: string;
  publicIntakeDescription: string;
  publicIntakeEnabled: boolean;
  supportLabel: string;
}

export type ViewMode = 'list' | 'kanban';
export type OrderSortBy = 'createdAt' | 'dueDate' | 'totalAmount' | 'updatedAt';
export type OrderGroupBy = 'status' | 'priority' | 'paymentStatus';

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
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'На заказ',
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
