/**
 * features/chapan-spa/api/client.ts
 * Real API client for the Chapan sewing workshop.
 * Drop-in replacement for mock.ts — same interface, real HTTP calls.
 */
import { api } from '@/shared/api/client';
import type {
  Order, Client, OrderStatus, ProductionStatus,
  PaymentMethod, OrderPriority, OrderItem, OrderActivity,
  ClientRequest, WorkzoneProfile,
} from './types';

// ── Response wrappers ──────────────────────────────────

interface ListResponse<T> {
  count: number;
  results: T[];
}

// ── API ────────────────────────────────────────────────

export const chapanApi = {
  // ── Profile & Settings ──────────────────────────────

  getProfile: () =>
    api.get<WorkzoneProfile>('/chapan/settings/profile'),

  updateProfile: (patch: Partial<WorkzoneProfile>) =>
    api.patch<WorkzoneProfile>('/chapan/settings/profile', patch),

  getCatalogs: () =>
    api.get<{
      productCatalog: string[];
      fabricCatalog: string[];
      sizeCatalog: string[];
      workers: string[];
    }>('/chapan/settings/catalogs'),

  saveCatalogs: (data: {
    productCatalog?: string[];
    fabricCatalog?: string[];
    sizeCatalog?: string[];
    workers?: string[];
  }) =>
    api.put<{ ok: boolean }>('/chapan/settings/catalogs', data),

  // ── Client Requests ─────────────────────────────────

  getRequests: async (): Promise<ClientRequest[]> => {
    const res = await api.get<ListResponse<ClientRequest>>('/chapan/requests');
    return res.results;
  },

  submitClientRequest: (data: {
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
  }) =>
    api.post<ClientRequest>('/chapan/requests', data),

  updateRequestStatus: (requestId: string, status: ClientRequest['status'], createdOrderId?: string) =>
    api.patch<{ ok: boolean }>(`/chapan/requests/${requestId}/status`, { status, createdOrderId }),

  // ── Orders ──────────────────────────────────────────

  getOrders: async (): Promise<Order[]> => {
    const res = await api.get<ListResponse<Order>>('/chapan/orders');
    return res.results;
  },

  getOrder: (id: string) =>
    api.get<Order>(`/chapan/orders/${id}`),

  createOrder: (data: {
    clientId?: string;
    clientName: string;
    clientPhone: string;
    priority: OrderPriority;
    items: Omit<OrderItem, 'id'>[];
    dueDate?: string;
    sourceRequestId?: string;
  }) =>
    api.post<Order>('/chapan/orders', data),

  confirmOrder: (id: string) =>
    api.post<{ ok: boolean }>(`/chapan/orders/${id}/confirm`),

  updateOrderStatus: (id: string, status: OrderStatus, cancelReason?: string) =>
    api.patch<{ ok: boolean }>(`/chapan/orders/${id}/status`, { status, cancelReason }),

  addPayment: async (orderId: string, amount: number, method: PaymentMethod, notes?: string) => {
    const res = await api.post<{ id: string; orderId: string; amount: number; method: PaymentMethod; paidAt: string; notes?: string }>(
      `/chapan/orders/${orderId}/payments`,
      { amount, method, notes },
    );
    return res;
  },

  // ── Transfer ────────────────────────────────────────

  initiateTransfer: (orderId: string) =>
    api.post<{ id: string; orderId: string; confirmedByManager: boolean; confirmedByClient: boolean }>(
      `/chapan/orders/${orderId}/transfer`,
    ),

  confirmTransfer: (orderId: string, by: 'manager' | 'client') =>
    api.post<{ ok: boolean }>(`/chapan/orders/${orderId}/transfer/confirm`, { by }),

  // ── Production ──────────────────────────────────────

  moveProductionStatus: (taskId: string, status: ProductionStatus) =>
    api.patch<{ ok: boolean }>(`/chapan/production/${taskId}/status`, { status }),

  assignWorker: (taskId: string, worker: string) =>
    api.patch<{ ok: boolean }>(`/chapan/production/${taskId}/assign`, { worker }),

  flagTask: (taskId: string, reason: string) =>
    api.post<{ ok: boolean }>(`/chapan/production/${taskId}/flag`, { reason }),

  unflagTask: (taskId: string) =>
    api.post<{ ok: boolean }>(`/chapan/production/${taskId}/unflag`),

  setTaskDefect: (taskId: string, defect: string) =>
    api.patch<{ ok: boolean }>(`/chapan/production/${taskId}/defect`, { defect }),

  // ── Activity ────────────────────────────────────────

  addActivity: async (orderId: string, entry: Omit<OrderActivity, 'id'>) => {
    const res = await api.post<OrderActivity>(`/chapan/orders/${orderId}/activities`, {
      type: entry.type,
      content: entry.content,
    });
    return res;
  },

  // ── Clients ─────────────────────────────────────────

  getClients: async (): Promise<Client[]> => {
    const res = await api.get<ListResponse<Client>>('/chapan/settings/clients');
    return res.results;
  },

  createClient: (data: Omit<Client, 'id' | 'createdAt'>) =>
    api.post<Client>('/chapan/settings/clients', data),
};
